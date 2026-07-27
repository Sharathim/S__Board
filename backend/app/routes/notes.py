from flask import Blueprint, request, jsonify, g
from ..extensions import db
from ..models.user import User, UserRole
from ..models.faculty import Faculty
from ..models.notes import Subject, Unit, UnitFile, NotesLog
from ..utils.auth_middleware import require_auth
from ..utils.cloudinary_helper import upload_file, delete_file
import json
from datetime import datetime

notes_bp = Blueprint("notes", __name__)

CLASSES = ["UG_1A", "UG_1B", "UG_2A", "UG_2B", "UG_3A", "UG_3B", "PG_1A", "PG_2A"]

# Helper to check if a user can view/access a class
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
        if class_name in getattr(fp, "extra_class_access", []):
            return True
        return False
    if user.role == UserRole.STUDENT:
        return user.student_profile and user.student_profile.class_name == class_name
    return False

# Helper to check if a user is the class incharge of a class
def _is_class_incharge(user, class_name):
    if user.role == UserRole.HOD:
        return True
    if user.role == UserRole.FACULTY:
        fp = user.faculty_profile
        return fp and fp.class_incharge_of == class_name
    return False

# Helper to check if a user has write/modify permissions for a specific resource
def _can_modify_resource(user, class_name, creator_id):
    if user.role == UserRole.HOD:
        return True
    if user.role == UserRole.FACULTY:
        # Class incharge has full authority
        if _is_class_incharge(user, class_name):
            return True
        # The creator/uploader has authority
        return user.id == creator_id
    return False

# Helper to write to logs
def _log_notes_action(class_name, action, target_type, target_name, performed_by, details=None):
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
        # Non-blocking log failure
        print(f"Log creation failed: {e}")

# Serialize helpers
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
            "role": f.uploader.role.value
        },
        "created_at": f.created_at.isoformat()
    }

def _serialize_unit(u):
    return {
        "id": u.id,
        "name": u.name,
        "order_index": u.order_index,
        "created_by": {
            "id": u.creator.id,
            "name": u.creator.name,
            "role": u.creator.role.value
        },
        "files": [_serialize_file(f) for f in u.files.all()],
        "created_at": u.created_at.isoformat()
    }

def _serialize_unit_no_files(u):
    return {
        "id": u.id,
        "name": u.name,
        "order_index": u.order_index,
        "file_count": u.files.count(),
        "created_at": u.created_at.isoformat()
    }

def _serialize_subject(s):
    # Calculate counts
    unit_count = s.units.count()
    file_count = sum(unit.files.count() for unit in s.units.all())
    return {
        "id": s.id,
        "name": s.name,
        "academic_year": s.academic_year,
        "semester": s.semester,
        "is_archived": s.is_archived,
        "created_by": {
            "id": s.creator.id,
            "name": s.creator.name,
            "role": s.creator.role.value
        },
        "unit_count": unit_count,
        "file_count": file_count,
        "created_at": s.created_at.isoformat()
    }

# Helper to compute current academic year
def _get_current_academic_year():
    now = datetime.utcnow()
    y = now.year
    return f"{y}-{y+1}" if now.month >= 6 else f"{y-1}-{y}"

# ─── New Unified Notes & Docs Endpoints ─────────────────────────────────────

@notes_bp.route("/notes/classes", methods=["GET"])
@require_auth
def get_user_notes_classes():
    """
    Returns list of authorized classes for the logged-in user:
    - STUDENT: [student_profile.class_name]
    - FACULTY: handled classes + class_incharge_of + extra_class_access
    - HOD: ALL_CLASSES
    """
    user = g.current_user
    if user.role == UserRole.HOD:
        return jsonify({"classes": CLASSES, "user_role": "HOD"})

    if user.role == UserRole.FACULTY:
        fp = user.faculty_profile
        if not fp:
            return jsonify({"classes": [], "user_role": "FACULTY"})
        classes_set = set(fp.classes_handling or [])
        if fp.class_incharge_of:
            classes_set.add(fp.class_incharge_of)
        if getattr(fp, "extra_class_access", None):
            classes_set.update(fp.extra_class_access or [])
        classes_list = sorted(list(classes_set))
        return jsonify({"classes": classes_list, "user_role": "FACULTY"})

    if user.role == UserRole.STUDENT:
        if user.student_profile and user.student_profile.class_name:
            return jsonify({"classes": [user.student_profile.class_name], "user_role": "STUDENT"})
        return jsonify({"classes": [], "user_role": "STUDENT"})

    return jsonify({"classes": [], "user_role": user.role.value})


