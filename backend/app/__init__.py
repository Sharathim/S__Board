from flask import Flask
from .config import Config
from .extensions import db, migrate, socketio, cors
from .utils.error_handlers import register_error_handlers
import firebase_admin
from firebase_admin import credentials
import cloudinary


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    # Extensions
    db.init_app(app)
    with app.app_context():
        try:
            from . import models
            db.create_all()
            print("Database tables initialized successfully via create_all() at startup.")
        except Exception as e:
            print(f"Database initialization at startup warning/error: {e}")
    migrate.init_app(app, db)
    cors.init_app(app, resources={r"/api/*": {"origins": app.config["FRONTEND_URL"]}})
    socketio.init_app(
        app,
        cors_allowed_origins=app.config["FRONTEND_URL"],
        async_mode="eventlet"
    )

    # Firebase Admin
    cred = credentials.Certificate(app.config["FIREBASE_SERVICE_ACCOUNT_PATH"])
    firebase_admin.initialize_app(cred)

    # Cloudinary
    cloudinary.config(
        cloud_name=app.config["CLOUDINARY_CLOUD_NAME"],
        api_key=app.config["CLOUDINARY_API_KEY"],
        api_secret=app.config["CLOUDINARY_API_SECRET"]
    )

    # Register blueprints
    from .routes.auth import auth_bp
    from .routes.faculty import faculty_bp
    from .routes.classes import classes_bp
    from .routes.notes import notes_bp
    from .routes.student_forms import student_forms_bp
    from .routes.forum import forum_bp
    from .routes.projects import projects_bp
    from .routes.updates import updates_bp
    from .routes.notifications import notifications_bp
    from .routes.settings import settings_bp
    from .routes.mail import mail_bp
    from .routes.developer import developer_bp

    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(faculty_bp, url_prefix="/api/faculty")
    app.register_blueprint(classes_bp, url_prefix="/api/classes")
    app.register_blueprint(notes_bp, url_prefix="/api/classes")
    app.register_blueprint(student_forms_bp, url_prefix="/api/classes")
    app.register_blueprint(forum_bp, url_prefix="/api/forum")
    app.register_blueprint(projects_bp, url_prefix="/api/projects")
    app.register_blueprint(updates_bp, url_prefix="/api/updates")
    app.register_blueprint(notifications_bp, url_prefix="/api/notifications")
    app.register_blueprint(settings_bp, url_prefix="/api/settings")
    app.register_blueprint(mail_bp, url_prefix="/api/mail")
    app.register_blueprint(developer_bp, url_prefix="/api/developer")

    # Socket handlers
    from .sockets import progress_monitor  # noqa

    # Error handlers
    register_error_handlers(app)

    # Scheduler for Low Activity detection
    from apscheduler.schedulers.background import BackgroundScheduler
    from .utils.activity_checker import check_low_activity
    scheduler = BackgroundScheduler()
    scheduler.add_job(check_low_activity, "interval", hours=6, args=[app])
    scheduler.start()

    return app
