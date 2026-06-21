from flask import Blueprint, request, jsonify, g
from ..extensions import db
from ..models.notification import Notification
from ..utils.auth_middleware import require_auth

notifications_bp = Blueprint("notifications", __name__)


@notifications_bp.route("/", methods=["GET"])
@require_auth
def list_notifications():
    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 20, type=int)

    paginated = Notification.query.filter_by(
        recipient_id=g.current_user.id
    ).order_by(
        Notification.created_at.desc()
    ).paginate(page=page, per_page=per_page, error_out=False)

    return jsonify({
        "notifications": [
            {
                "id": n.id,
                "title": n.title,
                "body": n.body,
                "type": n.type,
                "reference_id": n.reference_id,
                "is_read": n.is_read,
                "created_at": n.created_at.isoformat(),
            }
            for n in paginated.items
        ],
        "total": paginated.total,
        "pages": paginated.pages,
        "page": page,
    })


@notifications_bp.route("/read-all", methods=["POST"])
@require_auth
def mark_all_read():
    Notification.query.filter_by(
        recipient_id=g.current_user.id,
        is_read=False
    ).update({"is_read": True})
    db.session.commit()
    return jsonify({"ok": True})


@notifications_bp.route("/<int:notif_id>/read", methods=["PATCH"])
@require_auth
def mark_read(notif_id):
    notif = Notification.query.filter_by(
        id=notif_id,
        recipient_id=g.current_user.id
    ).first_or_404()
    notif.is_read = True
    db.session.commit()
    return jsonify({"ok": True})


@notifications_bp.route("/unread-count", methods=["GET"])
@require_auth
def unread_count():
    count = Notification.query.filter_by(
        recipient_id=g.current_user.id,
        is_read=False
    ).count()
    return jsonify({"count": count})
