from functools import wraps
from flask import request, jsonify, g
from ..models.user import User
from ..extensions import db
from .firebase_tokens import verify_firebase_token


def require_auth(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get("Authorization", "").replace("Bearer ", "")
        if not token:
            return jsonify({"error": "Unauthorized"}), 401
        try:
            decoded = verify_firebase_token(token)
            user = User.query.filter_by(firebase_uid=decoded["uid"]).first()
            if not user:
                return jsonify({"error": "User not registered"}), 403
            g.current_user = user
        except Exception:
            return jsonify({"error": "Invalid or expired token"}), 401
        return f(*args, **kwargs)
    return decorated


def optional_user():
    """Return the authenticated User if a valid token is present, else None.
    For endpoints that are public but enrich the response for logged-in users.
    """
    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    if not token:
        return None
    try:
        decoded = verify_firebase_token(token)
        return User.query.filter_by(firebase_uid=decoded["uid"]).first()
    except Exception:
        return None


def require_hod(f):
    @wraps(f)
    @require_auth
    def decorated(*args, **kwargs):
        from ..models.user import UserRole
        if g.current_user.role != UserRole.HOD:
            return jsonify({"error": "HOD access required"}), 403
        return f(*args, **kwargs)
    return decorated
