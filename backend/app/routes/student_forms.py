from flask import Blueprint, request, jsonify, g, send_file
from ..extensions import db
from ..models.user import User, UserRole
from ..models.student import Student, StudentDetail, CustomForm, FormResponse
from ..utils.auth_middleware import require_auth
from ..utils.cloudinary_helper import upload_file
import json
import io
import requests
import zipfile
from openpyxl import Workbook
from datetime import datetime

student_forms_bp = Blueprint("student_forms", __name__)

CORE_FIELDS = [
    "gender", "blood_group", "nationality", "religion", "community", "caste",
    "mobile_number", "communication_address", "permanent_address", "tenth_percentage",
    "twelfth_percentage", "admission_type", "aadhar_number", "pan_number",
    "father_name", "father_occupation", "father_income", "father_mobile",
    "mother_name", "mother_occupation", "mother_income", "mother_mobile"
]

def _can_view_class(user, class_name):
    if user.role == UserRole.HOD:
        return True
    if user.role == UserRole.FACULTY:
        fp = user.faculty_profile
        if fp.class_incharge_of == class_name:
            return True
        if class_name in (fp.classes_handling or []):
            return True
        return False
    if user.role == UserRole.STUDENT:
        return user.student_profile and user.student_profile.class_name == class_name
    return False

def _is_class_incharge(user, class_name):
    if user.role == UserRole.HOD:
        return True
    if user.role == UserRole.FACULTY:
        fp = user.faculty_profile
        return fp and fp.class_incharge_of == class_name
    return False

# ─── Student Detail View & Edit ──────────────────────────────────────────

@student_forms_bp.route("/<class_name>/students/<int:student_id>/details", methods=["GET"])
@require_auth
def get_student_details(class_name, student_id):
    user = g.current_user
    if not _can_view_class(user, class_name):
        return jsonify({"error": "Access denied"}), 403

    student = Student.query.filter_by(id=student_id, class_name=class_name).first_or_404()
    details = student.details

    res = {}
    for f in CORE_FIELDS:
        res[f] = getattr(details, f) if details else ""

    extra = details.get_extra_details() if details else {}
    return jsonify({
        "student_id": student.id,
        "name": student.user.name,
        "roll_number": student.roll_number,
        "register_number": student.register_number,
        "details": res,
        "extra_details": extra
    })

@student_forms_bp.route("/<class_name>/students/<int:student_id>/details", methods=["POST"])
@require_auth
def save_student_details(class_name, student_id):
    user = g.current_user
    # Students can only update their own details
    if user.role == UserRole.STUDENT:
        if not user.student_profile or user.student_profile.id != student_id:
            return jsonify({"error": "Unauthorized"}), 403
    elif not _is_class_incharge(user, class_name):
        return jsonify({"error": "Unauthorized"}), 403

    student = Student.query.filter_by(id=student_id, class_name=class_name).first_or_404()
    data = request.get_json() or {}
    incoming_details = data.get("details", {})

    details = student.details
    if not details:
        details = StudentDetail(student_id=student.id)
        db.session.add(details)

    # Immutability Check for Students:
    # If the student is saving their own details, do not overwrite any already-filled fields.
    for f in CORE_FIELDS:
        new_val = incoming_details.get(f)
        if new_val is not None:
            new_val_str = str(new_val).strip()
            if user.role == UserRole.STUDENT:
                current_val = getattr(details, f)
                if current_val and str(current_val).strip():
                    # Field already has content, make it immutable (ignore new value)
                    continue
            setattr(details, f, new_val_str if new_val_str else None)

    db.session.commit()
    return jsonify({"ok": True})

