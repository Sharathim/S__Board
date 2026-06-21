from ..extensions import db
from datetime import datetime
import secrets


class InviteLink(db.Model):
    __tablename__ = "invite_links"

    id = db.Column(db.Integer, primary_key=True)
    link_type = db.Column(db.String(20), nullable=False)
    class_name = db.Column(db.String(20), nullable=True)
    token = db.Column(db.String(64), unique=True, nullable=False, default=lambda: secrets.token_urlsafe(32))
    is_active = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
