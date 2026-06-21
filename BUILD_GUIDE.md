# DPMS — Department Project Management System
## Complete AI Agent Build Guide

> **For Cursor / Copilot / AI Agents**
> Follow every section in order. Do not skip steps. Do not create files not listed here.
> After completing each section, verify it works before moving to the next.
> All errors must be handled — no unhandled promise rejections, no unhandled Flask exceptions.

---

## 0. Project Overview

| Item | Value |
|---|---|
| App Name | DPMS – Department Project Management System |
| Frontend | React 18 + Vite + TailwindCSS |
| Backend | Python Flask |
| Database | PostgreSQL 15 (inside Docker) |
| Auth | Google OAuth 2.0 via Firebase |
| File Storage | Cloudinary |
| Real-time | Flask-SocketIO + Redis |
| Push Notifications | Firebase Cloud Messaging (FCM) |
| Containerization | Docker + Docker Compose |
| Hosting Target | AWS (EC2 + RDS or fully containerized) |
| PWA | Yes — service worker + manifest |
| Theme | Light (default) + Dark (user toggle in Settings) |
| Font | Inter (Google Fonts) |

### User Roles
| Role | Description |
|---|---|
| HOD | Full admin. Only one. Logs in via Google OAuth. |
| Faculty | Added via invite link. Google OAuth. |
| Student | Added via class-specific invite link. Google OAuth. |
| Forum Member | HOD-assigned from 3A/3B students only. |
| Update Coordinator | HOD-assigned from Faculty or Forum Members. |

### Classes
- **UG:** 1A, 1B, 2A, 2B, 3A, 3B
- **PG:** 1A, 2A

---

## 1. Folder Structure

Create exactly this structure:

```
dpms/
├── docker-compose.yml
├── .env                          # root env (gitignored)
├── .gitignore
├── setup.md
├── run.md
│
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── .env                      # backend env (gitignored)
│   ├── app/
│   │   ├── __init__.py           # Flask app factory
│   │   ├── extensions.py         # db, socketio, redis instances
│   │   ├── config.py
│   │   ├── models/
│   │   │   ├── __init__.py
│   │   │   ├── user.py
│   │   │   ├── faculty.py
│   │   │   ├── student.py
│   │   │   ├── forum_member.py
│   │   │   ├── project.py
│   │   │   ├── message.py
│   │   │   ├── update.py
│   │   │   ├── notification.py
│   │   │   └── invite.py
│   │   ├── routes/
│   │   │   ├── __init__.py
│   │   │   ├── auth.py
│   │   │   ├── faculty.py
│   │   │   ├── classes.py
│   │   │   ├── forum.py
│   │   │   ├── projects.py
│   │   │   ├── updates.py
│   │   │   ├── notifications.py
│   │   │   └── settings.py
│   │   ├── sockets/
│   │   │   ├── __init__.py
│   │   │   └── progress_monitor.py
│   │   └── utils/
│   │       ├── auth_middleware.py
│   │       ├── cloudinary_helper.py
│   │       ├── fcm_helper.py
│   │       ├── error_handlers.py
│   │       └── validators.py
│   └── migrations/               # Flask-Migrate
│
└── frontend/
    ├── Dockerfile
    ├── package.json
    ├── vite.config.js
    ├── tailwind.config.js
    ├── postcss.config.js
    ├── index.html
    ├── public/
    │   ├── manifest.json
    │   ├── sw.js                  # service worker
    │   ├── icons/                 # PWA icons (192, 512)
    │   └── favicon.ico
    └── src/
        ├── main.jsx
        ├── App.jsx
        ├── firebase.js
        ├── index.css              # CSS variables + base styles
        ├── api/
        │   ├── axios.js           # axios instance with interceptors
        │   ├── auth.js
        │   ├── faculty.js
        │   ├── classes.js
        │   ├── forum.js
        │   ├── projects.js
        │   ├── updates.js
        │   └── notifications.js
        ├── context/
        │   ├── AuthContext.jsx
        │   ├── ThemeContext.jsx
        │   └── NotificationContext.jsx
        ├── hooks/
        │   ├── useAuth.js
        │   ├── useSocket.js
        │   ├── useNotifications.js
        │   └── useTheme.js
        ├── components/
        │   ├── layout/
        │   │   ├── Sidebar.jsx
        │   │   ├── TopBar.jsx
        │   │   ├── PageLayout.jsx
        │   │   └── PublicLayout.jsx
        │   ├── ui/
        │   │   ├── Button.jsx
        │   │   ├── Input.jsx
        │   │   ├── Modal.jsx
        │   │   ├── Avatar.jsx
        │   │   ├── Badge.jsx
        │   │   ├── Dropdown.jsx
        │   │   ├── Toast.jsx
        │   │   ├── Spinner.jsx
        │   │   ├── EmptyState.jsx
        │   │   ├── ErrorBoundary.jsx
        │   │   └── ConfirmDialog.jsx
        │   ├── public/
        │   │   ├── HeroSection.jsx
        │   │   ├── UpdatesSection.jsx
        │   │   ├── AboutSection.jsx
        │   │   └── HODLoginButton.jsx
        │   └── shared/
        │       ├── FileUpload.jsx
        │       ├── SearchFilter.jsx
        │       ├── Pagination.jsx
        │       └── StatusBadge.jsx
        └── pages/
            ├── public/
            │   ├── HomePage.jsx
            │   └── NotFoundPage.jsx
            ├── auth/
            │   ├── FacultyOnboarding.jsx
            │   └── StudentOnboarding.jsx
            ├── dashboard/
            │   └── DashboardPage.jsx
            ├── faculty/
            │   └── FacultyPage.jsx
            ├── classes/
            │   ├── ClassesPage.jsx
            │   └── ClassDetailPage.jsx
            ├── forum/
            │   └── ForumPage.jsx
            ├── projects/
            │   ├── ProjectsPage.jsx
            │   └── ProjectDetailPage.jsx
            ├── updates/
            │   └── UpdatesPage.jsx
            ├── notifications/
            │   └── NotificationsPage.jsx
            └── settings/
                └── SettingsPage.jsx
```

---

## 2. Docker & Infrastructure

### 2.1 `docker-compose.yml`

```yaml
version: "3.9"

services:
  postgres:
    image: postgres:15-alpine
    container_name: dpms_postgres
    restart: always
    environment:
      POSTGRES_DB: ${POSTGRES_DB}
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER}"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    container_name: dpms_redis
    restart: always
    ports:
      - "6379:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: dpms_backend
    restart: always
    env_file:
      - ./backend/.env
    environment:
      DATABASE_URL: postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}
      REDIS_URL: redis://redis:6379/0
    ports:
      - "5000:5000"
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    volumes:
      - ./backend:/app

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: dpms_frontend
    restart: always
    ports:
      - "3000:80"
    depends_on:
      - backend

volumes:
  postgres_data:
```

### 2.2 `backend/Dockerfile`

```dockerfile
FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 5000

CMD ["gunicorn", "--worker-class", "eventlet", "-w", "1", "--bind", "0.0.0.0:5000", "app:create_app()"]
```

### 2.3 `frontend/Dockerfile`

