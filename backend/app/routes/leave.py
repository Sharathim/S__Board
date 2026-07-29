import json as json_lib
from flask import Blueprint, request, jsonify, g
from datetime import date, datetime
from ..extensions import db
from ..models.leave import LeaveRequest, LeaveBalance, LeaveType, LeaveStatus, LeaveDuration, AcademicYear
from ..models.faculty import Faculty
from ..models.user import User, UserRole
from ..utils.auth_middleware import require_auth, require_hod
from ..utils.cloudinary_helper import upload_file
from ..utils.fcm_helper import send_notification
from ..utils import leave_service as svc

leave_bp = Blueprint("leave", __name__)


def _get_faculty():
    """Return the Faculty record for the current authenticated user, or None."""
    return Faculty.query.filter_by(user_id=g.current_user.id).first()


# ─────────────────────────────────────────────────────────────────────────────
# FACULTY-FACING ENDPOINTS
# ─────────────────────────────────────────────────────────────────────────────

@leave_bp.route("/my", methods=["GET"])
@require_auth
def my_leaves():
    """Faculty's own leave history. ?status=PENDING optional filter."""
    faculty = _get_faculty()
    if not faculty:
        return jsonify({"error": "Not a faculty account"}), 403
    q = LeaveRequest.query.filter_by(faculty_id=faculty.id)
    status_param = request.args.get("status")
    if status_param:
        try:
            q = q.filter_by(status=LeaveStatus[status_param])
        except KeyError:
            return jsonify({"error": f"Invalid status: {status_param}"}), 400
    leaves = q.order_by(LeaveRequest.created_at.desc()).all()
    return jsonify({"leaves": [l.to_dict() for l in leaves]})


@leave_bp.route("/my/balance", methods=["GET"])
@require_auth
def my_balance():
    """Faculty's own leave balances for the current academic year."""
    faculty = _get_faculty()
    if not faculty:
        return jsonify({"error": "Not a faculty account"}), 403
    ay = svc.get_or_create_current_academic_year()
    balances = [svc.get_or_create_balance(faculty.id, lt, ay) for lt in LeaveType]
    return jsonify({"academic_year": ay.to_dict(), "balances": [b.to_dict() for b in balances]})


