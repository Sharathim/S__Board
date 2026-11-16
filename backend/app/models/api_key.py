from ..extensions import db
from datetime import datetime


class ApiKey(db.Model):
    __tablename__ = "api_keys"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    key_hash = db.Column(db.String(128), unique=True, nullable=False, index=True)
    key_prefix = db.Column(db.String(32), nullable=False)
    name = db.Column(db.String(100), nullable=False)
    scope = db.Column(db.String(50), default="notes", nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    last_used_at = db.Column(db.DateTime, nullable=True)
    is_active = db.Column(db.Boolean, default=True, nullable=False)

    user = db.relationship("User", backref=db.backref("api_keys", cascade="all, delete-orphan", lazy="dynamic"))

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "key_prefix": self.key_prefix,
            "scope": self.scope,
            "created_at": self.created_at.isoformat() + "Z" if self.created_at else None,
            "last_used_at": self.last_used_at.isoformat() + "Z" if self.last_used_at else None,
            "is_active": self.is_active,
            "user_email": self.user.email if self.user else None,
        }
