from flask import Blueprint, request, jsonify, g
from ..extensions import db
from ..models.project import Project, ProjectStatus, project_members
from ..models.user import User, UserRole
from ..models.message import ProjectMessage
from ..models.progress_comment import ProgressComment, CommentReaction
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

    creator = User.query.get(project.created_by) if project.created_by else None

    return {
        "id": project.id,
        "name": project.name,
        "description": project.description,
        "status": project.status.value,
        "created_at": project.created_at.isoformat(),
        "updated_at": project.updated_at.isoformat(),
        "last_message_time": project.last_message_time().isoformat(),
        "created_by": {
            "id": creator.id,
            "name": creator.name,
            "profile_picture": creator.profile_picture,
            "role": creator.role.value,
        } if creator else None,
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
        not_started = Project.query.filter_by(status=ProjectStatus.NOT_STARTED).count()
        in_progress = Project.query.filter_by(status=ProjectStatus.IN_PROGRESS).count()
        review = Project.query.filter_by(status=ProjectStatus.REVIEW).count()
        completed = Project.query.filter_by(status=ProjectStatus.COMPLETED).count()
        on_hold = Project.query.filter_by(status=ProjectStatus.ON_HOLD).count()
        cancelled = Project.query.filter_by(status=ProjectStatus.CANCELLED).count()
        low_activity = Project.query.filter_by(status=ProjectStatus.LOW_ACTIVITY).count()
        student_count = db.session.execute(
            text("SELECT COUNT(DISTINCT user_id) FROM project_members pm "
                 "JOIN users u ON u.id = pm.user_id WHERE u.role = 'STUDENT'")
        ).scalar()
    else:
        total = Project.query.filter(Project.members.any(id=user.id)).count()
        not_started = Project.query.filter(
            Project.members.any(id=user.id),
            Project.status == ProjectStatus.NOT_STARTED
        ).count()
        in_progress = Project.query.filter(
            Project.members.any(id=user.id),
            Project.status == ProjectStatus.IN_PROGRESS
        ).count()
        review = Project.query.filter(
            Project.members.any(id=user.id),
            Project.status == ProjectStatus.REVIEW
        ).count()
        completed = Project.query.filter(
            Project.members.any(id=user.id),
            Project.status == ProjectStatus.COMPLETED
        ).count()
        on_hold = Project.query.filter(
            Project.members.any(id=user.id),
            Project.status == ProjectStatus.ON_HOLD
        ).count()
        cancelled = Project.query.filter(
            Project.members.any(id=user.id),
            Project.status == ProjectStatus.CANCELLED
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
        "not_started": not_started,
        "in_progress": in_progress,
        "review": review,
        "completed": completed,
        "on_hold": on_hold,
        "cancelled": cancelled,
        "low_activity": low_activity,
        "student_count": student_count or 0,
    })


@projects_bp.route("/recent-activity", methods=["GET"])
@require_auth
def recent_activity():
    user = g.current_user
    limit = request.args.get("limit", 5, type=int)

    if user.role == UserRole.HOD:
        query = Project.query
    else:
        query = Project.query.filter(Project.members.any(id=user.id))

    projects = query.order_by(Project.updated_at.desc()).limit(limit).all()

    results = []
    for p in projects:
        last_msg = p.messages.filter_by(is_deleted=False).order_by(
            ProjectMessage.created_at.desc()
        ).first()
        results.append({
            "id": p.id,
            "name": p.name,
            "status": p.status.value,
            "updated_at": p.updated_at.isoformat(),
            "last_message": {
                "title": last_msg.title,
                "content": last_msg.content,
                "sender_name": last_msg.sender.name if last_msg.sender else "Unknown",
                "created_at": last_msg.created_at.isoformat(),
            } if last_msg else None,
        })

    return jsonify({"activities": results})


