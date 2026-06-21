from flask import Blueprint, request, jsonify, g
from ..extensions import db
from ..models.user import User, UserRole
from ..models.student import Student
from ..models.forum_member import ForumMember
from ..models import FORUM_ELIGIBLE_CLASSES
from ..utils.auth_middleware import require_auth, require_hod
from ..utils.cloudinary_helper import upload_file
from datetime import datetime, timedelta

forum_bp = Blueprint("forum", __name__)


@forum_bp.route("/members", methods=["GET"])
def list_members():
    members = ForumMember.query.filter_by(is_visible=True).join(Student).join(User).all()
    return jsonify({
        "members": [
            {
                "id": m.id,
                "name": m.student.user.name,
                "profile_picture": m.student.user.profile_picture,
                "role": m.role,
                "class_name": m.student.class_name,
                "is_update_coordinator": m.is_update_coordinator,
            }
            for m in members
        ]
    })


@forum_bp.route("/members", methods=["POST"])
@require_hod
def assign_member():
    data = request.get_json()
    student_id = data.get("student_id")
    role = data.get("role")

    if not student_id or not role:
        return jsonify({"error": "student_id and role required"}), 400

    student = Student.query.get_or_404(student_id)
    if student.class_name not in FORUM_ELIGIBLE_CLASSES:
        return jsonify({"error": "Forum members can only be from 3A or 3B"}), 400

    if ForumMember.query.filter_by(student_id=student_id).first():
        return jsonify({"error": "Already a forum member"}), 409

    member = ForumMember(student_id=student_id, role=role)
    student.is_forum_member = True
    db.session.add(member)
    db.session.commit()

    return jsonify({"member": {"id": member.id, "role": member.role}}), 201


@forum_bp.route("/members/<int:member_id>", methods=["DELETE"])
@require_hod
def remove_member(member_id):
    member = ForumMember.query.get_or_404(member_id)
    student = member.student
    student.is_forum_member = False
    db.session.delete(member)
    db.session.commit()
    return jsonify({"ok": True})


@forum_bp.route("/members/<int:member_id>/coordinator", methods=["POST"])
@require_hod
def toggle_coordinator(member_id):
    member = ForumMember.query.get_or_404(member_id)
    member.is_update_coordinator = not member.is_update_coordinator
    db.session.commit()
    return jsonify({"is_update_coordinator": member.is_update_coordinator})


# Forum Posts

@forum_bp.route("/posts", methods=["GET"])
def list_posts():
    from ..models.update import Update
    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 10, type=int)

    query = Update.query.filter_by(is_deleted=False)

    paginated = query.order_by(Update.created_at.desc()).paginate(
        page=page, per_page=per_page, error_out=False
    )

    return jsonify({
        "posts": [_serialize_post(p) for p in paginated.items],
        "total": paginated.total,
        "pages": paginated.pages,
    })


@forum_bp.route("/posts", methods=["POST"])
@require_auth
def create_post():
    data = request.form if request.files else request.get_json()
    user = g.current_user

    # Check if forum member
    if user.role == UserRole.STUDENT:
        student = user.student_profile
        if not student or not student.is_forum_member:
            return jsonify({"error": "Only forum members can post"}), 403
    elif user.role not in [UserRole.HOD, UserRole.FACULTY]:
        return jsonify({"error": "Only forum members can post"}), 403

    content = data.get("content", "").strip()
    file = request.files.get("attachment")
    attachment = None

    if file:
        try:
            attachment = upload_file(file, folder="dpms/forum_posts")
        except ValueError as e:
            return jsonify({"error": str(e)}), 400

    if not content and not attachment:
        return jsonify({"error": "Content cannot be empty"}), 400

    from ..models.update import Update
    post = Update(
        content=content,
        posted_by=user.id,
        attachment_url=attachment["url"] if attachment else None,
        attachment_type=attachment["type"] if attachment else None,
    )
    db.session.add(post)
    db.session.commit()

    return jsonify({"post": _serialize_post(post)}), 201


@forum_bp.route("/posts/<int:post_id>", methods=["PATCH"])
@require_auth
def edit_post(post_id):
    from ..models.update import Update
    post = Update.query.get_or_404(post_id)

    if post.posted_by != g.current_user.id:
        return jsonify({"error": "Cannot edit others' posts"}), 403

    if post.is_deleted:
        return jsonify({"error": "Cannot edit a deleted post"}), 400

    edit_window = timedelta(minutes=30)
    if datetime.utcnow() - post.created_at > edit_window:
        return jsonify({"error": "Edit window expired (30 minutes)"}), 400

    data = request.get_json()
    new_content = data.get("content", "").strip()
    if not new_content:
        return jsonify({"error": "Content cannot be empty"}), 400

    post.content = new_content
    post.is_edited = True
    post.updated_at = datetime.utcnow()
    db.session.commit()

    return jsonify({"post": _serialize_post(post)})


@forum_bp.route("/posts/<int:post_id>/like", methods=["POST"])
@require_auth
def toggle_like(post_id):
    from ..models.update import Update, update_likes
    post = Update.query.get_or_404(post_id)

    existing = db.session.execute(
        update_likes.select().where(
            update_likes.c.update_id == post_id,
            update_likes.c.user_id == g.current_user.id
        )
    ).first()

    if existing:
        db.session.execute(
            update_likes.delete().where(
                update_likes.c.update_id == post_id,
                update_likes.c.user_id == g.current_user.id
            )
        )
        liked = False
    else:
        db.session.execute(
            update_likes.insert().values(update_id=post_id, user_id=g.current_user.id)
        )
        liked = True

    db.session.commit()
    count = db.session.execute(
        db.text("SELECT COUNT(*) FROM update_likes WHERE update_id = :uid"),
        {"uid": post_id}
    ).scalar()

    return jsonify({"liked": liked, "count": count})


@forum_bp.route("/posts/<int:post_id>/visibility", methods=["PATCH"])
@require_hod
def toggle_visibility(post_id):
    from ..models.update import Update
    post = Update.query.get_or_404(post_id)
    # Not applicable for Update model directly, implement when needed
    return jsonify({"ok": True})


def _serialize_post(p):
    from ..models.user import User
    poster = User.query.get(p.posted_by) if p.posted_by else None
    return {
        "id": p.id,
        "content": p.content,
        "posted_by": {
            "id": p.posted_by,
            "name": poster.name if poster else "Unknown",
        } if poster else {"id": p.posted_by, "name": "Unknown"},
        "is_deleted": p.is_deleted,
        "is_edited": p.is_edited,
        "attachment_url": p.attachment_url,
        "attachment_type": p.attachment_type,
        "created_at": p.created_at.isoformat(),
        "updated_at": p.updated_at.isoformat(),
        "like_count": p.likes.count() if hasattr(p, 'likes') else 0,
    }
