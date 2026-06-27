from flask import Blueprint, request, jsonify, g
from ..extensions import db
from ..models.user import User, UserRole
from ..models.update import Update, update_likes
from ..utils.auth_middleware import require_auth, require_hod, optional_user
from ..utils.cloudinary_helper import upload_file
from ..utils.fcm_helper import send_bulk_notification, send_notification
from datetime import datetime, timedelta

updates_bp = Blueprint("updates", __name__)

MAX_COORDINATORS = 2


def _optional_user():
    return optional_user()


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


def _serialize_update(u, current_user=None):
    liked = False
    if current_user is not None:
        liked = db.session.execute(
            update_likes.select().where(
                update_likes.c.update_id == u.id,
                update_likes.c.user_id == current_user.id,
            )
        ).first() is not None
    return {
        "id": u.id,
        "content": u.content,
        "posted_by": u.posted_by,
        "is_deleted": u.is_deleted,
        "is_edited": u.is_edited,
        "attachment_url": u.attachment_url,
        "attachment_type": u.attachment_type,
        "created_at": u.created_at.isoformat(),
        "updated_at": u.updated_at.isoformat(),
        "like_count": u.likes.count(),
        "liked": liked,
    }


@updates_bp.route("/", methods=["GET"])
def list_updates():
    # Public endpoint (used by the landing page) — but if a valid auth token is
    # present, resolve the user so we can include their per-update `liked` flag.
    current_user = _optional_user()

    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 10, type=int)

    query = Update.query.filter_by(is_deleted=False)
    paginated = query.order_by(Update.created_at.desc()).paginate(
        page=page, per_page=per_page, error_out=False
    )

    return jsonify({
        "updates": [_serialize_update(u, current_user) for u in paginated.items],
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
    files = request.files.getlist("attachment")
    attachments = []

    if files:
        for file in files:
            if not file or not file.filename:
                continue
            try:
                res = upload_file(file, folder="dpms/updates")
                attachments.append(res)
            except ValueError as e:
                return jsonify({"error": str(e)}), 400

    if not content:
        return jsonify({"error": "Content is required"}), 400

    attachment_urls = ",".join([a["url"] for a in attachments]) if attachments else None
    attachment_types = ",".join([a["type"] for a in attachments]) if attachments else None

    update = Update(
        content=content,
        posted_by=user.id,
        attachment_url=attachment_urls,
        attachment_type=attachment_types,
    )
    db.session.add(update)
    db.session.commit()

    # Notify every other user about the new department update.
    recipient_ids = [
        uid for (uid,) in db.session.query(User.id).filter(User.id != user.id).all()
    ]
    if recipient_ids:
        preview = (content[:80] + "…") if len(content) > 80 else content
        send_bulk_notification(
            recipient_ids=recipient_ids,
            title="New department update",
            body=preview or "A new update has been posted.",
            notif_type="new_update",
            reference_id=update.id,
        )

    return jsonify({"update": _serialize_update(update, user)}), 201


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

    return jsonify({"update": _serialize_update(update, g.current_user)})


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


# ─── Update Coordinators (max 2, from Faculty + Forum Members) ────────────

def _count_coordinators():
    from ..models.faculty import Faculty
    from ..models.forum_member import ForumMember
    fac = Faculty.query.filter_by(is_update_coordinator=True).count()
    fm = ForumMember.query.filter_by(is_update_coordinator=True).count()
    return fac + fm


@updates_bp.route("/coordinators", methods=["GET"])
@require_auth
def list_coordinators():
    from ..models.faculty import Faculty
    from ..models.forum_member import ForumMember
    result = []
    for f in Faculty.query.filter_by(is_update_coordinator=True).join(User).all():
        result.append({
            "kind": "faculty",
            "ref_id": f.id,
            "name": f.user.name,
            "profile_picture": f.user.profile_picture,
            "subtitle": f.designation or "Faculty",
        })
    for m in ForumMember.query.filter_by(is_update_coordinator=True).all():
        result.append({
            "kind": "forum_member",
            "ref_id": m.id,
            "name": m.student.user.name,
            "profile_picture": m.student.user.profile_picture,
            "subtitle": f"Forum · {m.role}",
        })
    return jsonify({"coordinators": result, "max": MAX_COORDINATORS})


@updates_bp.route("/coordinators/eligible", methods=["GET"])
@require_hod
def eligible_coordinators():
    """Faculty and forum members who are not yet update coordinators, filtered
    by an optional search term. For the assign-coordinator picker.
    """
    from ..models.faculty import Faculty
    from ..models.forum_member import ForumMember
    search = request.args.get("search", "").strip().lower()
    out = []
    for f in Faculty.query.filter_by(is_update_coordinator=False).join(User).all():
        name = f.user.name or ""
        if not search or search in name.lower() or search in (f.user.email or "").lower():
            out.append({
                "kind": "faculty",
                "ref_id": f.id,
                "name": name,
                "profile_picture": f.user.profile_picture,
                "subtitle": f.designation or "Faculty",
            })
    for m in ForumMember.query.filter_by(is_update_coordinator=False).all():
        name = m.student.user.name or ""
        if not search or search in name.lower():
            out.append({
                "kind": "forum_member",
                "ref_id": m.id,
                "name": name,
                "profile_picture": m.student.user.profile_picture,
                "subtitle": f"Forum · {m.role}",
            })
    return jsonify({"eligible": out[:20]})


@updates_bp.route("/coordinators", methods=["POST"])
@require_hod
def assign_coordinator():
    from ..models.faculty import Faculty
    from ..models.forum_member import ForumMember
    data = request.get_json() or {}
    kind = data.get("kind")
    ref_id = data.get("ref_id")
    if kind not in ("faculty", "forum_member") or not ref_id:
        return jsonify({"error": "kind (faculty/forum_member) and ref_id required"}), 400

    if _count_coordinators() >= MAX_COORDINATORS:
        return jsonify({"error": f"Maximum {MAX_COORDINATORS} update coordinators allowed."}), 400

    if kind == "faculty":
        entity = Faculty.query.get_or_404(ref_id)
        recipient_user_id = entity.user_id
    else:
        entity = ForumMember.query.get_or_404(ref_id)
        recipient_user_id = entity.student.user_id

    if entity.is_update_coordinator:
        return jsonify({"error": "Already an update coordinator"}), 409

    entity.is_update_coordinator = True
    db.session.commit()

    send_notification(
        recipient_id=recipient_user_id,
        title="You're an Update Coordinator",
        body="You can now post department updates.",
        notif_type="coordinator_assigned",
        reference_id=ref_id,
    )
    return jsonify({"ok": True})


@updates_bp.route("/coordinators", methods=["DELETE"])
@require_hod
def remove_coordinator():
    from ..models.faculty import Faculty
    from ..models.forum_member import ForumMember
    data = request.get_json() or {}
    kind = data.get("kind")
    ref_id = data.get("ref_id")
    if kind not in ("faculty", "forum_member") or not ref_id:
        return jsonify({"error": "kind (faculty/forum_member) and ref_id required"}), 400

    entity = (Faculty if kind == "faculty" else ForumMember).query.get_or_404(ref_id)
    entity.is_update_coordinator = False
    db.session.commit()
    return jsonify({"ok": True})
