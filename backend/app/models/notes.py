from ..extensions import db
from datetime import datetime


class Subject(db.Model):
    __tablename__ = "subjects"

    id = db.Column(db.Integer, primary_key=True)
    class_name = db.Column(db.String(20), nullable=False, index=True)
    name = db.Column(db.String(200), nullable=False)
    academic_year = db.Column(db.String(20), nullable=False)
    semester = db.Column(db.Integer, nullable=False, default=1)  # 1 or 2
    is_archived = db.Column(db.Boolean, default=False)
    created_by = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    units = db.relationship("Unit", backref="subject", lazy="dynamic",
                            cascade="all, delete-orphan", order_by="Unit.order_index")
    creator = db.relationship("User", foreign_keys=[created_by], lazy="joined")


class Unit(db.Model):
    __tablename__ = "units"

    id = db.Column(db.Integer, primary_key=True)
    subject_id = db.Column(db.Integer, db.ForeignKey("subjects.id", ondelete="CASCADE"), nullable=False)
    name = db.Column(db.String(200), nullable=False)
    order_index = db.Column(db.Integer, default=0)
    created_by = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    files = db.relationship("UnitFile", backref="unit", lazy="dynamic",
                            cascade="all, delete-orphan", order_by="UnitFile.created_at")
    creator = db.relationship("User", foreign_keys=[created_by], lazy="joined")


class UnitFile(db.Model):
    __tablename__ = "unit_files"

    id = db.Column(db.Integer, primary_key=True)
    unit_id = db.Column(db.Integer, db.ForeignKey("units.id", ondelete="CASCADE"), nullable=False)
    file_name = db.Column(db.String(500), nullable=False)
    file_url = db.Column(db.Text, nullable=False)
    file_type = db.Column(db.String(20), nullable=False)  # pdf, ppt, pptx, doc, docx
    file_size = db.Column(db.Integer, default=0)  # bytes
    cloudinary_public_id = db.Column(db.String(500), nullable=True)
    uploaded_by = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    uploader = db.relationship("User", foreign_keys=[uploaded_by], lazy="joined")


class NotesLog(db.Model):
    __tablename__ = "notes_logs"

    id = db.Column(db.Integer, primary_key=True)
    class_name = db.Column(db.String(20), nullable=False, index=True)
    action = db.Column(db.String(50), nullable=False)
    target_type = db.Column(db.String(20), nullable=False)  # subject, unit, file
    target_name = db.Column(db.String(500), nullable=False)
    performed_by = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    details = db.Column(db.Text, nullable=True)  # JSON string for extra info
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    performer = db.relationship("User", foreign_keys=[performed_by], lazy="joined")
