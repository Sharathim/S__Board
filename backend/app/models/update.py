from ..extensions import db
from datetime import datetime

update_likes = db.Table(
    "update_likes",
    db.Column("update_id", db.Integer, db.ForeignKey("updates.id", ondelete="CASCADE")),
    db.Column("user_id", db.Integer, db.ForeignKey("users.id", ondelete="CASCADE")),
)


class Update(db.Model):
    __tablename__ = "updates"

    id = db.Column(db.Integer, primary_key=True)
    content = db.Column(db.Text, nullable=False)
    posted_by = db.Column(db.Integer, db.ForeignKey("users.id"))
    is_deleted = db.Column(db.Boolean, default=False)
    is_edited = db.Column(db.Boolean, default=False)
    attachment_url = db.Column(db.String(500), nullable=True)
    attachment_type = db.Column(db.String(50), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    likes = db.relationship("User", secondary=update_likes, lazy="dynamic")
