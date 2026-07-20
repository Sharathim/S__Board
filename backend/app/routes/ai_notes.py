"""
ai_notes.py — AI-Powered Notes Ingestion Blueprint

POST /<class_name>/notes/ai-ingest
  - Accepts: multipart/form-data with `prompt` (text) + `files[]` (PDF/PPT/PPTX/DOC/DOCX/ZIP)
  - Calls Gemini 2.0 Flash to parse faculty's intent into a structured plan
  - Falls back to Groq llama-3.1-8b-instant if Gemini fails/rate-limits
  - Executes the plan: create subjects → create units → upload files to Cloudinary
  - Returns: { plan, created_subjects, created_units, uploaded_files, skipped, errors }
"""

from flask import Blueprint, request, jsonify, g, current_app
from ..extensions import db
from ..models.user import User, UserRole
from ..models.notes import Subject, Unit, UnitFile, NotesLog
from ..utils.auth_middleware import require_auth
from ..utils.cloudinary_helper import upload_file
import json
import zipfile
import io
import os
import re
import requests as http_requests
from datetime import datetime

ai_notes_bp = Blueprint("ai_notes", __name__)

ALLOWED_NOTE_EXTS = {"pdf", "ppt", "pptx", "doc", "docx"}

# ─── Helpers ──────────────────────────────────────────────────────────────────

def _can_access_class(user, class_name):
    if user.role == UserRole.HOD:
        return True
    if user.role == UserRole.FACULTY:
        fp = user.faculty_profile
        if not fp:
            return False
        if fp.class_incharge_of == class_name:
            return True
        if class_name in (fp.classes_handling or []):
            return True
        return False
    return False


def _log(class_name, action, target_type, target_name, performed_by, details=None):
    try:
        log_entry = NotesLog(
            class_name=class_name,
            action=action,
            target_type=target_type,
            target_name=target_name,
            performed_by=performed_by,
            details=json.dumps(details) if details else None
        )
        db.session.add(log_entry)
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        print(f"[ai_notes] Log failed: {e}")


def _get_current_academic_year():
    """Returns e.g. '2025-2026' based on current date (June = mid-year boundary)."""
    now = datetime.utcnow()
    if now.month >= 6:
        return f"{now.year}-{now.year + 1}"
    return f"{now.year - 1}-{now.year}"


def _extract_zip(zip_file_obj):
    """
    Extracts a ZIP file and returns a list of dicts:
    { 'filename': str, 'ext': str, 'data': bytes }
    Only files with allowed note extensions are included.
    """
    extracted = []
    try:
        with zipfile.ZipFile(zip_file_obj, 'r') as zf:
            for info in zf.infolist():
                if info.is_dir():
                    continue
                # Strip directory path, keep only filename
                fname = os.path.basename(info.filename)
                if not fname:
                    continue
                ext = fname.rsplit('.', 1)[-1].lower() if '.' in fname else ''
                if ext not in ALLOWED_NOTE_EXTS:
                    continue
                data = zf.read(info.filename)
                extracted.append({'filename': fname, 'ext': ext, 'data': data, 'zip_path': info.filename})
    except zipfile.BadZipFile:
        pass
    return extracted


def _build_system_prompt(existing_subjects, current_year, class_name):
    """Builds the system prompt instructing Gemini to return a strict JSON plan."""
    existing_str = "None"
    if existing_subjects:
        existing_str = "\n".join(
            f"  ID={s.id} | Name='{s.name}' | Year='{s.academic_year}' | Semester={s.semester}"
            for s in existing_subjects
        )

    return f"""You are an AI assistant for an academic management system called S-DESK.
A faculty member will give you a free-form instruction and a list of file names.
Your job is to produce a structured JSON plan for organizing academic notes.

CONTEXT:
- Class: {class_name}
- Current Academic Year: {current_year}
- Existing subjects in this class:
{existing_str}

RULES:
1. Return ONLY valid JSON. No markdown, no explanation, no extra text.
2. If the faculty wants to add to an EXISTING subject, use "existing_subject_id" with the ID from the list above.
3. If creating a NEW subject, set "existing_subject_id" to null.
4. Assign files to units based on context clues in filenames and the faculty's instruction.
5. If you cannot determine which unit a file belongs to, put it in the first unit.
6. For academic_year: use "{current_year}" unless the faculty specifies a different year.
7. For semester: default to 1 if not mentioned. Faculty may say "sem 1", "S1", "first semester", "semester 2", "S2", etc.
8. For unit order_index: assign sequentially starting from 1 for new units; for existing subject, continue from the highest existing unit number (assume next available).
9. Unit names should be clean and descriptive, e.g. "Unit 1 – Introduction to OS".

OUTPUT SCHEMA (strict):
{{
  "action_summary": "<one sentence describing what you will do>",
  "operations": [
    {{
      "subject_name": "<name>",
      "subject_semester": 1,
      "academic_year": "{current_year}",
      "existing_subject_id": null,
      "units": [
        {{
          "unit_name": "<descriptive unit name>",
          "order_index": 1,
          "files": ["<filename1>", "<filename2>"]
        }}
      ]
    }}
  ]
}}

If no files are attached, the "files" array in each unit will be empty — that is fine.
Always produce at least one operation.
"""


