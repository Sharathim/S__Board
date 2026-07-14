from ..extensions import db
from datetime import datetime


class ProgressComment(db.Model):
    """Feedback left by HOD or Faculty on a student's progress post."""
    __tablename__ = "progress_comments"

    id = db.Column(db.Integer, primary_key=True)
    progress_post_id = db.Column(
        db.Integer,
        db.ForeignKey("project_messages.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    author_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    content = db.Column(db.Text, nullable=False)
    is_deleted = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    author = db.relationship("User", foreign_keys=[author_id], lazy="joined")
    reactions = db.relationship(
        "CommentReaction", backref="comment", lazy="dynamic", cascade="all, delete-orphan"
    )


class CommentReaction(db.Model):
    """Emoji reaction by a student on a HOD/Faculty feedback comment."""
    __tablename__ = "comment_reactions"

    id = db.Column(db.Integer, primary_key=True)
    comment_id = db.Column(
        db.Integer,
        db.ForeignKey("progress_comments.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    user_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    emoji = db.Column(db.String(10), nullable=False)  # e.g. "👍", "❤️", "🔥"
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    __table_args__ = (
        db.UniqueConstraint("comment_id", "user_id", "emoji", name="uq_comment_reaction"),
    )
