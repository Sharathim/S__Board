from ..extensions import db
from datetime import datetime
import enum
import json


class ScanStatus(enum.Enum):
    PENDING = "PENDING"
    PROCESSING = "PROCESSING"
    COMPLETE = "COMPLETE"
    FAILED = "FAILED"


class JobRole(db.Model):
    """Target career roles students can evaluate against, e.g. Full-Stack Developer."""
    __tablename__ = "job_roles"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), unique=True, nullable=False)
    description = db.Column(db.Text)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    required_skills = db.relationship("JobRoleSkill", backref="role", cascade="all, delete-orphan", lazy="joined")

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "is_active": self.is_active,
            "skills": [s.skill_name for s in self.required_skills],
            "required_skills": [
                {
                    "id": s.id,
                    "skill_name": s.skill_name,
                    "weight": s.weight,
                    "is_core": s.is_core
                } for s in self.required_skills
            ]
        }


class JobRoleSkill(db.Model):
    """The skill taxonomy for a role used for structured AI match score calculations."""
    __tablename__ = "job_role_skills"

    id = db.Column(db.Integer, primary_key=True)
    role_id = db.Column(db.Integer, db.ForeignKey("job_roles.id", ondelete="CASCADE"), nullable=False)
    skill_name = db.Column(db.String(100), nullable=False)
    weight = db.Column(db.Integer, default=1)
    is_core = db.Column(db.Boolean, default=True)


class ResumeScan(db.Model):
    """AI evaluation run: a student's resume evaluated against a target role."""
    __tablename__ = "resume_scans"

    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey("students.id", ondelete="CASCADE"), nullable=False)
    role_id = db.Column(db.Integer, db.ForeignKey("job_roles.id"), nullable=False)

    resume_url = db.Column(db.String(500), nullable=False)
    resume_public_id = db.Column(db.String(255))
    resume_text_hash = db.Column(db.String(64), index=True)

    status = db.Column(db.Enum(ScanStatus), default=ScanStatus.PENDING)
    match_score = db.Column(db.Integer)
    matched_skills_json = db.Column(db.Text)
    missing_skills_json = db.Column(db.Text)
    action_plan_json = db.Column(db.Text)
    ai_raw_response = db.Column(db.Text)
    error_message = db.Column(db.Text)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    completed_at = db.Column(db.DateTime)

    student = db.relationship("Student", backref=db.backref("resume_scans", cascade="all, delete-orphan", lazy="dynamic"))
    role = db.relationship("JobRole")

    def get_matched_skills(self):
        return json.loads(self.matched_skills_json) if self.matched_skills_json else []

    def get_missing_skills(self):
        return json.loads(self.missing_skills_json) if self.missing_skills_json else []

    def get_action_plan(self):
        return json.loads(self.action_plan_json) if self.action_plan_json else {}

    def to_dict(self):
        return {
            "id": self.id,
            "student_id": self.student_id,
            "student_name": self.student.user.name if self.student and self.student.user else None,
            "roll_number": self.student.roll_number if self.student else None,
            "class_name": self.student.class_name if self.student else None,
            "role_id": self.role_id,
            "role_name": self.role.name if self.role else None,
            "resume_url": self.resume_url,
            "status": self.status.value,
            "match_score": self.match_score,
            "matched_skills": self.get_matched_skills(),
            "missing_skills": self.get_missing_skills(),
            "action_plan": self.get_action_plan(),
            "error_message": self.error_message,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
        }


class CompanyCriteria(db.Model):
    """HOD-defined eligibility thresholds per target company/drive."""
    __tablename__ = "company_criteria"

    id = db.Column(db.Integer, primary_key=True)
    company_name = db.Column(db.String(120), nullable=False)
    role_id = db.Column(db.Integer, db.ForeignKey("job_roles.id"), nullable=False)
    min_match_score = db.Column(db.Integer, default=70)
    min_cgpa = db.Column(db.String(10))
    required_skills_json = db.Column(db.Text)
    created_by = db.Column(db.Integer, db.ForeignKey("users.id"))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    role = db.relationship("JobRole")

    def get_required_skills(self):
        return json.loads(self.required_skills_json) if self.required_skills_json else []

    def to_dict(self):
        return {
            "id": self.id,
            "company_name": self.company_name,
            "role_id": self.role_id,
            "role_name": self.role.name if self.role else None,
            "min_match_score": self.min_match_score,
            "min_cgpa": self.min_cgpa,
            "required_skills": self.get_required_skills(),
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class LearningAssignment(db.Model):
    """Faculty assignment of courses/workshops to close class-wide or student skill gaps."""
    __tablename__ = "learning_assignments"

    id = db.Column(db.Integer, primary_key=True)
    assigned_by = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    class_name = db.Column(db.String(20))
    student_id = db.Column(db.Integer, db.ForeignKey("students.id", ondelete="CASCADE"))
    skill_name = db.Column(db.String(100), nullable=False)
    resource_title = db.Column(db.String(255), nullable=False)
    resource_url = db.Column(db.String(500))
    resource_type = db.Column(db.String(50), default="course")
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    assigner = db.relationship("User")

    def to_dict(self):
        return {
            "id": self.id,
            "assigned_by": self.assigned_by,
            "assigner_name": self.assigner.name if self.assigner else "Faculty",
            "class_name": self.class_name,
            "student_id": self.student_id,
            "skill_name": self.skill_name,
            "resource_title": self.resource_title,
            "resource_url": self.resource_url,
            "resource_type": self.resource_type,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
