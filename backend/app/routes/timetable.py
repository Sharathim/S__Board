from flask import Blueprint, request, jsonify, g
from ..extensions import db
from ..models.timetable import (
    TimetableEntry, FacultySubjectMapping,
    ClassLabConfig, get_lab_room_for_class
)
from ..models.faculty import Faculty
from ..models.user import User, UserRole
from ..utils.auth_middleware import require_auth, require_hod

timetable_bp = Blueprint("timetable", __name__)

CLASSES = ["UG_1A", "UG_1B", "UG_2A", "UG_2B", "UG_3A", "UG_3B", "PG_1A", "PG_2A"]
DAYS    = list(range(1, 7))   # 1..6  (Mon–Sat)
PERIODS = list(range(1, 6))   # 1..5  (Hour 1–5)


# ─────────────────────────────────────────────────────────────────────────────
# Lab Configuration endpoints
# ─────────────────────────────────────────────────────────────────────────────

@timetable_bp.route("/lab-config/<class_name>", methods=["GET"])
@require_auth
def get_lab_config(class_name):
    if class_name not in CLASSES:
        return jsonify({"error": "Invalid class"}), 400
    cfg = ClassLabConfig.query.filter_by(class_name=class_name).first()
    if not cfg:
        # Return default (no lab hours configured yet)
        return jsonify({
            "config": {
                "id": None,
                "class_name": class_name,
                "weekly_lab_hours": 0,
                "lab_room": get_lab_room_for_class(class_name),
                "notes": None,
            }
        })
    return jsonify({"config": cfg.to_dict()})


@timetable_bp.route("/lab-config/<class_name>", methods=["POST"])
@require_hod
def save_lab_config(class_name):
    if class_name not in CLASSES:
        return jsonify({"error": "Invalid class"}), 400
    data = request.get_json()
    weekly_lab_hours = data.get("weekly_lab_hours", 0)
    notes = data.get("notes", None)

    cfg = ClassLabConfig.query.filter_by(class_name=class_name).first()
    if cfg:
        cfg.weekly_lab_hours = int(weekly_lab_hours)
        cfg.notes = notes
    else:
        cfg = ClassLabConfig(
            class_name=class_name,
            weekly_lab_hours=int(weekly_lab_hours),
            notes=notes,
        )
        db.session.add(cfg)
    db.session.commit()
    return jsonify({"config": cfg.to_dict()})


