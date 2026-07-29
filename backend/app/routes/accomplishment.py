from flask import Blueprint, request, jsonify, g
from ..extensions import db
from ..models.user import User, UserRole
from ..models.student import Student
from ..models.project import Project, project_members
from ..models.accomplishment import Accomplishment, AccomplishmentCategory
from ..utils.auth_middleware import require_auth
from ..utils.cloudinary_helper import upload_file, delete_file
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

accomplishment_bp = Blueprint("accomplishment", __name__)


# ─── Permission Helpers ──────────────────────────────────────────────────

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


def _can_modify_resource(user, class_name, owner_student_id):
    if user.role == UserRole.HOD:
        return True
    if user.role == UserRole.FACULTY:
        return _is_class_incharge(user, class_name)
    if user.role == UserRole.STUDENT:
        return user.student_profile and user.student_profile.id == owner_student_id
    return False


def _serialize_accomplishment(acc):
    return {
        "id": acc.id,
        "student_id": acc.student_id,
        "student_name": acc.student.user.name if acc.student and acc.student.user else "Unknown",
        "student_roll": acc.student.roll_number if acc.student else "",
        "student_register": acc.student.register_number if acc.student else "",
        "class_name": acc.class_name,
        "title": acc.title,
        "category": acc.category.value if acc.category else "OTHER",
        "organizer": acc.organizer or "",
        "event_date": acc.event_date.isoformat() if acc.event_date else "",
        "description": acc.description or "",
        "position_achieved": acc.position_achieved or "",
        "certificate_url": acc.certificate_url or "",
        "created_at": acc.created_at.isoformat() if acc.created_at else "",
        "updated_at": acc.updated_at.isoformat() if acc.updated_at else "",
    }


# ─── Routes ──────────────────────────────────────────────────────────────

@accomplishment_bp.route("/<class_name>/accomplishments", methods=["GET"])
@require_auth
def list_accomplishments(class_name):
    user = g.current_user
    if not _can_access_class(user, class_name):
        return jsonify({"error": "Access denied"}), 403

    student_id = request.args.get("student_id", type=int)

    query = Accomplishment.query.filter_by(class_name=class_name)
    if student_id:
        query = query.filter_by(student_id=student_id)

    accomplishments = query.order_by(Accomplishment.event_date.desc()).all()
    return jsonify([_serialize_accomplishment(a) for a in accomplishments])


@accomplishment_bp.route("/<class_name>/accomplishments", methods=["POST"])
@require_auth
def create_accomplishment(class_name):
    user = g.current_user
    if user.role != UserRole.STUDENT or not user.student_profile:
        return jsonify({"error": "Only registered students can add accomplishments"}), 403

    student = user.student_profile
    if student.class_name != class_name:
        return jsonify({"error": "Cannot add accomplishment for another class"}), 403

    # Handle multipart form data or json
    if request.content_type and "multipart/form-data" in request.content_type:
        title = request.form.get("title")
        category_str = request.form.get("category", "OTHER")
        organizer = request.form.get("organizer", "")
        event_date_str = request.form.get("event_date")
        description = request.form.get("description", "")
        position_achieved = request.form.get("position_achieved", "")
        file = request.files.get("certificate")
    else:
        data = request.get_json() or {}
        title = data.get("title")
        category_str = data.get("category", "OTHER")
        organizer = data.get("organizer", "")
        event_date_str = data.get("event_date")
        description = data.get("description", "")
        position_achieved = data.get("position_achieved", "")
        file = None

    if not title or not event_date_str:
        return jsonify({"error": "Title and event_date are required"}), 400

    try:
        event_date = datetime.fromisoformat(event_date_str.replace("Z", "+00:00"))
    except ValueError:
        try:
            event_date = datetime.strptime(event_date_str, "%Y-%m-%d")
        except ValueError:
            return jsonify({"error": "Invalid event_date format"}), 400

    category_enum = AccomplishmentCategory.OTHER
    try:
        category_enum = AccomplishmentCategory[category_str.upper()]
    except KeyError:
        pass

    certificate_url = ""
    cloudinary_public_id = None
    if file:
        try:
            upload_res = upload_file(file, folder="accomplishments")
            if upload_res:
                certificate_url = upload_res.get("url", "")
                cloudinary_public_id = upload_res.get("public_id")
        except Exception as e:
            logger.error("Failed to upload accomplishment certificate: %s", e)
            return jsonify({"error": f"Certificate upload failed: {str(e)}"}), 500

    accomplishment = Accomplishment(
        student_id=student.id,
        class_name=class_name,
        title=title,
        category=category_enum,
        organizer=organizer,
        event_date=event_date,
        description=description,
        position_achieved=position_achieved,
        certificate_url=certificate_url,
        cloudinary_public_id=cloudinary_public_id
    )

    db.session.add(accomplishment)
    db.session.commit()

    return jsonify(_serialize_accomplishment(accomplishment)), 201


