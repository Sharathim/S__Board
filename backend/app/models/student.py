from ..extensions import db
from datetime import datetime


class Student(db.Model):
    __tablename__ = "students"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), unique=True)
    roll_number = db.Column(db.String(20), nullable=False)
    register_number = db.Column(db.String(20), nullable=False, unique=True)
    class_name = db.Column(db.String(20), nullable=False)
    is_forum_member = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