@student_forms_bp.route("/<class_name>/students/<int:student_id>/details/admin", methods=["POST"])
@require_auth
def save_student_details_admin(class_name, student_id):
    user = g.current_user
    if not _is_class_incharge(user, class_name):
        return jsonify({"error": "Unauthorized"}), 403

    student = Student.query.filter_by(id=student_id, class_name=class_name).first_or_404()
    data = request.get_json() or {}
    incoming_details = data.get("details", {})
    incoming_extra = data.get("extra_details", {})

    details = student.details
    if not details:
        details = StudentDetail(student_id=student.id)
        db.session.add(details)

    # Admins can overwrite any field freely
    for f in CORE_FIELDS:
        val = incoming_details.get(f)
        if val is not None:
            val_str = str(val).strip()
            setattr(details, f, val_str if val_str else None)

    # Update extra details (custom fields)
    current_extra = details.get_extra_details()
    for k, v in incoming_extra.items():
        current_extra[k] = str(v).strip() if v is not None else ""
    details.set_extra_details(current_extra)

    db.session.commit()
    return jsonify({"ok": True})

# ─── Class Data & Stats for Incharge ─────────────────────────────────────

@student_forms_bp.route("/<class_name>/students-data", methods=["GET"])
@require_auth
def get_students_data(class_name):
    user = g.current_user
    if not _can_view_class(user, class_name):
        return jsonify({"error": "Access denied"}), 403

    students = Student.query.filter_by(class_name=class_name).join(User).all()
    
    # Retrieve all forms adding columns to the main table
    forms = CustomForm.query.filter_by(class_name=class_name, destination="main_table").all()
    custom_columns = []
    for f in forms:
        meta = f.get_metadata()
        fields = meta.get("fields", [])
        for field in fields:
            # Avoid duplicate column definitions
            if field["name"] not in [c["name"] for c in custom_columns]:
                custom_columns.append({
                    "name": field["name"],
                    "label": field["label"],
                    "form_title": f.title
                })

    serialized = []
    for s in students:
        details = s.details
        res = {}
        for f in CORE_FIELDS:
            res[f] = getattr(details, f) if details else ""

        extra = details.get_extra_details() if details else {}
        serialized.append({
            "id": s.id,
            "name": s.user.name,
            "roll_number": s.roll_number,
            "register_number": s.register_number,
            "details": res,
            "extra_details": extra
        })

    return jsonify({
        "students": serialized,
        "custom_columns": custom_columns
    })

@student_forms_bp.route("/<class_name>/stats", methods=["GET"])
@require_auth
def get_class_stats(class_name):
    user = g.current_user
    if not _can_view_class(user, class_name):
        return jsonify({"error": "Access denied"}), 403

    students = Student.query.filter_by(class_name=class_name).all()
    total_count = len(students)
    incomplete_count = 0

    for s in students:
        details = s.details
        if not details:
            incomplete_count += 1
            continue
        
        # Check if any core field is empty
        is_incomplete = False
        for f in CORE_FIELDS:
            val = getattr(details, f)
            if not val or not str(val).strip():
                is_incomplete = True
                break
        if is_incomplete:
            incomplete_count += 1

    return jsonify({
        "total_students": total_count,
        "incomplete_students": incomplete_count,
        "complete_students": total_count - incomplete_count
    })

# ─── Form Builder & Submissions ──────────────────────────────────────────

@student_forms_bp.route("/<class_name>/forms", methods=["POST"])
@require_auth
def create_form(class_name):
    user = g.current_user
    if not _is_class_incharge(user, class_name):
        return jsonify({"error": "Unauthorized"}), 403

    data = request.get_json() or {}
    title = data.get("title")
    form_type = data.get("form_type", "custom")
    destination = data.get("destination", "separate_table")
    metadata = data.get("metadata", {})

    if not title:
        return jsonify({"error": "Form title required"}), 400

    form = CustomForm(
        class_name=class_name,
        title=title,
        form_type=form_type,
        destination=destination
    )
    form.set_metadata(metadata)
    
    db.session.add(form)
    db.session.commit()

    return jsonify({"ok": True, "form_id": form.id})

