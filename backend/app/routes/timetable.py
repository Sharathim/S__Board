from flask import Blueprint, request, jsonify, g
from ..extensions import db
from ..models.timetable import TimetableEntry, FacultySubjectMapping
from ..models.faculty import Faculty
from ..models.user import User, UserRole
from ..utils.auth_middleware import require_auth, require_hod

timetable_bp = Blueprint("timetable", __name__)

CLASSES = ["UG_1A", "UG_1B", "UG_2A", "UG_2B", "UG_3A", "UG_3B", "PG_1A", "PG_2A"]
DAYS = list(range(1, 7))      # 1..6  (Mon–Sat)
PERIODS = list(range(1, 6))   # 1..5  (Hour 1–5)


# ─────────────────────────────────────────────────────────────────────────────
# Subject-Faculty Mapping endpoints
# ─────────────────────────────────────────────────────────────────────────────

@timetable_bp.route("/subject-mappings/<class_name>", methods=["GET"])
@require_auth
def list_mappings(class_name):
    if class_name not in CLASSES:
        return jsonify({"error": "Invalid class"}), 400
    mappings = FacultySubjectMapping.query.filter_by(class_name=class_name).all()
    return jsonify({"mappings": [m.to_dict() for m in mappings]})


@timetable_bp.route("/subject-mappings/<class_name>", methods=["POST"])
@require_hod
def create_mapping(class_name):
    if class_name not in CLASSES:
        return jsonify({"error": "Invalid class"}), 400
    data = request.get_json()
    required = ["subject_name", "subject_code", "subject_type", "weekly_hours"]
    for field in required:
        if field not in data:
            return jsonify({"error": f"Missing field: {field}"}), 400

    # Prevent duplicate subject_code in same class
    existing = FacultySubjectMapping.query.filter_by(
        class_name=class_name, subject_code=data["subject_code"]
    ).first()
    if existing:
        return jsonify({"error": f"Subject '{data['subject_code']}' already mapped for {class_name}"}), 409

    mapping = FacultySubjectMapping(
        class_name=class_name,
        faculty_id=data.get("faculty_id"),
        subject_name=data["subject_name"],
        subject_code=data["subject_code"],
        subject_type=data["subject_type"],
        weekly_hours=int(data["weekly_hours"]),
        lab_block_size=data.get("lab_block_size"),
    )
    db.session.add(mapping)
    db.session.commit()
    return jsonify({"mapping": mapping.to_dict()}), 201


@timetable_bp.route("/subject-mappings/<int:mapping_id>", methods=["PATCH"])
@require_hod
def update_mapping(mapping_id):
    mapping = FacultySubjectMapping.query.get_or_404(mapping_id)
    data = request.get_json()
    for field in ["subject_name", "subject_code", "subject_type", "weekly_hours", "lab_block_size", "faculty_id"]:
        if field in data:
            setattr(mapping, field, data[field])
    db.session.commit()
    return jsonify({"mapping": mapping.to_dict()})


@timetable_bp.route("/subject-mappings/<int:mapping_id>", methods=["DELETE"])
@require_hod
def delete_mapping(mapping_id):
    mapping = FacultySubjectMapping.query.get_or_404(mapping_id)
    db.session.delete(mapping)
    db.session.commit()
    return jsonify({"ok": True})


# ─────────────────────────────────────────────────────────────────────────────
# Timetable CRUD endpoints
# ─────────────────────────────────────────────────────────────────────────────

@timetable_bp.route("/<class_name>", methods=["GET"])
@require_auth
def get_timetable(class_name):
    if class_name not in CLASSES:
        return jsonify({"error": "Invalid class"}), 400
    entries = TimetableEntry.query.filter_by(class_name=class_name).order_by(
        TimetableEntry.day, TimetableEntry.period
    ).all()
    return jsonify({"entries": [e.to_dict() for e in entries]})


@timetable_bp.route("/<class_name>", methods=["DELETE"])
@require_hod
def clear_timetable(class_name):
    """Clear (reset) all timetable entries for a class."""
    if class_name not in CLASSES:
        return jsonify({"error": "Invalid class"}), 400
    TimetableEntry.query.filter_by(class_name=class_name).delete()
    db.session.commit()
    return jsonify({"ok": True})


@timetable_bp.route("/<class_name>/entry/<int:entry_id>", methods=["PATCH"])
@require_hod
def update_entry(class_name, entry_id):
    entry = TimetableEntry.query.filter_by(id=entry_id, class_name=class_name).first_or_404()
    data = request.get_json()
    if "faculty_id" in data:
        entry.faculty_id = data["faculty_id"]
    if "subject_name" in data:
        entry.subject_name = data["subject_name"]
    if "subject_code" in data:
        entry.subject_code = data["subject_code"]
    db.session.commit()
    return jsonify({"entry": entry.to_dict()})


