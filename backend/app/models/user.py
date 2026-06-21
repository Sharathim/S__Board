from ..extensions import db
from datetime import datetime
import enum


class UserRole(enum.Enum):
    HOD = "HOD"
    FACULTY = "FACULTY"
    STUDENT = "STUDENT"


class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    firebase_uid = db.Column(db.String(128), unique=True, nullable=False, index=True)
    email = db.Column(db.String(255), unique=True, nullable=False, index=True)
    name = db.Column(db.String(255), nullable=False)
    profile_picture = db.Column(db.String(500))
    role = db.Column(db.Enum(UserRole), nullable=False)
    fcm_token = db.Column(db.String(500))
    push_enabled = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    faculty_profile = db.relationship("Faculty", backref="user", uselist=False, lazy="joined")
    student_profile = db.relationship("Student", backref="user", uselist=False, lazy="joined")
