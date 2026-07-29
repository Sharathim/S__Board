from datetime import date, timedelta
from ..extensions import db
from ..models.timetable import TimetableEntry
from ..models.faculty import Faculty
from ..models.leave import (
    LeaveRequest, LeaveBalance, LeaveType, LeaveStatus, LeaveDuration,
    AcademicYear, DEFAULT_ANNUAL_ENTITLEMENT
)
from .fcm_helper import send_notification


# ── Date <-> timetable day mapping ─────────────────────────────────────────

def date_to_timetable_day(d: date):
    """
    Python's date.isoweekday(): Mon=1 ... Sun=7.
    Timetable day column: 1=Mon ... 6=Sat. Sunday (7) has no timetable rows.
    Returns None for Sunday — callers must treat that as "no timetable impact".
    """
    iso = d.isoweekday()
    return iso if iso <= 6 else None


def dates_in_range(start: date, end: date):
    days = (end - start).days
    return [start + timedelta(days=i) for i in range(days + 1)]


# ── Academic year ───────────────────────────────────────────────────────────

def get_or_create_current_academic_year():
    """
    Academic year: June 1 – May 31.
    E.g. 2026-07-29 → starts 2026-06-01, ends 2027-05-31, label '2026-27'.
    Auto-seeds the row on first call — HOD never has to create it manually.
    """
    today = date.today()
    start_year = today.year if today.month >= 6 else today.year - 1
    start = date(start_year, 6, 1)
    end = date(start_year + 1, 5, 31)
    label = f"{start_year}-{str(start_year + 1)[-2:]}"

    ay = AcademicYear.query.filter_by(label=label).first()
    if ay:
        return ay

    # Deactivate any previously-active year, create & activate new one
    AcademicYear.query.filter_by(is_active=True).update({"is_active": False})
    ay = AcademicYear(label=label, start_date=start, end_date=end, is_active=True)
    db.session.add(ay)
    db.session.commit()
    return ay


def get_or_create_leave_settings():
    """
    Retrieves or initializes HOD-configurable department leave & permission settings.
    Auto-creates table via db.create_all() if table missing in DB.
    """
    try:
        setting = DepartmentLeaveSettings.query.first()
        if not setting:
            setting = DepartmentLeaveSettings(
                monthly_permission_quota=3,
                max_permission_hours=2,
                default_casual_leave=12,
                default_medical_leave=12,
                default_on_duty_leave=999,
            )
            db.session.add(setting)
            db.session.commit()
        return setting
    except Exception:
        db.session.rollback()
        try:
            db.create_all()
            setting = DepartmentLeaveSettings.query.first()
            if not setting:
                setting = DepartmentLeaveSettings(
                    monthly_permission_quota=3,
                    max_permission_hours=2,
                    default_casual_leave=12,
                    default_medical_leave=12,
                    default_on_duty_leave=999,
                )
                db.session.add(setting)
                db.session.commit()
            return setting
        except Exception:
            db.session.rollback()
            return DepartmentLeaveSettings(
                id=1,
                monthly_permission_quota=3,
                max_permission_hours=2,
                default_casual_leave=12,
                default_medical_leave=12,
                default_on_duty_leave=999,
            )


def get_or_create_balance(faculty_id: int, leave_type: LeaveType, academic_year: AcademicYear = None):
    academic_year = academic_year or get_or_create_current_academic_year()
    bal = LeaveBalance.query.filter_by(
        faculty_id=faculty_id, academic_year_id=academic_year.id, leave_type=leave_type
    ).first()
    if bal:
        return bal

    settings = get_or_create_leave_settings()
    default_entitlements = {
        LeaveType.CASUAL: settings.default_casual_leave,
        LeaveType.MEDICAL: settings.default_medical_leave,
        LeaveType.ON_DUTY: settings.default_on_duty_leave,
        LeaveType.COMP_OFF: 0,
        LeaveType.PERMISSION: settings.monthly_permission_quota,
    }

    bal = LeaveBalance(
        faculty_id=faculty_id,
        academic_year_id=academic_year.id,
        leave_type=leave_type,
        entitled=default_entitlements.get(leave_type, 0),
        used=0,
    )
    db.session.add(bal)
    db.session.commit()
    return bal