@notes_bp.route("/notes/class/<class_name>/tree", methods=["GET"])
@require_auth
def get_class_notes_tree(class_name):
    """
    Returns full nested tree of subjects -> units -> files for a specific class.
    Combined and organized by Subject name and Unit name.
    """
    user = g.current_user
    if not _can_access_class(user, class_name):
        return jsonify({"error": f"Access denied to class {class_name}"}), 403

    subjects = Subject.query.filter_by(class_name=class_name, is_archived=False)\
        .order_by(Subject.name.asc()).all()

    serialized_subjects = []
    for subj in subjects:
        units = subj.units.order_by(Unit.order_index.asc(), Unit.id.asc()).all()
        serialized_units = []
        for u in units:
            serialized_units.append({
                "id": u.id,
                "name": u.name,
                "order_index": u.order_index,
                "created_by": {
                    "id": u.creator.id,
                    "name": u.creator.name,
                    "role": u.creator.role.value
                } if u.creator else None,
                "files": [_serialize_file(f) for f in u.files.order_by(UnitFile.created_at.desc()).all()],
                "created_at": u.created_at.isoformat()
            })

        serialized_subjects.append({
            "id": subj.id,
            "name": subj.name,
            "academic_year": subj.academic_year,
            "semester": subj.semester,
            "created_by": {
                "id": subj.creator.id,
                "name": subj.creator.name,
                "role": subj.creator.role.value
            } if subj.creator else None,
            "units": serialized_units,
            "created_at": subj.created_at.isoformat()
        })

    return jsonify({
        "class_name": class_name,
        "subjects": serialized_subjects
    })


