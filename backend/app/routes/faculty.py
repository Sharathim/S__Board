from flask import Blueprint, request, jsonify, g
from ..extensions import db
from ..models.user import User, UserRole
from ..models.faculty import Faculty
from ..models.invite import InviteLink
from ..utils.auth_middleware import require_auth, require_hod
from ..utils.fcm_helper import send_notification

faculty_bp = Blueprint("faculty", __name__)


@faculty_bp.route("/", methods=["GET"])
@require_auth
def list_faculty():
    faculties = Faculty.query.join(User).all()
    return jsonify({"faculty": [_serialize_faculty(f) for f in faculties]})


@faculty_bp.route("/<int:faculty_id>", methods=["PATCH"])
@require_auth
def update_faculty(faculty_id):
    faculty = Faculty.query.get_or_404(faculty_id)
    if g.current_user.role != UserRole.HOD and faculty.user_id != g.current_user.id:
        return jsonify({"error": "Forbidden"}), 403

    data = request.get_json()
    if "name" in data:
        faculty.user.name = data["name"]
    if "profile_picture" in data:
        faculty.user.profile_picture = data["profile_picture"]
    if "designation" in data:
        faculty.designation = data["designation"]
    if "classes_handling" in data and g.current_user.role != UserRole.HOD:
        faculty.classes_handling = data["classes_handling"]
    db.session.commit()
    return jsonify({"faculty": _serialize_faculty(faculty)})


@faculty_bp.route("/<int:faculty_id>/assign-incharge", methods=["POST"])
@require_hod
def assign_incharge(faculty_id):
    data = request.get_json()
    class_name = data.get("class_name")
    faculty = Faculty.query.get_or_404(faculty_id)

    if class_name is None or class_name == "":
        faculty.class_incharge_of = None
        db.session.commit()
        return jsonify({"ok": True})

    prev = Faculty.query.filter_by(class_incharge_of=class_name).first()
    if prev:
        prev.class_incharge_of = None

    faculty.class_incharge_of = class_name
    db.session.commit()

    send_notification(
        recipient_id=faculty.user_id,
        title="Class Incharge Assigned",
        body=f"You have been assigned as class incharge for {class_name}",
        notif_type="class_incharge_assigned",
        reference_id=faculty_id,
    )
    return jsonify({"ok": True})


@faculty_bp.route("/<int:faculty_id>/coordinator", methods=["POST"])
@require_hod
def toggle_coordinator(faculty_id):
    faculty = Faculty.query.get_or_404(faculty_id)
    faculty.is_update_coordinator = not faculty.is_update_coordinator
    db.session.commit()
    return jsonify({"is_update_coordinator": faculty.is_update_coordinator})


@faculty_bp.route("/<int:faculty_id>", methods=["DELETE"])
@require_hod
def delete_faculty(faculty_id):
    faculty = Faculty.query.get_or_404(faculty_id)
    user = faculty.user

    from ..models.project import Project
    Project.query.filter_by(created_by=user.id).update({Project.created_by: None})

    from ..models.update import Update
    Update.query.filter_by(posted_by=user.id).update({Update.posted_by: None})

    faculty.class_incharge_of = None

    db.session.delete(user)
    db.session.commit()
    return jsonify({"ok": True})


@faculty_bp.route("/invite", methods=["GET"])
@require_hod
def get_faculty_invite():
    invite = InviteLink.query.filter_by(link_type="faculty").first()
    if not invite:
        invite = InviteLink(link_type="faculty")
        db.session.add(invite)
        db.session.commit()
    return jsonify({"token": invite.token, "is_active": invite.is_active})


@faculty_bp.route("/invite/toggle", methods=["POST"])
@require_hod
def toggle_faculty_invite():
    invite = InviteLink.query.filter_by(link_type="faculty").first()
    if not invite:
        return jsonify({"error": "Invite not found"}), 404
    invite.is_active = not invite.is_active
    db.session.commit()
    return jsonify({"is_active": invite.is_active})


def _serialize_faculty(f):
    from ..models.project import project_members
    project_count = db.session.query(project_members).filter(project_members.c.user_id == f.user_id).count()
    return {
        "id": f.id,
        "user_id": f.user_id,
        "name": f.user.name,
        "email": f.user.email,
        "profile_picture": f.user.profile_picture,
        "designation": f.designation,
        "classes_handling": f.classes_handling,
        "class_incharge_of": f.class_incharge_of,
        "is_update_coordinator": f.is_update_coordinator,
        "project_count": project_count,
    }