# ── Permission monthly quota ────────────────────────────────────────────────

def check_permission_quota(faculty_id: int, on_date: date):
    """
    Permission: max quota per calendar month (configurable by HOD).
    Counts APPROVED + PENDING requests in that month.
    Returns True if quota is still available.
    """
    settings = get_or_create_leave_settings()
    max_quota = settings.monthly_permission_quota
    month_start = on_date.replace(day=1)
    # First day of next month — safe calculation
    next_month = (month_start.replace(day=28) + timedelta(days=4)).replace(day=1)
    count = LeaveRequest.query.filter(
        LeaveRequest.faculty_id == faculty_id,
        LeaveRequest.leave_type == LeaveType.PERMISSION,
        LeaveRequest.start_date >= month_start,
        LeaveRequest.start_date < next_month,
        LeaveRequest.status.in_([LeaveStatus.PENDING, LeaveStatus.APPROVED]),
    ).count()
    return count < max_quota


# ── Timetable integration ───────────────────────────────────────────────────

def cancel_timetable_for_leave(leave: LeaveRequest):
    """
    Called at approval. For each date in the leave range, find the faculty's
    TimetableEntry rows for that weekday and cancel them. Records exactly which
    entry IDs were touched per date in leave.affected_entries.

    - FULL_DAY: every entry that day
    - HALF_DAY_FIRST: periods 1–2
    - HALF_DAY_SECOND: periods 3–5
    - PERMISSION_HOURS: only the specific period_numbers

    Already-cancelled slots are skipped — we must never record an ID we didn't
    actually flip, so restoration never touches unrelated cancellations.
    """
    affected = {}
    for d in dates_in_range(leave.start_date, leave.end_date):
        day_num = date_to_timetable_day(d)
        if day_num is None:
            continue  # Sunday

        query = TimetableEntry.query.filter_by(faculty_id=leave.faculty_id, day=day_num)

        if leave.duration == LeaveDuration.PERMISSION_HOURS and leave.period_numbers:
            query = query.filter(TimetableEntry.period.in_(leave.period_numbers))
        elif leave.duration == LeaveDuration.HALF_DAY_FIRST:
            query = query.filter(TimetableEntry.period.in_([1, 2]))
        elif leave.duration == LeaveDuration.HALF_DAY_SECOND:
            query = query.filter(TimetableEntry.period.in_([3, 4, 5]))
        # FULL_DAY: no extra period filter

        entries = query.all()
        entry_ids = []
        faculty_name = leave.faculty.user.name if leave.faculty and leave.faculty.user else "Faculty"
        reason = f"{leave.leave_type.value.title()} leave — {faculty_name}"

        for e in entries:
            if not e.is_cancelled:  # skip already-cancelled — never own what we didn't do
                e.is_cancelled = True
                e.cancel_reason = reason
                entry_ids.append(e.id)

        if entry_ids:
            affected[d.isoformat()] = entry_ids

    leave.affected_entries = affected
    db.session.commit()


def restore_timetable_for_leave(leave: LeaveRequest):
    """
    Precise inverse of cancel_timetable_for_leave.
    Only restores entries recorded in leave.affected_entries — never touches
    other rows (e.g. manual HOD cancellations or other leaves on the same day).
    """
    if not leave.affected_entries:
        return
    all_ids = [eid for ids in leave.affected_entries.values() for eid in ids]
    if not all_ids:
        return
    entries = TimetableEntry.query.filter(TimetableEntry.id.in_(all_ids)).all()
    for e in entries:
        e.is_cancelled = False
        e.cancel_reason = None
    leave.affected_entries = {}
    db.session.commit()


# ── Balance deduction / refund ──────────────────────────────────────────────

def deduct_balance(leave: LeaveRequest):
    """Deduct days_count from the faculty's balance. No-op for Permission (quota-based)."""
    if leave.leave_type == LeaveType.PERMISSION:
        return
    ay = AcademicYear.query.get(leave.academic_year_id) or get_or_create_current_academic_year()
    bal = get_or_create_balance(leave.faculty_id, leave.leave_type, ay)
    bal.used += leave.days_count
    db.session.commit()