@student_forms_bp.route("/<class_name>/forms", methods=["GET"])
@require_auth
def list_forms(class_name):
    user = g.current_user
    if not _can_view_class(user, class_name):
        return jsonify({"error": "Access denied"}), 403

    forms = CustomForm.query.filter_by(class_name=class_name).order_by(CustomForm.created_at.desc()).all()
    
    result = []
    for f in forms:
        result.append({
            "id": f.id,
            "title": f.title,
            "form_type": f.form_type,
            "destination": f.destination,
            "metadata": f.get_metadata(),
            "created_at": f.created_at.isoformat(),
            "response_count": f.responses.count()
        })
    return jsonify({"forms": result})

@student_forms_bp.route("/<class_name>/forms/<int:form_id>", methods=["GET"])
@require_auth
def get_form(class_name, form_id):
    user = g.current_user
    if not _can_view_class(user, class_name):
        return jsonify({"error": "Access denied"}), 403

    form = CustomForm.query.filter_by(id=form_id, class_name=class_name).first_or_404()
    return jsonify({
        "id": form.id,
        "title": form.title,
        "form_type": form.form_type,
        "destination": form.destination,
        "metadata": form.get_metadata(),
        "created_at": form.created_at.isoformat()
    })

@student_forms_bp.route("/<class_name>/forms/<int:form_id>", methods=["DELETE"])
@require_auth
def delete_form(class_name, form_id):
    user = g.current_user
    if not _is_class_incharge(user, class_name):
        return jsonify({"error": "Unauthorized"}), 403

    form = CustomForm.query.filter_by(id=form_id, class_name=class_name).first_or_404()
    db.session.delete(form)
    db.session.commit()
    return jsonify({"ok": True})

@student_forms_bp.route("/<class_name>/forms/<int:form_id>/responses", methods=["POST"])
@require_auth
def submit_form_response(class_name, form_id):
    user = g.current_user
    if user.role != UserRole.STUDENT or not user.student_profile:
        return jsonify({"error": "Only students can submit responses"}), 403

    student = user.student_profile
    if student.class_name != class_name:
        return jsonify({"error": "Access denied"}), 403

    form = CustomForm.query.filter_by(id=form_id, class_name=class_name).first_or_404()

    answers = {}
    attachment_url = None

    if request.content_type and "multipart/form-data" in request.content_type:
        answers_str = request.form.get("answers")
        if answers_str:
            try:
                answers = json.loads(answers_str)
            except Exception:
                answers = {}
        
        file = request.files.get("certificate")
        if file:
            try:
                res = upload_file(file, folder="dpms/certificates")
                if res:
                    attachment_url = res["url"]
            except Exception as e:
                return jsonify({"error": f"Certificate upload failed: {str(e)}"}), 500
    else:
        data = request.get_json() or {}
        answers = data.get("answers", {})
        attachment_url = data.get("attachment_url")

    # Check if response already exists
    response = FormResponse.query.filter_by(form_id=form_id, student_id=student.id).first()
    if not response:
        response = FormResponse(form_id=form_id, student_id=student.id)
        db.session.add(response)

    response.set_answers(answers)
    if attachment_url:
        response.attachment_url = attachment_url

    # If destination is "main_table", save custom answers into StudentDetail.extra_details!
    if form.destination == "main_table":
        details = student.details
        if not details:
            details = StudentDetail(student_id=student.id)
            db.session.add(details)
        
        current_extra = details.get_extra_details()
        for k, v in answers.items():
            if k not in CORE_FIELDS:
                current_extra[k] = str(v).strip()
        details.set_extra_details(current_extra)

    db.session.commit()
    return jsonify({"ok": True})

