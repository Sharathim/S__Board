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
                "user_id": m.student.user.id,
                "name": m.student.user.name,
                "profile_picture": m.student.user.profile_picture,
                "role": m.role,
                "class_name": m.student.class_name,
                "is_update_coordinator": m.is_update_coordinator,
            }
            for m in members
        ]
    })


@forum_bp.route("/eligible-students", methods=["GET"])
@require_hod
def eligible_students():
    """Students from forum-eligible classes (3A/3B) who are not yet forum
    members, optionally filtered by a search term. For the assign-member picker.
    """
    search = request.args.get("search", "").strip()
    query = (
        Student.query
        .join(User)
        .filter(Student.class_name.in_(FORUM_ELIGIBLE_CLASSES))
        .filter(Student.is_forum_member.is_(False))
    )
    if search:
        like = f"%{search}%"
        query = query.filter(db.or_(
            User.name.ilike(like),
            User.email.ilike(like),
            Student.roll_number.ilike(like),
            Student.register_number.ilike(like),
        ))
    students = query.order_by(User.name.asc()).limit(20).all()
    return jsonify({
        "students": [
            {
                "id": s.id,
                "name": s.user.name,
                "email": s.user.email,
                "profile_picture": s.user.profile_picture,
                "class_name": s.class_name,
                "roll_number": s.roll_number,
            }
            for s in students
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

    from ..utils.fcm_helper import send_notification
    send_notification(
        recipient_id=student.user_id,
        title="Added to the Forum",
        body=f"You have been assigned as a forum member ({role}).",
        notif_type="forum_assigned",
        reference_id=member.id,
    )

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
@require_auth
def list_posts():
    from ..models.forum_post import ForumPost
    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 10, type=int)

    query = ForumPost.query.filter_by(is_deleted=False)

    paginated = query.order_by(ForumPost.created_at.desc()).paginate(
        page=page, per_page=per_page, error_out=False
    )

    return jsonify({
        "posts": [_serialize_post(p, g.current_user) for p in paginated.items],
        "total": paginated.total,
        "pages": paginated.pages,
    })


@forum_bp.route("/posts", methods=["POST"])
@require_auth
def create_post():
    data = request.form if request.files else request.get_json()
    user = g.current_user

    # Check if forum member (strictly student forum member)
    is_forum_member = False
    if user.role == UserRole.STUDENT:
        student = user.student_profile
        if student and student.is_forum_member:
            is_forum_member = True

    if not is_forum_member:
        return jsonify({"error": "Only forum members can post"}), 403

    content = data.get("content", "").strip()
    files = request.files.getlist("attachment")
    attachments = []

    if files:
        for file in files:
            try:
                res = upload_file(file, folder="dpms/forum_posts")
                attachments.append(res)
            except ValueError as e:
                return jsonify({"error": str(e)}), 400

    attachment_urls = ",".join([a["url"] for a in attachments]) if attachments else None
    attachment_types = ",".join([a["type"] for a in attachments]) if attachments else None

    if not content and not attachment_urls:
        return jsonify({"error": "Content cannot be empty"}), 400

    from ..models.forum_post import ForumPost
    post = ForumPost(
        content=content,
        posted_by=user.id,
        attachment_url=attachment_urls,
        attachment_type=attachment_types,
    )
    db.session.add(post)
    db.session.commit()

    return jsonify({"post": _serialize_post(post, user)}), 201


@forum_bp.route("/posts/<int:post_id>", methods=["PATCH"])
@require_auth
def edit_post(post_id):
    from ..models.forum_post import ForumPost
    post = ForumPost.query.get_or_404(post_id)

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

    return jsonify({"post": _serialize_post(post, g.current_user)})


@forum_bp.route("/posts/<int:post_id>", methods=["DELETE"])
@require_auth
def delete_post(post_id):
    from ..models.forum_post import ForumPost
    post = ForumPost.query.get_or_404(post_id)
    if post.posted_by != g.current_user.id and g.current_user.role != UserRole.HOD:
        return jsonify({"error": "Cannot delete others' posts"}), 403
    if post.is_deleted:
        return jsonify({"error": "Already deleted"}), 400
    post.is_deleted = True
    post.content = None
    post.attachment_url = None
    db.session.commit()
    return jsonify({"ok": True})


@forum_bp.route("/posts/<int:post_id>/like", methods=["POST"])
@require_auth
def toggle_like(post_id):
    from ..models.forum_post import ForumPost, forum_post_likes
    ForumPost.query.get_or_404(post_id)

    existing = db.session.execute(
        forum_post_likes.select().where(
            forum_post_likes.c.post_id == post_id,
            forum_post_likes.c.user_id == g.current_user.id
        )
    ).first()

    if existing:
        db.session.execute(
            forum_post_likes.delete().where(
                forum_post_likes.c.post_id == post_id,
                forum_post_likes.c.user_id == g.current_user.id
            )
        )
        liked = False
    else:
        db.session.execute(
            forum_post_likes.insert().values(post_id=post_id, user_id=g.current_user.id)
        )
        liked = True

    db.session.commit()
    count = db.session.execute(
        db.text("SELECT COUNT(*) FROM forum_post_likes WHERE post_id = :pid"),
        {"pid": post_id}
    ).scalar()

    return jsonify({"liked": liked, "count": count})


def _serialize_post(p, current_user=None):
    from ..models.user import User
    from ..models.forum_post import forum_post_likes
    poster = User.query.get(p.posted_by) if p.posted_by else None
    liked = False
    if current_user is not None:
        liked = db.session.execute(
            forum_post_likes.select().where(
                forum_post_likes.c.post_id == p.id,
                forum_post_likes.c.user_id == current_user.id,
            )
        ).first() is not None
    return {
        "id": p.id,
        "content": p.content,
        "posted_by": {
            "id": p.posted_by,
            "name": poster.name if poster else "Unknown",
            "profile_picture": poster.profile_picture if poster else None,
        } if poster else {"id": p.posted_by, "name": "Unknown", "profile_picture": None},
        "is_deleted": p.is_deleted,
        "is_edited": p.is_edited,
        "attachment_url": p.attachment_url,
        "attachment_type": p.attachment_type,
        "created_at": p.created_at.isoformat(),
        "updated_at": p.updated_at.isoformat(),
        "like_count": p.likes.count() if hasattr(p, 'likes') else 0,
        "liked": liked,
    }