def refund_balance(leave: LeaveRequest):
    """Refund days_count back to the faculty's balance. No-op for Permission."""
    if leave.leave_type == LeaveType.PERMISSION:
        return
    ay = AcademicYear.query.get(leave.academic_year_id) or get_or_create_current_academic_year()
    bal = get_or_create_balance(leave.faculty_id, leave.leave_type, ay)
    bal.used = max(0, bal.used - leave.days_count)
    db.session.commit()


def send_leave_email_notification(user, title, body):
    if not user or not user.email:
        return
    try:
        from .mail_helper import send_smtp_email
        html_content = f"""
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
            <h2 style="color: #4F46E5;">{title}</h2>
            <p>Dear {user.name},</p>
            <p>{body}</p>
            <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
            <p style="font-size: 12px; color: #777;">This is an automated notification from Department Management System.</p>
        </div>
        """
        send_smtp_email([user.email], title, html_content, body_text=body)
    except Exception as e:
        import logging
        logging.getLogger(__name__).warning("Failed to send leave status email: %s", e)


# ── State transitions ───────────────────────────────────────────────────────

def approve_leave(leave: LeaveRequest, decided_by_user_id: int, comment: str = None):
    """Approve a leave: update status, deduct balance, cancel timetable, notify faculty."""
    leave.status = LeaveStatus.APPROVED
    leave.hod_comment = comment
    leave.decided_by = decided_by_user_id
    leave.decided_at = db.func.now()
    db.session.commit()
    deduct_balance(leave)
    cancel_timetable_for_leave(leave)
    msg = f"Your {leave.leave_type.value.title()} leave for {leave.start_date.isoformat()} has been approved."
    if comment:
        msg += f" (HOD Note: {comment})"
    send_notification(
        recipient_id=leave.faculty.user_id,
        title="Leave Approved ✓",
        body=msg,
        notif_type="leave_approved",
        reference_id=leave.id,
    )
    if leave.faculty and leave.faculty.user:
        send_leave_email_notification(leave.faculty.user, "Leave Request Approved ✓", msg)


def reject_leave(leave: LeaveRequest, decided_by_user_id: int, comment: str = None):
    """
    Reject a leave. If the leave was already APPROVED (rare reversal), refund
    the balance and restore timetable entries.
    """
    was_approved = leave.status == LeaveStatus.APPROVED
    leave.status = LeaveStatus.REJECTED
    leave.hod_comment = comment
    leave.decided_by = decided_by_user_id
    leave.decided_at = db.func.now()
    db.session.commit()
    if was_approved:
        refund_balance(leave)
        restore_timetable_for_leave(leave)
    msg = f"Your {leave.leave_type.value.title()} leave for {leave.start_date.isoformat()} was rejected." + (f" Reason: {comment}" if comment else "")
    send_notification(
        recipient_id=leave.faculty.user_id,
        title="Leave Rejected",
        body=msg,
        notif_type="leave_rejected",
        reference_id=leave.id,
    )
    if leave.faculty and leave.faculty.user:
        send_leave_email_notification(leave.faculty.user, "Leave Request Rejected", msg)


def cancel_leave(leave: LeaveRequest, cancelled_by_user_id: int):
    """
    Cancel a leave (by faculty or HOD).
    If the leave was APPROVED, refund balance, restore timetable, and notify HOD.
    Cancelling a still-PENDING request does NOT notify HOD (no action needed from them).
    """
    was_approved = leave.status == LeaveStatus.APPROVED
    leave.status = LeaveStatus.CANCELLED
    db.session.commit()
    if was_approved:
        refund_balance(leave)
        restore_timetable_for_leave(leave)
        # Notify HOD that an approved leave was walked back
        from ..models.user import User, UserRole
        hod = User.query.filter_by(role=UserRole.HOD).first()
        if hod:
            faculty_name = leave.faculty.user.name if leave.faculty and leave.faculty.user else "A faculty member"
            send_notification(
                recipient_id=hod.id,
                title="Approved Leave Cancelled",
                body=f"{faculty_name} cancelled their approved {leave.leave_type.value.title()} leave for {leave.start_date.isoformat()}.",
                notif_type="leave_cancelled",
                reference_id=leave.id,
            )
