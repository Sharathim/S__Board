from flask import Blueprint, request, jsonify, g
from ..extensions import db
from ..models.project import Project, ProjectStatus, project_members
from ..models.user import User, UserRole
from ..models.message import ProjectMessage
from ..utils.auth_middleware import require_auth, require_hod
from ..utils.cloudinary_helper import upload_file
from ..utils.fcm_helper import send_notification
from datetime import datetime, timedelta
from sqlalchemy import text

projects_bp = Blueprint("projects", __name__)


def _is_project_member(project, user):
    return user.role == UserRole.HOD or project.members.filter_by(id=user.id).count() > 0


def _serialize_project(project):
    members = db.session.execute(
        text("SELECT u.id, u.name, u.profile_picture, u.role, pm.role_in_project "
             "FROM users u JOIN project_members pm ON u.id = pm.user_id "
             "WHERE pm.project_id = :pid"),
        {"pid": project.id}
    ).fetchall()

    last_msg = project.messages.filter_by(is_deleted=False).order_by(
        ProjectMessage.created_at.desc()).first()

    return {
        "id": project.id,
        "name": project.name,
        "description": project.description,
        "status": project.status.value,
        "created_at": project.created_at.isoformat(),
        "updated_at": project.updated_at.isoformat(),
        "last_message_time": project.last_message_time().isoformat(),
        "members": [
            {
                "id": m.id,
                "name": m.name,
                "profile_picture": m.profile_picture,
                "role": m.role,
                "role_in_project": m.role_in_project,
            }
            for m in members
        ],
    }


@projects_bp.route("/", methods=["GET"])
@require_auth
def list_projects():
    user = g.current_user
    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 10, type=int)
    search = request.args.get("search", "")
    status_filter = request.args.get("status", "")

    if user.role == UserRole.HOD:
        query = Project.query
    else:
        query = Project.query.filter(
            Project.members.any(id=user.id)
        )

    if search:
        query = query.filter(Project.name.ilike(f"%{search}%"))
    if status_filter:
        try:
            query = query.filter(Project.status == ProjectStatus(status_filter))
        except ValueError:
            pass

    paginated = query.order_by(Project.updated_at.desc()).paginate(
        page=page, per_page=per_page, error_out=False
    )

    return jsonify({
        "projects": [_serialize_project(p) for p in paginated.items],
        "total": paginated.total,
        "pages": paginated.pages,
        "page": page,
    })


@projects_bp.route("/stats", methods=["GET"])
@require_auth
def project_stats():
    user = g.current_user
    if user.role == UserRole.HOD:
        total = Project.query.count()
        in_progress = Project.query.filter_by(status=ProjectStatus.IN_PROGRESS).count()
        completed = Project.query.filter_by(status=ProjectStatus.COMPLETED).count()
        low_activity = Project.query.filter_by(status=ProjectStatus.LOW_ACTIVITY).count()
        student_count = db.session.execute(
            text("SELECT COUNT(DISTINCT user_id) FROM project_members pm "
                 "JOIN users u ON u.id = pm.user_id WHERE u.role = 'STUDENT'")
        ).scalar()
    else:
        total = Project.query.filter(Project.members.any(id=user.id)).count()
        in_progress = Project.query.filter(
            Project.members.any(id=user.id),
            Project.status == ProjectStatus.IN_PROGRESS
        ).count()
        completed = Project.query.filter(
            Project.members.any(id=user.id),
            Project.status == ProjectStatus.COMPLETED
        ).count()
        low_activity = Project.query.filter(
            Project.members.any(id=user.id),
            Project.status == ProjectStatus.LOW_ACTIVITY
        ).count()
        student_count = db.session.execute(
            text("SELECT COUNT(DISTINCT pm.user_id) FROM project_members pm "
                 "JOIN users u ON u.id = pm.user_id "
                 "JOIN project_members pm2 ON pm2.project_id = pm.project_id "
                 "WHERE u.role = 'STUDENT' AND pm2.user_id = :uid"),
            {"uid": user.id}
        ).scalar()

    return jsonify({
        "total": total,
        "in_progress": in_progress,
        "completed": completed,
        "low_activity": low_activity,
        "student_count": student_count or 0,
    })


