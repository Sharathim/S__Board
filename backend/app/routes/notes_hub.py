from flask import Blueprint, request, jsonify, g
from ..extensions import db
from ..models.user import User, UserRole
from ..models.notes import Subject, Unit, UnitFile, NotesLog
from ..utils.auth_middleware import require_auth
from ..utils.cloudinary_helper import upload_file
from .classes import CLASSES
import json
from datetime import datetime

notes_hub_bp = Blueprint("notes_hub", __name__)


def _serialize_file(f):
    return {
        "id": f.id,
        "file_name": f.file_name,
        "file_url": f.file_url,
        "file_type": f.file_type,
        "file_size": f.file_size,
        "uploaded_by": {
            "id": f.uploader.id,
            "name": f.uploader.name,
            "role": f.uploader.role.value if f.uploader and f.uploader.role else "FACULTY"
        } if f.uploader else None,
        "created_at": f.created_at.isoformat() if f.created_at else None
    }


def _serialize_unit_full(u):
    files = u.files.order_by(UnitFile.created_at.desc()).all()
    return {
        "id": u.id,
        "name": u.name,
        "order_index": u.order_index,
        "created_by": {
            "id": u.creator.id,
            "name": u.creator.name,
            "role": u.creator.role.value if u.creator and u.creator.role else "FACULTY"
        } if u.creator else None,
        "files": [_serialize_file(f) for f in files],
        "file_count": len(files),
        "created_at": u.created_at.isoformat() if u.created_at else None
    }


def _serialize_subject_full(s):
    units = s.units.order_by(Unit.order_index, Unit.id).all()
    total_files = sum(u.files.count() for u in units)
    return {
        "id": s.id,
        "name": s.name,
        "academic_year": s.academic_year,
        "semester": s.semester,
        "is_archived": s.is_archived,
        "unit_count": len(units),
        "file_count": total_files,
        "units": [_serialize_unit_full(u) for u in units],
        "created_by": {
            "id": s.creator.id,
            "name": s.creator.name,
            "role": s.creator.role.value if s.creator and s.creator.role else "FACULTY"
        } if s.creator else None,
        "created_at": s.created_at.isoformat() if s.created_at else None
    }


@notes_hub_bp.route("/faculty/my-classes-subjects", methods=["GET"])
@notes_hub_bp.route("/my-classes-subjects", methods=["GET"])
@require_auth
def get_notes_hub():
    """
    Returns all subjects grouped by class → academic_year → semester.
    - HOD: Returns all classes in the institution.
    - FACULTY: Returns classes handled by faculty.
    - STUDENT: Returns student's enrolled class.
    Query params: ?class_name=UG_3A, ?academic_year=2024-25, ?semester=1
    """
    user = g.current_user
    incharge_class = None

    if user.role == UserRole.HOD:
        all_classes = list(CLASSES)
    elif user.role == UserRole.FACULTY:
        fp = user.faculty_profile
        if not fp:
            return jsonify({"classes": [], "available_classes": []})
        handled_classes = list(fp.classes_handling or [])
        incharge_class = fp.class_incharge_of
        all_classes = list(set(handled_classes + ([incharge_class] if incharge_class else [])))
    elif user.role == UserRole.STUDENT:
        sp = user.student_profile
        if not sp or not sp.class_name:
            return jsonify({"classes": [], "available_classes": []})
        all_classes = [sp.class_name]
    else:
        return jsonify({"error": "Unauthorized role"}), 403

    all_classes.sort()

    # Available classes list for upload form
    if user.role == UserRole.HOD:
        available_classes = list(CLASSES)
    elif user.role == UserRole.FACULTY:
        available_classes = all_classes
    else:
        available_classes = []

    # Optional filters
    filter_class = request.args.get("class_name")
    filter_year = request.args.get("academic_year")
    filter_semester = request.args.get("semester", type=int)
    include_archived = request.args.get("archived", "false").lower() == "true"

    target_classes = all_classes
    if filter_class:
        if filter_class not in all_classes:
            return jsonify({"error": "Access denied to this class"}), 403
        target_classes = [filter_class]

    result = []
    for class_name in target_classes:
        q = Subject.query.filter_by(class_name=class_name, is_archived=include_archived)
        if filter_year:
            q = q.filter_by(academic_year=filter_year)
        if filter_semester in (1, 2):
            q = q.filter_by(semester=filter_semester)

        subjects = q.order_by(
            Subject.academic_year.desc(), Subject.semester, Subject.name
        ).all()

        # Group by academic_year → semester
        grouped = {}
        for subj in subjects:
            yr = subj.academic_year
            sem = subj.semester
            if yr not in grouped:
                grouped[yr] = {}
            if sem not in grouped[yr]:
                grouped[yr][sem] = []
            grouped[yr][sem].append(_serialize_subject_full(subj))

        result.append({
            "class_name": class_name,
            "is_incharge": incharge_class == class_name,
            "academic_years": [
                {
                    "year": yr,
                    "semesters": [
                        {
                            "semester": sem,
                            "subjects": grouped[yr][sem]
                        }
                        for sem in sorted(grouped[yr].keys())
                    ]
                }
                for yr in sorted(grouped.keys(), reverse=True)
            ]
        })

    return jsonify({
        "classes": result,
        "available_classes": available_classes,
        "role": user.role.value
    })


