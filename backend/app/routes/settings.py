from flask import Blueprint, request, jsonify, g
from ..extensions import db
from ..utils.auth_middleware import require_auth
from ..utils.cloudinary_helper import upload_file

settings_bp = Blueprint("settings", __name__)


@settings_bp.route("/push-notifications", methods=["PATCH"])
@require_auth
def toggle_push_notifications():
    data = request.get_json()
    enabled = data.get("enabled")
    if enabled is None:
        return jsonify({"error": "enabled field required"}), 400

    g.current_user.push_enabled = bool(enabled)
    if not enabled:
        g.current_user.fcm_token = None
    db.session.commit()

    return jsonify({"push_enabled": g.current_user.push_enabled})


@settings_bp.route("/profile", methods=["PATCH"])
@require_auth
def update_profile():
    user = g.current_user

    if request.files:
        name = request.form.get("name")
        file = request.files.get("profile_picture")

        if name:
            user.name = name

        if file:
            try:
                result = upload_file(file, folder="dpms/profile_pictures")
                user.profile_picture = result["url"]
            except ValueError as e:
                return jsonify({"error": str(e)}), 400
    else:
        data = request.get_json()
        if data.get("name"):
            user.name = data["name"]

    db.session.commit()

    return jsonify({
        "name": user.name,
        "profile_picture": user.profile_picture,
        "email": user.email,
    })
