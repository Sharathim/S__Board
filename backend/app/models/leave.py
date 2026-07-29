from ..extensions import db
from datetime import datetime, date
import enum
from sqlalchemy.dialects.postgresql import ARRAY


class LeaveType(enum.Enum):
    CASUAL = "CASUAL"          # CL
    MEDICAL = "MEDICAL"        # ML
    ON_DUTY = "ON_DUTY"        # OD
    PERMISSION = "PERMISSION"  # short leave, specific periods
    COMP_OFF = "COMP_OFF"


class LeaveStatus(enum.Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    CANCELLED = "CANCELLED"    # cancelled by faculty (only while PENDING/APPROVED) or by HOD after approval


class LeaveDuration(enum.Enum):
    FULL_DAY = "FULL_DAY"
    HALF_DAY_FIRST = "HALF_DAY_FIRST"       # periods 1-2 (first half)
    HALF_DAY_SECOND = "HALF_DAY_SECOND"     # periods 3-5 (second half)
    PERMISSION_HOURS = "PERMISSION_HOURS"   # specific periods, see period_numbers


# Default yearly entitlements — used to seed LeaveBalance rows for a faculty/year.
# ON_DUTY is effectively unlimited (tracked for reporting), COMP_OFF starts at 0 (earned only).
DEFAULT_ANNUAL_ENTITLEMENT = {
    LeaveType.CASUAL: 12,
    LeaveType.MEDICAL: 12,
    LeaveType.ON_DUTY: 999,
    LeaveType.COMP_OFF: 0,
    LeaveType.PERMISSION: 3,   # reference only — enforcement is monthly via check_permission_quota
}


class DepartmentLeaveSettings(db.Model):
    """
    HOD-configurable default leave and permission settings for the department.
    """
    __tablename__ = "department_leave_settings"

    id = db.Column(db.Integer, primary_key=True)
    monthly_permission_quota = db.Column(db.Integer, nullable=False, default=3)  # Max permissions per month
    max_permission_hours = db.Column(db.Integer, nullable=False, default=2)      # Max periods per permission
    default_casual_leave = db.Column(db.Float, nullable=False, default=12)        # Default annual CL
    default_medical_leave = db.Column(db.Float, nullable=False, default=12)       # Default annual ML
    default_on_duty_leave = db.Column(db.Float, nullable=False, default=999)      # Default annual OD
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "monthly_permission_quota": self.monthly_permission_quota,
            "max_permission_hours": self.max_permission_hours,
            "default_casual_leave": self.default_casual_leave,
            "default_medical_leave": self.default_medical_leave,
            "default_on_duty_leave": self.default_on_duty_leave,
        }


class AcademicYear(db.Model):
    """
    Explicit academic year row, e.g. start=2026-06-01, end=2027-05-31, label='2026-27'.
    Auto-seeded by get_or_create_current_academic_year() on first use.
    """
    __tablename__ = "academic_years"

    id = db.Column(db.Integer, primary_key=True)
    label = db.Column(db.String(20), nullable=False, unique=True)   # "2026-27"
    start_date = db.Column(db.Date, nullable=False)
    end_date = db.Column(db.Date, nullable=False)
    is_active = db.Column(db.Boolean, default=True)   # exactly one True at a time
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "label": self.label,
            "start_date": self.start_date.isoformat(),
            "end_date": self.end_date.isoformat(),
            "is_active": self.is_active,
        }


class LeaveBalance(db.Model):
    """
    Per-(faculty, academic_year, leave_type) balance row.
    Deducted on approval, refunded on rejection/cancellation.
    """
    __tablename__ = "leave_balances"

    id = db.Column(db.Integer, primary_key=True)
    faculty_id = db.Column(db.Integer, db.ForeignKey("faculty.id", ondelete="CASCADE"), nullable=False)
    academic_year_id = db.Column(db.Integer, db.ForeignKey("academic_years.id", ondelete="CASCADE"), nullable=False)
    leave_type = db.Column(db.Enum(LeaveType, name="leavetype"), nullable=False)

    entitled = db.Column(db.Float, nullable=False, default=0)   # total allotted (days)
    used = db.Column(db.Float, nullable=False, default=0)       # deducted on approval
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    faculty = db.relationship("Faculty", backref=db.backref("leave_balances", lazy=True))
    academic_year = db.relationship("AcademicYear")

    __table_args__ = (
        db.UniqueConstraint("faculty_id", "academic_year_id", "leave_type", name="uq_faculty_year_leavetype"),
    )

    @property
    def remaining(self):
        return round(self.entitled - self.used, 2)

    def to_dict(self):
        return {
            "id": self.id,
            "leave_type": self.leave_type.value,
            "entitled": self.entitled,
            "used": self.used,
            "remaining": self.remaining,
        }


class LeaveRequest(db.Model):
    """
    One leave/permission request. Permission is a LeaveRequest with
    leave_type=PERMISSION and period_numbers populated.
    """
    __tablename__ = "leave_requests"

    id = db.Column(db.Integer, primary_key=True)
    faculty_id = db.Column(db.Integer, db.ForeignKey("faculty.id", ondelete="CASCADE"), nullable=False)
    academic_year_id = db.Column(db.Integer, db.ForeignKey("academic_years.id", ondelete="SET NULL"), nullable=True)

    leave_type = db.Column(db.Enum(LeaveType, name="leavetype"), nullable=False)
    duration = db.Column(db.Enum(LeaveDuration, name="leaveduration"), nullable=False, default=LeaveDuration.FULL_DAY)

    start_date = db.Column(db.Date, nullable=False)
    end_date = db.Column(db.Date, nullable=False)   # == start_date unless multi-day

    # Permission-only: which timetable periods (1-5) this covers
    period_numbers = db.Column(ARRAY(db.Integer), nullable=True)

    reason = db.Column(db.Text, nullable=False)
    document_url = db.Column(db.String(500), nullable=True)     # Cloudinary secure_url
    document_name = db.Column(db.String(255), nullable=True)

    status = db.Column(db.Enum(LeaveStatus, name="leavestatus"), nullable=False, default=LeaveStatus.PENDING)
    hod_comment = db.Column(db.Text, nullable=True)
    decided_by = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    decided_at = db.Column(db.DateTime, nullable=True)

    is_hod_initiated = db.Column(db.Boolean, default=False)   # True = HOD granted directly

    # Exact TimetableEntry ids this request cancelled, recorded at approval time.
    # Shape: {"2026-08-03": [101, 102, 145], "2026-08-04": [201]}
    # Restoration only ever touches these exact IDs — never other rows.
    affected_entries = db.Column(db.JSON, nullable=True, default=dict)

    days_count = db.Column(db.Float, nullable=False, default=1)  # 1 full, 0.5 half, 0 permission

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    faculty = db.relationship("Faculty", backref=db.backref("leave_requests", lazy=True))

    def to_dict(self):
        return {
            "id": self.id,
            "faculty_id": self.faculty_id,
            "faculty_name": self.faculty.user.name if self.faculty and self.faculty.user else None,
            "leave_type": self.leave_type.value,
            "duration": self.duration.value,
            "start_date": self.start_date.isoformat(),
            "end_date": self.end_date.isoformat(),
            "period_numbers": self.period_numbers,
            "reason": self.reason,
            "document_url": self.document_url,
            "document_name": self.document_name,
            "status": self.status.value,
            "hod_comment": self.hod_comment,
            "decided_at": self.decided_at.isoformat() if self.decided_at else None,
            "is_hod_initiated": self.is_hod_initiated,
            "days_count": self.days_count,
            "created_at": self.created_at.isoformat(),
        }
