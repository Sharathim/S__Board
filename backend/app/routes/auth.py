from flask import Blueprint, request, jsonify, g, current_app
from ..models.user import User, UserRole
from ..models.invite import InviteLink
from ..models.faculty import Faculty
from ..models.student import Student
from ..extensions import db
from ..utils.auth_middleware import require_auth
from ..utils.firebase_tokens import verify_firebase_token

auth_bp = Blueprint("auth", __name__)

CLASSES = ["UG_1A", "UG_1B", "UG_2A", "UG_2B", "UG_3A", "UG_3B", "PG_1A", "PG_2A"]


@auth_bp.route("/verify", methods=["POST"])
def verify_token():
    data = request.get_json()
    id_token = data.get("idToken")
    role = data.get("role")  # "HOD", "FACULTY", or "STUDENT" — optional for returning users

    if not id_token:
        return jsonify({"error": "idToken required"}), 400
    # A role is only required for a fresh sign-in (to decide HOD vs new-user
    # onboarding). Returning users restoring a persistent session send no role;
    # they are identified by their Firebase UID below.
    if role is not None and role not in ("HOD", "FACULTY", "STUDENT"):
        return jsonify({"error": "Valid role (HOD/FACULTY/STUDENT) required"}), 400

    try:
        decoded = verify_firebase_token(id_token)
    except Exception as exc:
        current_app.logger.warning("Firebase token verification failed during login: %s", exc)
        message = str(exc)
        if 'incorrect "aud"' in message or 'incorrect "iss"' in message:
            return jsonify({"error": "Invalid token. Frontend Firebase config does not match the backend service account."}), 401
        if "Failed to fetch" in message or "certificate" in message.lower():
            return jsonify({"error": "Invalid token. Backend could not reach Firebase to validate the login token."}), 401
        return jsonify({"error": "Invalid token"}), 401

    email = decoded.get("email")
    uid = decoded.get("uid")
    name = decoded.get("name", "")
    picture = decoded.get("picture", "")

    # ---- HOD restored session (no role, but email matches the configured HOD) ----
    # Lets a returning HOD whose DB row is missing be re-created on session
    # restore instead of being locked out.
    if role is None and email == current_app.config["HOD_EMAIL"]:
        role = "HOD"

    # ---- HOD Login ----
    if role == "HOD":
        if email != current_app.config["HOD_EMAIL"]:
            return jsonify({"error": "Unauthorized. HOD email does not match."}), 403
        user = User.query.filter_by(email=email).first()
        if not user:
            user = User(firebase_uid=uid, email=email, name=name,
                        profile_picture=picture, role=UserRole.HOD)
            db.session.add(user)
        else:
            if user.firebase_uid != uid:
                user.firebase_uid = uid
        db.session.commit()
        return jsonify({"user": _serialize_user(user), "onboarding_required": False})

    # ---- Existing user login (any role) ----
    user = User.query.filter_by(firebase_uid=uid).first()
    if user:
        return jsonify({"user": _serialize_user(user), "onboarding_required": False})

    # ---- Returning session with no role, but no account found ----
    # (e.g. account was removed). Don't fall through to onboarding; ask them to
    # sign in again choosing a role.
    if role is None:
        return jsonify({"error": "No account found. Please sign in again."}), 401

    # ---- New user - check if registration is open ----
    if role == "FACULTY":
        invite = InviteLink.query.filter_by(link_type="faculty").first()
        if not invite or not invite.is_active:
            return jsonify({"error": "New faculty registration is not currently accepted. Please contact HOD."}), 403
        return jsonify({
            "onboarding_required": True,
            "invite_type": "faculty",
            "prefill": {"name": name, "email": email, "profile_picture": picture, "uid": uid}
        })

    elif role == "STUDENT":
        # Check the global student registration toggle
        invite = InviteLink.query.filter_by(link_type="student", class_name=None).first()
        if not invite or not invite.is_active:
            return jsonify({
                "error": "New student registration is not currently accepted. Please contact HOD."
            }), 403
        return jsonify({
            "onboarding_required": True,
            "invite_type": "student",
            "available_classes": CLASSES,
            "prefill": {"name": name, "email": email, "profile_picture": picture, "uid": uid}
        })


@auth_bp.route("/onboard/faculty", methods=["POST"])
def onboard_faculty():
    data = request.get_json()
    required = ["uid", "email", "name", "designation", "classes_handling"]
    missing = [k for k in required if data.get(k) is None]
    if missing:
        return jsonify({"error": f"Missing fields: {', '.join(missing)}"}), 400

    # Check faculty registration toggle
    invite = InviteLink.query.filter_by(link_type="faculty", is_active=True).first()
    if not invite:
        return jsonify({"error": "New faculty registration is not currently accepted."}), 403

    if User.query.filter_by(email=data["email"]).first():
        return jsonify({"error": "Account already exists"}), 409

    user = User(
        firebase_uid=data["uid"],
        email=data["email"],
        name=data["name"],
        profile_picture=data.get("profile_picture", ""),
        role=UserRole.FACULTY,
    )
    db.session.add(user)
    db.session.flush()

    faculty = Faculty(
        user_id=user.id,
        designation=data.get("designation", "Professor"),
        classes_handling=data.get("classes_handling", []),
    )
    db.session.add(faculty)
    db.session.commit()

    return jsonify({"user": _serialize_user(user)}), 201


@auth_bp.route("/onboard/student", methods=["POST"])
def onboard_student():
    data = request.get_json()
    required = ["uid", "email", "name", "roll_number", "register_number", "class_name"]
    missing = [k for k in required if data.get(k) is None]
    if missing:
        return jsonify({"error": f"Missing fields: {', '.join(missing)}"}), 400

    # Check the global student registration toggle
    invite = InviteLink.query.filter_by(link_type="student", class_name=None, is_active=True).first()
    if not invite:
        return jsonify({"error": "New student registration is not currently accepted. Please contact HOD."}), 403

    if User.query.filter_by(email=data["email"]).first():
        return jsonify({"error": "Account already exists"}), 409

    user = User(
        firebase_uid=data["uid"],
        email=data["email"],
        name=data["name"],
        profile_picture=data.get("profile_picture", ""),
        role=UserRole.STUDENT,
    )
    db.session.add(user)
    db.session.flush()

    student = Student(
        user_id=user.id,
        roll_number=data["roll_number"],
        register_number=data["register_number"],
        class_name=data["class_name"],
    )
    db.session.add(student)
    db.session.commit()

    return jsonify({"user": _serialize_user(user)}), 201


@auth_bp.route("/fcm-token", methods=["POST"])
@require_auth
def update_fcm_token():
    data = request.get_json()
    token = data.get("fcm_token")
    if token:
        g.current_user.fcm_token = token
        db.session.commit()
    return jsonify({"ok": True})


def _serialize_user(user):
    out = {
        "id": user.id,
        "email": user.email,
        "name": user.name,
        "profile_picture": user.profile_picture,
        "role": user.role.value,
    }
    if user.role == UserRole.FACULTY and user.faculty_profile:
        out["faculty"] = {
            "designation": user.faculty_profile.designation,
            "classes_handling": user.faculty_profile.classes_handling,
            "class_incharge_of": user.faculty_profile.class_incharge_of,
            "is_update_coordinator": user.faculty_profile.is_update_coordinator,
        }
    if user.role == UserRole.STUDENT and user.student_profile:
        out["student"] = {
            "roll_number": user.student_profile.roll_number,
            "register_number": user.student_profile.register_number,
            "class_name": user.student_profile.class_name,
            "is_forum_member": user.student_profile.is_forum_member,
        }
    return out