@notes_bp.route("/notes/upload-notes", methods=["POST"])
@require_auth
def upload_notes_unified():
    """
    Unified route for uploading notes (Faculty / HOD):
    1. Select Class
    2. Select / Create Subject (combines duplicate subject names within class)
    3. Select Unit (Unit 1 .. Unit 5, combines duplicate unit names within subject)
    4. Upload multiple files (PDF, PPT, PPTX, DOC, DOCX, PNG, JPG, JPEG)
    """
    user = g.current_user
    if user.role == UserRole.STUDENT:
        return jsonify({"error": "Students cannot upload notes"}), 403

    class_name = request.form.get("class_name", "").strip()
    subject_name = request.form.get("subject_name", "").strip()
    unit_name = request.form.get("unit_name", "").strip()

    if not class_name or not subject_name or not unit_name:
        return jsonify({"error": "Class name, subject name, and unit name are required"}), 400

    if not _can_access_class(user, class_name):
        return jsonify({"error": f"Access denied to upload notes for class {class_name}"}), 403

    files = request.files.getlist("files")
    if not files or len(files) == 0:
        return jsonify({"error": "Please select at least one file to upload"}), 400

    # 1. Subject Resolution / Creation (case-insensitive name match within class)
    subject = Subject.query.filter(
        Subject.class_name == class_name,
        db.func.lower(Subject.name) == subject_name.lower(),
        Subject.is_archived == False
    ).first()

    if not subject:
        acad_year = _get_current_academic_year()
        subject = Subject(
            class_name=class_name,
            name=subject_name,
            academic_year=acad_year,
            semester=1,
            created_by=user.id
        )
        db.session.add(subject)
        db.session.commit()
        _log_notes_action(
            class_name=class_name,
            action="created_subject",
            target_type="subject",
            target_name=subject_name,
            performed_by=user.id
        )

    # 2. Unit Resolution / Creation (case-insensitive name match within subject)
    unit = Unit.query.filter(
        Unit.subject_id == subject.id,
        db.func.lower(Unit.name) == unit_name.lower()
    ).first()

    if not unit:
        order_idx = 1
        if "1" in unit_name: order_idx = 1
        elif "2" in unit_name: order_idx = 2
        elif "3" in unit_name: order_idx = 3
        elif "4" in unit_name: order_idx = 4
        elif "5" in unit_name: order_idx = 5
        else:
            max_ord = db.session.query(db.func.max(Unit.order_index)).filter_by(subject_id=subject.id).scalar() or 0
            order_idx = max_ord + 1

        unit = Unit(
            subject_id=subject.id,
            name=unit_name,
            order_index=order_idx,
            created_by=user.id
        )
        db.session.add(unit)
        db.session.commit()
        _log_notes_action(
            class_name=class_name,
            action="created_unit",
            target_type="unit",
            target_name=unit_name,
            performed_by=user.id,
            details={"subject_id": subject.id}
        )

    # 3. Process File Uploads
    allowed_extensions = {"pdf", "ppt", "pptx", "doc", "docx", "png", "jpg", "jpeg"}
    uploaded_files = []

    for file in files:
        if not file or not file.filename:
            continue

        ext = file.filename.split(".")[-1].lower() if "." in file.filename else ""
        if ext not in allowed_extensions:
            return jsonify({"error": f"File type .{ext} is not supported. Allowed types: PDF, PPT, PPTX, DOC, DOCX, PNG, JPG, JPEG"}), 400

        try:
            res = upload_file(file, folder=f"dpms/notes/{class_name}")
            if res:
                unit_file = UnitFile(
                    unit_id=unit.id,
                    file_name=res.get("name") or file.filename,
                    file_url=res["url"],
                    file_type=ext,
                    file_size=0,
                    cloudinary_public_id=res.get("public_id"),
                    uploaded_by=user.id
                )
                db.session.add(unit_file)
                db.session.commit()
                uploaded_files.append(_serialize_file(unit_file))

                _log_notes_action(
                    class_name=class_name,
                    action="uploaded_file",
                    target_type="file",
                    target_name=unit_file.file_name,
                    performed_by=user.id,
                    details={"file_id": unit_file.id, "unit_id": unit.id, "subject_id": subject.id}
                )
        except Exception as e:
            db.session.rollback()
            return jsonify({"error": f"Upload failed for {file.filename}: {str(e)}"}), 500

    return jsonify({
        "message": "Notes uploaded successfully",
        "subject_id": subject.id,
        "unit_id": unit.id,
        "uploaded_files": uploaded_files
    })


@notes_bp.route("/notes/subjects/<int:subject_id>", methods=["DELETE"])
@require_auth
def delete_subject_direct(subject_id):
    user = g.current_user
    if user.role == UserRole.STUDENT:
        return jsonify({"error": "Students cannot delete subjects"}), 403

    subject = Subject.query.get_or_404(subject_id)
    if not _can_modify_resource(user, subject.class_name, subject.created_by):
        return jsonify({"error": "Unauthorized to delete this subject"}), 403

    for u in subject.units.all():
        for f in u.files.all():
            if f.cloudinary_public_id:
                try:
                    res_type = "raw" if f.file_type.lower() in ["ppt", "pptx", "doc", "docx"] else "image"
                    delete_file(f.cloudinary_public_id, resource_type=res_type)
                except Exception as e:
                    print(f"Cloudinary file delete failed: {e}")

    class_name = subject.class_name
    subject_name = subject.name
    db.session.delete(subject)
    db.session.commit()

    _log_notes_action(
        class_name=class_name,
        action="deleted_subject",
        target_type="subject",
        target_name=subject_name,
        performed_by=user.id,
        details={"subject_id": subject_id}
    )

    return jsonify({"success": True, "message": f"Subject '{subject_name}' deleted successfully"})


