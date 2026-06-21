from flask import Blueprint, request, jsonify, g
from ..extensions import db
from ..models.user import User, UserRole
from ..models.student import Student
from ..models.faculty import Faculty
from ..models.invite import InviteLink
from ..utils.auth_middleware import require_auth, require_hod

classes_bp = Blueprint("classes", __name__)

CLASSES = ["UG_1A", "UG_1B", "UG_2A", "UG_2B", "UG_3A", "UG_3B", "PG_1A", "PG_2A"]


def _can_view_class(user, class_name):
    if user.role == UserRole.HOD:
        return True
    if user.role == UserRole.FACULTY:
        fp = user.faculty_profile
        if fp.class_incharge_of == class_name:
            return True
        if class_name in (fp.extra_class_access or []):
            return True
        return False
    if user.role == UserRole.STUDENT:
        return user.student_profile and user.student_profile.class_name == class_name
    return False


@classes_bp.route("/", methods=["GET"])
@require_auth
def list_classes():
    result = []
    for cls in CLASSES:
        incharge = Faculty.query.filter_by(class_incharge_of=cls).join(User).first()
        student_count = Student.query.filter_by(class_name=cls).count()
        invite = InviteLink.query.filter_by(link_type="student", class_name=cls).first()

        entry = {
            "class_name": cls,
            "student_count": student_count,
            "incharge": {
                "name": incharge.user.name,
                "id": incharge.id,
            } if incharge else None,
            "invite_active": invite.is_active if invite else False,
        }
        if cls in ["UG_3A", "UG_3B"]:
            from ..models.forum_member import ForumMember
            fm_count = ForumMember.query.join(Student).filter(Student.class_name == cls).count()
            entry["forum_member_count"] = fm_count
        result.append(entry)
    return jsonify({"classes": result})


@classes_bp.route("/<class_name>/students", methods=["GET"])
@require_auth
def list_students(class_name):
    if class_name not in CLASSES:
        return jsonify({"error": "Invalid class"}), 400
    if not _can_view_class(g.current_user, class_name):
        return jsonify({"error": "Access denied"}), 403

    students = Student.query.filter_by(class_name=class_name).join(User).all()
    return jsonify({"students": [_serialize_student(s) for s in students]})


@classes_bp.route("/<class_name>/invite", methods=["GET"])
@require_auth
def get_class_invite(class_name):
    if class_name not in CLASSES:
        return jsonify({"error": "Invalid class"}), 400
    user = g.current_user
    if user.role != UserRole.HOD:
        if not (user.role == UserRole.FACULTY and
                user.faculty_profile.class_incharge_of == class_name):
            return jsonify({"error": "Forbidden"}), 403

    invite = InviteLink.query.filter_by(link_type="student", class_name=class_name).first()
    if not invite:
        invite = InviteLink(link_type="student", class_name=class_name)
        db.session.add(invite)
        db.session.commit()
    return jsonify({"token": invite.token, "is_active": invite.is_active, "class_name": class_name})


@classes_bp.route("/<class_name>/invite/toggle", methods=["POST"])
@require_auth
def toggle_class_invite(class_name):
    user = g.current_user
    if user.role != UserRole.HOD:
        if not (user.role == UserRole.FACULTY and
                user.faculty_profile.class_incharge_of == class_name):
            return jsonify({"error": "Forbidden"}), 403

    invite = InviteLink.query.filter_by(link_type="student", class_name=class_name).first()
    if not invite:
        return jsonify({"error": "Not found"}), 404
    invite.is_active = not invite.is_active
    db.session.commit()
    return jsonify({"is_active": invite.is_active})


@classes_bp.route("/<class_name>/grant-access", methods=["POST"])
@require_auth
def grant_access(class_name):
    user = g.current_user
    if user.role != UserRole.HOD:
        if not (user.role == UserRole.FACULTY and
                user.faculty_profile.class_incharge_of == class_name):
            return jsonify({"error": "Forbidden"}), 403

    data = request.get_json()
    faculty_id = data.get("faculty_id")
    faculty = Faculty.query.get_or_404(faculty_id)

    access = list(faculty.extra_class_access or [])
    if class_name not in access:
        access.append(class_name)
        faculty.extra_class_access = access
        db.session.commit()
    return jsonify({"ok": True})


def _serialize_student(s):
    return {
        "id": s.id,
        "user_id": s.user_id,
        "name": s.user.name,
        "email": s.user.email,
        "profile_picture": s.user.profile_picture,
        "roll_number": s.roll_number,
        "register_number": s.register_number,
        "class_name": s.class_name,
        "is_forum_member": s.is_forum_member,
    }
