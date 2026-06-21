from flask import Flask
from .config import Config
from .extensions import db, migrate, socketio, cors, get_redis
from .utils.error_handlers import register_error_handlers
import firebase_admin
from firebase_admin import credentials
import cloudinary


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    # Extensions
    db.init_app(app)
    migrate.init_app(app, db)
    cors.init_app(app, resources={r"/api/*": {"origins": app.config["FRONTEND_URL"]}})
    socketio.init_app(
        app,
        cors_allowed_origins=app.config["FRONTEND_URL"],
        message_queue=app.config["REDIS_URL"],
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

    # Redis
    app.redis = get_redis(app)

    # Register blueprints
    from .routes.auth import auth_bp
    from .routes.faculty import faculty_bp
    from .routes.classes import classes_bp
    from .routes.forum import forum_bp
    from .routes.projects import projects_bp
    from .routes.updates import updates_bp
    from .routes.notifications import notifications_bp
    from .routes.settings import settings_bp

    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(faculty_bp, url_prefix="/api/faculty")
    app.register_blueprint(classes_bp, url_prefix="/api/classes")
    app.register_blueprint(forum_bp, url_prefix="/api/forum")
    app.register_blueprint(projects_bp, url_prefix="/api/projects")
    app.register_blueprint(updates_bp, url_prefix="/api/updates")
    app.register_blueprint(notifications_bp, url_prefix="/api/notifications")
    app.register_blueprint(settings_bp, url_prefix="/api/settings")

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