def _call_gemini(prompt_text, file_names, existing_subjects, current_year, class_name):
    """Call Gemini 2.0 Flash API. Returns parsed dict or raises."""
    import google.generativeai as genai

    api_key = current_app.config.get("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY not configured")

    genai.configure(api_key=api_key)
    model = genai.GenerativeModel("gemini-2.0-flash")

    system_prompt = _build_system_prompt(existing_subjects, current_year, class_name)
    file_list_str = "\n".join(f"  - {fn}" for fn in file_names) if file_names else "  (no files attached)"
    user_message = f"""Faculty instruction: {prompt_text}

Files to organize:
{file_list_str}
"""

    response = model.generate_content(
        [system_prompt, user_message],
        generation_config=genai.GenerationConfig(
            temperature=0.1,
            max_output_tokens=2048,
        )
    )

    raw = response.text.strip()
    # Strip possible markdown fences
    raw = re.sub(r'^```(?:json)?\s*', '', raw)
    raw = re.sub(r'\s*```$', '', raw)
    return json.loads(raw)


def _call_groq(prompt_text, file_names, existing_subjects, current_year, class_name):
    """Call Groq llama-3.1-8b-instant via REST API. Returns parsed dict or raises."""
    api_key = current_app.config.get("GROQ_API_KEY")
    if not api_key:
        raise ValueError("GROQ_API_KEY not configured")

    system_prompt = _build_system_prompt(existing_subjects, current_year, class_name)
    file_list_str = "\n".join(f"  - {fn}" for fn in file_names) if file_names else "  (no files attached)"
    user_message = f"""Faculty instruction: {prompt_text}

Files to organize:
{file_list_str}
"""

    resp = http_requests.post(
        "https://api.groq.com/openai/v1/chat/completions",
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        },
        json={
            "model": "llama-3.1-8b-instant",
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_message}
            ],
            "temperature": 0.1,
            "max_tokens": 2048,
        },
        timeout=30
    )
    resp.raise_for_status()
    raw = resp.json()["choices"][0]["message"]["content"].strip()
    raw = re.sub(r'^```(?:json)?\s*', '', raw)
    raw = re.sub(r'\s*```$', '', raw)
    return json.loads(raw)


def _get_ai_plan(prompt_text, file_names, existing_subjects, current_year, class_name):
    """Try Gemini first; fallback to Groq on any failure."""
    try:
        plan = _call_gemini(prompt_text, file_names, existing_subjects, current_year, class_name)
        plan["_ai_provider"] = "gemini"
        return plan
    except Exception as e:
        print(f"[ai_notes] Gemini failed: {e}. Trying Groq...")
        try:
            plan = _call_groq(prompt_text, file_names, existing_subjects, current_year, class_name)
            plan["_ai_provider"] = "groq"
            return plan
        except Exception as e2:
            raise RuntimeError(f"Both AI providers failed. Gemini: {e}. Groq: {e2}")


# ─── Main Route ───────────────────────────────────────────────────────────────

