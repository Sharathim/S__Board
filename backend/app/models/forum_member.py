from ..extensions import db
from datetime import datetime


class ForumMember(db.Model):
    __tablename__ = "forum_members"

    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey("students.id", ondelete="CASCADE"), unique=True)
    role = db.Column(db.String(100), nullable=False)
    is_update_coordinator = db.Column(db.Boolean, default=False)
    is_visible = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    student = db.relationship("Student", backref="forum_profile", lazy="joined")