@leave_bp.route("/", methods=["POST"])
@require_auth
def submit_leave():
    """
    Submit a leave request. Accepts multipart/form-data so a document can accompany it.
    Required fields: leave_type, duration, start_date, end_date, reason
    Optional: document (file), period_numbers (JSON string, PERMISSION only)
    """
    faculty = _get_faculty()
    if not faculty:
        return jsonify({"error": "Not a faculty account"}), 403

    form = request.form
    for field in ["leave_type", "duration", "start_date", "end_date", "reason"]:
        if not form.get(field):
            return jsonify({"error": f"Missing required field: {field}"}), 400

    try:
        leave_type = LeaveType[form["leave_type"]]
        duration = LeaveDuration[form["duration"]]
        start_date = datetime.strptime(form["start_date"], "%Y-%m-%d").date()
        end_date = datetime.strptime(form["end_date"], "%Y-%m-%d").date()
    except KeyError as e:
        return jsonify({"error": f"Invalid value for field: {e}"}), 400
    except ValueError:
        return jsonify({"error": "Invalid date format — expected YYYY-MM-DD"}), 400

    if end_date < start_date:
        return jsonify({"error": "end_date cannot be before start_date"}), 400

    period_numbers = None
    if leave_type == LeaveType.PERMISSION:
        if start_date != end_date:
            return jsonify({"error": "Permission requests must be single-day"}), 400
        if not svc.check_permission_quota(faculty.id, start_date):
            return jsonify({"error": "Permission quota exhausted for this month (max 3)"}), 400
        try:
            period_numbers = json_lib.loads(form.get("period_numbers", "[]"))
        except ValueError:
            return jsonify({"error": "period_numbers must be a valid JSON array"}), 400
        if not period_numbers or len(period_numbers) > 2:
            return jsonify({"error": "Permission covers 1 or 2 periods"}), 400

    days_count = {
        LeaveDuration.FULL_DAY: (end_date - start_date).days + 1,
        LeaveDuration.HALF_DAY_FIRST: 0.5,
        LeaveDuration.HALF_DAY_SECOND: 0.5,
        LeaveDuration.PERMISSION_HOURS: 0,
    }[duration]

    document_url = document_name = None
    if "document" in request.files and request.files["document"].filename:
        try:
            uploaded = upload_file(request.files["document"], folder="dpms/leave_documents")
            document_url = uploaded["url"]
            document_name = uploaded["name"]
        except (ValueError, Exception) as e:
            return jsonify({"error": f"File upload failed: {str(e)}"}), 400

    ay = svc.get_or_create_current_academic_year()
    leave = LeaveRequest(
        faculty_id=faculty.id,
        academic_year_id=ay.id,
        leave_type=leave_type,
        duration=duration,
        start_date=start_date,
        end_date=end_date,
        period_numbers=period_numbers,
        reason=form["reason"],
        document_url=document_url,
        document_name=document_name,
        days_count=days_count,
        status=LeaveStatus.PENDING,
    )
    db.session.add(leave)
    db.session.commit()

    hod = User.query.filter_by(role=UserRole.HOD).first()
    if hod:
        notif_msg = f"{faculty.user.name} requested {leave_type.value.title()} leave for {start_date.isoformat()}."
        send_notification(
            recipient_id=hod.id,
            title="New Leave Request",
            body=notif_msg,
            notif_type="leave_requested",
            reference_id=leave.id,
        )
        svc.send_leave_email_notification(hod, "New Faculty Leave Request", notif_msg)
    return jsonify({"leave": leave.to_dict()}), 201


@leave_bp.route("/<int:leave_id>/cancel", methods=["POST"])
@require_auth
def cancel_own_leave(leave_id):
    """Faculty cancels their own PENDING or APPROVED leave."""
    faculty = _get_faculty()
    leave = LeaveRequest.query.get_or_404(leave_id)
    if not faculty or leave.faculty_id != faculty.id:
        return jsonify({"error": "Forbidden"}), 403
    if leave.status not in (LeaveStatus.PENDING, LeaveStatus.APPROVED):
        return jsonify({"error": f"Cannot cancel a leave with status {leave.status.value}"}), 400
    svc.cancel_leave(leave, g.current_user.id)
    return jsonify({"leave": leave.to_dict()})


# ─────────────────────────────────────────────────────────────────────────────
# HOD-FACING ENDPOINTS
# ─────────────────────────────────────────────────────────────────────────────

@leave_bp.route("/pending", methods=["GET"])
@require_hod
def pending_leaves():
    """HOD approval dashboard — all PENDING requests oldest-first."""
    leaves = (
        LeaveRequest.query
        .filter_by(status=LeaveStatus.PENDING)
        .order_by(LeaveRequest.created_at.asc())
        .all()
    )
    return jsonify({"leaves": [l.to_dict() for l in leaves]})


@leave_bp.route("/all", methods=["GET"])
@require_hod
def all_leaves():
    """Department-wide filterable list. ?faculty_id, ?status, ?from, ?to"""
    q = LeaveRequest.query
    if request.args.get("faculty_id"):
        try:
            q = q.filter_by(faculty_id=int(request.args["faculty_id"]))
        except ValueError:
            return jsonify({"error": "faculty_id must be an integer"}), 400
    if request.args.get("status"):
        try:
            q = q.filter_by(status=LeaveStatus[request.args["status"]])
        except KeyError:
            return jsonify({"error": f"Invalid status: {request.args['status']}"}), 400
    if request.args.get("from"):
        q = q.filter(LeaveRequest.start_date >= request.args["from"])
    if request.args.get("to"):
        q = q.filter(LeaveRequest.end_date <= request.args["to"])
    leaves = q.order_by(LeaveRequest.created_at.desc()).all()
    return jsonify({"leaves": [l.to_dict() for l in leaves]})