@ai_notes_bp.route("/<class_name>/notes/ai-ingest", methods=["POST"])
@require_auth
def ai_ingest(class_name):
    """
    AI-powered notes ingestion endpoint.
    Accepts multipart: `prompt` (text) + `files[]` (any mix of PDFs/PPTs/DOCs/ZIPs)
    """
    user = g.current_user

    # Auth: only HOD or FACULTY
    if user.role == UserRole.STUDENT:
        return jsonify({"error": "Unauthorized"}), 403
    if not _can_access_class(user, class_name):
        return jsonify({"error": "Access denied to this class"}), 403

    # ── 1. Read prompt ──────────────────────────────────────────────────────
    prompt_text = (request.form.get("prompt") or "").strip()
    if not prompt_text:
        return jsonify({"error": "A prompt is required"}), 400

    # ── 2. Collect and extract files ────────────────────────────────────────
    raw_files = request.files.getlist("files")
    # file_store: list of { 'filename': str, 'ext': str, 'data': bytes }
    file_store = []
    skipped = []

    for rf in raw_files:
        if not rf or not rf.filename:
            continue
        fname = rf.filename
        ext = fname.rsplit('.', 1)[-1].lower() if '.' in fname else ''

        if ext == 'zip':
            # Extract ZIP contents
            zip_data = rf.read()
            extracted = _extract_zip(io.BytesIO(zip_data))
            if not extracted:
                skipped.append({"file": fname, "reason": "ZIP was empty or contained no supported files"})
            else:
                file_store.extend(extracted)
        elif ext in ALLOWED_NOTE_EXTS:
            data = rf.read()
            file_store.append({'filename': fname, 'ext': ext, 'data': data})
        else:
            skipped.append({"file": fname, "reason": f"Unsupported file type: .{ext}"})

    # ── 3. Get existing subjects for AI context ──────────────────────────────
    existing_subjects = Subject.query.filter_by(class_name=class_name, is_archived=False).all()
    current_year = _get_current_academic_year()

    # ── 4. Call AI to get structured plan ───────────────────────────────────
    file_names = [f['filename'] for f in file_store]
    try:
        ai_plan = _get_ai_plan(prompt_text, file_names, existing_subjects, current_year, class_name)
    except RuntimeError as e:
        return jsonify({"error": str(e)}), 502

    if not isinstance(ai_plan, dict) or "operations" not in ai_plan:
        return jsonify({"error": "AI returned an invalid plan structure"}), 502

    # ── 5. Return preview plan (don't execute yet) ───────────────────────────
    # The frontend shows this and lets faculty confirm before execution
    # Map file_names for frontend display
    preview_operations = ai_plan.get("operations", [])

    return jsonify({
        "preview": True,
        "action_summary": ai_plan.get("action_summary", "AI has parsed your request"),
        "ai_provider": ai_plan.get("_ai_provider", "unknown"),
        "operations": preview_operations,
        "file_count": len(file_store),
        "file_names": file_names,
        "skipped": skipped,
        "current_year": current_year,
    })


