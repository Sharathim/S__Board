import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from flask import current_app

logger = logging.getLogger(__name__)

def send_smtp_email(recipients, subject, body_html, body_text=None):
    """
    Sends an email to a list of recipients using SMTP configurations.
    Uses BCC to keep recipient addresses private.
    """
    if not recipients:
        logger.warning("No recipients provided for SMTP email.")
        return False

    smtp_host = current_app.config.get("SMTP_HOST")
    smtp_port = current_app.config.get("SMTP_PORT")
    smtp_user = current_app.config.get("SMTP_USER")
    smtp_password = current_app.config.get("SMTP_PASSWORD")
    smtp_sender = current_app.config.get("SMTP_SENDER") or smtp_user
    smtp_use_tls = current_app.config.get("SMTP_USE_TLS", True)

    if not smtp_host or not smtp_user or not smtp_password:
        logger.error("SMTP settings are not fully configured in environment variables.")
        raise ValueError("SMTP configuration is incomplete. Host, username, and password are required.")

    # Convert recipients to a unique list of emails, filtering out empty values
    unique_recipients = list(set([r.strip() for r in recipients if r and r.strip()]))
    if not unique_recipients:
        logger.warning("Recipients list empty after filtering.")
        return False

    logger.info(f"Preparing to send mail to {len(unique_recipients)} recipients via {smtp_host}:{smtp_port}")

    # Build the base email structure
    # Since we are using BCC to protect privacy, we set the 'To' field to the sender's own email.
    msg_template = MIMEMultipart("alternative")
    msg_template["Subject"] = subject
    msg_template["From"] = smtp_sender
    msg_template["To"] = smtp_sender

    if body_text:
        part_text = MIMEText(body_text, "plain")
        msg_template.attach(part_text)
    
    part_html = MIMEText(body_html, "html")
    msg_template.attach(part_html)

    # Establish SMTP connection
    try:
        if smtp_use_tls and smtp_port == 465:
            logger.debug("Connecting using SMTP SSL...")
            server = smtplib.SMTP_SSL(smtp_host, smtp_port, timeout=15)
        else:
            logger.debug("Connecting using standard SMTP...")
            server = smtplib.SMTP(smtp_host, smtp_port, timeout=15)
            if smtp_use_tls:
                logger.debug("Starting TLS encryption...")
                server.starttls()
        
        logger.debug("Logging in to SMTP server...")
        server.login(smtp_user, smtp_password)

        # Chunk recipients list to avoid BCC limits (standard limit is often 50-100)
        chunk_size = 50
        for i in range(0, len(unique_recipients), chunk_size):
            chunk = unique_recipients[i:i + chunk_size]
            logger.info(f"Sending chunk of {len(chunk)} emails...")
            # sendmail: (from_addr, to_addrs_list, msg_string)
            # The SMTP protocol sends to all addresses in the second parameter.
            # Since To is set to the sender, the actual recipients in 'chunk' receive it as BCC.
            server.sendmail(smtp_sender, chunk, msg_template.as_string())

        server.quit()
        logger.info("Successfully sent all email chunks.")
        return True

    except Exception as e:
        logger.exception("Failed to send email via SMTP.")
        raise e