@leave_bp.route("/<int:leave_id>/approve", methods=["POST"])
@require_hod
def approve(leave_id):
    """Approve a PENDING leave. Optional JSON body: {"comment": "..."}"""
    leave = LeaveRequest.query.get_or_404(leave_id)
    if leave.status != LeaveStatus.PENDING:
        return jsonify({"error": f"Cannot approve a leave with status {leave.status.value}"}), 400
    data = request.get_json() or {}
    svc.approve_leave(leave, g.current_user.id, data.get("comment"))
    return jsonify({"leave": leave.to_dict()})


@leave_bp.route("/<int:leave_id>/reject", methods=["POST"])
@require_hod
def reject(leave_id):
    """Reject a PENDING or previously-APPROVED leave. JSON body: {"comment": "..."}"""
    leave = LeaveRequest.query.get_or_404(leave_id)
    if leave.status not in (LeaveStatus.PENDING, LeaveStatus.APPROVED):
        return jsonify({"error": f"Cannot reject a leave with status {leave.status.value}"}), 400
    data = request.get_json() or {}
    svc.reject_leave(leave, g.current_user.id, data.get("comment"))
    return jsonify({"leave": leave.to_dict()})


@leave_bp.route("/grant", methods=["POST"])
@require_hod
def hod_grant_leave():
    """
    HOD manually grants leave from a faculty profile — same shape as submit_leave
    but pre-approved (no PENDING stage). JSON body.
    """
    data = request.get_json() or {}
    for field in ["faculty_id", "leave_type", "duration", "start_date", "end_date", "reason"]:
        if field not in data:
            return jsonify({"error": f"Missing required field: {field}"}), 400

    faculty = Faculty.query.get_or_404(data["faculty_id"])

    try:
        leave_type = LeaveType[data["leave_type"]]
        duration = LeaveDuration[data["duration"]]
        start_date = datetime.strptime(data["start_date"], "%Y-%m-%d").date()
        end_date = datetime.strptime(data["end_date"], "%Y-%m-%d").date()
    except KeyError as e:
        return jsonify({"error": f"Invalid value: {e}"}), 400
    except ValueError:
        return jsonify({"error": "Invalid date format — expected YYYY-MM-DD"}), 400

    if end_date < start_date:
        return jsonify({"error": "end_date cannot be before start_date"}), 400

    days_count = {
        LeaveDuration.FULL_DAY: (end_date - start_date).days + 1,
        LeaveDuration.HALF_DAY_FIRST: 0.5,
        LeaveDuration.HALF_DAY_SECOND: 0.5,
        LeaveDuration.PERMISSION_HOURS: 0,
    }[duration]

    ay = svc.get_or_create_current_academic_year()
    leave = LeaveRequest(
        faculty_id=faculty.id,
        academic_year_id=ay.id,
        leave_type=leave_type,
        duration=duration,
        start_date=start_date,
        end_date=end_date,
        period_numbers=data.get("period_numbers"),
        reason=data["reason"],
        days_count=days_count,
        status=LeaveStatus.PENDING,
        is_hod_initiated=True,
    )
    db.session.add(leave)
    db.session.commit()
    svc.approve_leave(leave, g.current_user.id, comment="Granted directly by HOD")
    return jsonify({"leave": leave.to_dict()}), 201


@leave_bp.route("/department-overview", methods=["GET"])
@require_hod
def department_overview():
    """Balance grid — total leaves taken per faculty this academic year, grouped by type."""
    ay = svc.get_or_create_current_academic_year()
    balances = LeaveBalance.query.filter_by(academic_year_id=ay.id).all()
    by_faculty = {}
    for b in balances:
        fid = b.faculty_id
        if fid not in by_faculty:
            by_faculty[fid] = {
                "faculty_id": fid,
                "faculty_name": b.faculty.user.name if b.faculty and b.faculty.user else None,
                "balances": [],
            }
        by_faculty[fid]["balances"].append(b.to_dict())
    return jsonify({"academic_year": ay.to_dict(), "faculty": list(by_faculty.values())})


