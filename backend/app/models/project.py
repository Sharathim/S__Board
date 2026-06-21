from ..extensions import db
from datetime import datetime
import enum


class ProjectStatus(enum.Enum):
    IN_PROGRESS = "IN_PROGRESS"
    LOW_ACTIVITY = "LOW_ACTIVITY"
    COMPLETED = "COMPLETED"


project_members = db.Table(
    "project_members",
    db.Column("project_id", db.Integer, db.ForeignKey("projects.id", ondelete="CASCADE")),
    db.Column("user_id", db.Integer, db.ForeignKey("users.id", ondelete="CASCADE")),
    db.Column("role_in_project", db.String(20)),
)


class Project(db.Model):
    __tablename__ = "projects"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text, nullable=True)
    status = db.Column(db.Enum(ProjectStatus), default=ProjectStatus.IN_PROGRESS)
    created_by = db.Column(db.Integer, db.ForeignKey("users.id"))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    members = db.relationship("User", secondary=project_members, backref="projects", lazy="dynamic")
    messages = db.relationship("ProjectMessage", backref="project", lazy="dynamic",
                               cascade="all, delete-orphan")

    def last_message_time(self):
        from ..models.message import ProjectMessage
        last = self.messages.order_by(ProjectMessage.created_at.desc()).first()
        return last.created_at if last else self.created_at
