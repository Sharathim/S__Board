from flask import Blueprint, request, jsonify, g
import hashlib
import secrets
from ..extensions import db
from ..models.api_key import ApiKey
from ..utils.auth_middleware import require_api_admin

api_admin_bp = Blueprint("api_admin", __name__)


@api_admin_bp.route("/status", methods=["GET"])
@require_api_admin
def check_status():
    """Verify admin status for ashok.j2346@gmail.com."""
    return jsonify({
        "authorized": True,
        "email": g.current_user.email,
        "name": g.current_user.name,
        "role": g.current_user.role.value if hasattr(g.current_user.role, "value") else str(g.current_user.role),
    })


@api_admin_bp.route("/keys", methods=["GET"])
@require_api_admin
def list_keys():
    """List all API keys generated for Notes management."""
    keys = ApiKey.query.filter_by(user_id=g.current_user.id).order_by(ApiKey.created_at.desc()).all()
    return jsonify({
        "keys": [k.to_dict() for k in keys],
        "count": len(keys),
        "admin_email": g.current_user.email
    })


@api_admin_bp.route("/keys", methods=["POST"])
@require_api_admin
def create_key():
    """Generate a new secure API Key scoped strictly to Notes management."""
    data = request.get_json() or {}
    name = data.get("name", "").strip() or "Claude Code - Notes Agent"

    # Generate cryptographic random token
    token_entropy = secrets.token_urlsafe(32)
    raw_key = f"sdesk_notes_{token_entropy}"
    key_hash = hashlib.sha256(raw_key.encode("utf-8")).hexdigest()
    key_prefix = f"sdesk_notes_{token_entropy[:6]}...{token_entropy[-4:]}"

    api_key = ApiKey(
        user_id=g.current_user.id,
        key_hash=key_hash,
        key_prefix=key_prefix,
        name=name,
        scope="notes",
        is_active=True
    )

    db.session.add(api_key)
    db.session.commit()

    return jsonify({
        "message": "API Key generated successfully! Store this key safely as it will not be shown again.",
        "raw_key": raw_key,
        "key": api_key.to_dict()
    }), 201


@api_admin_bp.route("/keys/<int:key_id>", methods=["DELETE"])
@require_api_admin
def delete_key(key_id):
    """Revoke and delete an API key."""
    key = ApiKey.query.filter_by(id=key_id, user_id=g.current_user.id).first()
    if not key:
        return jsonify({"error": "API Key not found or unauthorized"}), 404

    db.session.delete(key)
    db.session.commit()

    return jsonify({
        "ok": True,
        "message": f"API Key '{key.name}' ({key.key_prefix}) has been revoked."
    })


@api_admin_bp.route("/keys/<int:key_id>/toggle", methods=["PATCH"])
@require_api_admin
def toggle_key(key_id):
    """Enable or disable an API key without deleting it."""
    key = ApiKey.query.filter_by(id=key_id, user_id=g.current_user.id).first()
    if not key:
        return jsonify({"error": "API Key not found or unauthorized"}), 404

    key.is_active = not key.is_active
    db.session.commit()

    state = "activated" if key.is_active else "deactivated"
    return jsonify({
        "message": f"API Key has been {state}.",
        "key": key.to_dict()
    })
