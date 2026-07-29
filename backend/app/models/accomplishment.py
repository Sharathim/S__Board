from ..extensions import db
from datetime import datetime
import enum


class AccomplishmentCategory(enum.Enum):
    HACKATHON = "HACKATHON"
    COURSE_CERTIFICATION = "COURSE_CERTIFICATION"
    WORKSHOP = "WORKSHOP"
    SPORTS = "SPORTS"
    PAPER_PRESENTATION = "PAPER_PRESENTATION"
    VOLUNTEERING = "VOLUNTEERING"
    OTHER = "OTHER"


class Accomplishment(db.Model):
    __tablename__ = "accomplishments"

    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey("students.id", ondelete="CASCADE"), nullable=False)
    class_name = db.Column(db.String(20), nullable=False)  # denormalized for fast class-roster queries
    title = db.Column(db.String(255), nullable=False)
    category = db.Column(db.Enum(AccomplishmentCategory), default=AccomplishmentCategory.OTHER)
    organizer = db.Column(db.String(255))
    event_date = db.Column(db.DateTime, nullable=False)
    description = db.Column(db.Text)
    position_achieved = db.Column(db.String(100))
    certificate_url = db.Column(db.String(500))  # set via cloudinary_helper.upload_file
    cloudinary_public_id = db.Column(db.String(500), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    student = db.relationship("Student", backref=db.backref("accomplishments", cascade="all, delete-orphan"))
