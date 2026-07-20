# S-DESK (Hive Board) - Full Architecture & Documentation

S-DESK (also referred to as Hive Board) is a premium, real-time Academic Department Portal and Project Management System designed to streamline collaboration, documentation sharing, and academic management between students, faculty members, and the Head of Department (HOD).

---

## 1. System Architecture & Overview

The project is engineered as a decoupled client-server architecture:

```
                  ┌──────────────────────────────────────────────┐
                  │          React 18 Single Page App            │
                  │   Vite + Tailwind CSS + Vanilla Neomorphism  │
                  │        GSAP Animations + Socket.io           │
                  └──────────────────────┬───────────────────────┘
                                         │
                         REST API & WebSockets (Socket.IO)
                                         │
                  ┌──────────────────────▼───────────────────────┐
                  │            Python Flask Backend              │
                  │       (Blueprints + Flask-SQLAlchemy)        │
                  └──────┬──────────────────────┬─────────┬──────┘
                         │                      │         │
                ┌────────▼────────┐    ┌────────▼──────┐ ┌▼───────────────┐
                │   PostgreSQL    │    │ Firebase Auth │ │ Cloudinary File│
                │ Database (RBAC) │    │  (Identity)   │ │    Storage     │
                └─────────────────┘    └───────────────┘ └────────────────┘
```

- **Frontend**: A single-page application built with React 18, Vite, Tailwind CSS, custom neomorphic utilities, and GSAP micro-animations. Features a floating dark capsule left navigation panel, dynamic viewport shrinking for main content view, and dual desktop/mobile adaptive engines (`AppEntry.jsx`).
- **Backend**: A Flask application (Python 3) utilizing PostgreSQL via SQLAlchemy for persistent relational data, Firebase Auth for security verification, Cloudinary for file and assignment storage, and Flask-SocketIO for bi-directional real-time events.

---

## 2. Technology Stack

### Frontend Architecture
- **Framework & Build System**: React 18, Vite JavaScript framework.
- **Styling**: Tailwind CSS combined with Vanilla CSS tokens (`index.css`) featuring custom Neomorphism UI effects, CSS `clamp()` responsiveness, and custom dark/light theme systems.
- **Animations**: GSAP (GreenSock Animation Platform) for smooth navigation hover physics, capsule pill indicators, and route transition overlays.
- **Routing**: React Router DOM (v6) with public, private, and role-guarded routes.
- **Authentication**: Firebase Client SDK for identity management and OAuth flow.
- **State & Data Sync**: Axios client & `@tanstack/react-query` for state synchronization and client-side caching.
- **Real-Time Layer**: `socket.io-client` for real-time notification pushes and collaborative feeds.

### Backend Architecture
- **Web Engine**: Flask (Python 3).
- **Relational Storage**: PostgreSQL powered by `Flask-SQLAlchemy` & schema migrations via `Flask-Migrate`.
- **Identity & Security**: Firebase Admin SDK verifying JWT tokens on every guarded route.
- **Storage Services**: Cloudinary API for synopsis docs, project reports, class notes, and user avatars.
- **Real-time Engine**: `Flask-SocketIO` powered by `eventlet` engine.
- **Scheduled Workers**: `APScheduler` for automated daily reports and activity sync.
- **Email Gateway**: `Flask-Mail` / SMTPLib for automated invites, onboarding keys, and form approval notifications.

---

## 3. Directory Structure

```
Hive2/S__Board/
├── docker-compose.yml           # Multi-container orchestrator (PostgreSQL, Redis, Flask, Vite)
├── docker-compose.dev.yml       # Local development override configuration
├── .env.example                 # Environment keys template
├── README.md                    # System documentation & developer architecture guide
│
├── backend/                     # Python Flask REST API & WebSockets Engine
│   ├── app/
│   │   ├── __init__.py          # App bootstrap, blueprint handlers, middleware setup
│   │   ├── config.py            # Environment settings parser
│   │   ├── extensions.py        # Singletons for SQLAlchemy DB, Migrate, SocketIO, CORS
│   │   ├── models/              # SQLAlchemy Data Models
│   │   │   ├── user.py          # Unified User model with role flags (HOD, FACULTY, STUDENT)
│   │   │   ├── faculty.py       # FacultyProfile model
│   │   │   ├── student.py       # StudentProfile and StudentForm models
│   │   │   ├── project.py       # Project, TeamMember, and TimelineEvent models
│   │   │   ├── notes.py         # Subject, Unit, UnitFile, and NotesLog models
│   │   │   ├── forum_post.py    # Class Forum post and comment models
│   │   │   ├── invite.py        # Global invite toggle states for registration
│   │   │   └── notification.py  # User notifications
│   │   ├── routes/              # Blueprint API Endpoint Handlers
│   │   │   ├── auth.py          # Firebase token login & onboarding verification
│   │   │   ├── faculty.py       # Faculty directory management
│   │   │   ├── classes.py       # Class list & handling logic
│   │   │   ├── notes.py         # Notes upload, subject logs, Cloudinary link generation
│   │   │   ├── student_forms.py # Form templates & approval workflows
│   │   │   ├── forum.py         # Class discussion forum posts & comments
│   │   │   ├── projects.py      # Project proposals, kanban boards, milestones
│   │   │   ├── updates.py       # Department announcements
│   │   │   ├── settings.py      # User profile updates
│   │   │   └── mail.py          # Mail dispatch handlers
│   │   ├── sockets/             # Real-time event handlers
│   │   └── utils/               # Decorators, mailers, and validation utilities
│   ├── migrations/              # Database migration scripts
│   ├── requirements.txt         # Python package dependencies
│   └── run.py                   # Flask server startup entry point
│
└── frontend/                    # Single Page React Application
    ├── public/                  # Logo assets, background graphics, web manifest
    ├── src/
    │   ├── api/                 # Axios HTTP client configuration & endpoint queries
    │   ├── components/
    │   │   ├── layout/          # PageLayout, Neomorphic Sidebar capsule, TopBar search & controls
    │   │   ├── ui/              # Dialog, Toast, SessionLoader, ErrorBoundary components
    │   │   └── transitions/     # Page transition overlay & GSAP wrappers
    │   ├── context/             # AuthContext, TransitionContext, NotificationContext
    │   ├── hooks/               # useTheme, useIsMobile hooks
    │   ├── mobile/              # Dedicated touch-optimized layouts and views
    │   ├── pages/               # Dashboard, Projects, Faculty, Classes, Updates, Settings views
    │   ├── App.jsx              # Main router tree & role access guards
    │   ├── AppEntry.jsx         # Mobile vs Desktop device router switcher
    │   ├── index.css            # Custom Neomorphism tokens, clamp responsive rules, design tokens
    │   └── main.jsx             # React entry bootstrap
    ├── tailwind.config.js       # Custom design scale and font configurations
    └── vite.config.js           # Vite development server and bundle builder settings
```