@notes_bp.route("/notes/units/<int:unit_id>", methods=["DELETE"])
@require_auth
def delete_unit_direct(unit_id):
    user = g.current_user
    if user.role == UserRole.STUDENT:
        return jsonify({"error": "Students cannot delete units"}), 403

    unit = Unit.query.get_or_404(unit_id)
    class_name = unit.subject.class_name
    if not _can_modify_resource(user, class_name, unit.created_by):
        return jsonify({"error": "Unauthorized to delete this unit"}), 403

    for f in unit.files.all():
        if f.cloudinary_public_id:
            try:
                res_type = "raw" if f.file_type.lower() in ["ppt", "pptx", "doc", "docx"] else "image"
                delete_file(f.cloudinary_public_id, resource_type=res_type)
            except Exception as e:
                print(f"Cloudinary file delete failed: {e}")

    unit_name = unit.name
    db.session.delete(unit)
    db.session.commit()

    _log_notes_action(
        class_name=class_name,
        action="deleted_unit",
        target_type="unit",
        target_name=unit_name,
        performed_by=user.id,
        details={"unit_id": unit_id}
    )

    return jsonify({"success": True, "message": f"Unit '{unit_name}' deleted successfully"})


@notes_bp.route("/notes/files/<int:file_id>", methods=["DELETE"])
@require_auth
def delete_file_direct(file_id):
    user = g.current_user
    if user.role == UserRole.STUDENT:
        return jsonify({"error": "Students cannot delete files"}), 403

    unit_file = UnitFile.query.get_or_404(file_id)
    class_name = unit_file.unit.subject.class_name
    if not _can_modify_resource(user, class_name, unit_file.uploaded_by):
        return jsonify({"error": "Unauthorized to delete this file"}), 403

    if unit_file.cloudinary_public_id:
        try:
            res_type = "raw" if unit_file.file_type.lower() in ["ppt", "pptx", "doc", "docx"] else "image"
            delete_file(unit_file.cloudinary_public_id, resource_type=res_type)
        except Exception as e:
            print(f"Cloudinary delete failed: {e}")

    file_name = unit_file.file_name
    db.session.delete(unit_file)
    db.session.commit()

    _log_notes_action(
        class_name=class_name,
        action="deleted_file",
        target_type="file",
        target_name=file_name,
        performed_by=user.id,
        details={"file_id": file_id}
    )

    return jsonify({"success": True, "message": f"File '{file_name}' deleted successfully"})


# ─── Faculty Notes Hub — aggregated view across all handled classes ────────────

@notes_bp.route("/notes/faculty/my-classes-subjects", methods=["GET"])
@require_auth
def get_faculty_notes_hub():
    """
    Returns all subjects grouped by class → academic_year → semester for the
    logged-in faculty member. Only accessible by FACULTY role.
    Optionally filter by ?class_name=UG_3A, ?academic_year=2024-25, ?semester=1
    """
    user = g.current_user
    if user.role not in (UserRole.FACULTY, UserRole.HOD):
        return jsonify({"error": "Only faculty can access this endpoint"}), 403

    fp = user.faculty_profile
    if not fp and user.role == UserRole.FACULTY:
        return jsonify({"classes": []})

    # Build the list of classes this faculty member can access
    if user.role == UserRole.HOD:
        # HOD can see all classes — but this page is faculty-only in the UI
        handled_classes = []
        incharge_class = None
    else:
        handled_classes = list(fp.classes_handling or [])
        incharge_class = fp.class_incharge_of

    all_classes = list(set(handled_classes + ([incharge_class] if incharge_class else [])))
    all_classes.sort()

    # Optional filters from query params
    filter_class = request.args.get("class_name")
    filter_year = request.args.get("academic_year")
    filter_semester = request.args.get("semester", type=int)
    include_archived = request.args.get("archived", "false").lower() == "true"

    if filter_class and filter_class in all_classes:
        all_classes = [filter_class]
    elif filter_class:
        return jsonify({"error": "Access denied to this class"}), 403

    result = []
    for class_name in all_classes:
        q = Subject.query.filter_by(class_name=class_name, is_archived=include_archived)
        if filter_year:
            q = q.filter_by(academic_year=filter_year)
        if filter_semester:
            q = q.filter_by(semester=filter_semester)

        subjects = q.order_by(Subject.academic_year.desc(), Subject.semester, Subject.name).all()

        # Group by academic_year → semester
        grouped = {}
        for subj in subjects:
            yr = subj.academic_year
            sem = subj.semester
            if yr not in grouped:
                grouped[yr] = {}
            if sem not in grouped[yr]:
                grouped[yr][sem] = []
            grouped[yr][sem].append(_serialize_subject(subj))

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

    return jsonify({"classes": result})


