from flask import Blueprint, request, jsonify, g
from ..extensions import db
from ..models import User, UserRole, Project, Update, ForumPost, UnitFile, Notification, Student, Faculty
from ..utils.auth_middleware import require_developer
from sqlalchemy import text
from datetime import datetime

developer_bp = Blueprint("developer", __name__)


@developer_bp.route("/telemetry", methods=["GET"])
@require_developer
def get_telemetry():
    """Calculates database size, table sizes, entity telemetry, and health metrics."""
    try:
        # PostgreSQL specific database size query
        db_size_res = db.session.execute(
            text("SELECT pg_database_size(current_database()) as size_bytes, pg_size_pretty(pg_database_size(current_database())) as size_pretty")
        ).fetchone()
        db_bytes = db_size_res.size_bytes if db_size_res else 0
        db_pretty = db_size_res.size_pretty if db_size_res else "N/A"
    except Exception:
        db_bytes = 0
        db_pretty = "N/A (SQLite/Other)"

    # Table breakdown
    table_stats = []
    tables = [
        ("users", User),
        ("projects", Project),
        ("updates", Update),
        ("forum_posts", ForumPost),
        ("unit_files", UnitFile),
        ("notifications", Notification),
    ]

    for name, model in tables:
        try:
            cnt = db.session.query(model).count()
            table_stats.append({"table": name, "count": cnt})
        except Exception:
            table_stats.append({"table": name, "count": 0})

    # Detailed role distribution
    hod_count = User.query.filter_by(role=UserRole.HOD).count()
    faculty_count = User.query.filter_by(role=UserRole.FACULTY).count()
    student_count = User.query.filter_by(role=UserRole.STUDENT).count()

    return jsonify({
        "db_size_bytes": db_bytes,
        "db_size_pretty": db_pretty,
        "db_size_mb": round(db_bytes / (1024 * 1024), 2),
        "tables": table_stats,
        "metrics": {
            "total_users": User.query.count(),
            "hod_users": hod_count,
            "faculty_users": faculty_count,
            "student_users": student_count,
            "total_projects": Project.query.count(),
            "total_updates": Update.query.count(),
            "total_forum_posts": ForumPost.query.count(),
            "total_notes_files": UnitFile.query.count(),
            "total_notifications": Notification.query.count(),
        },
        "server_time": datetime.utcnow().isoformat() + "Z",
        "status": "HEALTHY",
    })


@developer_bp.route("/users", methods=["GET"])
@require_developer
def list_users():
    """List all registered users in the platform with full details."""
    query = User.query.order_by(User.created_at.desc())
    role_filter = request.args.get("role")
    search = request.args.get("search", "").strip()

    if role_filter and role_filter in ("HOD", "FACULTY", "STUDENT"):
        query = query.filter(User.role == UserRole[role_filter])

    if search:
        query = query.filter(
            (User.name.ilike(f"%{search}%")) |
            (User.email.ilike(f"%{search}%"))
        )

    users = query.all()
    user_list = []
    for u in users:
        student_info = None
        faculty_info = None
        if u.role == UserRole.STUDENT and u.student:
            student_info = {
                "register_number": u.student.register_number,
                "class_name": u.student.class_name,
            }
        elif u.role == UserRole.FACULTY and u.faculty:
            faculty_info = {
                "designation": u.faculty.designation,
                "department": u.faculty.department,
            }

        user_list.append({
            "id": u.id,
            "firebase_uid": u.firebase_uid,
            "name": u.name,
            "email": u.email,
            "role": u.role.value,
            "profile_picture": u.profile_picture,
            "created_at": u.created_at.isoformat() if u.created_at else None,
            "student": student_info,
            "faculty": faculty_info,
        })

    return jsonify({"users": user_list, "total": len(user_list)})


@developer_bp.route("/users/grant-hod", methods=["POST"])
@require_developer
def grant_hod():
    """Directly promote an existing user or assign HOD authority by email address."""
    data = request.get_json() or {}
    email = data.get("email", "").strip().lower()

    if not email:
        return jsonify({"error": "Email is required"}), 400

    user = User.query.filter(db.func.lower(User.email) == email).first()
    if not user:
        return jsonify({
            "error": f"No registered user found with email '{email}'. The user must sign in once first to create an account base."
        }), 404

    user.role = UserRole.HOD
    db.session.commit()

    return jsonify({
        "message": f"Successfully elevated '{user.name}' ({user.email}) to HOD role with GOD authority.",
        "user": {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "role": user.role.value,
        }
    })


@developer_bp.route("/users/<int:user_id>/set-role", methods=["POST"])
@require_developer
def set_user_role(user_id):
    """Elevate or modify any user's role to HOD, FACULTY, or STUDENT."""
    user = User.query.get_or_404(user_id)
    data = request.get_json() or {}
    new_role = data.get("role", "").upper()

    if new_role not in ("HOD", "FACULTY", "STUDENT"):
        return jsonify({"error": "Invalid role. Must be HOD, FACULTY, or STUDENT"}), 400

    user.role = UserRole[new_role]
    db.session.commit()

    return jsonify({
        "message": f"User '{user.name}' role updated to {user.role.value}.",
        "user": {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "role": user.role.value,
        }
    })


@developer_bp.route("/users/<int:user_id>", methods=["DELETE"])
@require_developer
def delete_user(user_id):
    """Developer GOD action to hard-delete any user account."""
    user = User.query.get_or_404(user_id)
    if user.email in ("rathisha273@gmail.com", "ashok.j2346@gmail.com"):
        return jsonify({"error": "Cannot delete developer account"}), 403

    name = user.name
    email = user.email
    db.session.delete(user)
    db.session.commit()

    return jsonify({"message": f"User '{name}' ({email}) removed successfully."})


@developer_bp.route("/all-data", methods=["GET"])
@require_developer
def get_all_data():
    """Universal system inspection overview for Omni Control."""
    projects = Project.query.order_by(Project.created_at.desc()).limit(50).all()
    updates = Update.query.order_by(Update.created_at.desc()).limit(50).all()

    project_list = [{
        "id": p.id,
        "name": p.name,
        "status": p.status.value if hasattr(p.status, 'value') else str(p.status),
        "created_by": p.created_by.name if p.created_by else "Unknown",
        "members_count": len(p.members),
        "created_at": p.created_at.isoformat() if p.created_at else None,
    } for p in projects]

    update_list = [{
        "id": u.id,
        "content": u.content[:100] + "..." if len(u.content) > 100 else u.content,
        "author": u.author.name if u.author else "Unknown",
        "created_at": u.created_at.isoformat() if u.created_at else None,
    } for u in updates]

    return jsonify({
        "projects": project_list,
        "updates": update_list,
    })