@projects_bp.route("/", methods=["POST"])
@require_hod
def create_project():
    data = request.get_json()
    name = data.get("name", "").strip()
    description = data.get("description", "").strip()
    members_data = data.get("members", [])

    if not name:
        return jsonify({"error": "Project name is required"}), 400
    if not members_data:
        return jsonify({"error": "At least one member is required"}), 400

    project = Project(name=name, description=description, created_by=g.current_user.id)
    db.session.add(project)
    db.session.flush()

    for m in members_data:
        db.session.execute(
            project_members.insert().values(
                project_id=project.id,
                user_id=m["user_id"],
                role_in_project=m["role_in_project"]
            )
        )

    db.session.commit()

    for m in members_data:
        send_notification(
            recipient_id=m["user_id"],
            title="Added to a project",
            body=f"You have been added to the project: {name}",
            notif_type="project_assigned",
            reference_id=project.id,
        )

    return jsonify({"project": _serialize_project(project)}), 201


@projects_bp.route("/<int:project_id>", methods=["GET"])
@require_auth
def get_project(project_id):
    project = Project.query.get_or_404(project_id)
    if not _is_project_member(project, g.current_user):
        return jsonify({"error": "Access denied"}), 403
    return jsonify({"project": _serialize_project(project)})


@projects_bp.route("/<int:project_id>/status", methods=["PATCH"])
@require_hod
def update_status(project_id):
    project = Project.query.get_or_404(project_id)
    data = request.get_json()
    status = data.get("status")
    try:
        project.status = ProjectStatus(status)
        db.session.commit()
    except ValueError:
        return jsonify({"error": "Invalid status"}), 400
    return jsonify({"status": project.status.value})


@projects_bp.route("/<int:project_id>/messages", methods=["GET"])
@require_auth
def get_messages(project_id):
    project = Project.query.get_or_404(project_id)
    if not _is_project_member(project, g.current_user):
        return jsonify({"error": "Access denied"}), 403

    page = request.args.get("page", 1, type=int)
    msgs = project.messages.order_by(ProjectMessage.created_at.asc()).paginate(
        page=page, per_page=50, error_out=False
    )

    return jsonify({
        "messages": [_serialize_message(m) for m in msgs.items],
        "total": msgs.total,
        "pages": msgs.pages,
    })


@projects_bp.route("/<int:project_id>/messages", methods=["POST"])
@require_auth
def post_message(project_id):
    project = Project.query.get_or_404(project_id)
    if not _is_project_member(project, g.current_user):
        return jsonify({"error": "Access denied"}), 403

    content = request.form.get("content", "").strip()
    file = request.files.get("attachment")
    attachment = None

    if file:
        try:
            attachment = upload_file(file, folder="dpms/progress_monitor")
        except ValueError as e:
            return jsonify({"error": str(e)}), 400

    if not content and not attachment:
        return jsonify({"error": "Message cannot be empty"}), 400

    msg = ProjectMessage(
        project_id=project_id,
        sender_id=g.current_user.id,
        content=content,
        attachment_url=attachment["url"] if attachment else None,
        attachment_type=attachment["type"] if attachment else None,
        attachment_name=attachment["name"] if attachment else None,
    )
    db.session.add(msg)
    project.updated_at = datetime.utcnow()
    if project.status == ProjectStatus.LOW_ACTIVITY:
        project.status = ProjectStatus.IN_PROGRESS
    db.session.commit()

    from ..extensions import socketio
    socketio.emit(f"new_message_{project_id}", _serialize_message(msg))

    return jsonify({"message": _serialize_message(msg)}), 201