# ─── Subjects routes ────────────────────────────────────────────────────────

@notes_bp.route("/<class_name>/notes/subjects", methods=["GET"])
@require_auth
def get_subjects(class_name):
    user = g.current_user
    if not _can_access_class(user, class_name):
        return jsonify({"error": "Access denied"}), 403

    archived = request.args.get("archived", "false").lower() == "true"
    semester = request.args.get("semester", type=int)

    q = Subject.query.filter_by(class_name=class_name, is_archived=archived)
    if semester in (1, 2):
        q = q.filter_by(semester=semester)
    subjects = q.order_by(Subject.academic_year.desc(), Subject.semester, Subject.created_at.desc()).all()
    return jsonify({"subjects": [_serialize_subject(s) for s in subjects]})

@notes_bp.route("/<class_name>/notes/subjects", methods=["POST"])
@require_auth
def create_subject(class_name):
    user = g.current_user
    if user.role == UserRole.STUDENT:
        return jsonify({"error": "Unauthorized"}), 403
    if not _can_access_class(user, class_name):
        return jsonify({"error": "Access denied"}), 403

    data = request.get_json() or {}
    name = data.get("name", "").strip()
    academic_year = data.get("academic_year", "").strip()
    semester = data.get("semester", 1)

    if not name or not academic_year:
        return jsonify({"error": "Subject name and Academic year are required"}), 400

    if semester not in (1, 2):
        return jsonify({"error": "Semester must be 1 or 2"}), 400

    # Duplicate check: same name, academic year, AND semester
    existing = Subject.query.filter_by(
        class_name=class_name, name=name, academic_year=academic_year, semester=semester
    ).first()
    if existing:
        return jsonify({"error": "Subject with the same name, academic year and semester already exists in this class"}), 400

    subject = Subject(
        class_name=class_name,
        name=name,
        academic_year=academic_year,
        semester=semester,
        created_by=user.id
    )
    db.session.add(subject)
    db.session.commit()

    _log_notes_action(
        class_name=class_name,
        action="created_subject",
        target_type="subject",
        target_name=name,
        performed_by=user.id,
        details={"academic_year": academic_year, "semester": semester, "subject_id": subject.id}
    )

    return jsonify({"subject": _serialize_subject(subject)})

@notes_bp.route("/<class_name>/notes/subjects/<int:subject_id>", methods=["PATCH"])
@require_auth
def edit_subject(class_name, subject_id):
    user = g.current_user
    subject = Subject.query.get_or_404(subject_id)

    if subject.class_name != class_name:
        return jsonify({"error": "Invalid subject or class"}), 400

    if not _can_modify_resource(user, class_name, subject.created_by):
        return jsonify({"error": "Unauthorized to modify this subject"}), 403

    data = request.get_json() or {}
    name = data.get("name", "").strip()
    academic_year = data.get("academic_year", "").strip()
    semester = data.get("semester")

    changes = {}

    if semester is not None:
        if semester not in (1, 2):
            return jsonify({"error": "Semester must be 1 or 2"}), 400
        changes["old_semester"] = subject.semester
        changes["new_semester"] = semester
        subject.semester = semester

    if name:
        current_year = academic_year or subject.academic_year
        current_sem = semester if semester is not None else subject.semester
        existing = Subject.query.filter(
            Subject.class_name == class_name,
            Subject.name == name,
            Subject.academic_year == current_year,
            Subject.semester == current_sem,
            Subject.id != subject_id
        ).first()
        if existing:
            return jsonify({"error": "Another subject with same name, academic year and semester exists"}), 400
        changes["old_name"] = subject.name
        changes["new_name"] = name
        subject.name = name

    if academic_year:
        current_name = name or subject.name
        current_sem = semester if semester is not None else subject.semester
        existing = Subject.query.filter(
            Subject.class_name == class_name,
            Subject.name == current_name,
            Subject.academic_year == academic_year,
            Subject.semester == current_sem,
            Subject.id != subject_id
        ).first()
        if existing:
            return jsonify({"error": "Another subject with same name, academic year and semester exists"}), 400
        changes["old_academic_year"] = subject.academic_year
        changes["new_academic_year"] = academic_year
        subject.academic_year = academic_year

    db.session.commit()

    _log_notes_action(
        class_name=class_name,
        action="edited_subject",
        target_type="subject",
        target_name=subject.name,
        performed_by=user.id,
        details={"subject_id": subject.id, "changes": changes}
    )

    return jsonify({"subject": _serialize_subject(subject)})

