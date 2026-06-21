from firebase_admin import messaging
from ..models.notification import Notification
from ..models.user import User
from ..extensions import db


def send_notification(recipient_id: int, title: str, body: str,
                       notif_type: str, reference_id: int = None):
    """Create in-app notification and send push notification via FCM."""
    notif = Notification(
        recipient_id=recipient_id,
        title=title,
        body=body,
        type=notif_type,
        reference_id=reference_id,
    )
    db.session.add(notif)
    db.session.commit()

    user = User.query.get(recipient_id)
    if user and user.fcm_token and user.push_enabled:
        try:
            message = messaging.Message(
                notification=messaging.Notification(title=title, body=body),
                token=user.fcm_token,
                data={"type": notif_type, "reference_id": str(reference_id or "")},
            )
            messaging.send(message)
        except Exception:
            pass


def send_bulk_notification(recipient_ids: list, title: str, body: str,
                            notif_type: str, reference_id: int = None):
    for rid in recipient_ids:
        send_notification(rid, title, body, notif_type, reference_id)
