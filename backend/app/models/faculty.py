from ..extensions import db
from datetime import datetime
from sqlalchemy.dialects.postgresql import ARRAY


class Faculty(db.Model):
    __tablename__ = "faculty"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), unique=True)
    designation = db.Column(db.String(100), default="Professor")
    classes_handling = db.Column(ARRAY(db.String), default=[])
    is_update_coordinator = db.Column(db.Boolean, default=False)
    class_incharge_of = db.Column(db.String(20), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    extra_class_access = db.Column(ARRAY(db.String), default=[])