@notes_bp.route("/<class_name>/notes/subjects/<int:subject_id>", methods=["DELETE"])
@require_auth
def delete_subject(class_name, subject_id):
    user = g.current_user
    subject = Subject.query.get_or_404(subject_id)

    if subject.class_name != class_name:
        return jsonify({"error": "Invalid subject or class"}), 400

    if not _can_modify_resource(user, class_name, subject.created_by):
        return jsonify({"error": "Unauthorized to delete this subject"}), 403

    # Clean up Cloudinary files for all files in this subject's units
    for unit in subject.units.all():
        for f in unit.files.all():
            if f.cloudinary_public_id:
                try:
                    res_type = "raw" if f.file_type.lower() in ["ppt", "pptx", "doc", "docx"] else "image"
                    delete_file(f.cloudinary_public_id, resource_type=res_type)
                except Exception as e:
                    print(f"Failed to delete file from Cloudinary: {e}")

    subject_name = subject.name
    db.session.delete(subject)
    db.session.commit()

    _log_notes_action(
        class_name=class_name,
        action="deleted_subject",
        target_type="subject",
        target_name=subject_name,
        performed_by=user.id,
        details={"subject_id": subject_id}
    )

    return jsonify({"ok": True})

@notes_bp.route("/<class_name>/notes/subjects/<int:subject_id>/archive", methods=["POST"])
@require_auth
def archive_subject_route(class_name, subject_id):
    user = g.current_user
    subject = Subject.query.get_or_404(subject_id)

    if subject.class_name != class_name:
        return jsonify({"error": "Invalid subject or class"}), 400

    if not _can_modify_resource(user, class_name, subject.created_by):
        return jsonify({"error": "Unauthorized to archive this subject"}), 403

    subject.is_archived = True
    db.session.commit()

    _log_notes_action(
        class_name=class_name,
        action="archived_subject",
        target_type="subject",
        target_name=subject.name,
        performed_by=user.id,
        details={"subject_id": subject.id}
    )

    return jsonify({"subject": _serialize_subject(subject)})

@notes_bp.route("/<class_name>/notes/subjects/<int:subject_id>/unarchive", methods=["POST"])
@require_auth
def unarchive_subject_route(class_name, subject_id):
    user = g.current_user
    subject = Subject.query.get_or_404(subject_id)

    if subject.class_name != class_name:
        return jsonify({"error": "Invalid subject or class"}), 400

    if not _can_modify_resource(user, class_name, subject.created_by):
        return jsonify({"error": "Unauthorized to unarchive this subject"}), 403

    subject.is_archived = False
    db.session.commit()

    _log_notes_action(
        class_name=class_name,
        action="unarchived_subject",
        target_type="subject",
        target_name=subject.name,
        performed_by=user.id,
        details={"subject_id": subject.id}
    )

    return jsonify({"subject": _serialize_subject(subject)})


# ─── Units routes ──────────────────────────────────────────────────────────

@notes_bp.route("/<class_name>/notes/subjects/<int:subject_id>/units", methods=["GET"])
@require_auth
def get_units(class_name, subject_id):
    user = g.current_user
    if not _can_access_class(user, class_name):
        return jsonify({"error": "Access denied"}), 403

    subject = Subject.query.get_or_404(subject_id)
    if subject.class_name != class_name:
        return jsonify({"error": "Invalid subject or class"}), 400

    units = subject.units.all()
    return jsonify({"units": [_serialize_unit(u) for u in units]})