@student_forms_bp.route("/<class_name>/forms/<int:form_id>/responses", methods=["GET"])
@require_auth
def get_form_responses(class_name, form_id):
    user = g.current_user
    if not _can_view_class(user, class_name):
        return jsonify({"error": "Access denied"}), 403

    form = CustomForm.query.filter_by(id=form_id, class_name=class_name).first_or_404()
    responses = form.responses.all()

    serialized = []
    for r in responses:
        serialized.append({
            "id": r.id,
            "student_id": r.student_id,
            "student_name": r.student_rel.user.name,
            "roll_number": r.student_rel.roll_number,
            "answers": r.get_answers(),
            "attachment_url": r.attachment_url,
            "created_at": r.created_at.isoformat()
        })
    return jsonify({"responses": serialized})

# ─── Excel & ZIP Export Logic ────────────────────────────────────────────

@student_forms_bp.route("/<class_name>/export-students-data", methods=["GET"])
@require_auth
def export_students_data(class_name):
    user = g.current_user
    if not _is_class_incharge(user, class_name):
        return jsonify({"error": "Unauthorized"}), 403

    columns_param = request.args.get("columns")
    students = Student.query.filter_by(class_name=class_name).join(User).all()

    headers_map = {
        "roll_number": "Roll Number",
        "name": "Name",
        "register_number": "Register Number",
        "gender": "Gender",
        "blood_group": "Blood Group",
        "nationality": "Nationality",
        "religion": "Religion",
        "community": "Community",
        "caste": "Caste",
        "mobile_number": "Mobile Number",
        "communication_address": "Communication Address",
        "permanent_address": "Permanent Address",
        "tenth_percentage": "10th %",
        "twelfth_percentage": "12th %",
        "admission_type": "Admission Type",
        "aadhar_number": "Aadhar Card Number",
        "pan_number": "PAN Card Number",
        "father_name": "Father's Name",
        "father_occupation": "Father's Occupation",
        "father_income": "Father's Annual Income",
        "father_mobile": "Father's Mobile Number",
        "mother_name": "Mother's Name",
        "mother_occupation": "Mother's Occupation",
        "mother_income": "Mother's Annual Income",
        "mother_mobile": "Mother's Mobile Number"
    }

    # Fetch custom main_table columns
    forms = CustomForm.query.filter_by(class_name=class_name, destination="main_table").all()
    custom_cols_map = {}
    for f in forms:
        meta = f.get_metadata()
        for field in meta.get("fields", []):
            custom_cols_map[field["name"]] = field["label"]

    full_cols_map = {}
    full_cols_map.update(headers_map)
    full_cols_map.update(custom_cols_map)

    if columns_param:
        selected_keys = [c.strip() for c in columns_param.split(",") if c.strip() in full_cols_map]
    else:
        selected_keys = ["roll_number", "name", "register_number"] + CORE_FIELDS + list(custom_cols_map.keys())

    wb = Workbook()
    ws = wb.active
    ws.title = "Students Details"

    ws.append([full_cols_map[k] for k in selected_keys])

    for s in students:
        details = s.details
        row = []
        for key in selected_keys:
            if key == "name":
                row.append(s.user.name)
            elif key == "roll_number":
                row.append(s.roll_number)
            elif key == "register_number":
                row.append(s.register_number)
            elif key in CORE_FIELDS:
                row.append(getattr(details, key) if details else "")
            elif key in custom_cols_map:
                extra = details.get_extra_details() if details else {}
                row.append(extra.get(key, ""))
            else:
                row.append("")
        ws.append(row)

    output = io.BytesIO()
    wb.save(output)
    output.seek(0)

    filename = f"{class_name}_students_data_{datetime.now().strftime('%Y%m%d')}.xlsx"
    return send_file(
        output,
        mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        as_attachment=True,
        download_name=filename
    )

