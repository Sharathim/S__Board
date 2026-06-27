from ..extensions import db
from datetime import datetime

# Likes for forum posts — separate from update_likes so forum and updates
# are fully independent features.
forum_post_likes = db.Table(
    "forum_post_likes",
    db.Column("post_id", db.Integer, db.ForeignKey("forum_posts.id", ondelete="CASCADE")),
    db.Column("user_id", db.Integer, db.ForeignKey("users.id", ondelete="CASCADE")),
)


class ForumPost(db.Model):
    __tablename__ = "forum_posts"

    id = db.Column(db.Integer, primary_key=True)
    content = db.Column(db.Text, nullable=True)  # nullable: image-only posts allowed
    posted_by = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    is_deleted = db.Column(db.Boolean, default=False)
    is_edited = db.Column(db.Boolean, default=False)
    attachment_url = db.Column(db.Text, nullable=True)  # Text: multiple URLs joined by commas
    attachment_type = db.Column(db.Text, nullable=True)  # Text: multiple types joined by commas
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    likes = db.relationship("User", secondary=forum_post_likes, lazy="dynamic")
