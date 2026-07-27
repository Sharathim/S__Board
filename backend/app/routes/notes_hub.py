from flask import Blueprint, request, jsonify, g
from ..extensions import db
from ..models.user import User, UserRole
from ..models.notes import Subject
from ..utils.auth_middleware import require_auth

notes_hub_bp = Blueprint("notes_hub", __name__)


def _serialize_subject_summary(s):
    unit_count = s.units.count()
    file_count = sum(unit.files.count() for unit in s.units.all())
    return {
        "id": s.id,
        "name": s.name,
        "academic_year": s.academic_year,
        "semester": s.semester,
        "is_archived": s.is_archived,
        "unit_count": unit_count,
        "file_count": file_count,
        "created_at": s.created_at.isoformat()
    }


@notes_hub_bp.route("/faculty/my-classes-subjects", methods=["GET"])
@require_auth
def get_faculty_notes_hub():
    """
    Returns all subjects grouped by class → academic_year → semester for the
    logged-in FACULTY member. Powers the standalone Faculty Notes & Docs page.
    Query params: ?class_name=UG_3A, ?academic_year=2024-25, ?semester=1
    """
    user = g.current_user
    if user.role != UserRole.FACULTY:
        return jsonify({"error": "Only faculty can access this endpoint"}), 403

    fp = user.faculty_profile
    if not fp:
        return jsonify({"classes": []})

    handled_classes = list(fp.classes_handling or [])
    incharge_class = fp.class_incharge_of
    all_classes = list(set(handled_classes + ([incharge_class] if incharge_class else [])))
    all_classes.sort()

    # Optional filters
    filter_class = request.args.get("class_name")
    filter_year = request.args.get("academic_year")
    filter_semester = request.args.get("semester", type=int)
    include_archived = request.args.get("archived", "false").lower() == "true"

    if filter_class:
        if filter_class not in all_classes:
            return jsonify({"error": "Access denied to this class"}), 403
        all_classes = [filter_class]

    result = []
    for class_name in all_classes:
        q = Subject.query.filter_by(class_name=class_name, is_archived=include_archived)
        if filter_year:
            q = q.filter_by(academic_year=filter_year)
        if filter_semester in (1, 2):
            q = q.filter_by(semester=filter_semester)

        subjects = q.order_by(
            Subject.academic_year.desc(), Subject.semester, Subject.name
        ).all()

        # Group by academic_year → semester
        grouped = {}
        for subj in subjects:
            yr = subj.academic_year
            sem = subj.semester
            if yr not in grouped:
                grouped[yr] = {}
            if sem not in grouped[yr]:
                grouped[yr][sem] = []
            grouped[yr][sem].append(_serialize_subject_summary(subj))

        result.append({
            "class_name": class_name,
            "is_incharge": incharge_class == class_name,
            "academic_years": [
                {
                    "year": yr,
                    "semesters": [
                        {
                            "semester": sem,
                            "subjects": grouped[yr][sem]
                        }
                        for sem in sorted(grouped[yr].keys())
                    ]
                }
                for yr in sorted(grouped.keys(), reverse=True)
            ]
        })

    return jsonify({"classes": result})