@timetable_bp.route("/<class_name>/entry/<int:entry_id>/cancel", methods=["POST"])
@require_hod
def cancel_entry(class_name, entry_id):
    """Mark a timetable slot as cancelled (faculty on leave). Leave as gap."""
    entry = TimetableEntry.query.filter_by(id=entry_id, class_name=class_name).first_or_404()
    data = request.get_json() or {}
    entry.is_cancelled = True
    entry.cancel_reason = data.get("reason", "Faculty on leave")
    # If this is a lab anchor, also cancel its continuation entries
    if entry.is_lab_anchor and entry.lab_span:
        continuations = TimetableEntry.query.filter_by(
            lab_anchor_id=entry.id, class_name=class_name
        ).all()
        for c in continuations:
            c.is_cancelled = True
            c.cancel_reason = entry.cancel_reason
    db.session.commit()
    return jsonify({"ok": True})


@timetable_bp.route("/<class_name>/entry/<int:entry_id>/restore", methods=["POST"])
@require_hod
def restore_entry(class_name, entry_id):
    entry = TimetableEntry.query.filter_by(id=entry_id, class_name=class_name).first_or_404()
    entry.is_cancelled = False
    entry.cancel_reason = None
    if entry.is_lab_anchor and entry.lab_span:
        continuations = TimetableEntry.query.filter_by(
            lab_anchor_id=entry.id, class_name=class_name
        ).all()
        for c in continuations:
            c.is_cancelled = False
            c.cancel_reason = None
    db.session.commit()
    return jsonify({"ok": True})


@timetable_bp.route("/faculty/<int:faculty_id>", methods=["GET"])
@require_auth
def get_faculty_timetable(faculty_id):
    """Return all non-continuation timetable entries for a faculty across all classes."""
    entries = TimetableEntry.query.filter_by(
        faculty_id=faculty_id,
        is_lab_continuation=False
    ).order_by(TimetableEntry.day, TimetableEntry.period).all()
    return jsonify({"entries": [e.to_dict() for e in entries]})


# ─────────────────────────────────────────────────────────────────────────────
# Cancellation helpers
# ─────────────────────────────────────────────────────────────────────────────

@timetable_bp.route("/<class_name>/cancel-faculty-day", methods=["POST"])
@require_hod
def cancel_faculty_day(class_name):
    """
    Mark ALL entries for a faculty on a given day in a given class as cancelled.
    HOD uses this for faculty leave days.
    """
    if class_name not in CLASSES:
        return jsonify({"error": "Invalid class"}), 400
    data = request.get_json()
    faculty_id = data.get("faculty_id")
    day = data.get("day")
    reason = data.get("reason", "Faculty on leave")
    if not faculty_id or not day:
        return jsonify({"error": "faculty_id and day required"}), 400

    entries = TimetableEntry.query.filter_by(
        class_name=class_name, faculty_id=faculty_id, day=day
    ).all()
    for e in entries:
        e.is_cancelled = True
        e.cancel_reason = reason
    db.session.commit()
    return jsonify({"ok": True, "cancelled_count": len(entries)})


@timetable_bp.route("/<class_name>/restore-faculty-day", methods=["POST"])
@require_hod
def restore_faculty_day(class_name):
    if class_name not in CLASSES:
        return jsonify({"error": "Invalid class"}), 400
    data = request.get_json()
    faculty_id = data.get("faculty_id")
    day = data.get("day")
    if not faculty_id or not day:
        return jsonify({"error": "faculty_id and day required"}), 400

    entries = TimetableEntry.query.filter_by(
        class_name=class_name, faculty_id=faculty_id, day=day
    ).all()
    for e in entries:
        e.is_cancelled = False
        e.cancel_reason = None
    db.session.commit()
    return jsonify({"ok": True})


# ─────────────────────────────────────────────────────────────────────────────
# Substitute finder
# ─────────────────────────────────────────────────────────────────────────────

@timetable_bp.route("/substitutes", methods=["GET"])
@require_hod
def find_substitutes():
    """
    Return faculties who are FREE on a given day+period across all classes.
    Query params: day=<1-6>, period=<1-5>
    """
    day = request.args.get("day", type=int)
    period = request.args.get("period", type=int)
    if not day or not period:
        return jsonify({"error": "day and period query params required"}), 400

    busy_faculty_ids = db.session.query(TimetableEntry.faculty_id).filter(
        TimetableEntry.day == day,
        TimetableEntry.period == period,
        TimetableEntry.faculty_id.isnot(None),
        TimetableEntry.is_cancelled == False
    ).distinct().all()
    busy_ids = {r[0] for r in busy_faculty_ids}

    all_faculties = Faculty.query.join(User).all()
    free = [f for f in all_faculties if f.id not in busy_ids]

    return jsonify({
        "substitutes": [
            {"id": f.id, "name": f.user.name, "designation": f.designation}
            for f in free
        ]
    })


