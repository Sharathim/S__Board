from flask import Blueprint, request, jsonify, g, current_app
from ..models.user import User, UserRole
from ..utils.auth_middleware import require_auth
from ..utils.mail_helper import send_smtp_email
from ..extensions import db

mail_bp = Blueprint("mail", __name__)

@mail_bp.route("/smtp-status", methods=["GET"])
@require_auth
def get_smtp_status():
    """
    Check if the SMTP configurations are set in the application environment variables.
    """
    if g.current_user.role not in [UserRole.HOD, UserRole.FACULTY]:
        return jsonify({"error": "Access denied"}), 403

    smtp_host = current_app.config.get("SMTP_HOST")
    smtp_user = current_app.config.get("SMTP_USER")
    smtp_password = current_app.config.get("SMTP_PASSWORD")
    
    is_configured = bool(smtp_host and smtp_user and smtp_password)
    
    return jsonify({
        "configured": is_configured,
        "smtp_host": smtp_host,
        "smtp_user": smtp_user,
    })

@mail_bp.route("/recipients", methods=["GET"])
@require_auth
def get_recipients():
    """
    Query and return all active registered users in HIVE, sorted by name, 
    to populate the selected recipients UI.
    """
    if g.current_user.role not in [UserRole.HOD, UserRole.FACULTY]:
        return jsonify({"error": "Access denied"}), 403

    users = User.query.order_by(User.name).all()
    
    serialized_users = []
    for u in users:
        serialized_users.append({
            "id": u.id,
            "name": u.name,
            "email": u.email,
            "role": u.role.value,
            "profile_picture": u.profile_picture
        })
        
    return jsonify({
        "recipients": serialized_users
    })

@mail_bp.route("/send", methods=["POST"])
@require_auth
def send_mail():
    """
    Sends email to a select segment or chosen lists of users inside the HIVE.
    """
    if g.current_user.role not in [UserRole.HOD, UserRole.FACULTY]:
        return jsonify({"error": "Access denied"}), 403

    data = request.get_json()
    if not data:
        return jsonify({"error": "Request body missing"}), 400

    subject = data.get("subject")
    body = data.get("body")
    recipient_type = data.get("recipient_type")  # 'all', 'faculty', 'students', 'custom'
    selected_emails = data.get("selected_emails", [])  # list of emails if 'custom'

    if not subject or not body or not recipient_type:
        return jsonify({"error": "subject, body, and recipient_type are required fields"}), 400

    # Retrieve lists of emails from DB depending on target type
    emails = []
    if recipient_type == "all":
        users = User.query.all()
        emails = [u.email for u in users if u.email]
    elif recipient_type == "faculty":
        users = User.query.filter_by(role=UserRole.FACULTY).all()
        emails = [u.email for u in users if u.email]
    elif recipient_type == "students":
        users = User.query.filter_by(role=UserRole.STUDENT).all()
        emails = [u.email for u in users if u.email]
    elif recipient_type == "custom":
        if not selected_emails:
            return jsonify({"error": "selected_emails list required when recipient_type is 'custom'"}), 400
        # Ensure we only send to active users found in the system
        db_users = User.query.filter(User.email.in_(selected_emails)).all()
        emails = [u.email for u in db_users if u.email]
    else:
        return jsonify({"error": "Invalid recipient_type"}), 400

    if not emails:
        return jsonify({"error": "No matching recipient emails found"}), 404

    sender_name = g.current_user.name
    sender_role = g.current_user.role.value
    
    # Replace single newlines with HTML breaks for rich HTML version
    formatted_body = body.replace("\n", "<br />")
    
    # Render a premium, responsive email newsletter style card
    html_template = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>{subject}</title>
        <style>
            body {{
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
                background-color: #f8fafc;
                margin: 0;
                padding: 0;
                color: #1e293b;
            }}
            .container {{
                max-width: 600px;
                margin: 20px auto;
                background: #ffffff;
                border-radius: 12px;
                overflow: hidden;
                box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.025);
                border: 1px solid #e2e8f0;
            }}
            .header {{
                background: linear-gradient(135deg, #4f46e5, #6366f1);
                color: #ffffff;
                padding: 28px 24px;
                text-align: center;
            }}
            .header h1 {{
                margin: 0;
                font-size: 22px;
                font-weight: 800;
                letter-spacing: -0.025em;
            }}
            .content {{
                padding: 32px 24px;
                line-height: 1.6;
                font-size: 15px;
                color: #334155;
            }}
            .footer {{
                background-color: #f1f5f9;
                padding: 20px 24px;
                text-align: center;
                font-size: 12px;
                color: #64748b;
                border-top: 1px solid #e2e8f0;
            }}
            .meta-badge {{
                display: inline-block;
                padding: 4px 10px;
                background-color: rgba(255, 255, 255, 0.2);
                color: #ffffff;
                border-radius: 9999px;
                font-weight: 600;
                font-size: 11px;
                margin-top: 10px;
                letter-spacing: 0.025em;
            }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>HIVE Department Announcement</h1>
                <div class="meta-badge">Sent by {sender_name} ({sender_role})</div>
            </div>
            <div class="content">
                {formatted_body}
            </div>
            <div class="footer">
                <p>This message was sent to you from the HIVE Academic Management Board.</p>
                <p style="margin-top: 8px; font-weight: bold; color: #475569;">Do not reply directly to this email.</p>
            </div>
        </div>
    </body>
    </html>
    """

    plain_text_body = f"""
    HIVE Department Announcement
    Sent by: {sender_name} ({sender_role})
    
    --------------------------------------------------
    
    {body}
    
    --------------------------------------------------
    This message was sent to you from the HIVE Academic Management Board.
    Do not reply directly to this email.
    """

    try:
        send_smtp_email(
            recipients=emails,
            subject=subject,
            body_html=html_template,
            body_text=plain_text_body
        )
        return jsonify({"ok": True, "recipient_count": len(emails)})
    except Exception as e:
        return jsonify({"error": f"Failed to send email: {str(e)}"}), 500
