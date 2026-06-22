from flask import Blueprint, request, jsonify, g
from ..extensions import db
from ..models.user import User, UserRole
from ..models.student import Student
from ..models.faculty import Faculty
from ..models.invite import InviteLink
from ..utils.auth_middleware import require_auth, require_hod
from ..utils.fcm_helper import send_notification

classes_bp = Blueprint("classes", __name__)

CLASSES = ["UG_1A", "UG_1B", "UG_2A", "UG_2B", "UG_3A", "UG_3B", "PG_1A", "PG_2A"]


# ─── Helpers ─────────────────────────────────────────────────────────────

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


def _get_or_create_global_student_invite():
    """Return the single global student registration InviteLink."""
    invite = InviteLink.query.filter_by(link_type="student", class_name=None).first()
    if not invite:
        invite = InviteLink(link_type="student", class_name=None)
        db.session.add(invite)
        db.session.commit()
    return invite


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


# ─── List Classes ────────────────────────────────────────────────────────

@classes_bp.route("/", methods=["GET"])
@require_auth
def list_classes():
    user = g.current_user
    global_invite = _get_or_create_global_student_invite()
    result = []
    for cls in CLASSES:
        incharge = Faculty.query.filter_by(class_incharge_of=cls).join(User).first()
        student_count = Student.query.filter_by(class_name=cls).count()

        entry = {
            "class_name": cls,
            "student_count": student_count,
            "incharge": {
                "name": incharge.user.name,
                "id": incharge.id,
            } if incharge else None,
            "can_view_details": _can_view_class(user, cls),
        }
        if cls in ["UG_3A", "UG_3B"]:
            from ..models.forum_member import ForumMember
            fm_count = ForumMember.query.join(Student).filter(Student.class_name == cls).count()
            entry["forum_member_count"] = fm_count
        result.append(entry)

    return jsonify({
        "classes": result,
        "student_registration_open": global_invite.is_active,
    })


# ─── Global Student Registration Toggle ──────────────────────────────────

@classes_bp.route("/student-registration", methods=["GET"])
@require_auth
def get_student_registration():
    invite = _get_or_create_global_student_invite()
    return jsonify({"is_active": invite.is_active})


@classes_bp.route("/student-registration/toggle", methods=["POST"])
@require_hod
def toggle_student_registration():
    invite = _get_or_create_global_student_invite()
    invite.is_active = not invite.is_active
    db.session.commit()
    return jsonify({"is_active": invite.is_active})


# ─── Students ────────────────────────────────────────────────────────────

@classes_bp.route("/<class_name>/students", methods=["GET"])
@require_auth
def list_students(class_name):
    if class_name not in CLASSES:
        return jsonify({"error": "Invalid class"}), 400
    if not _can_view_class(g.current_user, class_name):
        return jsonify({"error": "Access denied"}), 403

    students = Student.query.filter_by(class_name=class_name).join(User).all()
    return jsonify({"students": [_serialize_student(s) for s in students]})


@classes_bp.route("/<class_name>/students/<int:student_id>", methods=["DELETE"])
@require_auth
def remove_student(class_name, student_id):
    if class_name not in CLASSES:
        return jsonify({"error": "Invalid class"}), 400

    user = g.current_user
    # HOD can remove any student; a faculty may remove students only from the
    # class they are incharge of.
    is_incharge = (
        user.role == UserRole.FACULTY
        and user.faculty_profile
        and user.faculty_profile.class_incharge_of == class_name
    )
    if user.role != UserRole.HOD and not is_incharge:
        return jsonify({"error": "Only the HOD or class incharge can remove students"}), 403

    student = Student.query.filter_by(id=student_id, class_name=class_name).first()
    if not student:
        return jsonify({"error": "Student not found in this class"}), 404

    # Clean up an associated forum-member record, then the user (cascade removes
    # the student profile).
    from ..models.forum_member import ForumMember
    fm = ForumMember.query.filter_by(student_id=student.id).first()
    if fm:
        db.session.delete(fm)

    user_to_delete = User.query.get(student.user_id)
    if user_to_delete:
        db.session.delete(user_to_delete)
    else:
        db.session.delete(student)
    db.session.commit()

    return jsonify({"ok": True})


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


# ─── Assign Class Incharge (from class perspective) ──────────────────────

@classes_bp.route("/<class_name>/assign-incharge", methods=["POST"])
@require_hod
def assign_class_incharge(class_name):
    if class_name not in CLASSES:
        return jsonify({"error": "Invalid class"}), 400

    data = request.get_json()
    faculty_id = data.get("faculty_id")
    if not faculty_id:
        return jsonify({"error": "faculty_id required"}), 400

    faculty = Faculty.query.get_or_404(faculty_id)

    # Clear this faculty's previous incharge assignment if switching classes
    if faculty.class_incharge_of and faculty.class_incharge_of != class_name:
        faculty.class_incharge_of = None

    # Clear any other faculty who was previously incharge of this class
    prev = Faculty.query.filter(
        Faculty.class_incharge_of == class_name,
        Faculty.id != faculty_id
    ).first()
    if prev:
        prev.class_incharge_of = None

    faculty.class_incharge_of = class_name
    db.session.commit()

    send_notification(
        recipient_id=faculty.user_id,
        title="Class Incharge Assigned",
        body=f"You have been assigned as class incharge for {class_name.replace('_', ' ')}",
        notif_type="class_incharge_assigned",
        reference_id=faculty_id,
    )
    return jsonify({"ok": True, "incharge": {"name": faculty.user.name, "id": faculty.id}})
