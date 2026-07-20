# S-DESK (Hive Board) - Project Documentation

S-DESK  (also referred to as Hive Board) is a premium, real-time Academic Department Portal and Project Management System designed to streamline collaboration, documentation sharing, and academic management between students, faculty members, and the Head of Department (HOD).

---

## 1. Project Overview & Architecture

The project is structured as a decoupled client-server architecture:
- **Frontend**: A modern, single-page React application built with Vite and Tailwind CSS. It features a responsive split layout, premium micro-animations (via GSAP), and uses Socket.IO for real-time updates. It includes a tailored desktop client and a distinct lazy-loaded mobile view.
- **Backend**: A Flask web application (Python) powered by PostgreSQL (via SQLAlchemy) for relational data persistence, Firebase Authentication for secure identity verification, Cloudinary for file/document storage, and Socket.IO for real-time bi-directional messaging.

---

## 2. Technology Stack

### Frontend
- **Framework**: React 18 (Vite, Javascript)
- **Styling**: Tailwind CSS & Vanilla CSS (premium animations, variables-based themes)
- **Routing**: React Router DOM (v6)
- **Animations**: GSAP (GreenSock Animation Platform) for view transitions and interactive hover effects
- **Authentication**: Firebase Client SDK (delegated OAuth)
- **API Client**: Axios & React Query (for state synchronization and data caching)
- **Real-Time Communication**: Socket.io-client (Socket connections for active workflows)

### Backend
- **Framework**: Flask (Python 3)
- **Database**: PostgreSQL (via Flask-SQLAlchemy & Flask-Migrate)
- **Authentication**: Firebase Admin SDK (token verification at endpoints)
- **Media/File Storage**: Cloudinary (handles uploads of project reports, forms, class notes, and user avatars)
- **Real-Time Events**: Flask-SocketIO (with `eventlet` async server engine)
- **Background Tasks**: APScheduler (e.g., periodic system checks for inactivity and email reports)
- **Mailing**: Flask-Mail / SMTPLib for notifications and onboarding invites

---

## 3. Project Structure

### Root Directory
- `docker-compose.yml` / `docker-compose.dev.yml`: Container services definitions for PostgreSQL, Redis, Flask backend, and React frontend.
- `.env` / `.env.example`: Centralized configuration variables for keys, URLs, and database links.
- `PROJECT.md`: Comprehensive system architecture and developer guide (this document).
- `firebase-service-account.json`: Private keys for Firebase Admin SDK validation.

### Backend Structure (`/backend`)
```
backend/
├── app/
│   ├── __init__.py          # Flask app instantiation, middleware setup, blueprint registration
│   ├── config.py            # Configuration options loading env variables
│   ├── extensions.py        # Shared instances of db, migrate, socketio, and cors
│   ├── models/              # SQLAlchemy database model definitions
│   │   ├── faculty.py       # FacultyProfile model
│   │   ├── student.py       # StudentProfile and StudentForm models
│   │   ├── notes.py         # Subject, Unit, UnitFile, and NotesLog models
│   │   ├── project.py       # Project, TeamMember, and TimelineEvent models
│   │   ├── forum_post.py    # Class Forum post and comment models
│   │   ├── user.py          # Unified User model with role flags (HOD, FACULTY, STUDENT)
│   │   ├── invite.py        # Global invite toggle states (faculty/student registration)
│   │   └── notification.py  # User notifications
│   ├── routes/              # Flask Blueprints (API Endpoint handlers)
│   │   ├── auth.py          # Firebase token login, verify, and onboarding pre-fill logic
│   │   ├── faculty.py       # Faculty verification and details
│   │   ├── classes.py       # Class list management
│   │   ├── notes.py         # Academic resources, subject logs, and uploads
│   │   ├── student_forms.py # Official form templates and submissions
│   │   ├── forum.py         # Class discussion forum posts and comments
│   │   ├── projects.py      # Project proposals, milestones, and task boards
│   │   ├── updates.py       # Department announcements
│   │   ├── settings.py      # User details editing
│   │   └── mail.py          # Mail dispatch handlers
│   ├── sockets/             # Real-time event receivers/senders
│   └── utils/               # Custom decorators, mail handlers, and validation helpers
├── migrations/              # Database schema migrations via Flask-Migrate
├── requirements.txt         # Server-side python dependencies
└── run.py                   # Development server entry point
```

### Frontend Structure (`/frontend`)
```
frontend/
├── public/                  # Static assets: logo-icon.png, manifest.json, background illustrations
├── src/
│   ├── api/                 # Axios clients and React Query fetch functions
│   ├── components/
│   │   ├── layout/          # Global shells: PageLayout (Desktop), TopBar, Sidebar, NotificationsPanel
│   │   ├── ui/              # Reusable design components: Dialog, Toast, SessionLoader, ErrorBoundary
│   │   └── transitions/     # Page transition animations and GSAP wrappers
│   ├── context/             # React Context Providers (AuthContext, TransitionContext, NotificationContext)
│   ├── hooks/               # Core utility hooks (useTheme, useIsMobile)
│   ├── mobile/              # Dedicated layouts and view wrappers for mobile screens
│   │   ├── layout/          # Mobile shells: MobileShell, MobileTopBar, BottomTabBar, MoreSheet
│   │   └── pages/           # Views optimized for mobile viewports
│   ├── pages/               # Desktop dashboard, forum, settings, classes, and project detail pages
│   ├── App.jsx              # Main routing tree and route guards (Public vs Protected)
│   ├── AppEntry.jsx         # Lazy loader switching between MobileApp and App based on device width
│   ├── index.css            # Stylesheets, design tokens, and glassmorphic / neomorphic styles
│   └── main.jsx             # Entry script bootstrap
├── tailwind.config.js       # Theme definitions, custom color palettes, and fonts
└── vite.config.js           # Compilation config and dev server proxy settings
```

