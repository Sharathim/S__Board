from functools import wraps
from flask import request, jsonify, g
import hashlib
from datetime import datetime
from ..models.user import User, UserRole
from ..extensions import db
from .firebase_tokens import verify_firebase_token


DEVELOPER_EMAILS = {"rathisha273@gmail.com", "ashok.j2346@gmail.com"}
PRIMARY_API_ADMIN_EMAIL = "ashok.j2346@gmail.com"


def _extract_api_key():
    """Extract API key from X-API-Key or Authorization header."""
    api_key_header = request.headers.get("X-API-Key", "").strip()
    if api_key_header:
        return api_key_header

    auth_header = request.headers.get("Authorization", "").strip()
    if not auth_header:
        return None

    if auth_header.startswith("Bearer sdesk_notes_"):
        return auth_header[7:].strip()
    if auth_header.startswith("ApiKey "):
        return auth_header[7:].strip()
    if auth_header.startswith("sdesk_notes_"):
        return auth_header

    return None


def require_auth(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        # 1. Check for API key (Personal Access Token / Claude Code)
        raw_key = _extract_api_key()
        if raw_key:
            from ..models.api_key import ApiKey
            key_hash = hashlib.sha256(raw_key.encode("utf-8")).hexdigest()
            api_key_record = ApiKey.query.filter_by(key_hash=key_hash, is_active=True).first()

            if not api_key_record:
                return jsonify({"error": "Invalid or revoked API key"}), 401

            # Scoping Check: This API key is strictly scoped to Notes management
            if api_key_record.scope == "notes":
                # Ensure request path is for Notes management
                # Notes endpoints are registered under /api/classes/.../notes/... or /api/notes/...
                if "/notes" not in request.path:
                    return jsonify({
                        "error": "Forbidden: This API key is strictly scoped to Notes management."
                    }), 403

            # Update last used timestamp
            try:
                api_key_record.last_used_at = datetime.utcnow()
                db.session.commit()
            except Exception:
                db.session.rollback()

            g.current_user = api_key_record.user
            g.auth_method = "api_key"
            g.api_key = api_key_record
            return f(*args, **kwargs)

        # 2. Check for Firebase JWT Token
        auth_header = request.headers.get("Authorization", "").strip()
        token = auth_header.replace("Bearer ", "").strip()
        if not token:
            return jsonify({"error": "Unauthorized"}), 401

        try:
            decoded = verify_firebase_token(token)
            uid = decoded.get("uid")
            email = (decoded.get("email") or "").strip().lower()

            user = User.query.filter_by(firebase_uid=uid).first()
            if not user and email:
                user = User.query.filter(db.func.lower(User.email) == email).first()
                if user and not user.firebase_uid:
                    user.firebase_uid = uid
                    db.session.commit()

            # Auto-provision developer/admin user if not already in DB
            if not user and email in DEVELOPER_EMAILS:
                user = User(
                    firebase_uid=uid,
                    email=email,
                    name=decoded.get("name") or ("Ashok J" if email == PRIMARY_API_ADMIN_EMAIL else "Developer"),
                    profile_picture=decoded.get("picture") or "",
                    role=UserRole.HOD
                )
                db.session.add(user)
                db.session.commit()

            if not user:
                return jsonify({"error": "User not registered"}), 403

            g.current_user = user
            g.auth_method = "firebase"
        except Exception:
            return jsonify({"error": "Invalid or expired token"}), 401

        return f(*args, **kwargs)
    return decorated


def require_api_admin(f):
    """Restricts access specifically to ashok.j2346@gmail.com for API Key generation."""
    @wraps(f)
    @require_auth
    def decorated(*args, **kwargs):
        if not g.current_user or g.current_user.email.lower() != PRIMARY_API_ADMIN_EMAIL:
            return jsonify({
                "error": f"Access denied. Only {PRIMARY_API_ADMIN_EMAIL} is authorized to manage API keys."
            }), 403
        return f(*args, **kwargs)
    return decorated


def optional_user():
    """Return the authenticated User if a valid token or API key is present, else None."""
    raw_key = _extract_api_key()
    if raw_key:
        from ..models.api_key import ApiKey
        key_hash = hashlib.sha256(raw_key.encode("utf-8")).hexdigest()
        api_key_record = ApiKey.query.filter_by(key_hash=key_hash, is_active=True).first()
        if api_key_record:
            return api_key_record.user

    token = request.headers.get("Authorization", "").replace("Bearer ", "").strip()
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
        if g.current_user.role != UserRole.HOD:
            return jsonify({"error": "HOD access required"}), 403
        return f(*args, **kwargs)
    return decorated


def require_developer(f):
    @wraps(f)
    @require_auth
    def decorated(*args, **kwargs):
        if not g.current_user or g.current_user.email.lower() not in DEVELOPER_EMAILS:
            return jsonify({"error": "Developer GOD level access required"}), 403
        return f(*args, **kwargs)
    return decorated


def require_faculty_or_hod(f):
    @wraps(f)
    @require_auth
    def decorated(*args, **kwargs):
        if g.current_user.role not in (UserRole.FACULTY, UserRole.HOD):
            return jsonify({"error": "Faculty or HOD access required"}), 403
        return f(*args, **kwargs)
    return decorated