@notes_hub_bp.route("/classes/<class_name>/subject-names", methods=["GET"])
@require_auth
def get_subject_names_for_class(class_name):
    """
    Returns unique subject names existing in a given class.
    Used to populate Subject Name dropdown in the upload form.
    """
    subjects = Subject.query.filter_by(class_name=class_name, is_archived=False).order_by(Subject.name).all()
    # Deduplicate subject names (case-insensitive deduplication)
    seen = set()
    names = []
    for s in subjects:
        s_name_strip = s.name.strip()
        if s_name_strip.lower() not in seen:
            seen.add(s_name_strip.lower())
            names.append({"id": s.id, "name": s_name_strip, "academic_year": s.academic_year, "semester": s.semester})

    return jsonify({"subjects": names})


@notes_hub_bp.route("/upload-notes", methods=["POST"])
@require_auth
def upload_notes_batch():
    """
    Atomic upload notes endpoint:
    Form Data:
      - class_name: target class (e.g. UG_3A)
      - subject_name: name of subject (e.g. Operating Systems)
      - unit_name: e.g. "Unit 1", "Unit 2", ..., "Unit 5"
      - academic_year (optional)
      - semester (optional, int)
      - files: multi-file upload
    """
    user = g.current_user
    if user.role == UserRole.STUDENT:
        return jsonify({"error": "Students are not authorized to upload notes"}), 403

    class_name = request.form.get("class_name", "").strip()
    subject_name = request.form.get("subject_name", "").strip()
    unit_name = request.form.get("unit_name", "").strip()
    academic_year = request.form.get("academic_year", "").strip()
    semester = request.form.get("semester", 1, type=int)

    if not class_name or not subject_name or not unit_name:
        return jsonify({"error": "Class name, subject name, and unit are required"}), 400

    # Authorization check
    if user.role == UserRole.FACULTY:
        fp = user.faculty_profile
        handled = list(fp.classes_handling or []) if fp else []
        incharge = fp.class_incharge_of if fp else None
        allowed = set(handled + ([incharge] if incharge else []))
        if class_name not in allowed:
            return jsonify({"error": f"You do not have access to upload notes for {class_name}"}), 403
    elif user.role != UserRole.HOD:
        return jsonify({"error": "Unauthorized"}), 403

    # Calculate default academic year if not provided
    if not academic_year:
        now = datetime.utcnow()
        y = now.year
        academic_year = f"{y}-{y+1}" if now.month >= 6 else f"{y-1}-{y}"

    # 1. Find or create Subject (prevent duplicates for same class_name and subject_name case-insensitively)
    subject = Subject.query.filter(
        Subject.class_name == class_name,
        db.func.lower(Subject.name) == subject_name.lower()
    ).first()

    if not subject:
        subject = Subject(
            class_name=class_name,
            name=subject_name,
            academic_year=academic_year,
            semester=semester if semester in (1, 2) else 1,
            created_by=user.id
        )
        db.session.add(subject)
        db.session.commit()
    
    # 2. Find or create Unit under this Subject (prevent duplicates)
    unit = Unit.query.filter(
        Unit.subject_id == subject.id,
        db.func.lower(Unit.name) == unit_name.lower()
    ).first()

    if not unit:
        # Determine order index (Unit 1 -> 1, Unit 2 -> 2, etc.)
        order_idx = 1
        if "1" in unit_name: order_idx = 1
        elif "2" in unit_name: order_idx = 2
        elif "3" in unit_name: order_idx = 3
        elif "4" in unit_name: order_idx = 4
        elif "5" in unit_name: order_idx = 5
        else:
            max_order = db.session.query(db.func.max(Unit.order_index)).filter_by(subject_id=subject.id).scalar() or 0
            order_idx = max_order + 1

        unit = Unit(
            subject_id=subject.id,
            name=unit_name,
            order_index=order_idx,
            created_by=user.id
        )
        db.session.add(unit)
        db.session.commit()

    # 3. Handle File Uploads
    files = request.files.getlist("files")
    if not files:
        return jsonify({"error": "Please select at least one file to upload"}), 400

    uploaded_records = []
    for file in files:
        if not file or not file.filename:
            continue

        ext = file.filename.split(".")[-1].lower() if "." in file.filename else ""
        if ext not in ["pdf", "ppt", "pptx", "doc", "docx"]:
            return jsonify({"error": f"File format .{ext} is not allowed. Only PDF, PPT, PPTX, DOC, DOCX are supported."}), 400

        try:
            res = upload_file(file, folder="dpms/notes")
            if res:
                unit_file = UnitFile(
                    unit_id=unit.id,
                    file_name=res.get("name", file.filename),
                    file_url=res["url"],
                    file_type=ext,
                    file_size=0,
                    cloudinary_public_id=res.get("public_id"),
                    uploaded_by=user.id
                )
                db.session.add(unit_file)
                db.session.commit()
                uploaded_records.append(unit_file)

                # Log action
                try:
                    log_entry = NotesLog(
                        class_name=class_name,
                        action="uploaded_file",
                        target_type="file",
                        target_name=unit_file.file_name,
                        performed_by=user.id,
                        details=json.dumps({"unit_id": unit.id, "subject_id": subject.id, "file_id": unit_file.id})
                    )
                    db.session.add(log_entry)
                    db.session.commit()
                except Exception as log_err:
                    db.session.rollback()
                    print(f"NotesLog failed: {log_err}")

        except ValueError as ve:
            return jsonify({"error": str(ve)}), 400
        except Exception as e:
            return jsonify({"error": f"Upload failed: {str(e)}"}), 500

    return jsonify({
        "message": f"Successfully uploaded {len(uploaded_records)} file(s) to {subject.name} - {unit.name}",
        "subject": _serialize_subject_full(subject)
    })