```dockerfile
FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### 2.4 `frontend/nginx.conf`

```nginx
server {
    listen 80;
    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://backend:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location /socket.io {
        proxy_pass http://backend:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

### 2.5 Root `.env`

```env
POSTGRES_DB=dpms
POSTGRES_USER=dpms_user
POSTGRES_PASSWORD=your_secure_password_here
```

---

## 3. Backend Setup

### 3.1 `backend/requirements.txt`

```
Flask==3.0.0
Flask-SQLAlchemy==3.1.1
Flask-Migrate==4.0.5
Flask-SocketIO==5.3.6
Flask-CORS==4.0.0
psycopg2-binary==2.9.9
redis==5.0.1
eventlet==0.35.1
gunicorn==21.2.0
firebase-admin==6.4.0
cloudinary==1.36.0
python-dotenv==1.0.0
marshmallow==3.20.1
Werkzeug==3.0.1
requests==2.31.0
APScheduler==3.10.4
```

### 3.2 `backend/.env`

```env
FLASK_ENV=production
SECRET_KEY=your_very_long_random_secret_key_here

DATABASE_URL=postgresql://dpms_user:your_secure_password_here@postgres:5432/dpms
REDIS_URL=redis://redis:6379/0

# Firebase (download service account JSON from Firebase Console)
FIREBASE_SERVICE_ACCOUNT_PATH=/app/firebase-service-account.json

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# HOD
HOD_EMAIL=hod@yourdomain.com

# CORS
FRONTEND_URL=http://localhost:3000
```

### 3.3 `backend/app/config.py`

```python
import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    SECRET_KEY = os.environ.get("SECRET_KEY", "dev-secret")
    SQLALCHEMY_DATABASE_URI = os.environ.get("DATABASE_URL")
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {
        "pool_pre_ping": True,
        "pool_recycle": 300,
    }
    REDIS_URL = os.environ.get("REDIS_URL", "redis://localhost:6379/0")
    FIREBASE_SERVICE_ACCOUNT_PATH = os.environ.get("FIREBASE_SERVICE_ACCOUNT_PATH")
    CLOUDINARY_CLOUD_NAME = os.environ.get("CLOUDINARY_CLOUD_NAME")
    CLOUDINARY_API_KEY = os.environ.get("CLOUDINARY_API_KEY")
    CLOUDINARY_API_SECRET = os.environ.get("CLOUDINARY_API_SECRET")
    HOD_EMAIL = os.environ.get("HOD_EMAIL")
    FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:3000")
```

### 3.4 `backend/app/extensions.py`

```python
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_socketio import SocketIO
from flask_cors import CORS
import redis as redis_client

db = SQLAlchemy()
migrate = Migrate()
socketio = SocketIO()
cors = CORS()

def get_redis(app):
    return redis_client.from_url(app.config["REDIS_URL"], decode_responses=True)
```

### 3.5 `backend/app/__init__.py`

```python
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
```

---

## 4. Database Schema

### 4.1 Enums and Constants

```python
# In each model file, use Python Enum for status fields.
# Classes list — use this everywhere classes are referenced:
CLASSES = ["UG_1A","UG_1B","UG_2A","UG_2B","UG_3A","UG_3B","PG_1A","PG_2A"]
FORUM_ELIGIBLE_CLASSES = ["UG_3A", "UG_3B"]
```

### 4.2 `backend/app/models/user.py`

```python
from ..extensions import db
from datetime import datetime
import enum

class UserRole(enum.Enum):
    HOD = "HOD"
    FACULTY = "FACULTY"
    STUDENT = "STUDENT"

class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    firebase_uid = db.Column(db.String(128), unique=True, nullable=False, index=True)
    email = db.Column(db.String(255), unique=True, nullable=False, index=True)
    name = db.Column(db.String(255), nullable=False)
    profile_picture = db.Column(db.String(500))
    role = db.Column(db.Enum(UserRole), nullable=False)
    fcm_token = db.Column(db.String(500))          # For push notifications
    push_enabled = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    faculty_profile = db.relationship("Faculty", backref="user", uselist=False, lazy="joined")
    student_profile = db.relationship("Student", backref="user", uselist=False, lazy="joined")
```

### 4.3 `backend/app/models/faculty.py`

```python
from ..extensions import db
from datetime import datetime
from sqlalchemy.dialects.postgresql import ARRAY

class Faculty(db.Model):
    __tablename__ = "faculty"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), unique=True)
    designation = db.Column(db.String(100), default="Professor")
    classes_handling = db.Column(ARRAY(db.String), default=[])
    is_update_coordinator = db.Column(db.Boolean, default=False)
    class_incharge_of = db.Column(db.String(20), nullable=True)  # e.g. "UG_3A"
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Class access grants (other faculty viewing this class)
    # Stored as list of class strings this faculty can access beyond their own
    extra_class_access = db.Column(ARRAY(db.String), default=[])
```

### 4.4 `backend/app/models/student.py`

```python
from ..extensions import db
from datetime import datetime

class Student(db.Model):
    __tablename__ = "students"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), unique=True)
    roll_number = db.Column(db.String(20), nullable=False)
    register_number = db.Column(db.String(20), nullable=False, unique=True)
    class_name = db.Column(db.String(20), nullable=False)   # e.g. "UG_3A"
    is_forum_member = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
```

### 4.5 `backend/app/models/forum_member.py`

```python
from ..extensions import db
from datetime import datetime

class ForumMember(db.Model):
    __tablename__ = "forum_members"

    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey("students.id", ondelete="CASCADE"), unique=True)
    role = db.Column(db.String(100), nullable=False)        # dropdown + custom
    is_update_coordinator = db.Column(db.Boolean, default=False)
    is_visible = db.Column(db.Boolean, default=True)        # HOD can restrict visibility
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    student = db.relationship("Student", backref="forum_profile", lazy="joined")
```

### 4.6 `backend/app/models/invite.py`

```python
from ..extensions import db
from datetime import datetime
import secrets

class InviteLink(db.Model):
    __tablename__ = "invite_links"

    id = db.Column(db.Integer, primary_key=True)
    # type: 'faculty' or 'student'
    link_type = db.Column(db.String(20), nullable=False)
    # For student links: which class this belongs to
    class_name = db.Column(db.String(20), nullable=True)
    token = db.Column(db.String(64), unique=True, nullable=False, default=lambda: secrets.token_urlsafe(32))
    is_active = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    # For student links: controlled by HOD or class incharge
    # For faculty links: controlled by HOD only
```

### 4.7 `backend/app/models/project.py`

```python
from ..extensions import db
from datetime import datetime
import enum

class ProjectStatus(enum.Enum):
    IN_PROGRESS = "IN_PROGRESS"
    LOW_ACTIVITY = "LOW_ACTIVITY"
    COMPLETED = "COMPLETED"

# Association tables
project_members = db.Table(
    "project_members",
    db.Column("project_id", db.Integer, db.ForeignKey("projects.id", ondelete="CASCADE")),
    db.Column("user_id", db.Integer, db.ForeignKey("users.id", ondelete="CASCADE")),
    db.Column("role_in_project", db.String(20)),  # 'student', 'faculty', 'forum_member'
)

class Project(db.Model):
    __tablename__ = "projects"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text, nullable=True)
    status = db.Column(db.Enum(ProjectStatus), default=ProjectStatus.IN_PROGRESS)
    created_by = db.Column(db.Integer, db.ForeignKey("users.id"))  # Always HOD
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    members = db.relationship("User", secondary=project_members, backref="projects", lazy="dynamic")
    messages = db.relationship("ProjectMessage", backref="project", lazy="dynamic",
                               cascade="all, delete-orphan")

    def last_message_time(self):
        last = self.messages.order_by(ProjectMessage.created_at.desc()).first()
        return last.created_at if last else self.created_at
```

### 4.8 `backend/app/models/message.py`

```python
from ..extensions import db
from datetime import datetime

class ProjectMessage(db.Model):
    __tablename__ = "project_messages"

    id = db.Column(db.Integer, primary_key=True)
    project_id = db.Column(db.Integer, db.ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    sender_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    content = db.Column(db.Text, nullable=True)
    is_deleted = db.Column(db.Boolean, default=False)
    is_edited = db.Column(db.Boolean, default=False)
    # Cloudinary attachment
    attachment_url = db.Column(db.String(500), nullable=True)
    attachment_type = db.Column(db.String(50), nullable=True)  # 'image', 'video', 'document'
    attachment_name = db.Column(db.String(255), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    sender = db.relationship("User", foreign_keys=[sender_id], lazy="joined")
```

### 4.9 `backend/app/models/update.py`

```python
from ..extensions import db
from datetime import datetime

update_likes = db.Table(
    "update_likes",
    db.Column("update_id", db.Integer, db.ForeignKey("updates.id", ondelete="CASCADE")),
    db.Column("user_id", db.Integer, db.ForeignKey("users.id", ondelete="CASCADE")),
)

class Update(db.Model):
    __tablename__ = "updates"

    id = db.Column(db.Integer, primary_key=True)
    content = db.Column(db.Text, nullable=False)
    posted_by = db.Column(db.Integer, db.ForeignKey("users.id"))
    is_deleted = db.Column(db.Boolean, default=False)
    is_edited = db.Column(db.Boolean, default=False)
    attachment_url = db.Column(db.String(500), nullable=True)
    attachment_type = db.Column(db.String(50), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    likes = db.relationship("User", secondary=update_likes, lazy="dynamic")
```

### 4.10 `backend/app/models/notification.py`

```python
from ..extensions import db
from datetime import datetime

class Notification(db.Model):
    __tablename__ = "notifications"

    id = db.Column(db.Integer, primary_key=True)
    recipient_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title = db.Column(db.String(255), nullable=False)
    body = db.Column(db.Text, nullable=False)
    type = db.Column(db.String(50))   # 'project_assigned', 'new_update', 'forum_assigned', etc.
    reference_id = db.Column(db.Integer, nullable=True)  # id of the related entity
    is_read = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
```

---

## 5. Backend Utilities

### 5.1 `backend/app/utils/error_handlers.py`

```python
from flask import jsonify

def register_error_handlers(app):
    @app.errorhandler(400)
    def bad_request(e):
        return jsonify({"error": "Bad request", "message": str(e)}), 400

    @app.errorhandler(401)
    def unauthorized(e):
        return jsonify({"error": "Unauthorized", "message": "Authentication required"}), 401

    @app.errorhandler(403)
    def forbidden(e):
        return jsonify({"error": "Forbidden", "message": "You do not have permission"}), 403

    @app.errorhandler(404)
    def not_found(e):
        return jsonify({"error": "Not found", "message": str(e)}), 404

    @app.errorhandler(422)
    def unprocessable(e):
        return jsonify({"error": "Unprocessable", "message": str(e)}), 422

    @app.errorhandler(500)
    def internal_error(e):
        return jsonify({"error": "Internal server error", "message": "Something went wrong"}), 500
```

### 5.2 `backend/app/utils/auth_middleware.py`

```python
from functools import wraps
from flask import request, jsonify, g
from firebase_admin import auth as firebase_auth
from ..models.user import User
from ..extensions import db

def require_auth(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get("Authorization", "").replace("Bearer ", "")
        if not token:
            return jsonify({"error": "Unauthorized"}), 401
        try:
            decoded = firebase_auth.verify_id_token(token)
            user = User.query.filter_by(firebase_uid=decoded["uid"]).first()
            if not user:
                return jsonify({"error": "User not registered"}), 403
            g.current_user = user
        except Exception:
            return jsonify({"error": "Invalid or expired token"}), 401
        return f(*args, **kwargs)
    return decorated

def require_hod(f):
    @wraps(f)
    @require_auth
    def decorated(*args, **kwargs):
        from ..models.user import UserRole
        if g.current_user.role != UserRole.HOD:
            return jsonify({"error": "HOD access required"}), 403
        return f(*args, **kwargs)
    return decorated
```

### 5.3 `backend/app/utils/cloudinary_helper.py`

```python
import cloudinary.uploader

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/gif", "image/webp"}
ALLOWED_DOC_TYPES = {"application/pdf", "application/msword",
                      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"}
ALLOWED_VIDEO_TYPES = {"video/mp4", "video/webm"}
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB

def upload_file(file, folder="dpms"):
    """Upload a file to Cloudinary. Returns dict with url, type, name."""
    if not file:
        return None

    content_type = file.content_type
    file.seek(0, 2)
    size = file.tell()
    file.seek(0)

    if size > MAX_FILE_SIZE:
        raise ValueError("File too large. Max 50MB.")

    if content_type in ALLOWED_IMAGE_TYPES:
        resource_type = "image"
        file_type = "image"
    elif content_type in ALLOWED_VIDEO_TYPES:
        resource_type = "video"
        file_type = "video"
    elif content_type in ALLOWED_DOC_TYPES:
        resource_type = "raw"
        file_type = "document"
    else:
        raise ValueError(f"File type {content_type} not allowed.")

    result = cloudinary.uploader.upload(
        file,
        folder=folder,
        resource_type=resource_type,
    )
    return {
        "url": result["secure_url"],
        "type": file_type,
        "name": file.filename,
        "public_id": result["public_id"],
    }

def delete_file(public_id, resource_type="image"):
    cloudinary.uploader.destroy(public_id, resource_type=resource_type)
```

### 5.4 `backend/app/utils/fcm_helper.py`

```python
from firebase_admin import messaging
from ..models.notification import Notification
from ..models.user import User
from ..extensions import db

def send_notification(recipient_id: int, title: str, body: str,
                       notif_type: str, reference_id: int = None):
    """Create in-app notification and send push notification via FCM."""
    # Save in-app notification
    notif = Notification(
        recipient_id=recipient_id,
        title=title,
        body=body,
        type=notif_type,
        reference_id=reference_id,
    )
    db.session.add(notif)
    db.session.commit()

    # Send FCM push
    user = User.query.get(recipient_id)
    if user and user.fcm_token and user.push_enabled:
        try:
            message = messaging.Message(
                notification=messaging.Notification(title=title, body=body),
                token=user.fcm_token,
                data={"type": notif_type, "reference_id": str(reference_id or "")},
            )
            messaging.send(message)
        except Exception:
            pass  # Push failure should never crash the main flow

def send_bulk_notification(recipient_ids: list, title: str, body: str,
                            notif_type: str, reference_id: int = None):
    for rid in recipient_ids:
        send_notification(rid, title, body, notif_type, reference_id)
```

### 5.5 `backend/app/utils/activity_checker.py`

```python
from datetime import datetime, timedelta

def check_low_activity(app):
    """Run every 6 hours. Mark projects as LOW_ACTIVITY if no message in 3 days."""
    with app.app_context():
        from ..models.project import Project, ProjectStatus
        from ..extensions import db

        threshold = datetime.utcnow() - timedelta(days=3)
        active_projects = Project.query.filter(
            Project.status == ProjectStatus.IN_PROGRESS
        ).all()

        for project in active_projects:
            if project.last_message_time() < threshold:
                project.status = ProjectStatus.LOW_ACTIVITY

        db.session.commit()
```

---

## 6. Backend Routes

### 6.1 `backend/app/routes/auth.py`

```python
from flask import Blueprint, request, jsonify, g, current_app
from firebase_admin import auth as firebase_auth
from ..models.user import User, UserRole
from ..models.invite import InviteLink
from ..extensions import db
from ..utils.auth_middleware import require_auth

auth_bp = Blueprint("auth", __name__)

@auth_bp.route("/verify", methods=["POST"])
def verify_token():
    """
    Called after Google OAuth on frontend.
    Returns user info + role. If new user from invite link,
    returns onboarding_required=True.
    """
    data = request.get_json()
    id_token = data.get("idToken")
    invite_token = data.get("inviteToken")  # optional

    if not id_token:
        return jsonify({"error": "idToken required"}), 400

    try:
        decoded = firebase_auth.verify_id_token(id_token)
    except Exception:
        return jsonify({"error": "Invalid token"}), 401

    email = decoded.get("email")
    uid = decoded.get("uid")
    name = decoded.get("name", "")
    picture = decoded.get("picture", "")

    # Check if HOD
    if email == current_app.config["HOD_EMAIL"]:
        user = User.query.filter_by(email=email).first()
        if not user:
            user = User(firebase_uid=uid, email=email, name=name,
                        profile_picture=picture, role=UserRole.HOD)
            db.session.add(user)
            db.session.commit()
        return jsonify({
            "user": _serialize_user(user),
            "onboarding_required": False
        })

    # Existing user
    user = User.query.filter_by(firebase_uid=uid).first()
    if user:
        return jsonify({
            "user": _serialize_user(user),
            "onboarding_required": False
        })

    # New user — must have valid invite token
    if not invite_token:
        return jsonify({"error": "No account found. An invite link is required."}), 403

    invite = InviteLink.query.filter_by(token=invite_token, is_active=True).first()
    if not invite:
        return jsonify({"error": "Invite link is invalid or disabled."}), 403

    return jsonify({
        "onboarding_required": True,
        "invite_type": invite.link_type,
        "class_name": invite.class_name,  # pre-set for student invites
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

    # Class must match the invite's class
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
```

### 6.2 `backend/app/routes/projects.py`

```python
from flask import Blueprint, request, jsonify, g
from ..extensions import db
from ..models.project import Project, ProjectStatus, project_members
from ..models.user import User, UserRole
from ..models.message import ProjectMessage
from ..utils.auth_middleware import require_auth, require_hod
from ..utils.cloudinary_helper import upload_file
from ..utils.fcm_helper import send_notification
from datetime import datetime, timedelta
from sqlalchemy import text

projects_bp = Blueprint("projects", __name__)

def _is_project_member(project, user):
    return user.role == UserRole.HOD or project.members.filter_by(id=user.id).count() > 0

def _serialize_project(project):
    members = db.session.execute(
        text("SELECT u.id, u.name, u.profile_picture, u.role, pm.role_in_project "
             "FROM users u JOIN project_members pm ON u.id = pm.user_id "
             "WHERE pm.project_id = :pid"),
        {"pid": project.id}
    ).fetchall()

    last_msg = project.messages.filter_by(is_deleted=False).order_by(
        ProjectMessage.created_at.desc()).first()

    return {
        "id": project.id,
        "name": project.name,
        "description": project.description,
        "status": project.status.value,
        "created_at": project.created_at.isoformat(),
        "updated_at": project.updated_at.isoformat(),
        "last_message_time": project.last_message_time().isoformat(),
        "members": [
            {
                "id": m.id,
                "name": m.name,
                "profile_picture": m.profile_picture,
                "role": m.role,
                "role_in_project": m.role_in_project,
            }
            for m in members
        ],
    }


@projects_bp.route("/", methods=["GET"])
@require_auth
def list_projects():
    user = g.current_user

    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 10, type=int)
    search = request.args.get("search", "")
    status_filter = request.args.get("status", "")

    if user.role == UserRole.HOD:
        query = Project.query
    else:
        query = Project.query.filter(
            Project.members.any(id=user.id)
        )

    if search:
        query = query.filter(Project.name.ilike(f"%{search}%"))
    if status_filter:
        try:
            query = query.filter(Project.status == ProjectStatus(status_filter))
        except ValueError:
            pass

    paginated = query.order_by(Project.updated_at.desc()).paginate(
        page=page, per_page=per_page, error_out=False
    )

    return jsonify({
        "projects": [_serialize_project(p) for p in paginated.items],
        "total": paginated.total,
        "pages": paginated.pages,
        "page": page,
    })


@projects_bp.route("/stats", methods=["GET"])
@require_hod
def project_stats():
    from sqlalchemy import func
    total = Project.query.count()
    in_progress = Project.query.filter_by(status=ProjectStatus.IN_PROGRESS).count()
    completed = Project.query.filter_by(status=ProjectStatus.COMPLETED).count()
    low_activity = Project.query.filter_by(status=ProjectStatus.LOW_ACTIVITY).count()

    # count unique students in any project
    from ..models.user import UserRole as UR
    student_count = db.session.execute(
        text("SELECT COUNT(DISTINCT user_id) FROM project_members pm "
             "JOIN users u ON u.id = pm.user_id WHERE u.role = 'STUDENT'")
    ).scalar()

    return jsonify({
        "total": total,
        "in_progress": in_progress,
        "completed": completed,
        "low_activity": low_activity,
        "student_count": student_count or 0,
    })


@projects_bp.route("/", methods=["POST"])
@require_hod
def create_project():
    data = request.get_json()
    name = data.get("name", "").strip()
    description = data.get("description", "").strip()
    members_data = data.get("members", [])  # [{user_id, role_in_project}]

    if not name:
        return jsonify({"error": "Project name is required"}), 400
    if not members_data:
        return jsonify({"error": "At least one member is required"}), 400

    # Validate: forum member cannot be student in same project
    roles_by_user = {m["user_id"]: m["role_in_project"] for m in members_data}
    from ..models.student import Student
    from ..models.forum_member import ForumMember

    for uid, role in roles_by_user.items():
        if role == "forum_member":
            student = Student.query.filter_by(user_id=uid).first()
            if student and roles_by_user.get(uid) == "student":
                return jsonify({"error": f"User {uid} cannot be both forum member and student"}), 400

    project = Project(name=name, description=description, created_by=g.current_user.id)
    db.session.add(project)
    db.session.flush()

    for m in members_data:
        db.session.execute(
            project_members.insert().values(
                project_id=project.id,
                user_id=m["user_id"],
                role_in_project=m["role_in_project"]
            )
        )

    db.session.commit()

    # Notify all members
    for m in members_data:
        send_notification(
            recipient_id=m["user_id"],
            title="Added to a project",
            body=f"You have been added to the project: {name}",
            notif_type="project_assigned",
            reference_id=project.id,
        )

    return jsonify({"project": _serialize_project(project)}), 201


@projects_bp.route("/<int:project_id>", methods=["GET"])
@require_auth
def get_project(project_id):
    project = Project.query.get_or_404(project_id)
    if not _is_project_member(project, g.current_user):
        return jsonify({"error": "Access denied"}), 403
    return jsonify({"project": _serialize_project(project)})


@projects_bp.route("/<int:project_id>/status", methods=["PATCH"])
@require_hod
def update_status(project_id):
    project = Project.query.get_or_404(project_id)
    data = request.get_json()
    status = data.get("status")
    try:
        project.status = ProjectStatus(status)
        db.session.commit()
    except ValueError:
        return jsonify({"error": "Invalid status"}), 400
    return jsonify({"status": project.status.value})


# ── Progress Monitor Messages ──────────────────────────────

@projects_bp.route("/<int:project_id>/messages", methods=["GET"])
@require_auth
def get_messages(project_id):
    project = Project.query.get_or_404(project_id)
    if not _is_project_member(project, g.current_user):
        return jsonify({"error": "Access denied"}), 403

    page = request.args.get("page", 1, type=int)
    msgs = project.messages.order_by(ProjectMessage.created_at.asc()).paginate(
        page=page, per_page=50, error_out=False
    )

    return jsonify({
        "messages": [_serialize_message(m) for m in msgs.items],
        "total": msgs.total,
        "pages": msgs.pages,
    })


@projects_bp.route("/<int:project_id>/messages", methods=["POST"])
@require_auth
def post_message(project_id):
    project = Project.query.get_or_404(project_id)
    if not _is_project_member(project, g.current_user):
        return jsonify({"error": "Access denied"}), 403

    content = request.form.get("content", "").strip()
    file = request.files.get("attachment")
    attachment = None

    if file:
        from ..utils.cloudinary_helper import upload_file
        try:
            attachment = upload_file(file, folder="dpms/progress_monitor")
        except ValueError as e:
            return jsonify({"error": str(e)}), 400

    if not content and not attachment:
        return jsonify({"error": "Message cannot be empty"}), 400

    msg = ProjectMessage(
        project_id=project_id,
        sender_id=g.current_user.id,
        content=content,
        attachment_url=attachment["url"] if attachment else None,
        attachment_type=attachment["type"] if attachment else None,
        attachment_name=attachment["name"] if attachment else None,
    )
    db.session.add(msg)

    # Update project updated_at for activity tracking
    project.updated_at = datetime.utcnow()
    if project.status == ProjectStatus.LOW_ACTIVITY:
        project.status = ProjectStatus.IN_PROGRESS

    db.session.commit()

    # Emit via SocketIO
    from ..extensions import socketio
    socketio.emit(f"new_message_{project_id}", _serialize_message(msg))

    return jsonify({"message": _serialize_message(msg)}), 201


@projects_bp.route("/<int:project_id>/messages/<int:message_id>", methods=["PATCH"])
@require_auth
def edit_message(project_id, message_id):
    msg = ProjectMessage.query.filter_by(id=message_id, project_id=project_id).first_or_404()

    if msg.sender_id != g.current_user.id:
        return jsonify({"error": "Cannot edit others' messages"}), 403

    if msg.is_deleted:
        return jsonify({"error": "Cannot edit a deleted message"}), 400

    edit_window = timedelta(minutes=30)
    if datetime.utcnow() - msg.created_at > edit_window:
        return jsonify({"error": "Edit window expired (30 minutes)"}), 400

    data = request.get_json()
    new_content = data.get("content", "").strip()
    if not new_content:
        return jsonify({"error": "Content cannot be empty"}), 400

    msg.content = new_content
    msg.is_edited = True
    msg.updated_at = datetime.utcnow()
    db.session.commit()

    from ..extensions import socketio
    socketio.emit(f"message_updated_{project_id}", _serialize_message(msg))

    return jsonify({"message": _serialize_message(msg)})


@projects_bp.route("/<int:project_id>/messages/<int:message_id>", methods=["DELETE"])
@require_auth
def delete_message(project_id, message_id):
    msg = ProjectMessage.query.filter_by(id=message_id, project_id=project_id).first_or_404()

    if msg.sender_id != g.current_user.id:
        return jsonify({"error": "Cannot delete others' messages"}), 403

    if msg.is_deleted:
        return jsonify({"error": "Already deleted"}), 400

    msg.is_deleted = True
    msg.content = None
    msg.attachment_url = None
    db.session.commit()

    from ..extensions import socketio
    socketio.emit(f"message_deleted_{project_id}", {"id": msg.id})

    return jsonify({"ok": True})


def _serialize_message(msg):
    return {
        "id": msg.id,
        "project_id": msg.project_id,
        "sender": {
            "id": msg.sender.id,
            "name": msg.sender.name,
            "profile_picture": msg.sender.profile_picture,
            "role": msg.sender.role.value,
        } if msg.sender and not msg.is_deleted else None,
        "content": msg.content,
        "is_deleted": msg.is_deleted,
        "is_edited": msg.is_edited,
        "attachment_url": msg.attachment_url,
        "attachment_type": msg.attachment_type,
        "attachment_name": msg.attachment_name,
        "created_at": msg.created_at.isoformat(),
        "updated_at": msg.updated_at.isoformat(),
        "can_edit": (
            not msg.is_deleted and
            (datetime.utcnow() - msg.created_at) < timedelta(minutes=30)
        ),
    }
```

### 6.3 `backend/app/routes/faculty.py`

```python
from flask import Blueprint, request, jsonify, g
from ..extensions import db
from ..models.user import User, UserRole
from ..models.faculty import Faculty
from ..models.invite import InviteLink
from ..utils.auth_middleware import require_auth, require_hod
from ..utils.fcm_helper import send_notification

faculty_bp = Blueprint("faculty", __name__)

@faculty_bp.route("/", methods=["GET"])
@require_auth
def list_faculty():
    faculties = Faculty.query.join(User).all()
    return jsonify({"faculty": [_serialize_faculty(f) for f in faculties]})

@faculty_bp.route("/<int:faculty_id>", methods=["PATCH"])
@require_auth
def update_faculty(faculty_id):
    faculty = Faculty.query.get_or_404(faculty_id)
    # Only HOD or the faculty themselves
    if g.current_user.role != UserRole.HOD and faculty.user_id != g.current_user.id:
        return jsonify({"error": "Forbidden"}), 403

    data = request.get_json()
    if "name" in data:
        faculty.user.name = data["name"]
    if "profile_picture" in data:
        faculty.user.profile_picture = data["profile_picture"]
    if "designation" in data:
        faculty.designation = data["designation"]
    if "classes_handling" in data and g.current_user.role != UserRole.HOD:
        faculty.classes_handling = data["classes_handling"]
    db.session.commit()
    return jsonify({"faculty": _serialize_faculty(faculty)})

@faculty_bp.route("/<int:faculty_id>/assign-incharge", methods=["POST"])
@require_hod
def assign_incharge(faculty_id):
    data = request.get_json()
    class_name = data.get("class_name")
    if not class_name:
        return jsonify({"error": "class_name required"}), 400

    # Remove previous incharge of this class
    prev = Faculty.query.filter_by(class_incharge_of=class_name).first()
    if prev:
        prev.class_incharge_of = None

    faculty = Faculty.query.get_or_404(faculty_id)
    faculty.class_incharge_of = class_name
    db.session.commit()

    send_notification(
        recipient_id=faculty.user_id,
        title="Class Incharge Assigned",
        body=f"You have been assigned as class incharge for {class_name}",
        notif_type="class_incharge_assigned",
        reference_id=faculty_id,
    )
    return jsonify({"ok": True})

@faculty_bp.route("/<int:faculty_id>/coordinator", methods=["POST"])
@require_hod
def toggle_coordinator(faculty_id):
    faculty = Faculty.query.get_or_404(faculty_id)
    faculty.is_update_coordinator = not faculty.is_update_coordinator
    db.session.commit()
    return jsonify({"is_update_coordinator": faculty.is_update_coordinator})

# Invite link management
@faculty_bp.route("/invite", methods=["GET"])
@require_hod
def get_faculty_invite():
    invite = InviteLink.query.filter_by(link_type="faculty").first()
    if not invite:
        invite = InviteLink(link_type="faculty")
        db.session.add(invite)
        db.session.commit()
    return jsonify({"token": invite.token, "is_active": invite.is_active})

@faculty_bp.route("/invite/toggle", methods=["POST"])
@require_hod
def toggle_faculty_invite():
    invite = InviteLink.query.filter_by(link_type="faculty").first()
    if not invite:
        return jsonify({"error": "Invite not found"}), 404
    invite.is_active = not invite.is_active
    db.session.commit()
    return jsonify({"is_active": invite.is_active})

def _serialize_faculty(f):
    return {
        "id": f.id,
        "user_id": f.user_id,
        "name": f.user.name,
        "email": f.user.email,
        "profile_picture": f.user.profile_picture,
        "designation": f.designation,
        "classes_handling": f.classes_handling,
        "class_incharge_of": f.class_incharge_of,
        "is_update_coordinator": f.is_update_coordinator,
    }
```

### 6.4 `backend/app/routes/classes.py`

```python
from flask import Blueprint, request, jsonify, g
from ..extension import db
from ..models.user import User, UserRole
from ..models.student import Student
from ..models.faculty import Faculty
from ..models.invite import InviteLink
from ..utils.auth_middleware import require_auth, require_hod

classes_bp = Blueprint("classes", __name__)

CLASSES = ["UG_1A","UG_1B","UG_2A","UG_2B","UG_3A","UG_3B","PG_1A","PG_2A"]

def _can_view_class(user, class_name):
    if user.role == UserRole.HOD:
        return True
    if user.role == UserRole.FACULTY:
        fp = user.faculty_profile
        if fp.class_incharge_of == class_name:
            return True
        if class_name in (fp.extra_class_access or []):
            return True
        return False
    if user.role == UserRole.STUDENT:
        return user.student_profile and user.student_profile.class_name == class_name
    return False

@classes_bp.route("/", methods=["GET"])
@require_auth
def list_classes():
    result = []
    for cls in CLASSES:
        incharge = Faculty.query.filter_by(class_incharge_of=cls).join(User).first()
        student_count = Student.query.filter_by(class_name=cls).count()
        invite = InviteLink.query.filter_by(link_type="student", class_name=cls).first()

        entry = {
            "class_name": cls,
            "student_count": student_count,
            "incharge": {
                "name": incharge.user.name,
                "id": incharge.id,
            } if incharge else None,
            "invite_active": invite.is_active if invite else False,
        }
        if cls in ["UG_3A", "UG_3B"]:
            from ..models.forum_member import ForumMember
            fm_count = ForumMember.query.join(Student).filter(Student.class_name == cls).count()
            entry["forum_member_count"] = fm_count
        result.append(entry)
    return jsonify({"classes": result})

@classes_bp.route("/<class_name>/students", methods=["GET"])
@require_auth
def list_students(class_name):
    if class_name not in CLASSES:
        return jsonify({"error": "Invalid class"}), 400
    if not _can_view_class(g.current_user, class_name):
        return jsonify({"error": "Access denied"}), 403

    students = Student.query.filter_by(class_name=class_name).join(User).all()
    return jsonify({"students": [_serialize_student(s) for s in students]})

@classes_bp.route("/<class_name>/invite", methods=["GET"])
@require_auth
def get_class_invite(class_name):
    if class_name not in CLASSES:
        return jsonify({"error": "Invalid class"}), 400
    user = g.current_user
    # Only HOD or class incharge can manage
    if user.role != UserRole.HOD:
        if not (user.role == UserRole.FACULTY and
                user.faculty_profile.class_incharge_of == class_name):
            return jsonify({"error": "Forbidden"}), 403

    invite = InviteLink.query.filter_by(link_type="student", class_name=class_name).first()
    if not invite:
        invite = InviteLink(link_type="student", class_name=class_name)
        db.session.add(invite)
        db.session.commit()
    return jsonify({"token": invite.token, "is_active": invite.is_active, "class_name": class_name})

@classes_bp.route("/<class_name>/invite/toggle", methods=["POST"])
@require_auth
def toggle_class_invite(class_name):
    user = g.current_user
    if user.role != UserRole.HOD:
        if not (user.role == UserRole.FACULTY and
                user.faculty_profile.class_incharge_of == class_name):
            return jsonify({"error": "Forbidden"}), 403

    invite = InviteLink.query.filter_by(link_type="student", class_name=class_name).first()
    if not invite:
        return jsonify({"error": "Not found"}), 404
    invite.is_active = not invite.is_active
    db.session.commit()
    return jsonify({"is_active": invite.is_active})

@classes_bp.route("/<class_name>/grant-access", methods=["POST"])
@require_auth
def grant_access(class_name):
    """HOD or incharge grants a faculty access to a class's student list."""
    user = g.current_user
    if user.role != UserRole.HOD:
        if not (user.role == UserRole.FACULTY and
                user.faculty_profile.class_incharge_of == class_name):
            return jsonify({"error": "Forbidden"}), 403

    data = request.get_json()
    faculty_id = data.get("faculty_id")
    faculty = Faculty.query.get_or_404(faculty_id)

    access = list(faculty.extra_class_access or [])
    if class_name not in access:
        access.append(class_name)
        faculty.extra_class_access = access
        db.session.commit()
    return jsonify({"ok": True})

def _serialize_student(s):
    return {
        "id": s.id,
        "user_id": s.user_id,
        "name": s.user.name,
        "email": s.user.email,
        "profile_picture": s.user.profile_picture,
        "roll_number": s.roll_number,
        "register_number": s.register_number,
        "class_name": s.class_name,
        "is_forum_member": s.is_forum_member,
    }
```

### 6.5 Remaining Routes (Summary)

Implement the following routes following the same patterns:

**`backend/app/routes/forum.py`**
- `GET /api/forum/members` — list all forum members (public)
- `POST /api/forum/members` — HOD assigns a student as forum member (HOD only)
- `DELETE /api/forum/members/<id>` — remove forum member (HOD only)
- `POST /api/forum/members/<id>/coordinator` — toggle update coordinator (HOD only)
- `GET /api/forum/posts` — list all posts (with visibility filter)
- `POST /api/forum/posts` — create post (forum member only, with optional Cloudinary image)
- `PATCH /api/forum/posts/<id>` — edit post within 30 min (original poster only)
- `POST /api/forum/posts/<id>/like` — toggle like
- `PATCH /api/forum/posts/<id>/visibility` — toggle visibility (HOD only)

**`backend/app/routes/updates.py`**
- `GET /api/updates/` — list updates (all users + public)
- `POST /api/updates/` — create update (update coordinators only), Cloudinary attachment
- `PATCH /api/updates/<id>` — edit within 30 min (poster only)
- `DELETE /api/updates/<id>` — soft delete (poster only)
- `POST /api/updates/<id>/like` — toggle like

**`backend/app/routes/notifications.py`**
- `GET /api/notifications/` — list notifications for current user (paginated)
- `POST /api/notifications/read-all` — mark all as read
- `PATCH /api/notifications/<id>/read` — mark one as read
- `GET /api/notifications/unread-count` — returns integer count

**`backend/app/routes/settings.py`**
- `PATCH /api/settings/push-notifications` — toggle push notifications for user
- `PATCH /api/settings/profile` — update name / profile picture (Cloudinary upload)

---

## 7. WebSocket — Progress Monitor

### `backend/app/sockets/progress_monitor.py`

```python
from flask_socketio import emit, join_room, leave_room
from ..extensions import socketio
from ..utils.auth_middleware import require_auth
from flask import request

@socketio.on("join_project")
def handle_join(data):
    project_id = data.get("project_id")
    if project_id:
        join_room(f"project_{project_id}")

@socketio.on("leave_project")
def handle_leave(data):
    project_id = data.get("project_id")
    if project_id:
        leave_room(f"project_{project_id}")

# Messages are sent via REST and broadcast via socketio.emit in routes
# This file registers the room join/leave handlers
```

---

## 8. Frontend Setup

### 8.1 `frontend/package.json` (key dependencies)

```json
{
  "dependencies": {
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "react-router-dom": "^6.23.0",
    "@tanstack/react-query": "^5.40.0",
    "axios": "^1.7.0",
    "socket.io-client": "^4.7.0",
    "firebase": "^10.12.0",
    "lucide-react": "^0.383.0",
    "clsx": "^2.1.1",
    "date-fns": "^3.6.0"
  },
  "devDependencies": {
    "vite": "^5.2.0",
    "@vitejs/plugin-react": "^4.3.0",
    "tailwindcss": "^3.4.0",
    "postcss": "^8.4.0",
    "autoprefixer": "^10.4.0"
  }
}
```

### 8.2 `frontend/tailwind.config.js`

```js
/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        primary: {
          50:  "#EEF2FF",
          100: "#E0E7FF",
          200: "#C7D2FE",
          300: "#A5B4FC",
          400: "#818CF8",
          500: "#6366F1",
          600: "#4F46E5",
          700: "#4338CA",
          800: "#3730A3",
          900: "#312E81",
        },
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
      },
      borderRadius: {
        sm:  "8px",
        md:  "12px",
        lg:  "16px",
        xl:  "20px",
      },
      boxShadow: {
        card:  "0 4px 12px rgba(15,23,42,0.06)",
        hover: "0 10px 25px rgba(79,70,229,0.12)",
        dark:  "0 8px 32px rgba(0,0,0,0.35)",
      },
    },
  },
  plugins: [],
}
```

### 8.3 `frontend/src/index.css`

```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --background: #F8FAFC;
  --surface: #FFFFFF;
  --surface-hover: #F1F5F9;
  --surface-secondary: #F8FAFC;
  --sidebar-bg: #FFFFFF;
  --sidebar-border: #E2E8F0;
  --sidebar-hover: #F1F5F9;
  --text-primary: #0F172A;
  --text-secondary: #475569;
  --text-muted: #94A3B8;
  --border-light: #E2E8F0;
  --border-medium: #CBD5E1;
  --primary: #4F46E5;
}

.dark {
  --background: #0B1220;
  --surface: #111827;
  --surface-hover: #243041;
  --surface-secondary: #1A2333;
  --sidebar-bg: #0F172A;
  --sidebar-border: #1E293B;
  --text-primary: #F8FAFC;
  --text-secondary: #CBD5E1;
  --text-muted: #94A3B8;
  --border-light: #243041;
  --border-medium: #334155;
  --primary: #6366F1;
}

* { box-sizing: border-box; margin: 0; padding: 0; }

body {
  font-family: "Inter", sans-serif;
  background-color: var(--background);
  color: var(--text-primary);
  font-size: 14px;
  line-height: 1.5;
}

/* Scrollbar */
::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: var(--border-medium); border-radius: 3px; }
```

### 8.4 `frontend/src/firebase.js`

```js
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import { getMessaging, getToken, onMessage } from "firebase/messaging";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const messaging = getMessaging(app);

export const signInWithGoogle = () => signInWithPopup(auth, googleProvider);
export const logOut = () => signOut(auth);

export const requestFCMToken = async () => {
  try {
    const token = await getToken(messaging, {
      vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
    });
    return token;
  } catch {
    return null;
  }
};

export const onFCMMessage = (callback) => onMessage(messaging, callback);
```

### 8.5 `frontend/src/api/axios.js`

```js
import axios from "axios";
import { auth } from "../firebase";

const api = axios.create({
  baseURL: "/api",
  timeout: 30000,
});

// Attach Firebase ID token to every request
api.interceptors.request.use(async (config) => {
  const user = auth.currentUser;
  if (user) {
    const token = await user.getIdToken();
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Global error handling
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const message = err.response?.data?.error || "Something went wrong";
    // Dispatch a custom event so Toast can catch it globally
    window.dispatchEvent(new CustomEvent("api-error", { detail: message }));
    return Promise.reject(err);
  }
);

export default api;
```

### 8.6 `frontend/src/context/AuthContext.jsx`

```jsx
import { createContext, useContext, useEffect, useState } from "react";
import { auth, signInWithGoogle, logOut, requestFCMToken, onFCMMessage } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import api from "../api/axios";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);          // DPMS user object
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [onboardingData, setOnboardingData] = useState(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);
      if (fbUser) {
        try {
          const idToken = await fbUser.getIdToken();
          const res = await api.post("/auth/verify", { idToken });
          if (res.data.onboarding_required) {
            setOnboardingData(res.data);
            setUser(null);
          } else {
            setUser(res.data.user);
            setOnboardingData(null);
            // Register FCM token
            const fcmToken = await requestFCMToken();
            if (fcmToken) {
              api.post("/auth/fcm-token", { fcm_token: fcmToken }).catch(() => {});
            }
          }
        } catch {
          setUser(null);
        }
      } else {
        setUser(null);
        setOnboardingData(null);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  const loginWithGoogle = async (inviteToken = null) => {
    await signInWithGoogle();
    // onAuthStateChanged will handle the rest
    // Pass invite token through sessionStorage for the verify call
    if (inviteToken) sessionStorage.setItem("inviteToken", inviteToken);
  };

  const logout = async () => {
    await logOut();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, firebaseUser, loading, onboardingData, loginWithGoogle, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
```

### 8.7 `frontend/src/context/ThemeContext.jsx`

```jsx
import { createContext, useContext, useEffect, useState } from "react";

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => localStorage.getItem("dpms_theme") || "light");

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem("dpms_theme", theme);
  }, [theme]);

  const toggleTheme = () => setTheme(t => t === "light" ? "dark" : "light");

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
```

---

## 9. Frontend Pages

### 9.1 App.jsx — Routing

```jsx
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import { Spinner } from "./components/ui/Spinner";

// Layouts
import PageLayout from "./components/layout/PageLayout";
import PublicLayout from "./components/layout/PublicLayout";

// Pages
import HomePage from "./pages/public/HomePage";
import FacultyOnboarding from "./pages/auth/FacultyOnboarding";
import StudentOnboarding from "./pages/auth/StudentOnboarding";
import DashboardPage from "./pages/dashboard/DashboardPage";
import FacultyPage from "./pages/faculty/FacultyPage";
import ClassesPage from "./pages/classes/ClassesPage";
import ClassDetailPage from "./pages/classes/ClassDetailPage";
import ForumPage from "./pages/forum/ForumPage";
import ProjectsPage from "./pages/projects/ProjectsPage";
import ProjectDetailPage from "./pages/projects/ProjectDetailPage";
import UpdatesPage from "./pages/updates/UpdatesPage";
import NotificationsPage from "./pages/notifications/NotificationsPage";
import SettingsPage from "./pages/settings/SettingsPage";
import NotFoundPage from "./pages/public/NotFoundPage";

function ProtectedRoute({ children }) {
  const { user, loading, onboardingData } = useAuth();
  if (loading) return <Spinner fullScreen />;
  if (onboardingData) {
    if (onboardingData.invite_type === "faculty") return <Navigate to="/onboard/faculty" />;
    if (onboardingData.invite_type === "student") return <Navigate to="/onboard/student" />;
  }
  if (!user) return <Navigate to="/" />;
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route element={<PublicLayout />}>
          <Route path="/" element={<HomePage />} />
        </Route>

        {/* Onboarding */}
        <Route path="/onboard/faculty" element={<FacultyOnboarding />} />
        <Route path="/onboard/student" element={<StudentOnboarding />} />
        <Route path="/invite/:token" element={<InviteLandingPage />} />

        {/* Protected HOD dashboard */}
        <Route element={<ProtectedRoute><PageLayout /></ProtectedRoute>}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/faculty" element={<FacultyPage />} />
          <Route path="/classes" element={<ClassesPage />} />
          <Route path="/classes/:className" element={<ClassDetailPage />} />
          <Route path="/forum" element={<ForumPage />} />
          <Route path="/projects" element={<ProjectsPage />} />
          <Route path="/projects/:id" element={<ProjectDetailPage />} />
          <Route path="/updates" element={<UpdatesPage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}
```

### 9.2 Sidebar Component

Build `Sidebar.jsx` with:
- DPMS logo + title at top
- Nav items: Dashboard, Faculty, Classes, Forum Members, Projects, Updates, Notifications (with red dot badge from unread count), Settings
- Active item: indigo gradient background, white text
- Hover: `var(--sidebar-hover)` background
- Bottom: "Need Help?" card with contact support link
- Fully responsive — collapses to icon-only on tablet, hidden on mobile with hamburger toggle in TopBar

### 9.3 Projects Page — `ProjectsPage.jsx`

```jsx
// State: projects list, stats, filters (search, status, page)
// Components:
//   - Stats row: 5 cards (Total, In Progress, Students, Completed, Low Activity)
//     - Icons from lucide-react
//   - Toolbar: SearchInput + StatusDropdown + FacultyDropdown + Export button
//   - ProjectTable with columns: #, Project Title+description, Faculty, Classes (avatar stack), Status badge, Updated, Actions (⋮ menu)
//   - CreateProjectModal (HOD only)
//   - Pagination

// Data fetching: useQuery from @tanstack/react-query, key ["projects", filters]
// On create: invalidate ["projects"] and ["project-stats"]
```

### 9.4 Project Detail Page — `ProjectDetailPage.jsx`

```jsx
// Layout: two columns on desktop, single column on mobile
// Left: project info, member list with avatars and roles
//        HOD sees "Mark as Completed" button
// Right: Progress Monitor chat
//   - Message list (scrollable, newest at bottom)
//   - Each message: avatar, name, role badge, content, time
//   - If is_deleted: show "This message was deleted" in muted italic
//   - If is_edited: show "(edited)" in muted text after content
//   - Attachment: show image inline or file download link
//   - Actions (visible only to sender, within 30 min): Edit | Delete
//   - Input area: text input + file attachment button (Cloudinary) + send button
//   - WebSocket: connect to socket.io, join_project room on mount
//     listen for new_message_{id}, message_updated_{id}, message_deleted_{id}
```

---

## 10. PWA Setup

### 10.1 `frontend/public/manifest.json`

```json
{
  "name": "DPMS – Department Project Management",
  "short_name": "DPMS",
  "description": "Department Project Management System",
  "theme_color": "#4F46E5",
  "background_color": "#F8FAFC",
  "display": "standalone",
  "scope": "/",
  "start_url": "/",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

### 10.2 `frontend/public/sw.js` (Service Worker)

```js
const CACHE_NAME = "dpms-v1";
const STATIC_ASSETS = ["/", "/index.html", "/manifest.json"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(STATIC_ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
  ));
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  if (e.request.url.includes("/api/") || e.request.url.includes("/socket.io/")) return;
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});