@student_forms_bp.route("/<class_name>/forms/<int:form_id>/export", methods=["GET"])
@require_auth
def export_form_responses(class_name, form_id):
    user = g.current_user
    if not _is_class_incharge(user, class_name):
        return jsonify({"error": "Unauthorized"}), 403

    form = CustomForm.query.filter_by(id=form_id, class_name=class_name).first_or_404()
    responses = form.responses.all()
    meta = form.get_metadata()
    fields = meta.get("fields", [])

    wb = Workbook()
    ws = wb.active
    ws.title = "Submissions"

    headers = ["Roll Number", "Name"]
    field_keys = []
    
    if form.form_type == "mark_analysis":
        headers.extend(["Academic Year", "Semester Type", "Exam Type"])
        for field in fields:
            headers.append(field["label"])
            field_keys.append(field["name"])
    elif form.form_type == "internship":
        headers.extend([
            "Company Name", "Start Date", "End Date", 
            "Duration", "Project Name", "Company Website", 
            "Company Address", "Certificate Link"
        ])
        field_keys.extend([
            "company_name", "start_date", "end_date", 
            "duration", "project_name", "company_website", 
            "company_address"
        ])
        for field in fields:
            if field["name"] not in field_keys:
                headers.append(field["label"])
                field_keys.append(field["name"])
    else:
        for field in fields:
            headers.append(field["label"])
            field_keys.append(field["name"])

    ws.append(headers)

    for r in responses:
        answers = r.get_answers()
        row = [r.student_rel.roll_number, r.student_rel.user.name]
        
        if form.form_type == "mark_analysis":
            row.extend([
                meta.get("academic_year", ""),
                meta.get("semester_type", ""),
                meta.get("exam_type", "")
            ])
            for k in field_keys:
                row.append(answers.get(k, ""))
        elif form.form_type == "internship":
            row.extend([
                answers.get("company_name", ""),
                answers.get("start_date", ""),
                answers.get("end_date", ""),
                answers.get("duration", ""),
                answers.get("project_name", ""),
                answers.get("company_website", ""),
                answers.get("company_address", ""),
                r.attachment_url or "No Certificate"
            ])
            for k in field_keys[7:]:
                row.append(answers.get(k, ""))
        else:
            for k in field_keys:
                row.append(answers.get(k, ""))
        ws.append(row)

    output = io.BytesIO()
    wb.save(output)
    output.seek(0)

    filename = f"{class_name}_{form.title.replace(' ', '_')}_responses_{datetime.now().strftime('%Y%m%d')}.xlsx"
    return send_file(
        output,
        mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        as_attachment=True,
        download_name=filename
    )

@student_forms_bp.route("/<class_name>/forms/<int:form_id>/download-certificates", methods=["GET"])
@require_auth
def download_certificates(class_name, form_id):
    user = g.current_user
    if not _is_class_incharge(user, class_name):
        return jsonify({"error": "Unauthorized"}), 403

    form = CustomForm.query.filter_by(id=form_id, class_name=class_name, form_type="internship").first_or_404()
    responses = form.responses.all()

    import urllib3
    urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

    memory_file = io.BytesIO()
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
    }

    with zipfile.ZipFile(memory_file, 'w', zipfile.ZIP_DEFLATED) as zf:
        for resp in responses:
            if resp.attachment_url:
                try:
                    r = requests.get(resp.attachment_url, headers=headers, verify=False, timeout=20)
                    if r.status_code == 200:
                        roll = resp.student_rel.roll_number if resp.student_rel else None
                        if not roll or not str(roll).strip():
                            roll = f"student_{resp.student_id}"
                        filename = f"{str(roll).strip()}.pdf"
                        zf.writestr(filename, r.content)
                    else:
                        print(f"Failed to fetch certificate for student {resp.student_id} from {resp.attachment_url}: Status {r.status_code}")
                except Exception as e:
                    student_roll = resp.student_rel.roll_number if (resp.student_rel and resp.student_rel.roll_number) else f"ID {resp.student_id}"
                    print(f"Failed to fetch certificate for student {student_roll}: {e}")

    memory_file.seek(0)
    
    zip_name = f"{class_name}_internship_certificates_{datetime.now().strftime('%Y%m%d')}.zip"
    return send_file(
        memory_file,
        mimetype="application/zip",
        as_attachment=True,
        download_name=zip_name
    )