---

## 4. Database Models & Core Entities

The system uses a relational database schema designed for Role-Based Access Control (RBAC):

1. **User (`User`)**:
   - Contains basic information synced from Firebase Authentication (`firebase_uid`, `email`, `name`, `profile_picture`).
   - Stores the assigned role (`HOD`, `FACULTY`, or `STUDENT`).
2. **Faculty Profile (`Faculty`)**:
   - Linked to a `User` (1-to-1).
   - Tracks which classes this faculty member is handling (`classes_handling` as JSON array) and which class they are in charge of (`class_incharge_of`).
3. **Student Profile (`Student`)**:
   - Linked to a `User` (1-to-1).
   - Tracks student details: `usn`, `roll_no`, `class_name` (e.g., `UG_3A`), and performance statistics like `cgpa` and `sem_gpas` (stored as JSON).
4. **Project (`Project`)**:
   - Stores project details: `title`, `domain`, `description`, `synopsis_url` (Cloudinary file link), `github_url`, and `status` (`PROPOSED`, `ONGOING`, `COMPLETED`).
   - Links to a supervisor (`Faculty` user) and a list of team members (students).
   - Contains a `tasks` list and a timeline tracking achievements.
5. **Academic Resources (`Subject`, `Unit`, `UnitFile`)**:
   - `Subject`: Represents a course for a class (e.g. "Software Engineering" for `UG_3A`).
   - `Unit`: Chapters within a subject.
   - `UnitFile`: PDF/Word documents stored in Cloudinary, uploaded by faculty/HOD, with size and metadata.
6. **Class Forum (`ForumPost`, `ForumComment`)**:
   - Represents discussions scoped per-class. Post creators can upload media attachments.
7. **Updates / Announcements (`Update`)**:
   - Global announcements pushed by the HOD or faculty, visible on the dashboard. Supports rich attachments and categories.

---

## 5. Main System Workflows

### A. Authentication & Onboarding
1. **Sign-In**: The user signs in on the frontend using Firebase OAuth (Google or Email/Password).
2. **Token Verification**: The frontend grabs the Firebase ID token and POSTs it to `/api/auth/verify`.
3. **Onboarding Check**:
   - If the database has a record for the user's UID, the backend returns their data, and they enter the app.
   - If the user is new, the backend checks if registration is globally open (via `InviteLink` table settings). If open, it returns onboarding metadata. The frontend intercepts this and redirects them to the onboarding wizard (`/onboard/faculty` or `/onboard/student`).
   - During onboarding, students input USN/Roll No and choose their class; faculty input handled classes.

### B. Project Management Lifecycle
1. **Proposal**: A student team leader creates a project proposal, uploads a synopsis PDF, inputs the Github URL, invites team members (fellow students), and selects a faculty supervisor. The project starts as `PROPOSED`.
2. **Approval**: The chosen supervisor or the HOD reviews the synopsis and changes the status to `ONGOING` (approved) or rejects it.
3. **Tracking & Tasks**: Once approved, students can add/edit tasks on a kanban-style board. They post regular progress reports to the project feed.
4. **Real-time Monitoring**: Faculty/HOD can monitor progress, leave feedback comments on timeline logs, and coordinate through Socket.IO real-time channels.

### C. Resource & Notes Sharing
1. **Subject Initialization**: Faculty or HOD initializes a Subject block for a class.
2. **Upload**: The incharge uploads PDF slides, text notes, or references. The server processes the file, uploads it to Cloudinary, and saves the link in the `UnitFile` model.
3. **Access**: Students of that class access their page and view/download the files directly. The download transactions are logged under `NotesLog` to audit user downloads.

### D. Form Submission & Approvals
1. **Submission**: Students download official templates, fill them, and upload them to the portal (e.g. scholarship forms, elective selection, no-due forms).
2. **Review**: The class incharge or HOD gets an in-app notification. They can download the submission, mark it as `APPROVED`, `REJECTED`, or request changes, triggering email alerts to the student.

---

## 6. Development & Run Guide

### Pre-requisites
- Node.js (v18+)
- Python 3.10+
- PostgreSQL
- Redis
- Firebase Console Account (with Auth enabled)
- Cloudinary Account

### Running with Docker (Recommended)
Configure your credentials in `.env` (using `.env.example` as a reference), and then run from the root directory:
```bash
# Start all services (db, redis, backend, frontend) in the background
docker-compose up -d --build

# View container logs
docker-compose logs -f
```

### Running Locally (Alternative)
If running services individually:

1. **Database & Redis**: Start local instances of PostgreSQL and Redis.
2. **Backend Setup**:
   ```bash
   cd backend
   # Create a virtual environment
   python -m venv venv
   source venv/bin/activate # On Windows use: venv\Scripts\activate
   # Install dependencies
   pip install -r requirements.txt
   # Run migrations/initialize DB tables
   python init_db.py
   # Run the server
   python run.py
   ```
3. **Frontend Setup**:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
   Open `http://localhost:5173` to access the application.