@projects_bp.route("/", methods=["POST"])
@require_auth
def create_project():
    user = g.current_user
    is_authorized = False
    if user.role == UserRole.HOD:
        is_authorized = True
    elif user.role == UserRole.STUDENT and user.student_profile:
        from ..models.forum_member import ForumMember
        fm = ForumMember.query.filter_by(student_id=user.student_profile.id).first()
        if fm and fm.role.lower() == "placement coordinator":
            is_authorized = True

    if not is_authorized:
        return jsonify({"error": "Unauthorized. Only HOD or Placement Coordinators can create projects."}), 403

    data = request.get_json()
    name = data.get("name", "").strip()
    description = data.get("description", "").strip()
    members_data = data.get("members", [])

    if not name:
        return jsonify({"error": "Project name is required"}), 400
    if not members_data:
        return jsonify({"error": "At least one member is required"}), 400

    status_val = data.get("status", "IN_PROGRESS")
    project = Project(name=name, description=description, created_by=g.current_user.id)
    try:
        project.status = ProjectStatus(status_val)
    except (ValueError, TypeError):
        project.status = ProjectStatus.IN_PROGRESS

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


@projects_bp.route("/<int:project_id>", methods=["PUT"])
@require_auth
def update_project(project_id):
    user = g.current_user
    project = Project.query.get_or_404(project_id)

    if user.role != UserRole.HOD and project.created_by != user.id:
        return jsonify({"error": "Unauthorized to edit this project"}), 403

    data = request.get_json() or {}
    name = data.get("name", "").strip()
    description = data.get("description", "").strip()
    members_data = data.get("members", None)
    status_val = data.get("status")

    if name:
        project.name = name
    if description is not None:
        project.description = description
    if status_val:
        try:
            project.status = ProjectStatus(status_val)
        except (ValueError, TypeError):
            pass

    if members_data is not None:
        db.session.execute(
            text("DELETE FROM project_members WHERE project_id = :pid"),
            {"pid": project.id}
        )
        for m in members_data:
            db.session.execute(
                project_members.insert().values(
                    project_id=project.id,
                    user_id=m["user_id"],
                    role_in_project=m["role_in_project"]
                )
            )

    project.updated_at = datetime.utcnow()
    db.session.commit()

    return jsonify({"project": _serialize_project(project)})


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
    user = g.current_user

    if not _is_project_member(project, user):
        return jsonify({"error": "Access denied"}), 403

    # Only STUDENT members can post progress updates.
    # HOD and Faculty should use the feedback/comment system instead.
    if user.role in (UserRole.HOD, UserRole.FACULTY):
        return jsonify({"error": "HOD and Faculty cannot post progress updates. Use the feedback system to comment on existing posts."}), 403

    title = request.form.get("title", "").strip()
    content = request.form.get("content", "").strip()
    files = request.files.getlist("attachments")
    # Support legacy single-file field too
    single_file = request.files.get("attachment")
    if single_file and single_file.filename:
        files = [single_file]

    attachment_urls = []
    attachment_types = []
    attachment_names = []

    for file in files:
        if not file or not file.filename:
            continue
        try:
            res = upload_file(file, folder="dpms/progress_monitor")
            attachment_urls.append(res["url"])
            attachment_types.append(res["type"])
            attachment_names.append(res.get("name", file.filename))
        except Exception as e:
            return jsonify({"error": f"Upload failed: {str(e)}"}), 400

    if not content and not attachment_urls:
        return jsonify({"error": "Progress update cannot be empty"}), 400

    msg = ProjectMessage(
        project_id=project_id,
        sender_id=user.id,
        title=title or None,
        content=content,
        attachment_url=",".join(attachment_urls) if attachment_urls else None,
        attachment_type=",".join(attachment_types) if attachment_types else None,
        attachment_name=",".join(attachment_names) if attachment_names else None,
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
    new_title = data.get("title", "").strip()
    new_content = data.get("content", "").strip()
    if not new_content and not new_title:
        return jsonify({"error": "Content cannot be empty"}), 400

    if new_title:
        msg.title = new_title
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


@projects_bp.route("/<int:project_id>", methods=["DELETE"])
@require_hod
def delete_project(project_id):
    project = Project.query.get_or_404(project_id)
    try:
        # Clear members association explicitly
        db.session.execute(
            text("DELETE FROM project_members WHERE project_id = :pid"),
            {"pid": project.id}
        )

        # Clear comment reactions for progress comments under project messages
        db.session.execute(
            text("DELETE FROM comment_reactions WHERE comment_id IN ("
                 "  SELECT pc.id FROM progress_comments pc"
                 "  JOIN project_messages pm ON pc.progress_post_id = pm.id"
                 "  WHERE pm.project_id = :pid"
                 ")"),
            {"pid": project.id}
        )

        # Clear progress comments
        db.session.execute(
            text("DELETE FROM progress_comments WHERE progress_post_id IN ("
                 "  SELECT pm.id FROM project_messages pm"
                 "  WHERE pm.project_id = :pid"
                 ")"),
            {"pid": project.id}
        )

        # Clear project messages
        db.session.execute(
            text("DELETE FROM project_messages WHERE project_id = :pid"),
            {"pid": project.id}
        )

        # Delete project itself
        db.session.delete(project)
        db.session.commit()
        return jsonify({"ok": True})
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500



def _serialize_comment(comment, current_user=None):
    """Serialize a ProgressComment with per-emoji reaction counts and user's own reactions."""
    # Aggregate reactions
    raw_reactions = db.session.execute(
        text("SELECT emoji, COUNT(*) as cnt FROM comment_reactions WHERE comment_id = :cid GROUP BY emoji"),
        {"cid": comment.id}
    ).fetchall()
    reaction_counts = {r.emoji: r.cnt for r in raw_reactions}

    user_reactions = []
    if current_user:
        user_reacted = db.session.execute(
            text("SELECT emoji FROM comment_reactions WHERE comment_id = :cid AND user_id = :uid"),
            {"cid": comment.id, "uid": current_user.id}
        ).fetchall()
        user_reactions = [r.emoji for r in user_reacted]

    return {
        "id": comment.id,
        "progress_post_id": comment.progress_post_id,
        "author": {
            "id": comment.author.id,
            "name": comment.author.name,
            "profile_picture": comment.author.profile_picture,
            "role": comment.author.role.value,
        } if comment.author and not comment.is_deleted else None,
        "content": comment.content if not comment.is_deleted else None,
        "is_deleted": comment.is_deleted,
        "reaction_counts": reaction_counts,
        "user_reactions": user_reactions,
        "created_at": comment.created_at.isoformat(),
        "updated_at": comment.updated_at.isoformat(),
    }


def _serialize_message(msg, current_user=None):
    can_edit = (
        not msg.is_deleted and
        msg.sender_id is not None and
        (datetime.utcnow() - msg.created_at) < timedelta(minutes=30)
    ) if msg.sender else False

    # Fetch comments for this progress post
    comments_raw = ProgressComment.query.filter_by(
        progress_post_id=msg.id, is_deleted=False
    ).order_by(ProgressComment.created_at.asc()).all()

    # Parse multi-attachment fields
    urls = msg.attachment_url.split(",") if msg.attachment_url else []
    types = msg.attachment_type.split(",") if msg.attachment_type else []
    names = msg.attachment_name.split(",") if msg.attachment_name else []
    attachments = [
        {"url": u, "type": t, "name": n}
        for u, t, n in zip(
            urls,
            types + [""] * max(0, len(urls) - len(types)),
            names + [""] * max(0, len(urls) - len(names))
        )
    ]

    return {
        "id": msg.id,
        "project_id": msg.project_id,
        "sender": {
            "id": msg.sender.id,
            "name": msg.sender.name,
            "profile_picture": msg.sender.profile_picture,
            "role": msg.sender.role.value,
        } if msg.sender and not msg.is_deleted else None,
        "title": msg.title,
        "content": msg.content,
        "is_deleted": msg.is_deleted,
        "is_edited": msg.is_edited,
        # Legacy single-file fields kept for backward compat
        "attachment_url": msg.attachment_url,
        "attachment_type": msg.attachment_type,
        "attachment_name": msg.attachment_name,
        # New multi-attachment list
        "attachments": attachments,
        "created_at": msg.created_at.isoformat(),
        "updated_at": msg.updated_at.isoformat(),
        "can_edit": can_edit,
        "comments": [_serialize_comment(c, current_user) for c in comments_raw],
    }


# ─── Progress Comment Routes ─────────────────────────────────────────────────

@projects_bp.route("/<int:project_id>/progress/<int:msg_id>/comments", methods=["POST"])
@require_auth
def post_progress_comment(project_id, msg_id):
    """HOD or Faculty member posts feedback on a student's progress update."""
    user = g.current_user
    project = Project.query.get_or_404(project_id)

    if not _is_project_member(project, user):
        return jsonify({"error": "Access denied"}), 403

    if user.role not in (UserRole.HOD, UserRole.FACULTY):
        return jsonify({"error": "Only HOD and Faculty can leave feedback on progress updates"}), 403

    msg = ProjectMessage.query.filter_by(id=msg_id, project_id=project_id, is_deleted=False).first_or_404()

    data = request.get_json() or {}
    content = data.get("content", "").strip()
    if not content:
        return jsonify({"error": "Feedback content cannot be empty"}), 400

    comment = ProgressComment(
        progress_post_id=msg_id,
        author_id=user.id,
        content=content,
    )
    db.session.add(comment)
    db.session.commit()

    from ..extensions import socketio
    socketio.emit(f"progress_comment_{project_id}", _serialize_comment(comment, user))

    return jsonify({"comment": _serialize_comment(comment, user)}), 201


@projects_bp.route("/<int:project_id>/progress/<int:msg_id>/comments/<int:comment_id>", methods=["DELETE"])
@require_auth
def delete_progress_comment(project_id, msg_id, comment_id):
    user = g.current_user
    project = Project.query.get_or_404(project_id)

    if not _is_project_member(project, user):
        return jsonify({"error": "Access denied"}), 403

    comment = ProgressComment.query.filter_by(id=comment_id, progress_post_id=msg_id).first_or_404()

    if comment.author_id != user.id and user.role != UserRole.HOD:
        return jsonify({"error": "Cannot delete others' feedback"}), 403

    comment.is_deleted = True
    db.session.commit()
    return jsonify({"ok": True})


@projects_bp.route("/<int:project_id>/progress/<int:msg_id>/comments/<int:comment_id>/react", methods=["POST"])
@require_auth
def react_to_comment(project_id, msg_id, comment_id):
    """Students can toggle an emoji reaction on a HOD/Faculty feedback comment."""
    user = g.current_user
    project = Project.query.get_or_404(project_id)

    if not _is_project_member(project, user):
        return jsonify({"error": "Access denied"}), 403

    if user.role not in (UserRole.STUDENT,):
        return jsonify({"error": "Only students can react to feedback comments"}), 403

    comment = ProgressComment.query.filter_by(id=comment_id, progress_post_id=msg_id, is_deleted=False).first_or_404()

    data = request.get_json() or {}
    emoji = data.get("emoji", "").strip()
    ALLOWED_EMOJIS = ["👍", "❤️", "🔥"]
    if emoji not in ALLOWED_EMOJIS:
        return jsonify({"error": f"Emoji must be one of: {', '.join(ALLOWED_EMOJIS)}"}), 400

    existing = db.session.execute(
        text("SELECT id FROM comment_reactions WHERE comment_id = :cid AND user_id = :uid AND emoji = :emoji"),
        {"cid": comment_id, "uid": user.id, "emoji": emoji}
    ).first()

    if existing:
        db.session.execute(
            text("DELETE FROM comment_reactions WHERE comment_id = :cid AND user_id = :uid AND emoji = :emoji"),
            {"cid": comment_id, "uid": user.id, "emoji": emoji}
        )
        reacted = False
    else:
        db.session.execute(
            text("INSERT INTO comment_reactions (comment_id, user_id, emoji, created_at) VALUES (:cid, :uid, :emoji, :now)"),
            {"cid": comment_id, "uid": user.id, "emoji": emoji, "now": datetime.utcnow()}
        )
        reacted = True

    db.session.commit()

    # Return updated counts
    raw = db.session.execute(
        text("SELECT emoji, COUNT(*) as cnt FROM comment_reactions WHERE comment_id = :cid GROUP BY emoji"),
        {"cid": comment_id}
    ).fetchall()
    reaction_counts = {r.emoji: r.cnt for r in raw}

    user_reactions = [r.emoji for r in db.session.execute(
        text("SELECT emoji FROM comment_reactions WHERE comment_id = :cid AND user_id = :uid"),
        {"cid": comment_id, "uid": user.id}
    ).fetchall()]

    from ..extensions import socketio
    socketio.emit(f"comment_reaction_{project_id}", {
        "comment_id": comment_id,
        "reaction_counts": reaction_counts,
        "user_reactions": user_reactions,
    })

    return jsonify({"reacted": reacted, "reaction_counts": reaction_counts, "user_reactions": user_reactions})
