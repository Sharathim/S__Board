from flask import Blueprint, request, jsonify, g, current_app
from ..models.user import User, UserRole
from ..models.invite import InviteLink
from ..extensions import db
from ..utils.auth_middleware import require_auth
from ..utils.firebase_tokens import verify_firebase_token

auth_bp = Blueprint("auth", __name__)


@auth_bp.route("/verify", methods=["POST"])
def verify_token():
    data = request.get_json()
    id_token = data.get("idToken")
    invite_token = data.get("inviteToken")

    if not id_token:
        return jsonify({"error": "idToken required"}), 400

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

    if email == current_app.config["HOD_EMAIL"]:
        user = User.query.filter_by(email=email).first()
        if not user:
            user = User(firebase_uid=uid, email=email, name=name,
                        profile_picture=picture, role=UserRole.HOD)
            db.session.add(user)
        else:
            if user.firebase_uid != uid:
                user.firebase_uid = uid
        db.session.commit()
        return jsonify({
            "user": _serialize_user(user),
            "onboarding_required": False
        })

    user = User.query.filter_by(firebase_uid=uid).first()
    if user:
        return jsonify({
            "user": _serialize_user(user),
            "onboarding_required": False
        })

    if not invite_token:
        return jsonify({"error": "No account found. An invite link is required."}), 403

    invite = InviteLink.query.filter_by(token=invite_token, is_active=True).first()
    if not invite:
        return jsonify({"error": "Invite link is invalid or disabled."}), 403

    return jsonify({
        "onboarding_required": True,
        "invite_type": invite.link_type,
        "class_name": invite.class_name,
        "prefill": {"name": name, "email": email, "profile_picture": picture, "uid": uid}
    })


@auth_bp.route("/onboard/faculty", methods=["POST"])
def onboard_faculty():
    data = request.get_json()
    required = ["uid", "email", "name", "designation", "classes_handling", "invite_token"]
    if not all(data.get(k) for k in required):
        return jsonify({"error": "All fields required"}), 400

    invite = InviteLink.query.filter_by(token=data["invite_token"], is_active=True).first()
    if not invite or invite.link_type != "faculty":
        return jsonify({"error": "Invalid invite"}), 403

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

    from ..models.faculty import Faculty
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
    required = ["uid", "email", "name", "roll_number", "register_number", "class_name", "invite_token"]
    if not all(data.get(k) for k in required):
        return jsonify({"error": "All fields required"}), 400

    invite = InviteLink.query.filter_by(token=data["invite_token"], is_active=True).first()
    if not invite or invite.link_type != "student":
        return jsonify({"error": "Invalid invite"}), 403

    if invite.class_name != data["class_name"]:
        return jsonify({"error": "Class mismatch"}), 400

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

    from ..models.student import Student
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