@notes_bp.route("/<class_name>/notes/subjects/<int:subject_id>/units", methods=["POST"])
@require_auth
def create_unit(class_name, subject_id):
    user = g.current_user
    if user.role == UserRole.STUDENT:
        return jsonify({"error": "Unauthorized"}), 403
    if not _can_access_class(user, class_name):
        return jsonify({"error": "Access denied"}), 403

    subject = Subject.query.get_or_404(subject_id)
    if subject.class_name != class_name:
        return jsonify({"error": "Invalid subject or class"}), 400

    data = request.get_json() or {}
    name = data.get("name", "").strip()

    if not name:
        return jsonify({"error": "Unit name is required"}), 400

    # Calculate order index
    max_order = db.session.query(db.func.max(Unit.order_index)).filter_by(subject_id=subject_id).scalar() or 0

    unit = Unit(
        subject_id=subject_id,
        name=name,
        order_index=max_order + 1,
        created_by=user.id
    )
    db.session.add(unit)
    db.session.commit()

    _log_notes_action(
        class_name=class_name,
        action="created_unit",
        target_type="unit",
        target_name=name,
        performed_by=user.id,
        details={"subject_id": subject_id, "subject_name": subject.name, "unit_id": unit.id}
    )

    return jsonify({"unit": _serialize_unit(unit)})

@notes_bp.route("/<class_name>/notes/subjects/<int:subject_id>/units/<int:unit_id>", methods=["PATCH"])
@require_auth
def edit_unit(class_name, subject_id, unit_id):
    user = g.current_user
    unit = Unit.query.get_or_404(unit_id)

    if unit.subject_id != subject_id or unit.subject.class_name != class_name:
        return jsonify({"error": "Invalid unit, subject or class"}), 400

    if not _can_modify_resource(user, class_name, unit.created_by):
        return jsonify({"error": "Unauthorized to modify this unit"}), 403

    data = request.get_json() or {}
    name = data.get("name", "").strip()

    if not name:
        return jsonify({"error": "Unit name is required"}), 400

    old_name = unit.name
    unit.name = name
    db.session.commit()

    _log_notes_action(
        class_name=class_name,
        action="edited_unit",
        target_type="unit",
        target_name=name,
        performed_by=user.id,
        details={"unit_id": unit_id, "old_name": old_name, "new_name": name, "subject_id": subject_id}
    )

    return jsonify({"unit": _serialize_unit(unit)})

@notes_bp.route("/<class_name>/notes/subjects/<int:subject_id>/units/<int:unit_id>", methods=["DELETE"])
@require_auth
def delete_unit(class_name, subject_id, unit_id):
    user = g.current_user
    unit = Unit.query.get_or_404(unit_id)

    if unit.subject_id != subject_id or unit.subject.class_name != class_name:
        return jsonify({"error": "Invalid unit, subject or class"}), 400

    if not _can_modify_resource(user, class_name, unit.created_by):
        return jsonify({"error": "Unauthorized to delete this unit"}), 403

    # Clean up Cloudinary files for this unit
    for f in unit.files.all():
        if f.cloudinary_public_id:
            try:
                res_type = "raw" if f.file_type.lower() in ["ppt", "pptx", "doc", "docx"] else "image"
                delete_file(f.cloudinary_public_id, resource_type=res_type)
            except Exception as e:
                print(f"Failed to delete file from Cloudinary: {e}")

    unit_name = unit.name
    db.session.delete(unit)
    db.session.commit()

    _log_notes_action(
        class_name=class_name,
        action="deleted_unit",
        target_type="unit",
        target_name=unit_name,
        performed_by=user.id,
        details={"unit_id": unit_id, "subject_id": subject_id}
    )

    return jsonify({"ok": True})


# ─── Files routes ──────────────────────────────────────────────────────────