// FCM background push handler
self.addEventListener("push", (e) => {
  const data = e.data?.json() || {};
  e.waitUntil(
    self.registration.showNotification(data.title || "DPMS", {
      body: data.body || "",
      icon: "/icons/icon-192.png",
    })
  );
});
```

### 10.3 Register Service Worker in `frontend/src/main.jsx`

```jsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "./index.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </React.StrictMode>
);
```

---

## 11. Error Handling Strategy

Apply these patterns universally:

### Backend
- All routes wrapped in try/except returning proper JSON errors
- All DB writes in try/except with `db.session.rollback()` on failure
- All Cloudinary uploads in try/except — file failure never crashes the message send
- All FCM sends in try/except — push failure never crashes the API response
- Use `first_or_404()` for single-object lookups

### Frontend
- `ErrorBoundary` component wraps all pages
- All `useQuery` hooks have `onError` handlers showing toasts
- All `useMutation` hooks have `onError` and `onSuccess` handlers
- Axios interceptor dispatches `api-error` events caught by global Toast
- Empty states for all lists: no projects, no students, no messages
- Loading skeletons for all data tables and lists
- Edit/delete within 30 min enforced both frontend (UI timer) and backend (hard check)

---

## 12. Public-Facing Website

The public homepage (`/`) before HOD login must have:

1. **Hero Section** — Department name, tagline, animated gradient background
2. **Updates Section** — Latest department updates/events (public, paginated)
3. **About Section** — Department info, faculty count, student count
4. **HOD Login Button** — Opens Google OAuth, routes to dashboard on success

After HOD logs in, redirect to `/dashboard`. The public site and the dashboard share the same domain — route separation handled by React Router.

---

## 13. Build Order for Agent

Follow this exact sequence. Complete and verify each step before the next.

```
Step 01 — Create full folder structure (empty files)
Step 02 — Write docker-compose.yml, both Dockerfiles, nginx.conf
Step 03 — Write all backend models (user, faculty, student, forum, invite, project, message, update, notification)
Step 04 — Write extensions.py, config.py, app/__init__.py
Step 05 — Write all backend utilities (error_handlers, auth_middleware, cloudinary_helper, fcm_helper, activity_checker)
Step 06 — Write auth routes (auth.py) — verify + onboard faculty + onboard student
Step 07 — Write projects routes (projects.py) — full CRUD + messages
Step 08 — Write faculty routes (faculty.py)
Step 09 — Write classes routes (classes.py)
Step 10 — Write forum routes (forum.py)
Step 11 — Write updates routes (updates.py)
Step 12 — Write notifications routes (notifications.py)
Step 13 — Write settings routes (settings.py)
Step 14 — Write socket handlers (sockets/progress_monitor.py)
Step 15 — Run: docker compose up --build and verify all containers healthy
Step 16 — Run Flask-Migrate: flask db init, flask db migrate, flask db upgrade
Step 17 — Write frontend index.css, tailwind.config.js, vite.config.js
Step 18 — Write firebase.js
Step 19 — Write axios.js + all api/ files
Step 20 — Write AuthContext, ThemeContext, NotificationContext
Step 21 — Write all UI components (Button, Input, Modal, Avatar, Badge, Spinner, Toast, EmptyState, ErrorBoundary)
Step 22 — Write layout components (Sidebar, TopBar, PageLayout, PublicLayout)
Step 23 — Write ProjectsPage + ProjectDetailPage (priority module)
Step 24 — Write DashboardPage
Step 25 — Write FacultyPage + FacultyOnboarding
Step 26 — Write ClassesPage + ClassDetailPage + StudentOnboarding
Step 27 — Write ForumPage
Step 28 — Write UpdatesPage
Step 29 — Write NotificationsPage + NotificationContext
Step 30 — Write SettingsPage
Step 31 — Write PublicHomePage (public-facing site)
Step 32 — Write PWA files (manifest.json, sw.js, icons)
Step 33 — Write InviteLandingPage (reads token from URL, stores in sessionStorage, triggers Google OAuth)
Step 34 — End-to-end test all flows
Step 35 — Verify responsiveness on mobile, tablet, desktop
Step 36 — Final docker compose build
```

---

## 14. Key Business Rules (Enforce in Both Backend and Frontend)

| Rule | Enforcement |
|---|---|
| Forum member cannot be student in same project | Backend `create_project` + frontend disables the user in student selector if already selected as forum member |
| Only message sender can delete/edit | Backend checks `sender_id == current_user.id` |
| Edit window is exactly 30 minutes | Backend: `datetime.utcnow() - msg.created_at > timedelta(minutes=30)` returns 400. Frontend: hide edit button after 30 min using a timer |
| Student invite link pre-sets and locks class | Backend: `invite.class_name != data["class_name"]` returns 400. Frontend: class field is read-only |
| Faculty invite requires HOD activation | Backend: `invite.is_active` check on onboard |
| Only HOD marks project Completed | `require_hod` on status endpoint |
| Low activity auto-set after 3 days of no messages | APScheduler every 6 hours |
| One faculty = one class incharge | Backend removes previous incharge before assigning new |
| Forum members only from UG_3A / UG_3B | Backend validates `class_name in ["UG_3A", "UG_3B"]` |
| Updates only posted by update coordinators | Check `is_update_coordinator` flag on user |
| Push failure never crashes API | All FCM calls in try/except |

---

## 15. Frontend `.env`

Create `frontend/.env`:

```env
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_FIREBASE_VAPID_KEY=
VITE_API_BASE_URL=http://localhost:3000
```

---

## 16. Coding Standards for Agent

- **No `any` types**, **no unhandled exceptions**, **no `console.log` in production code**
- Every Flask route: return proper HTTP status codes (200, 201, 400, 401, 403, 404, 500)
- Every React component: handle loading, error, and empty states
- Use `clsx` for conditional class names in React — never string concatenation
- Use `date-fns` for all date formatting — never raw `new Date().toString()`
- Use `@tanstack/react-query` for all server state — no `useEffect` + `fetch` patterns
- SocketIO connection: connect on component mount, disconnect on unmount
- All forms: validate before submit, show inline errors
- File uploads: show progress indicator, validate type and size client-side before upload
- Pagination: all lists are paginated — no loading entire collections into memory
- Indexes: `firebase_uid`, `email` on users table; `project_id` on messages; `recipient_id` on notifications
