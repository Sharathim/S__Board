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

    # Relationships
    details = db.relationship("StudentDetail", backref="student", uselist=False, cascade="all, delete-orphan")

class StudentDetail(db.Model):
    __tablename__ = "student_details"

    student_id = db.Column(db.Integer, db.ForeignKey("students.id", ondelete="CASCADE"), primary_key=True)
    gender = db.Column(db.String(50))
    blood_group = db.Column(db.String(50))
    nationality = db.Column(db.String(100))
    religion = db.Column(db.String(100))
    community = db.Column(db.String(100))
    caste = db.Column(db.String(100))
    mobile_number = db.Column(db.String(20))
    communication_address = db.Column(db.Text)
    permanent_address = db.Column(db.Text)
    tenth_percentage = db.Column(db.String(20))
    twelfth_percentage = db.Column(db.String(20))
    admission_type = db.Column(db.String(50))  # counselling or management
    aadhar_number = db.Column(db.String(50))
    pan_number = db.Column(db.String(50))
    father_name = db.Column(db.String(255))
    father_occupation = db.Column(db.String(255))
    father_income = db.Column(db.String(100))
    father_mobile = db.Column(db.String(20))
    mother_name = db.Column(db.String(255))
    mother_occupation = db.Column(db.String(255))
    mother_income = db.Column(db.String(100))
    mother_mobile = db.Column(db.String(20))
    extra_details = db.Column(db.Text)  # JSON string for custom columns

    def get_extra_details(self):
        import json
        if not self.extra_details:
            return {}
        try:
            return json.loads(self.extra_details)
        except Exception:
            return {}

    def set_extra_details(self, data):
        import json
        self.extra_details = json.dumps(data)

class CustomForm(db.Model):
    __tablename__ = "custom_forms"

    id = db.Column(db.Integer, primary_key=True)
    class_name = db.Column(db.String(20), nullable=False)
    title = db.Column(db.String(255), nullable=False)
    form_type = db.Column(db.String(50), default="custom")  # custom, mark_analysis, internship
    destination = db.Column(db.String(50), default="separate_table")  # main_table, separate_table
    metadata_json = db.Column(db.Text)  # questions, selections, etc.
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    responses = db.relationship("FormResponse", backref="form", cascade="all, delete-orphan", lazy="dynamic")

    def get_metadata(self):
        import json
        if not self.metadata_json:
            return {}
        try:
            return json.loads(self.metadata_json)
        except Exception:
            return {}

    def set_metadata(self, data):
        import json
        self.metadata_json = json.dumps(data)

class FormResponse(db.Model):
    __tablename__ = "form_responses"

    id = db.Column(db.Integer, primary_key=True)
    form_id = db.Column(db.Integer, db.ForeignKey("custom_forms.id", ondelete="CASCADE"), nullable=False)
    student_id = db.Column(db.Integer, db.ForeignKey("students.id", ondelete="CASCADE"), nullable=False)
    answers_json = db.Column(db.Text)  # JSON answers
    attachment_url = db.Column(db.String(500))  # for internship files
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    student_rel = db.relationship("Student", backref=db.backref("form_responses", cascade="all, delete-orphan"))

    def get_answers(self):
        import json
        if not self.answers_json:
            return {}
        try:
            return json.loads(self.answers_json)
        except Exception:
            return {}

    def set_answers(self, data):
        import json
        self.answers_json = json.dumps(data)