@ai_notes_bp.route("/<class_name>/notes/ai-ingest/execute", methods=["POST"])
@require_auth
def ai_ingest_execute(class_name):
    """
    Executes the AI-generated plan.
    Accepts multipart: `plan` (JSON string) + `files[]` (same files as the preview call)
    This two-step approach (preview → confirm → execute) prevents mistakes.
    """
    user = g.current_user

    if user.role == UserRole.STUDENT:
        return jsonify({"error": "Unauthorized"}), 403
    if not _can_access_class(user, class_name):
        return jsonify({"error": "Access denied to this class"}), 403

    # ── Parse the confirmed plan ─────────────────────────────────────────────
    plan_str = request.form.get("plan")
    if not plan_str:
        return jsonify({"error": "Execution plan is required"}), 400

    try:
        plan = json.loads(plan_str)
    except json.JSONDecodeError:
        return jsonify({"error": "Invalid plan JSON"}), 400

    operations = plan.get("operations", [])
    if not operations:
        return jsonify({"error": "No operations in plan"}), 400

    # ── Collect files into lookup dict: filename -> bytes ───────────────────
    raw_files = request.files.getlist("files")
    file_lookup = {}  # filename (lowercase) -> {'data': bytes, 'ext': str}

    for rf in raw_files:
        if not rf or not rf.filename:
            continue
        fname = rf.filename
        ext = fname.rsplit('.', 1)[-1].lower() if '.' in fname else ''

        if ext == 'zip':
            zip_data = rf.read()
            extracted = _extract_zip(io.BytesIO(zip_data))
            for item in extracted:
                file_lookup[item['filename'].lower()] = item
        elif ext in ALLOWED_NOTE_EXTS:
            data = rf.read()
            file_lookup[fname.lower()] = {'filename': fname, 'ext': ext, 'data': data}

    # ── Execute plan ─────────────────────────────────────────────────────────
    created_subjects = []
    created_units = []
    uploaded_files = []
    errors = []

    current_year = _get_current_academic_year()

    for op in operations:
        subject_name = (op.get("subject_name") or "").strip()
        academic_year = (op.get("academic_year") or current_year).strip()
        subject_semester = op.get("subject_semester")
        existing_subject_id = op.get("existing_subject_id")
        units_plan = op.get("units", [])

        if not subject_name:
            errors.append({"op": op, "error": "Missing subject_name"})
            continue

        # Validate/coerce semester
        if subject_semester is not None:
            try:
                subject_semester = int(subject_semester)
                if subject_semester not in (1, 2):
                    subject_semester = None
            except (ValueError, TypeError):
                subject_semester = None

        # ── Find or create subject ───────────────────────────────────────────
        subject = None
        if existing_subject_id:
            subject = Subject.query.get(existing_subject_id)
            if not subject or subject.class_name != class_name:
                subject = None  # invalid ID, will create new

        if not subject:
            # Check if a subject with same name+year exists before creating
            subject = Subject.query.filter_by(
                class_name=class_name,
                name=subject_name,
                academic_year=academic_year
            ).first()

        if not subject:
            # Create new subject
            subject = Subject(
                class_name=class_name,
                name=subject_name,
                academic_year=academic_year,
                semester=subject_semester,
                created_by=user.id
            )
            db.session.add(subject)
            db.session.flush()  # get the id without full commit
            created_subjects.append({
                "id": subject.id,
                "name": subject.name,
                "academic_year": subject.academic_year,
                "semester": subject.semester
            })
            _log(class_name, "ai_created_subject", "subject", subject.name, user.id,
                 {"subject_id": subject.id, "academic_year": academic_year, "via": "ai_ingest"})

        # ── Create units and upload files ────────────────────────────────────
        # Determine next order_index
        max_order = db.session.query(db.func.max(Unit.order_index)).filter_by(
            subject_id=subject.id).scalar() or 0

        for u_plan in units_plan:
            unit_name = (u_plan.get("unit_name") or "").strip()
            if not unit_name:
                continue

            order_idx = u_plan.get("order_index", max_order + 1)
            if not isinstance(order_idx, int) or order_idx <= 0:
                order_idx = max_order + 1
            max_order = order_idx

            # Create unit
            unit = Unit(
                subject_id=subject.id,
                name=unit_name,
                order_index=order_idx,
                created_by=user.id
            )
            db.session.add(unit)
            db.session.flush()
            created_units.append({
                "id": unit.id,
                "name": unit.name,
                "subject_id": subject.id,
                "subject_name": subject.name
            })
            _log(class_name, "ai_created_unit", "unit", unit_name, user.id,
                 {"unit_id": unit.id, "subject_id": subject.id, "via": "ai_ingest"})

            # Upload files assigned to this unit
            planned_filenames = u_plan.get("files", [])
            for planned_fname in planned_filenames:
                file_entry = file_lookup.get(planned_fname.lower())
                if not file_entry:
                    errors.append({"file": planned_fname, "error": "File not found in upload"})
                    continue

                try:
                    # Build a file-like object for cloudinary_helper.upload_file
                    file_bytes = file_entry['data']
                    file_ext = file_entry['ext']
                    original_name = file_entry['filename']

                    file_obj = io.BytesIO(file_bytes)
                    file_obj.filename = original_name
                    file_obj.content_type = _ext_to_mime(file_ext)
                    # Make seek/tell work for size check in cloudinary_helper
                    file_obj.seek(0, 2)
                    file_size = file_obj.tell()
                    file_obj.seek(0)

                    res = upload_file(file_obj, folder="dpms/notes")
                    if res:
                        unit_file = UnitFile(
                            unit_id=unit.id,
                            file_name=original_name,
                            file_url=res["url"],
                            file_type=file_ext,
                            file_size=file_size,
                            cloudinary_public_id=res["public_id"],
                            uploaded_by=user.id
                        )
                        db.session.add(unit_file)
                        db.session.flush()
                        uploaded_files.append({
                            "id": unit_file.id,
                            "file_name": original_name,
                            "file_url": res["url"],
                            "file_type": file_ext,
                            "unit_id": unit.id,
                            "unit_name": unit.name,
                            "subject_name": subject.name
                        })
                        _log(class_name, "ai_uploaded_file", "file", original_name, user.id,
                             {"file_id": unit_file.id, "unit_id": unit.id, "subject_id": subject.id, "via": "ai_ingest"})
                except Exception as e:
                    errors.append({"file": planned_fname, "error": f"Upload failed: {str(e)}"})

    # ── Final commit ─────────────────────────────────────────────────────────
    try:
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"Database commit failed: {str(e)}"}), 500

    return jsonify({
        "ok": True,
        "created_subjects": created_subjects,
        "created_units": created_units,
        "uploaded_files": uploaded_files,
        "errors": errors,
        "summary": (
            f"Created {len(created_subjects)} subject(s), "
            f"{len(created_units)} unit(s), "
            f"uploaded {len(uploaded_files)} file(s)."
        )
    })


def _ext_to_mime(ext):
    """Map file extension to MIME type for cloudinary_helper content_type check."""
    map = {
        "pdf": "application/pdf",
        "ppt": "application/vnd.ms-powerpoint",
        "pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "doc": "application/msword",
        "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    }
    return map.get(ext.lower(), "application/octet-stream")