@leave_bp.route("/balance/<int:balance_id>", methods=["PATCH", "PUT"])
@require_hod
def update_leave_balance(balance_id):
    """HOD sets/updates entitlement limit for a specific leave balance row."""
    bal = LeaveBalance.query.get_or_404(balance_id)
    data = request.get_json() or {}
    if "entitled" in data:
        try:
            bal.entitled = float(data["entitled"])
            db.session.commit()
        except ValueError:
            return jsonify({"error": "entitled must be a number"}), 400
    return jsonify({"balance": bal.to_dict()})


@leave_bp.route("/entitlement", methods=["POST"])
@require_hod
def set_faculty_entitlement():
    """HOD sets entitled limit for a faculty & leave type."""
    data = request.get_json() or {}
    for f in ["faculty_id", "leave_type", "entitled"]:
        if f not in data:
            return jsonify({"error": f"Missing field: {f}"}), 400

    try:
        leave_type = LeaveType[data["leave_type"]]
        entitled = float(data["entitled"])
    except (KeyError, ValueError):
        return jsonify({"error": "Invalid leave_type or entitled value"}), 400

    ay = svc.get_or_create_current_academic_year()
    bal = svc.get_or_create_balance(data["faculty_id"], leave_type, ay)
    bal.entitled = entitled
    db.session.commit()
    return jsonify({"balance": bal.to_dict()})


# ─────────────────────────────────────────────────────────────────────────────
# SHARED ENDPOINTS
# ─────────────────────────────────────────────────────────────────────────────

@leave_bp.route("/calendar", methods=["GET"])
@require_auth
def leave_calendar():
    """
    Monthly calendar view. ?year=2026&month=8
    Returns {"2026-08-03": [{faculty_id, faculty_name, leave_type, duration, leave_id}, ...], ...}
    HOD sees all faculty; FACULTY sees only their own.
    """
    year = request.args.get("year", type=int)
    month = request.args.get("month", type=int)
    if not year or not month:
        return jsonify({"error": "year and month are required"}), 400

    from calendar import monthrange
    _, last_day = monthrange(year, month)
    month_start = date(year, month, 1)
    month_end = date(year, month, last_day)

    q = LeaveRequest.query.filter(
        LeaveRequest.status == LeaveStatus.APPROVED,
        LeaveRequest.start_date <= month_end,
        LeaveRequest.end_date >= month_start,
    )

    # Faculty see only their own leaves in the calendar
    if g.current_user.role != UserRole.HOD:
        faculty = _get_faculty()
        if faculty:
            q = q.filter_by(faculty_id=faculty.id)

    leaves = q.all()
    by_date = {}
    for l in leaves:
        for d in svc.dates_in_range(max(l.start_date, month_start), min(l.end_date, month_end)):
            by_date.setdefault(d.isoformat(), []).append({
                "faculty_id": l.faculty_id,
                "faculty_name": l.faculty.user.name if l.faculty and l.faculty.user else None,
                "leave_type": l.leave_type.value,
                "duration": l.duration.value,
                "leave_id": l.id,
            })
    return jsonify({"calendar": by_date})


@leave_bp.route("/<int:leave_id>", methods=["GET"])
@require_auth
def get_leave(leave_id):
    """Single request detail — accessible by the owner or HOD."""
    leave = LeaveRequest.query.get_or_404(leave_id)
    faculty = _get_faculty()
    is_owner = faculty and leave.faculty_id == faculty.id
    if g.current_user.role != UserRole.HOD and not is_owner:
        return jsonify({"error": "Forbidden"}), 403
    return jsonify({"leave": leave.to_dict()})
