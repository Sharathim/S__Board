from ..extensions import db
from datetime import datetime


def get_lab_room_for_class(class_name: str) -> int:
    """
    Deterministically assign lab room based on section letter.
    All A-section classes (UG_1A, UG_2A, UG_3A, PG_1A) → Lab 1
    All B-section classes (UG_1B, UG_2B, UG_3B, PG_2A... PG_2A ends in A but is PG year 2 A) → Lab 1
    Rule: class_name ends with 'A' → Lab 1 else Lab 2
    """
    return 1 if class_name.endswith("A") else 2


class ClassLabConfig(db.Model):
    """
    HOD-configurable lab settings per class, set before generating the timetable.
    Stores how many weekly lab-periods the class has in total.
    The lab room (1 or 2) is auto-determined from the class name (A→Lab1, B→Lab2).
    """
    __tablename__ = "class_lab_configs"

    id              = db.Column(db.Integer, primary_key=True)
    class_name      = db.Column(db.String(20), nullable=False, unique=True)
    weekly_lab_hours= db.Column(db.Integer, default=0, nullable=False)  # total lab periods per week
    notes           = db.Column(db.String(200), nullable=True)           # e.g. "RDBMS Lab + ASP Lab"
    created_at      = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at      = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    @property
    def lab_room(self):
        return get_lab_room_for_class(self.class_name)

    def to_dict(self):
        return {
            "id":               self.id,
            "class_name":       self.class_name,
            "weekly_lab_hours": self.weekly_lab_hours,
            "lab_room":         self.lab_room,
            "notes":            self.notes,
        }


class FacultySubjectMapping(db.Model):
    """
    HOD maps: for a given class, which faculty teaches which subject.
    E.g. class_name=UG_3B, subject_name=OS, faculty_id=<dharani_id>, weekly_hours=5
    """
    __tablename__ = "faculty_subject_mappings"

    id = db.Column(db.Integer, primary_key=True)
    class_name      = db.Column(db.String(20), nullable=False)          # e.g. UG_3B
    faculty_id      = db.Column(db.Integer, db.ForeignKey("faculty.id", ondelete="CASCADE"), nullable=True)
    subject_name    = db.Column(db.String(100), nullable=False)          # e.g. Operating Systems
    subject_code    = db.Column(db.String(20), nullable=False)           # e.g. OS
    subject_type    = db.Column(db.String(10), nullable=False, default="theory")  # "theory" | "lab"
    weekly_hours    = db.Column(db.Integer, nullable=False, default=5)   # theory periods per week
    lab_block_size  = db.Column(db.Integer, nullable=True)               # 2 or 3 for labs, null for theory
    created_at      = db.Column(db.DateTime, default=datetime.utcnow)

    faculty = db.relationship("Faculty", backref=db.backref("subject_mappings", lazy=True))

    def to_dict(self):
        return {
            "id":             self.id,
            "class_name":     self.class_name,
            "faculty_id":     self.faculty_id,
            "faculty_name":   self.faculty.user.name if self.faculty and self.faculty.user else None,
            "subject_name":   self.subject_name,
            "subject_code":   self.subject_code,
            "subject_type":   self.subject_type,
            "weekly_hours":   self.weekly_hours,
            "lab_block_size": self.lab_block_size,
        }


class TimetableEntry(db.Model):
    """
    One cell in the timetable grid.
    day: 1–6 (Mon–Sat), period: 1–5 (Hour 1–5)
    For lab blocks, the "anchor" entry has lab_span = block size (2 or 3),
    and consecutive sibling periods are stored as separate entries with is_lab_continuation=True.
    """
    __tablename__ = "timetable_entries"

    id               = db.Column(db.Integer, primary_key=True)
    class_name       = db.Column(db.String(20), nullable=False)
    day              = db.Column(db.Integer, nullable=False)   # 1=Mon, 6=Sat
    period           = db.Column(db.Integer, nullable=False)   # 1..5
    subject_name     = db.Column(db.String(100), nullable=False)
    subject_code     = db.Column(db.String(20), nullable=False)
    subject_type     = db.Column(db.String(10), nullable=False, default="theory")
    faculty_id       = db.Column(db.Integer, db.ForeignKey("faculty.id", ondelete="SET NULL"), nullable=True)
    mapping_id       = db.Column(db.Integer, db.ForeignKey("faculty_subject_mappings.id", ondelete="SET NULL"), nullable=True)
    # Lab block fields
    is_lab_anchor        = db.Column(db.Boolean, default=False)   # True only on first period of a lab block
    is_lab_continuation  = db.Column(db.Boolean, default=False)   # True on 2nd/3rd period of lab block
    lab_anchor_id        = db.Column(db.Integer, db.ForeignKey("timetable_entries.id", ondelete="SET NULL"), nullable=True)
    lab_span             = db.Column(db.Integer, nullable=True)    # 2 or 3 on anchor entry
    # Status
    is_cancelled     = db.Column(db.Boolean, default=False)
    cancel_reason    = db.Column(db.String(200), nullable=True)
    created_at       = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at       = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    faculty = db.relationship("Faculty", backref=db.backref("timetable_entries", lazy=True))

    __table_args__ = (
        db.UniqueConstraint("class_name", "day", "period", name="uq_timetable_slot"),
    )

    def to_dict(self):
        return {
            "id":                   self.id,
            "class_name":           self.class_name,
            "day":                  self.day,
            "period":               self.period,
            "subject_name":         self.subject_name,
            "subject_code":         self.subject_code,
            "subject_type":         self.subject_type,
            "faculty_id":           self.faculty_id,
            "faculty_name":         self.faculty.user.name if self.faculty and self.faculty.user else None,
            "mapping_id":           self.mapping_id,
            "is_lab_anchor":        self.is_lab_anchor,
            "is_lab_continuation":  self.is_lab_continuation,
            "lab_anchor_id":        self.lab_anchor_id,
            "lab_span":             self.lab_span,
            "is_cancelled":         self.is_cancelled,
            "cancel_reason":        self.cancel_reason,
        }