@timetable_bp.route("/lab-config/all", methods=["GET"])
@require_auth
def get_all_lab_configs():
    """Return lab configs for all classes (used by generator for cross-class awareness)."""
    configs = ClassLabConfig.query.all()
    by_class = {c.class_name: c.to_dict() for c in configs}
    return jsonify({"configs": by_class})


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
    for field in ["subject_name", "subject_code", "subject_type", "weekly_hours"]:
        if field not in data:
            return jsonify({"error": f"Missing field: {field}"}), 400

    existing = FacultySubjectMapping.query.filter_by(
        class_name=class_name, subject_code=data["subject_code"]
    ).first()
    if existing:
        return jsonify({"error": f"Subject '{data['subject_code']}' already mapped for {class_name}"}), 409

    mapping = FacultySubjectMapping(
        class_name=class_name,
        faculty_id=data.get("faculty_id") or None,
        subject_name=data["subject_name"],
        subject_code=data["subject_code"],
        subject_type=data["subject_type"],
        weekly_hours=int(data["weekly_hours"]),
        lab_block_size=data.get("lab_block_size") or None,
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
            val = data[field]
            if field in ("faculty_id", "lab_block_size") and val == "":
                val = None
            setattr(mapping, field, val)
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
    return jsonify({
        "entries": [e.to_dict() for e in entries],
        "lab_room": get_lab_room_for_class(class_name),
    })


@timetable_bp.route("/<class_name>", methods=["DELETE"])
@require_hod
def clear_timetable(class_name):
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
    for field in ["faculty_id", "subject_name", "subject_code"]:
        if field in data:
            setattr(entry, field, data[field] or None)
    db.session.commit()
    return jsonify({"entry": entry.to_dict()})


@timetable_bp.route("/<class_name>/entry/<int:entry_id>/cancel", methods=["POST"])
@require_hod
def cancel_entry(class_name, entry_id):
    entry = TimetableEntry.query.filter_by(id=entry_id, class_name=class_name).first_or_404()
    data = request.get_json() or {}
    entry.is_cancelled  = True
    entry.cancel_reason = data.get("reason", "Faculty on leave")
    if entry.is_lab_anchor and entry.lab_span:
        for c in TimetableEntry.query.filter_by(lab_anchor_id=entry.id, class_name=class_name).all():
            c.is_cancelled  = True
            c.cancel_reason = entry.cancel_reason
    db.session.commit()
    return jsonify({"ok": True})


@timetable_bp.route("/<class_name>/entry/<int:entry_id>/restore", methods=["POST"])
@require_hod
def restore_entry(class_name, entry_id):
    entry = TimetableEntry.query.filter_by(id=entry_id, class_name=class_name).first_or_404()
    entry.is_cancelled  = False
    entry.cancel_reason = None
    if entry.is_lab_anchor and entry.lab_span:
        for c in TimetableEntry.query.filter_by(lab_anchor_id=entry.id, class_name=class_name).all():
            c.is_cancelled  = False
            c.cancel_reason = None
    db.session.commit()
    return jsonify({"ok": True})


@timetable_bp.route("/faculty/<int:faculty_id>", methods=["GET"])
@require_auth
def get_faculty_timetable(faculty_id):
    entries = TimetableEntry.query.filter_by(
        faculty_id=faculty_id, is_lab_continuation=False
    ).order_by(TimetableEntry.day, TimetableEntry.period).all()
    return jsonify({"entries": [e.to_dict() for e in entries]})


# ─────────────────────────────────────────────────────────────────────────────
# Faculty Leave Day
# ─────────────────────────────────────────────────────────────────────────────

@timetable_bp.route("/<class_name>/cancel-faculty-day", methods=["POST"])
@require_hod
def cancel_faculty_day(class_name):
    if class_name not in CLASSES:
        return jsonify({"error": "Invalid class"}), 400
    data   = request.get_json()
    fid    = data.get("faculty_id")
    day    = data.get("day")
    reason = data.get("reason", "Faculty on leave")
    if not fid or not day:
        return jsonify({"error": "faculty_id and day required"}), 400

    entries = TimetableEntry.query.filter_by(class_name=class_name, faculty_id=fid, day=day).all()
    for e in entries:
        e.is_cancelled  = True
        e.cancel_reason = reason
    db.session.commit()
    return jsonify({"ok": True, "cancelled_count": len(entries)})


@timetable_bp.route("/<class_name>/restore-faculty-day", methods=["POST"])
@require_hod
def restore_faculty_day(class_name):
    if class_name not in CLASSES:
        return jsonify({"error": "Invalid class"}), 400
    data = request.get_json()
    fid  = data.get("faculty_id")
    day  = data.get("day")
    if not fid or not day:
        return jsonify({"error": "faculty_id and day required"}), 400

    entries = TimetableEntry.query.filter_by(class_name=class_name, faculty_id=fid, day=day).all()
    for e in entries:
        e.is_cancelled  = False
        e.cancel_reason = None
    db.session.commit()
    return jsonify({"ok": True})


# ─────────────────────────────────────────────────────────────────────────────
# Substitute Finder
# ─────────────────────────────────────────────────────────────────────────────

@timetable_bp.route("/substitutes", methods=["GET"])
@require_hod
def find_substitutes():
    day    = request.args.get("day",    type=int)
    period = request.args.get("period", type=int)
    if not day or not period:
        return jsonify({"error": "day and period required"}), 400

    busy_ids = {
        r[0] for r in db.session.query(TimetableEntry.faculty_id).filter(
            TimetableEntry.day == day,
            TimetableEntry.period == period,
            TimetableEntry.faculty_id.isnot(None),
            TimetableEntry.is_cancelled == False
        ).distinct().all()
    }

    free = [
        f for f in Faculty.query.join(User).all()
        if f.id not in busy_ids
    ]
    return jsonify({
        "substitutes": [
            {"id": f.id, "name": f.user.name, "designation": f.designation}
            for f in free
        ]
    })


# ─────────────────────────────────────────────────────────────────────────────
# Auto-Generation Engine (with full lab-room conflict prevention)
# ─────────────────────────────────────────────────────────────────────────────

@timetable_bp.route("/<class_name>/generate", methods=["POST"])
@require_hod
def generate_timetable(class_name):
    """
    Conflict-free timetable generation for one class.

    Cross-class conflict matrices:
      1. faculty_busy[fid][day][period]   – faculty already teaching any class
      2. class_busy[day][period]           – this class already has a subject
      3. lab_room_busy[lab_num][day][period] – physical lab room occupied
             Lab 1 → used by ALL A-section classes (UG_1A, UG_2A, UG_3A, PG_1A)
             Lab 2 → used by ALL B-section classes (UG_1B, UG_2B, UG_3B, PG_2A ... PG_2A ends in A
                     but convention: name ending A → Lab1 else Lab2)

    Lab faculty can be None/unassigned — the generator will still schedule the
    time block (only the physical lab room is the real constraint for labs).

    Scheduling order:  labs first (hardest: need contiguous block + lab room free),
                       then theory by weekly_hours desc.
    """
    if class_name not in CLASSES:
        return jsonify({"error": "Invalid class"}), 400

    mappings = FacultySubjectMapping.query.filter_by(class_name=class_name).all()
    if not mappings:
        return jsonify({"error": "No subject mappings found. Configure subjects in the Setup tab first."}), 400

    # ── 1. Cross-class faculty busy matrix ────────────────────────────────
    faculty_busy: dict = {}
    for entry in TimetableEntry.query.filter(TimetableEntry.class_name != class_name).all():
        if entry.faculty_id is None:
            continue
        fid = entry.faculty_id
        faculty_busy.setdefault(fid, {d: {p: False for p in PERIODS} for d in DAYS})
        faculty_busy[fid][entry.day][entry.period] = True

    # ── 2. Class busy matrix (this class, starts empty) ──────────────────
    class_busy = {d: {p: False for p in PERIODS} for d in DAYS}

    # ── 3. Lab room busy matrix (from OTHER classes' lab entries) ─────────
    this_lab_room = get_lab_room_for_class(class_name)
    lab_room_busy = {
        1: {d: {p: False for p in PERIODS} for d in DAYS},
        2: {d: {p: False for p in PERIODS} for d in DAYS},
    }
    for entry in TimetableEntry.query.filter(
        TimetableEntry.subject_type == "lab",
        TimetableEntry.class_name != class_name,
        TimetableEntry.is_cancelled == False,
    ).all():
        lr = get_lab_room_for_class(entry.class_name)
        lab_room_busy[lr][entry.day][entry.period] = True

    # ── Helper functions ───────────────────────────────────────────────────
    def fac_free(fid, day, period) -> bool:
        if fid is None:
            return True
        faculty_busy.setdefault(fid, {d: {p: False for p in PERIODS} for d in DAYS})
        return not faculty_busy[fid][day][period]

    def mark_fac_busy(fid, day, period):
        if fid is None:
            return
        faculty_busy.setdefault(fid, {d: {p: False for p in PERIODS} for d in DAYS})
        faculty_busy[fid][day][period] = True

    def slot_ok_for_lab(fid, day, period) -> bool:
        return (
            not class_busy[day][period] and
            fac_free(fid, day, period) and
            not lab_room_busy[this_lab_room][day][period]
        )

    def slot_ok_for_theory(fid, day, period) -> bool:
        return not class_busy[day][period] and fac_free(fid, day, period)

    def make_entry_dict(day, period, mapping,
                        is_anchor=False, is_cont=False, anchor_period=None, span=None):
        return {
            "class_name":          class_name,
            "day":                 day,
            "period":              period,
            "subject_name":        mapping.subject_name,
            "subject_code":        mapping.subject_code,
            "subject_type":        mapping.subject_type,
            "faculty_id":          mapping.faculty_id,
            "mapping_id":          mapping.id,
            "is_lab_anchor":       is_anchor,
            "is_lab_continuation": is_cont,
            "lab_anchor_period":   anchor_period,   # resolved to FK later
            "lab_span":            span,
            "is_cancelled":        False,
        }

    # ── Sort: labs first, then theory desc by hours ───────────────────────
    sorted_mappings = sorted(
        mappings,
        key=lambda m: (0 if m.subject_type == "lab" else 1, -(m.weekly_hours or 0))
    )

    entries_buf: list = []

    # ── Schedule each mapping ──────────────────────────────────────────────
    for mapping in sorted_mappings:
        fid  = mapping.faculty_id
        remaining = mapping.weekly_hours or 0
        if remaining <= 0:
            continue

        if mapping.subject_type == "lab":
            block = mapping.lab_block_size or 2
            placed_days: set = set()

            while remaining > 0:
                current_block = min(block, remaining)
                placed_this = False

                for day in DAYS:
                    if day in placed_days:
                        continue
                    for start_p in PERIODS:
                        end_p = start_p + current_block - 1
                        if end_p > max(PERIODS):
                            continue
                        periods_needed = list(range(start_p, start_p + current_block))
                        if all(slot_ok_for_lab(fid, day, p) for p in periods_needed):
                            # Place lab anchor
                            entries_buf.append(make_entry_dict(
                                day, start_p, mapping,
                                is_anchor=True, span=current_block
                            ))
                            class_busy[day][start_p] = True
                            mark_fac_busy(fid, day, start_p)
                            lab_room_busy[this_lab_room][day][start_p] = True

                            # Place continuation periods
                            for p in periods_needed[1:]:
                                entries_buf.append(make_entry_dict(
                                    day, p, mapping,
                                    is_cont=True, anchor_period=start_p
                                ))
                                class_busy[day][p] = True
                                mark_fac_busy(fid, day, p)
                                lab_room_busy[this_lab_room][day][p] = True

                            placed_days.add(day)
                            remaining -= current_block
                            placed_this = True
                            break
                    if placed_this:
                        break

                if not placed_this:
                    if current_block > 1:
                        block -= 1
                    else:
                        return jsonify({
                            "error": (
                                f"Cannot schedule lab '{mapping.subject_code}' for {class_name} — "
                                f"Lab {this_lab_room} has no free contiguous block left. "
                                f"Tip: reduce weekly hours or clear other classes' timetables first."
                            )
                        }), 422

        else:
            # Theory: spread evenly across days, one period at a time
            placed = 0
            day_cycle = (DAYS * ((remaining // len(DAYS)) + 2))[:remaining * 2]

            for day in day_cycle:
                if placed >= remaining:
                    break
                for period in PERIODS:
                    if slot_ok_for_theory(fid, day, period):
                        entries_buf.append(make_entry_dict(day, period, mapping))
                        class_busy[day][period] = True
                        mark_fac_busy(fid, day, period)
                        placed += 1
                        break

            if placed < remaining:
                return jsonify({
                    "error": (
                        f"Only {placed}/{remaining} periods placed for '{mapping.subject_code}'. "
                        f"Check faculty schedule conflicts across multiple classes."
                    )
                }), 422

    # ── Persist: clear old, insert new ────────────────────────────────────
    TimetableEntry.query.filter_by(class_name=class_name).delete()
    db.session.flush()

    anchor_map: dict = {}   # (day, start_period) → TimetableEntry

    # Insert anchors + plain theory entries first
    for e in entries_buf:
        if not e["is_lab_continuation"]:
            obj = TimetableEntry(
                class_name          = e["class_name"],
                day                 = e["day"],
                period              = e["period"],
                subject_name        = e["subject_name"],
                subject_code        = e["subject_code"],
                subject_type        = e["subject_type"],
                faculty_id          = e["faculty_id"],
                mapping_id          = e["mapping_id"],
                is_lab_anchor       = e["is_lab_anchor"],
                is_lab_continuation = False,
                lab_span            = e["lab_span"],
                is_cancelled        = False,
            )
            db.session.add(obj)
            db.session.flush()
            anchor_map[(e["day"], e["period"])] = obj

    # Insert continuation entries with resolved FK
    for e in entries_buf:
        if e["is_lab_continuation"]:
            anchor_obj = anchor_map.get((e["day"], e["lab_anchor_period"]))
            obj = TimetableEntry(
                class_name          = e["class_name"],
                day                 = e["day"],
                period              = e["period"],
                subject_name        = e["subject_name"],
                subject_code        = e["subject_code"],
                subject_type        = e["subject_type"],
                faculty_id          = e["faculty_id"],
                mapping_id          = e["mapping_id"],
                is_lab_anchor       = False,
                is_lab_continuation = True,
                lab_anchor_id       = anchor_obj.id if anchor_obj else None,
                lab_span            = None,
                is_cancelled        = False,
            )
            db.session.add(obj)

    db.session.commit()

    final = TimetableEntry.query.filter_by(class_name=class_name).order_by(
        TimetableEntry.day, TimetableEntry.period
    ).all()

    return jsonify({
        "ok":       True,
        "entries":  [e.to_dict() for e in final],
        "total":    len(final),
        "lab_room": this_lab_room,
    })