@accomplishment_bp.route("/accomplishments/<int:acc_id>", methods=["PUT"])
@require_auth
def update_accomplishment(acc_id):
    user = g.current_user
    acc = Accomplishment.query.get_or_404(acc_id)

    if not _can_modify_resource(user, acc.class_name, acc.student_id):
        return jsonify({"error": "Access denied"}), 403

    if request.content_type and "multipart/form-data" in request.content_type:
        title = request.form.get("title", acc.title)
        category_str = request.form.get("category", acc.category.value if acc.category else "OTHER")
        organizer = request.form.get("organizer", acc.organizer)
        event_date_str = request.form.get("event_date")
        description = request.form.get("description", acc.description)
        position_achieved = request.form.get("position_achieved", acc.position_achieved)
        file = request.files.get("certificate")
    else:
        data = request.get_json() or {}
        title = data.get("title", acc.title)
        category_str = data.get("category", acc.category.value if acc.category else "OTHER")
        organizer = data.get("organizer", acc.organizer)
        event_date_str = data.get("event_date")
        description = data.get("description", acc.description)
        position_achieved = data.get("position_achieved", acc.position_achieved)
        file = None

    if event_date_str:
        try:
            acc.event_date = datetime.fromisoformat(event_date_str.replace("Z", "+00:00"))
        except ValueError:
            try:
                acc.event_date = datetime.strptime(event_date_str, "%Y-%m-%d")
            except ValueError:
                pass

    acc.title = title
    acc.organizer = organizer
    acc.description = description
    acc.position_achieved = position_achieved

    try:
        acc.category = AccomplishmentCategory[category_str.upper()]
    except KeyError:
        pass

    if file:
        try:
            if acc.cloudinary_public_id:
                try:
                    delete_file(acc.cloudinary_public_id)
                except Exception:
                    pass
            upload_res = upload_file(file, folder="accomplishments")
            if upload_res:
                acc.certificate_url = upload_res.get("url", "")
                acc.cloudinary_public_id = upload_res.get("public_id")
        except Exception as e:
            logger.error("Failed to upload new certificate: %s", e)

    acc.updated_at = datetime.utcnow()
    db.session.commit()

    return jsonify(_serialize_accomplishment(acc))


@accomplishment_bp.route("/accomplishments/<int:acc_id>", methods=["DELETE"])
@require_auth
def delete_accomplishment(acc_id):
    user = g.current_user
    acc = Accomplishment.query.get_or_404(acc_id)

    if not _can_modify_resource(user, acc.class_name, acc.student_id):
        return jsonify({"error": "Access denied"}), 403

    if acc.cloudinary_public_id:
        try:
            delete_file(acc.cloudinary_public_id)
        except Exception as e:
            logger.warning("Failed to delete Cloudinary asset for accomplishment %s: %s", acc_id, e)

    db.session.delete(acc)
    db.session.commit()

    return jsonify({"message": "Accomplishment deleted successfully"})


@accomplishment_bp.route("/students/<int:student_id>/resume-data", methods=["GET"])
@require_auth
def get_resume_data(student_id):
    user = g.current_user
    student = Student.query.get_or_404(student_id)

    if not _can_access_class(user, student.class_name):
        return jsonify({"error": "Access denied"}), 403

    # Profile Data
    details = student.details
    profile_data = {
        "student_id": student.id,
        "name": student.user.name if student.user else "Student",
        "email": student.user.email if student.user else "",
        "register_number": student.register_number,
        "roll_number": student.roll_number,
        "class_name": student.class_name,
        "mobile_number": details.mobile_number if details else "",
        "communication_address": details.communication_address if details else "",
    }

    # Accomplishments Data
    accomplishments = (
        Accomplishment.query.filter_by(student_id=student.id)
        .order_by(Accomplishment.event_date.desc())
        .all()
    )
    accomplishment_list = [_serialize_accomplishment(a) for a in accomplishments]

    # Projects Data (joined through project_members)
    user_id = student.user_id
    projects = []
    if user_id:
        user_projects = (
            Project.query.join(project_members)
            .filter(project_members.c.user_id == user_id)
            .all()
        )
        for p in user_projects:
            projects.append({
                "id": p.id,
                "name": p.name,
                "description": p.description or "",
                "status": p.status.value if p.status else "IN_PROGRESS",
                "created_at": p.created_at.isoformat() if p.created_at else ""
            })

    return jsonify({
        "profile": profile_data,
        "accomplishments": accomplishment_list,
        "projects": projects
    })