---

## 4. Key UI/UX Innovations: Neomorphic Floating Capsule Layout

The user interface includes a floating neomorphic capsule side panel and a dynamic layout structure:

1. **Neomorphic Floating Left Capsule Panel (`Sidebar.jsx`)**:
   - Dark capsule card design with multi-layered inset and outer box shadows (`.neomorph-capsule-dark`).
   - Integrated Website Emblem/Logo box at top.
   - GSAP physics hover animations on icons and active route indicator pills.
   - Quick access settings, logout trigger, and user profile badge at the capsule base.
2. **Dynamic Center Section Shrinking (`PageLayout.jsx`)**:
   - Resizes and scales the center content area smoothly when the sidebar expands or collapses.
   - Guarantees right-side cards, search controls, and task boards are never cut off or pushed off-screen.
3. **Integrated Search & Controls Header (`TopBar.jsx`)**:
   - Embedded top search bar, live unread notification bell drawer, theme mode toggler, and user status badge inside the main viewport container.

---

## 5. Relational Database Schema & Entities

- **`User`**: Core security identity linked with Firebase UID (`firebase_uid`, `email`, `name`, `role` (`HOD` | `FACULTY` | `STUDENT`), `profile_picture`).
- **`Faculty`**: 1-to-1 extension of `User`. Tracks `classes_handling` (JSON list) and `class_incharge_of`.
- **`Student`**: 1-to-1 extension of `User`. Stores `usn`, `roll_no`, `class_name`, `cgpa`, and `sem_gpas`.
- **`Project`**: Tracks `title`, `domain`, `description`, `synopsis_url`, `github_url`, and `status` (`PROPOSED`, `ONGOING`, `COMPLETED`). Links supervisor (`Faculty`) and team members (`Student` array).
- **`Subject`, `Unit`, `UnitFile`**: Subject blocks per class, broken down into units and uploaded Cloudinary resource files with `NotesLog` tracking download metadata.
- **`ForumPost`, `ForumComment`**: Discussions per class with media attachment support.
- **`Update`**: Department-wide announcements with attachments.

---

## 6. Core User Workflows

### Authentication & Onboarding
1. User logs in via Firebase OAuth (Google or Email/Password).
2. Frontend sends Firebase JWT token to `/api/auth/verify`.
3. If new, backend checks registration toggle (`InviteLink` table). If open, routes user to the multi-step onboarding wizard (`/onboard/faculty` or `/onboard/student`).

### Project Lifecycle
1. **Proposal**: Leader creates project proposal, attaches synopsis document, sets repository link, and selects faculty advisor. Status set to `PROPOSED`.
2. **Approval**: Faculty advisor or HOD reviews synopsis and transitions status to `ONGOING`.
3. **Tracking**: Students add tasks to Kanban board, post log updates, and collaborate through real-time Socket.IO feeds.

### Notes & Form Management
1. Faculty upload chapter slides to Cloudinary; backend records the metadata in `UnitFile`.
2. Students view/download files directly, logged under `NotesLog`.
3. Students submit official forms; Faculty/HOD receive in-app notifications to review, approve, or reject.

---

## 7. Setup & Local Development Guide

### Prerequisites
- Node.js (v18+)
- Python (v3.10+)
- PostgreSQL & Redis

### Docker Quickstart (Recommended)
```bash
# 1. Clone the repository
git clone https://github.com/Sharathim/S__Board.git
cd S__Board

# 2. Configure Environment Variables
cp .env.example .env

# 3. Spin up services via Docker Compose
docker-compose up -d --build
```

### Local Setup (Without Docker)

#### Backend Setup
```bash
cd backend
python -m venv venv
# On Windows:
venv\Scripts\activate
# On Linux/macOS:
source venv/bin/activate

pip install -r requirements.txt
python init_db.py
python run.py
```

#### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
Access the dashboard at `http://localhost:5173`.