@notes_bp.route("/<class_name>/notes/subjects/<int:subject_id>/units/<int:unit_id>/files", methods=["POST"])
@require_auth
def upload_unit_files(class_name, subject_id, unit_id):
    user = g.current_user
    if user.role == UserRole.STUDENT:
        return jsonify({"error": "Unauthorized"}), 403
    if not _can_access_class(user, class_name):
        return jsonify({"error": "Access denied"}), 403

    unit = Unit.query.get_or_404(unit_id)
    if unit.subject_id != subject_id or unit.subject.class_name != class_name:
        return jsonify({"error": "Invalid unit, subject or class"}), 400

    files = request.files.getlist("files")
    if not files:
        return jsonify({"error": "No files provided"}), 400

    uploaded_records = []
    for file in files:
        if not file or not file.filename:
            continue

        # Get extension
        ext = file.filename.split(".")[-1].lower() if "." in file.filename else ""
        if ext not in ["pdf", "ppt", "pptx", "doc", "docx"]:
            return jsonify({"error": f"Unsupported file type: .{ext}. Allowed: PDF, PPT, PPTX, DOC, DOCX"}), 400

        try:
            # Upload to Cloudinary under dpms/notes
            res = upload_file(file, folder="dpms/notes")
            if res:
                # Add to DB
                unit_file = UnitFile(
                    unit_id=unit_id,
                    file_name=res["name"],
                    file_url=res["url"],
                    file_type=ext,
                    file_size=0,
                    cloudinary_public_id=res["public_id"],
                    uploaded_by=user.id
                )
                db.session.add(unit_file)
                db.session.commit()
                uploaded_records.append(unit_file)

                # Log upload
                _log_notes_action(
                    class_name=class_name,
                    action="uploaded_file",
                    target_type="file",
                    target_name=res["name"],
                    performed_by=user.id,
                    details={"file_id": unit_file.id, "unit_id": unit_id, "subject_id": subject_id, "file_url": res["url"]}
                )
        except ValueError as e:
            return jsonify({"error": str(e)}), 400
        except Exception as e:
            return jsonify({"error": f"Upload failed: {str(e)}"}), 500

    return jsonify({"files": [_serialize_file(f) for f in uploaded_records]})

@notes_bp.route("/<class_name>/notes/subjects/<int:subject_id>/units/<int:unit_id>/files/<int:file_id>", methods=["DELETE"])
@require_auth
def delete_unit_file(class_name, subject_id, unit_id, file_id):
    user = g.current_user
    unit_file = UnitFile.query.get_or_404(file_id)

    if unit_file.unit_id != unit_id or unit_file.unit.subject_id != subject_id or unit_file.unit.subject.class_name != class_name:
        return jsonify({"error": "Invalid file, unit, subject or class"}), 400

    if not _can_modify_resource(user, class_name, unit_file.uploaded_by):
        return jsonify({"error": "Unauthorized to delete this file"}), 403

    # Delete from Cloudinary
    if unit_file.cloudinary_public_id:
        try:
            res_type = "raw" if unit_file.file_type.lower() in ["ppt", "pptx", "doc", "docx"] else "image"
            delete_file(unit_file.cloudinary_public_id, resource_type=res_type)
        except Exception as e:
            print(f"Failed to delete file from Cloudinary: {e}")

    file_name = unit_file.file_name
    db.session.delete(unit_file)
    db.session.commit()

    _log_notes_action(
        class_name=class_name,
        action="deleted_file",
        target_type="file",
        target_name=file_name,
        performed_by=user.id,
        details={"file_id": file_id, "unit_id": unit_id, "subject_id": subject_id}
    )

    return jsonify({"ok": True})


# ─── Activity Logs route ──────────────────────────────────────────────────

@notes_bp.route("/<class_name>/notes/logs", methods=["GET"])
@require_auth
def get_notes_logs(class_name):
    user = g.current_user
    if not _can_access_class(user, class_name):
        return jsonify({"error": "Access denied"}), 403

    page = request.args.get("page", 1, type=int)
    per_page = 20

    pagination = NotesLog.query.filter_by(class_name=class_name)\
        .order_by(NotesLog.created_at.desc())\
        .paginate(page=page, per_page=per_page, error_out=False)

    serialized_logs = []
    for log in pagination.items:
        details_parsed = None
        if log.details:
            try:
                details_parsed = json.loads(log.details)
            except Exception:
                details_parsed = log.details

        serialized_logs.append({
            "id": log.id,
            "action": log.action,
            "target_type": log.target_type,
            "target_name": log.target_name,
            "performed_by": {
                "id": log.performer.id,
                "name": log.performer.name,
                "role": log.performer.role.value
            },
            "details": details_parsed,
            "created_at": log.created_at.isoformat()
        })

    return jsonify({
        "logs": serialized_logs,
        "has_more": pagination.has_next,
        "total": pagination.total,
        "page": page,
        "pages": pagination.pages
    })