# ─────────────────────────────────────────────────────────────────────────────
# Auto-Generation Engine
# ─────────────────────────────────────────────────────────────────────────────

@timetable_bp.route("/<class_name>/generate", methods=["POST"])
@require_hod
def generate_timetable(class_name):
    """
    Auto-generate a conflict-free timetable for the given class.
    Uses a greedy + backtracking scheduler:
      1. Load all FacultySubjectMappings for this class.
      2. Build cross-class occupancy matrices for all faculties (so multi-class
         teachers like Ponnila don't get double-booked).
      3. Schedule LAB blocks first (hardest — needs contiguous periods).
      4. Fill remaining theory periods using round-robin across days.
    """
    if class_name not in CLASSES:
        return jsonify({"error": "Invalid class"}), 400

    mappings = FacultySubjectMapping.query.filter_by(class_name=class_name).all()
    if not mappings:
        return jsonify({"error": "No subject mappings found. Please configure subjects first."}), 400

    # ── Build cross-class faculty busy matrix ──────────────────────────────
    # Include ALL existing timetable entries across ALL classes (not just this one)
    # so faculties teaching multiple classes don't get double-booked.
    existing_all = TimetableEntry.query.filter(
        TimetableEntry.class_name != class_name
    ).all()

    # faculty_busy[faculty_id][day][period] = True
    faculty_busy = {}
    for entry in existing_all:
        if entry.faculty_id is None:
            continue
        fid = entry.faculty_id
        if fid not in faculty_busy:
            faculty_busy[fid] = {d: {p: False for p in PERIODS} for d in DAYS}
        faculty_busy[fid][entry.day][entry.period] = True

    # class_busy[day][period] = True  (for this class being generated)
    class_busy = {d: {p: False for p in PERIODS} for d in DAYS}

    # Generated entries buffer
    entries_to_create = []

    # ── Sort: labs first, then theory by weekly_hours descending ──────────
    sorted_mappings = sorted(
        mappings,
        key=lambda m: (0 if m.subject_type == "lab" else 1, -(m.weekly_hours or 0))
    )

    def faculty_is_free(fid, day, period):
        if fid is None:
            return True
        if fid not in faculty_busy:
            faculty_busy[fid] = {d: {p: False for p in PERIODS} for d in DAYS}
        return not faculty_busy[fid][day][period]

    def mark_faculty_busy(fid, day, period):
        if fid is None:
            return
        if fid not in faculty_busy:
            faculty_busy[fid] = {d: {p: False for p in PERIODS} for d in DAYS}
        faculty_busy[fid][day][period] = True

    def make_entry(day, period, mapping, is_lab_anchor=False,
                   is_lab_continuation=False, lab_anchor_ref=None, lab_span=None):
        return {
            "class_name":          class_name,
            "day":                 day,
            "period":              period,
            "subject_name":        mapping.subject_name,
            "subject_code":        mapping.subject_code,
            "subject_type":        mapping.subject_type,
            "faculty_id":          mapping.faculty_id,
            "mapping_id":          mapping.id,
            "is_lab_anchor":       is_lab_anchor,
            "is_lab_continuation": is_lab_continuation,
            "lab_anchor_ref":      lab_anchor_ref,  # resolved later
            "lab_span":            lab_span,
            "is_cancelled":        False,
        }

    # ── Schedule each mapping ──────────────────────────────────────────────
    for mapping in sorted_mappings:
        fid = mapping.faculty_id

        if mapping.subject_type == "lab":
            block = mapping.lab_block_size or 2
            # We need to schedule 'weekly_hours' total lab-hour slots.
            # Typically: e.g. 5 hours = one 2-hr block + one 3-hr block, OR two 2-hr + one 1-hr.
            # Strategy: place one block per day on different days.
            remaining = mapping.weekly_hours
            placed_days = set()
            success = True

            while remaining > 0:
                placed_this_iteration = False
                current_block = min(block, remaining)  # last block might be smaller

                for day in DAYS:
                    if day in placed_days:
                        continue
                    # Find contiguous free slot of size current_block
                    for start_period in PERIODS:
                        if start_period + current_block - 1 > max(PERIODS):
                            continue
                        periods_needed = list(range(start_period, start_period + current_block))
                        # Check all periods are free for class and faculty
                        if all(
                            not class_busy[day][p] and faculty_is_free(fid, day, p)
                            for p in periods_needed
                        ):
                            # Place lab block
                            anchor_entry = make_entry(
                                day, start_period, mapping,
                                is_lab_anchor=True, lab_span=current_block
                            )
                            entries_to_create.append(anchor_entry)
                            class_busy[day][start_period] = True
                            mark_faculty_busy(fid, day, start_period)

                            for offset, p in enumerate(periods_needed[1:], 1):
                                cont_entry = make_entry(
                                    day, p, mapping,
                                    is_lab_continuation=True,
                                    lab_anchor_ref=start_period  # temporary; resolved on DB insert
                                )
                                entries_to_create.append(cont_entry)
                                class_busy[day][p] = True
                                mark_faculty_busy(fid, day, p)

                            placed_days.add(day)
                            remaining -= current_block
                            placed_this_iteration = True
                            break
                    if placed_this_iteration:
                        break

                if not placed_this_iteration:
                    # Try again with block size 1 if no contiguous block found
                    if current_block > 1:
                        block = max(1, block - 1)
                    else:
                        success = False
                        break

            if not success:
                return jsonify({
                    "error": f"Could not schedule lab '{mapping.subject_code}' — not enough free contiguous slots. "
                             f"Try reducing weekly hours or checking faculty conflicts."
                }), 422

        else:
            # Theory subject: spread weekly_hours across different days
            remaining = mapping.weekly_hours
            # Round-robin days: distribute as evenly as possible
            day_cycle = []
            while len(day_cycle) < remaining:
                day_cycle.extend(DAYS)
            day_cycle = day_cycle[:remaining]
            # Sort by how many theory periods this class already has that day (ascending)

            placed = 0
            day_attempts = list(DAYS) * (remaining + 1)

            for day in day_attempts:
                if placed >= remaining:
                    break
                # Find first free period that day
                for period in PERIODS:
                    if not class_busy[day][period] and faculty_is_free(fid, day, period):
                        entries_to_create.append(
                            make_entry(day, period, mapping)
                        )
                        class_busy[day][period] = True
                        mark_faculty_busy(fid, day, period)
                        placed += 1
                        break

            if placed < remaining:
                return jsonify({
                    "error": f"Could not schedule all {remaining} periods for '{mapping.subject_code}'. "
                             f"Only {placed} slots available. Check faculty conflicts across classes."
                }), 422

    # ── Persist all generated entries ──────────────────────────────────────
    # First clear old timetable for this class
    TimetableEntry.query.filter_by(class_name=class_name).delete()
    db.session.flush()

    # Insert anchors first, then continuations (to resolve lab_anchor_id FKs)
    anchor_map = {}  # (day, period) -> TimetableEntry object

    # Insert non-continuation entries first
    for e_dict in entries_to_create:
        if not e_dict["is_lab_continuation"]:
            entry = TimetableEntry(
                class_name=e_dict["class_name"],
                day=e_dict["day"],
                period=e_dict["period"],
                subject_name=e_dict["subject_name"],
                subject_code=e_dict["subject_code"],
                subject_type=e_dict["subject_type"],
                faculty_id=e_dict["faculty_id"],
                mapping_id=e_dict["mapping_id"],
                is_lab_anchor=e_dict["is_lab_anchor"],
                is_lab_continuation=False,
                lab_span=e_dict["lab_span"],
                is_cancelled=False,
            )
            db.session.add(entry)
            db.session.flush()
            anchor_map[(e_dict["day"], e_dict["period"])] = entry

    # Insert continuation entries with resolved anchor FK
    for e_dict in entries_to_create:
        if e_dict["is_lab_continuation"]:
            # lab_anchor_ref is the start_period of the anchor on the same day
            anchor_day = e_dict["day"]
            anchor_period = e_dict["lab_anchor_ref"]
            anchor_obj = anchor_map.get((anchor_day, anchor_period))
            entry = TimetableEntry(
                class_name=e_dict["class_name"],
                day=e_dict["day"],
                period=e_dict["period"],
                subject_name=e_dict["subject_name"],
                subject_code=e_dict["subject_code"],
                subject_type=e_dict["subject_type"],
                faculty_id=e_dict["faculty_id"],
                mapping_id=e_dict["mapping_id"],
                is_lab_anchor=False,
                is_lab_continuation=True,
                lab_anchor_id=anchor_obj.id if anchor_obj else None,
                lab_span=None,
                is_cancelled=False,
            )
            db.session.add(entry)

    db.session.commit()

    # Return the final timetable
    final_entries = TimetableEntry.query.filter_by(class_name=class_name).order_by(
        TimetableEntry.day, TimetableEntry.period
    ).all()

    return jsonify({
        "ok": True,
        "entries": [e.to_dict() for e in final_entries],
        "total": len(final_entries),
    })