@projects_bp.route("/<int:project_id>/messages/<int:message_id>", methods=["PATCH"])
@require_auth
def edit_message(project_id, message_id):
    msg = ProjectMessage.query.filter_by(id=message_id, project_id=project_id).first_or_404()

    if msg.sender_id != g.current_user.id:
        return jsonify({"error": "Cannot edit others' messages"}), 403
    if msg.is_deleted:
        return jsonify({"error": "Cannot edit a deleted message"}), 400

    edit_window = timedelta(minutes=30)
    if datetime.utcnow() - msg.created_at > edit_window:
        return jsonify({"error": "Edit window expired (30 minutes)"}), 400

    data = request.get_json()
    new_content = data.get("content", "").strip()
    if not new_content:
        return jsonify({"error": "Content cannot be empty"}), 400

    msg.content = new_content
    msg.is_edited = True
    msg.updated_at = datetime.utcnow()
    db.session.commit()

    from ..extensions import socketio
    socketio.emit(f"message_updated_{project_id}", _serialize_message(msg))

    return jsonify({"message": _serialize_message(msg)})


@projects_bp.route("/<int:project_id>/messages/<int:message_id>", methods=["DELETE"])
@require_auth
def delete_message(project_id, message_id):
    msg = ProjectMessage.query.filter_by(id=message_id, project_id=project_id).first_or_404()

    if msg.sender_id != g.current_user.id:
        return jsonify({"error": "Cannot delete others' messages"}), 403
    if msg.is_deleted:
        return jsonify({"error": "Already deleted"}), 400

    msg.is_deleted = True
    msg.content = None
    msg.attachment_url = None
    db.session.commit()

    from ..extensions import socketio
    socketio.emit(f"message_deleted_{project_id}", {"id": msg.id})

    return jsonify({"ok": True})


@projects_bp.route("/<int:project_id>", methods=["PUT"])
@require_hod
def update_project(project_id):
    project = Project.query.get_or_404(project_id)
    data = request.get_json() or {}
    name = data.get("name", "").strip()
    description = data.get("description", "").strip()
    members_data = data.get("members", [])

    if not name:
        return jsonify({"error": "Project name is required"}), 400
    if not members_data:
        return jsonify({"error": "At least one member is required"}), 400

    project.name = name
    project.description = description
    project.updated_at = datetime.utcnow()

    # Clear old members
    db.session.execute(
        project_members.delete().where(project_members.c.project_id == project.id)
    )

    # Add new members
    for m in members_data:
        db.session.execute(
            project_members.insert().values(
                project_id=project.id,
                user_id=m["user_id"],
                role_in_project=m["role_in_project"]
            )
        )

    db.session.commit()
    return jsonify({"project": _serialize_project(project)})


@projects_bp.route("/<int:project_id>", methods=["DELETE"])
@require_hod
def delete_project(project_id):
    project = Project.query.get_or_404(project_id)
    db.session.delete(project)
    db.session.commit()
    return jsonify({"ok": True})


def _serialize_message(msg):
    can_edit = (
        not msg.is_deleted and
        (datetime.utcnow() - msg.created_at) < timedelta(minutes=30)
    ) if msg.sender else False

    return {
        "id": msg.id,
        "project_id": msg.project_id,
        "sender": {
            "id": msg.sender.id,
            "name": msg.sender.name,
            "profile_picture": msg.sender.profile_picture,
            "role": msg.sender.role.value,
        } if msg.sender and not msg.is_deleted else None,
        "content": msg.content,
        "is_deleted": msg.is_deleted,
        "is_edited": msg.is_edited,
        "attachment_url": msg.attachment_url,
        "attachment_type": msg.attachment_type,
        "attachment_name": msg.attachment_name,
        "created_at": msg.created_at.isoformat(),
        "updated_at": msg.updated_at.isoformat(),
        "can_edit": can_edit,
    }
