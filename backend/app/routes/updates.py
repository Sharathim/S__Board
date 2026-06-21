from flask import Blueprint, request, jsonify, g
from ..extensions import db
from ..models.user import User, UserRole
from ..models.update import Update, update_likes
from ..utils.auth_middleware import require_auth
from ..utils.cloudinary_helper import upload_file
from datetime import datetime, timedelta

updates_bp = Blueprint("updates", __name__)


def _can_post_update(user):
    if user.role == UserRole.HOD:
        return True
    if user.role == UserRole.FACULTY and user.faculty_profile:
        return user.faculty_profile.is_update_coordinator
    if user.role == UserRole.STUDENT and user.student_profile:
        if user.student_profile.is_forum_member:
            from ..models.forum_member import ForumMember
            fm = ForumMember.query.filter_by(student_id=user.student_profile.id).first()
            if fm and fm.is_update_coordinator:
                return True
    return False


def _serialize_update(u):
    return {
        "id": u.id,
        "content": u.content,
        "is_deleted": u.is_deleted,
        "is_edited": u.is_edited,
        "attachment_url": u.attachment_url,
        "attachment_type": u.attachment_type,
        "created_at": u.created_at.isoformat(),
        "updated_at": u.updated_at.isoformat(),
        "like_count": u.likes.count(),
    }


@updates_bp.route("/", methods=["GET"])
def list_updates():
    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 10, type=int)

    query = Update.query.filter_by(is_deleted=False)
    paginated = query.order_by(Update.created_at.desc()).paginate(
        page=page, per_page=per_page, error_out=False
    )

    return jsonify({
        "updates": [_serialize_update(u) for u in paginated.items],
        "total": paginated.total,
        "pages": paginated.pages,
        "page": page,
    })


@updates_bp.route("/", methods=["POST"])
@require_auth
def create_update():
    user = g.current_user
    if not _can_post_update(user):
        return jsonify({"error": "Only update coordinators can post updates"}), 403

    content = request.form.get("content", "").strip()
    file = request.files.get("attachment")
    attachment = None

    if file:
        try:
            attachment = upload_file(file, folder="dpms/updates")
        except ValueError as e:
            return jsonify({"error": str(e)}), 400

    if not content:
        return jsonify({"error": "Content is required"}), 400

    update = Update(
        content=content,
        posted_by=user.id,
        attachment_url=attachment["url"] if attachment else None,
        attachment_type=attachment["type"] if attachment else None,
    )
    db.session.add(update)
    db.session.commit()

    return jsonify({"update": _serialize_update(update)}), 201


@updates_bp.route("/<int:update_id>", methods=["PATCH"])
@require_auth
def edit_update(update_id):
    update = Update.query.get_or_404(update_id)

    if update.posted_by != g.current_user.id:
        return jsonify({"error": "Cannot edit others' updates"}), 403
    if update.is_deleted:
        return jsonify({"error": "Cannot edit a deleted update"}), 400

    edit_window = timedelta(minutes=30)
    if datetime.utcnow() - update.created_at > edit_window:
        return jsonify({"error": "Edit window expired (30 minutes)"}), 400

    data = request.get_json()
    new_content = data.get("content", "").strip()
    if not new_content:
        return jsonify({"error": "Content cannot be empty"}), 400

    update.content = new_content
    update.is_edited = True
    update.updated_at = datetime.utcnow()
    db.session.commit()

    return jsonify({"update": _serialize_update(update)})


@updates_bp.route("/<int:update_id>", methods=["DELETE"])
@require_auth
def delete_update(update_id):
    update = Update.query.get_or_404(update_id)

    if update.posted_by != g.current_user.id:
        return jsonify({"error": "Cannot delete others' updates"}), 403
    if update.is_deleted:
        return jsonify({"error": "Already deleted"}), 400

    update.is_deleted = True
    update.content = None
    db.session.commit()

    return jsonify({"ok": True})


@updates_bp.route("/<int:update_id>/like", methods=["POST"])
@require_auth
def toggle_like(update_id):
    update = Update.query.get_or_404(update_id)

    existing = db.session.execute(
        update_likes.select().where(
            update_likes.c.update_id == update_id,
            update_likes.c.user_id == g.current_user.id
        )
    ).first()

    if existing:
        db.session.execute(
            update_likes.delete().where(
                update_likes.c.update_id == update_id,
                update_likes.c.user_id == g.current_user.id
            )
        )
        liked = False
    else:
        db.session.execute(
            update_likes.insert().values(update_id=update_id, user_id=g.current_user.id)
        )
        liked = True

    db.session.commit()
    count = db.session.execute(
        db.text("SELECT COUNT(*) FROM update_likes WHERE update_id = :uid"),
        {"uid": update_id}
    ).scalar()

    return jsonify({"liked": liked, "count": count})
