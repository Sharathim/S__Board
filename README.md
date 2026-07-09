# 🏢 DPMS — Department Project Management System

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![React](https://img.shields.io/badge/Frontend-React%20%28Vite%29-blueviolet)](https://react.dev/)
[![Flask](https://img.shields.io/badge/Backend-Python%20Flask-green)](https://flask.palletsprojects.com/)
[![Postgres](https://img.shields.io/badge/Database-PostgreSQL-blue)](https://www.postgresql.org/)
[![TailwindCSS](https://img.shields.io/badge/Styling-Tailwind%20CSS-38bdf8)](https://tailwindcss.com/)
[![PWA](https://img.shields.io/badge/PWA-Installable-ff69b4)](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps)
[![Firebase](https://img.shields.io/badge/Auth%20%26%20Chat-Firebase-ffca28?logo=firebase)](https://firebase.google.com/)

DPMS (Department Project Management System) is a production-ready, highly responsive Progressive Web App (PWA) designed for a college department to seamlessly manage faculty, classes, students, forum members, projects, and departmental announcements 

This system features a dual-sided architecture (Public & Authenticated) built with robust role-based access control (RBAC), real-time collaboration features, offline capabilities, and cloud storage integrations.

---

## 📖 Table of Contents
1. [System Overview](#-system-overview)
2. [Tech Stack](#-tech-stack)
3. [Architecture](#-architecture)
4. [Functional Modules](#-functional-modules)
5. [Database Schema & Data Model](#-database-schema--data-model)
6. [Local Development Setup](#-local-development-setup)
7. [Environment Variables Reference](#-environment-variables-reference)
8. [AWS Production Deployment](#-aws-production-deployment)
9. [Integration Blueprint: Notes Management Module (NotesDock)](#-integration-blueprint-notes-management-module-notesdock)

---

## 🌟 System Overview

DPMS is divided into two distinct logical areas:

*   **Public Side (No Login Required):**
    *   **Department Information pages:** Public-facing marketing and directory pages.
    *   **Updates Feed:** Read-only access to announcements (likes visible, no posting allowed).
    *   **HOD Login Entry:** Direct Google OAuth entry point for administrators.
*   **Authenticated App Side (Invite-Based Onboarding):**
    *   Full-fledged admin & communication portal for HOD, Faculty, Class Incharges, Students, and Forum Members.
    *   Custom side navigation adapting dynamically to user roles.
    *   Responsive, PWA-compliant design featuring instant dark/light mode toggles.

### Key Qualities
*   ⚡ **Low Latency & High Optimization:** Structured queries, DB indexes, local caching, and lazy routing.
*   🔒 **Enterprise Security:** JWT-based secure HTTP-only cookies, verified server-side via Firebase Admin SDK.
*   📱 **PWA Support:** Installable on Desktop/Mobile, offline-ready shell caching, and background push notifications.

---

## 🛠️ Tech Stack

| Layer | Technology | Description |
|---|---|---|
| **Frontend Framework** | React (Vite) | Single Page Application (SPA), fast development server, lightweight bundles. |
| **Styling** | Tailwind CSS | Utility-first responsive design, light/dark mode variants. |
| **State & Fetching** | Axios + Context API + React Query | Clean server-state synchronization with caching and revalidation. |
| **PWA Engine** | `vite-plugin-pwa` | Service worker registration, manifest file management. |
| **Backend Framework** | Python Flask | Minimalist RESTful API gateway, extension-friendly. |
| **WSGI / Production** | Gunicorn + Eventlet | High-concurrency worker setup for web socket/polling connections. |
| **Database (SQL)** | PostgreSQL | Structured database engine for operational logs, settings, and profiles. |
| **ORM & Migrations** | SQLAlchemy + Flask-Migrate (Alembic) | Pythonic schema definitions and automated version control. |
| **Authentication** | Firebase Auth (Google OAuth) | Secure federated login verified server-side with `firebase-admin`. |
| **Real-time Chat** | Firebase Firestore | NoSQL backend for project progress messages (bypasses custom WS setup). |
| **Push Notifications** | Firebase Cloud Messaging (FCM) | Server-triggered browser push messages when tabs are closed. |
| **File Storage** | Cloudinary | Media asset management (documents, images, videos) with on-the-fly resizing. |
| **In-Memory Caching** | Redis | Caching and background task coordination. |
| **Containerization** | Docker & Docker Compose | Multi-container setup for standard environment replication. |

---

## 📐 Architecture

```
                 ┌────────────────────────────────┐
                 │       Vite React Frontend      │  (PWA, Tailwind, light/dark theme)
                 └───────────────┬────────────────┘
                                 │ 
                                 │ REST (Axios) + Firestore SDK (chat) + FCM SDK (push)
                                 ▼
                 ┌────────────────────────────────┐
                 │         Flask Backend          │  (REST API, role-based access control)
                 │    - Firebase Auth middleware  │
                 │    - Business & notification   │
                 │    - Cloudinary upload router  │
                 └──────┬───────────────┬─────────┘
                        │               │
           ┌────────────▼──┐   ┌────────▼───────┐
           │  PostgreSQL   │   │   Cloudinary    │
           │ (structured   │   │ (media storage) │
           │  app data)    │   └─────────────────┘
           └───────┬───────┘
                   │
                   ▼ (Cache / Tasks)
           ┌───────────────┐
           │     Redis     │
           └───────────────┘
                   ▲
                   │ Token verification
           ┌───────┴────────────────────┐
           │ Firebase Auth + Firestore  │
           │     + Cloud Messaging      │
           └────────────────────────────┘
```

---

## 📦 Functional Modules

### 1. Dashboard
Summarized analytics and tracking widgets:
*   Total project counts, pending class invitation alerts.
*   Recent system updates and flagged low-activity project warnings.

### 2. Faculty Module
*   **Controlled Access Signup:** The HOD can enable or disable faculty registration using a permanent invite toggle. If disabled, new faculty cannot register; existing faculty can log in freely.
*   **Onboarding Wizard:** Form captures editable display Name, immutable Google Email, profile picture upload (Cloudinary), Designation, and a multi-select handler for class assignments.

### 3. Classes Module
*   **Card Grid:** Features 8 fixed classes (`UG 1A`, `UG 1B`, `UG 2A`, `UG 2B`, `UG 3A`, `UG 3B`, `PG 1A`, `PG 2A`).
*   **Dedicated Invite Controls:** Each class has an independent invite link that can be activated/deactivated by either the HOD or the assigned **Class Incharge**.
*   **Access Delegation:** Class Incharges can share view access to their class roster with other faculty directly, bypassing complex requests.

### 4. Forum Members Module
*   **Appointment:** HOD selects and upgrades `UG 3A/3B` students to Forum Members with specialized roles.
*   **Sharing Feed:** Forum Members write text-based and document-enriched reports. 
*   **Engagement Rules:** Editable up to 30 minutes (marks post with an "edited" tag); likes can be cast by all authenticated users.

### 5. Projects Module *(Core Feature)*
*   **Creation & Members:** HOD defines projects by providing a title, description, and choosing at least one participant.
*   **Exclusivity check:** A person cannot occupy both "Student" and "Forum Member" slots simultaneously on the same project.
*   **Progress Monitor:** Each project opens a direct communication thread. Messages support documents/media uploads.
*   **Soft Deletion:** Deleting messages replaces the text with *"This message was deleted"* (maintaining audit trails).
*   **Automated Staleness Trigger:** If no communication occurs within **3 consecutive days**, the project status automatically updates to `Low Activity`.

### 6. Updates Module (Announcements)
*   Coordinators (assigned by HOD from Faculty/Forum Members) publish department announcements.
*   Author identity is scrubbed from the public interface (displays datetime stamps only).

### 7. Notifications Module
*   Dual notification dispatch: **In-app red-dot tracker** + **FCM Push Notification** fallback.
*   Distinguishes broad alerts (e.g., new updates posted) from target-only notifications (e.g., user assigned to a project).

---

## 🗄️ Database Schema & Data Model

Below is the structured data schema mapping:

```mermaid
erDiagram
    accounts ||--o| faculty_profiles : "extends"
    accounts ||--o| student_profiles : "extends"
    accounts ||--o| user_preferences : "configures"
    accounts ||--o{ device_tokens : "registers"
    accounts ||--o{ notifications : "receives"
    
    classes ||--o| accounts : "managed by HOD/Incharge"
    classes ||--o{ student_profiles : "contains"
    
    faculty_profiles ||--o{ faculty_class_access : "granted access"
    classes ||--o{ faculty_class_access : "allows viewing"
    
    student_profiles ||--o| forum_members : "upgrades to"
    
    projects ||--o{ project_members : "has"
    accounts ||--o{ project_members : "participates in"
    
    updates_posts }o--|| accounts : "posted by (metadata only)"
    forum_posts }o--|| forum_members : "authored by"
    
    likes }o--|| accounts : "placed by"
```

### Key Models Reference
1.  **`accounts`**: `id`, `gmail` (unique, immutable), `name`, `profile_picture_url`, `role` (`hod`/`faculty`/`student`), `created_at`, `last_login_at`.
2.  **`faculty_profiles`**: `account_id (FK)`, `designation`, `classes_handling` (array of class IDs), `is_update_coordinator` (bool).
3.  **`student_profiles`**: `account_id (FK)`, `roll_no`, `register_no`, `class_id (FK)`.
4.  **`forum_members`**: `student_account_id (FK, unique)`, `role_text`, `assigned_by` (HOD Account ID), `assigned_at`, `is_update_coordinator` (bool).
5.  **`classes`**: `id`, `name`, `incharge_account_id (FK, nullable)`, `invite_link_enabled` (bool).
6.  **`projects`**: `id`, `title`, `description`, `status` (`in_progress`/`completed`/`low_activity`), `created_by`, `created_at`, `updated_at`, `last_activity_at`.

---

## 🚀 Local Development Setup

The repository is fully containerized. You can boot the complete system with a single Docker orchestrator command.

### Prerequisites
*   [Docker Desktop](https://www.docker.com/products/docker-desktop/) (v20+)
*   [Node.js](https://nodejs.org/) (Optional, for non-docker client dev, v18+)
*   [Python 3.11+](Optional, for non-docker server dev)

### Docker Compose Spin-up (Recommended)
1.  Clone the repository and copy the example environment setup:
    ```bash
    git clone https://github.com/sharathim/S__Board.git
    cd S__Board
    cp .env.example .env
    ```
2.  Place your `firebase-service-account.json` file inside the root directory (so the Docker volume mount binds correctly).
3.  Run the compose service:
    ```bash
    docker-compose up --build
    ```
4.  Access the applications:
    *   **Frontend Client:** [http://localhost:3000](http://localhost:3000)
    *   **Backend Server API:** [http://localhost:5055](http://localhost:5055)
    *   **Postgres DB:** Port `5435`
    *   **Redis Cache:** Port `6385`

### Manual Development Setup (Without Docker)

#### 1. Setup Postgres Database
Ensure PostgreSQL is running locally. Create a database named `dpms` and a user with correct credentials corresponding to your `.env` values.

#### 2. Run Backend Flask Server
```bash
cd backend
python -m venv venv
# Windows powershell:
.\venv\Scripts\Activate.ps1
# Linux/macOS:
source venv/bin/activate

pip install -r requirements.txt

# Run migrations
flask db upgrade

# Run dev server
python run.py
```

#### 3. Run Frontend React Client
```bash
cd frontend
npm install
npm run dev
```
The React app will spin up on [http://localhost:5173](http://localhost:5173).

---

## 📝 Environment Variables Reference

A `.env` file must exist in the root. Below is a breakdown of configurable environment variables:

| Category | Variable | Description |
|---|---|---|
| **Database** | `POSTGRES_DB` | PostgreSQL Database name (e.g. `dpms`) |
| | `POSTGRES_USER` | DB owner username |
| | `POSTGRES_PASSWORD` | DB owner password |
| | `DATABASE_URL` | SQLAlchemy connection string (`postgresql://user:pass@host:port/dbname`) |
| | `REDIS_URL` | Redis instance URL (`redis://localhost:6385/0`) |
| **Backend** | `FLASK_ENV` | Mode switch (`development` or `production`) |
| | `SECRET_KEY` | Cryptographic secret for signing session cookies |
| | `FRONTEND_URL` | Origin path allowed by CORS headers (e.g., `http://localhost:5173`) |
| | `HOD_EMAILS` | Comma-separated HOD emails (gets elevated on first Google Auth) |
| **Cloudinary** | `CLOUDINARY_CLOUD_NAME` | Cloudinary account cloud identifier |
| | `CLOUDINARY_API_KEY` | Cloudinary API Key |
| | `CLOUDINARY_API_SECRET` | Cloudinary secret credential key |
| **Firebase** | `VITE_FIREBASE_API_KEY` | Web config API Key |
| | `VITE_FIREBASE_AUTH_DOMAIN` | Web config Auth Domain |
| | `VITE_FIREBASE_PROJECT_ID` | Project Identifier |
| | `VITE_FIREBASE_STORAGE_BUCKET` | Cloud Storage root bucket URL |
| | `VITE_FIREBASE_MESSAGING_SENDER_ID` | FCM Messaging ID |
| | `VITE_FIREBASE_APP_ID` | Firebase application identifier |
| | `VITE_FIREBASE_VAPID_KEY` | Key for Web Push browser handshakes |
| **SMTP Mail** | `SMTP_HOST` | Mail server IP/Host |
| | `SMTP_PORT` | Encryption port (e.g. `587`) |
| | `SMTP_USER` | Sender credentials (email address) |
| | `SMTP_PASSWORD` | App-specific password |

---

## ☁️ AWS Production Deployment

```
   [ Route 53 (DNS) ] ──► [ CloudFront (CDN) ] ──► [ React Client S3 Bucket ]
                                │
                          (API requests)
                                │
                                ▼
                       [ Load Balancer (ALB) ] (SSL Termination via ACM)
                                │
                                ▼
                   [ ECS Cluster (Fargate Tasks) ]
                   (Scalable Flask Backend Docker Containers)
                                │
                    ┌───────────┴───────────┐
                    ▼                       ▼
            [ RDS Postgres DB ]     [ AWS ElastiCache (Redis) ]
```

1.  **Static Hosting & CDN:**
    *   Vite static builds compiled and shipped to an **S3 Bucket** configured for static website hosting.
    *   **Amazon CloudFront** distribution wraps the S3 bucket to provide edge caching, HTTPS redirection, and security headers.
2.  **Compute Infrastructure:**
    *   Flask Backend containerized and deployed on **Amazon ECS (Fargate)**.
    *   An **Application Load Balancer (ALB)** manages routing, health checks, and path-based routing (e.g., forwarding `/api/*` requests to ECS).
    *   **AWS Certificate Manager (ACM)** handles SSL credentials on the ALB.
3.  **Database & Cache:**
    *   **Amazon RDS for PostgreSQL** (Multi-AZ configured) handles relational data persistence.
    *   **Amazon ElastiCache for Redis** powers background task coordination and WebSocket/Eventlet rooms.
4.  **Secrets & Keys:**
    *   Production keys, credentials, and FCM/Cloudinary configs are loaded into ECS tasks dynamically from **AWS Secrets Manager**.

---

## ⚡ Integration Blueprint: Notes Management Module (NotesDock)

If you plan to integrate the existing notes platform [notesdock.ddns.net](https://notesdock.ddns.net) into DPMS, here is the architectural blueprint to achieve a seamless, secure, and production-grade integration:

### Architecture Options

```mermaid
flowchart TD
    subgraph DPMS
        A[React UI: Notes Module]
        B[Flask API Gateway]
        C[(Postgres DB)]
    end
    subgraph NotesDock
        D[Embedded App/iframe]
        E[Notes API Server]
        F[(Notes DB)]
    end

    A -- "Option A: Embedded View" --> D
    A -- "Option B: Sync / REST" --> E
    B -- "Option C: Federated API" --> E
```

#### 🛠️ Option A: Single Sign-On (SSO) & Embedded Interface (Fastest Time-to-Market)
Keep NotesDock running independently at `notesdock.ddns.net` but make it look like a native module within the DPMS dashboard.
*   **Authentication & Session Sharing:**
    1.  When a user logs into DPMS via Firebase, the backend generates a short-lived **Secure Notes Token (JWT)** signed with a shared secret.
    2.  In DPMS sidebar, add a **"Notes"** tab containing an `<iframe>` pointing to `https://notesdock.ddns.net/embed?token=<token>`.
    3.  NotesDock reads this token, validates it against the shared secret (or hits a public JWKS endpoint on the DPMS backend), extracts the user's role/email/class, and logs them in automatically.
*   **Design & Theme:** NotesDock reads url parameters (e.g., `?theme=dark`) to adjust its CSS system dynamically to match DPMS light/dark mode.

#### ⚙️ Option B: Headless Backend Integration (Cleanest User Experience)
Maintain NotesDock purely as an API service. The DPMS UI acts as the sole user interface.
*   **API-Driven Notes Access:**
    1.  NotesDock exposes endpoints for listing, viewing, downloading, and uploading notes (`GET /api/notes`, `POST /api/notes`).
    2.  The DPMS backend functions as a reverse proxy/wrapper. When a student requests notes for their class, DPMS calls NotesDock's API using a secure server-to-server credentials handshake.
    3.  DPMS renders the notes search and download cards natively in React.
*   **Class/Subject Association:** Since DPMS already stores class profiles (e.g. `UG 3A`, `PG 1A`), notes uploaded by faculty are tagged with class-ids and subject keys that map exactly to DPMS's relational database.

#### 🔄 Option C: Database Federation / Schema Sync
Integrate the tables directly.
*   Extend the DPMS PostgreSQL database to include:
    *   `notes`: `id`, `class_id (FK)`, `faculty_id (FK)`, `subject_code`, `title`, `document_url` (stored on Cloudinary), `uploaded_at`.
    *   `subjects`: `id`, `class_id (FK)`, `name`, `code`.
*   Migrate NotesDock's database files directly into the DPMS storage layer and build custom controllers inside the existing Flask backend. This eliminates double hosting costs and centralizes notifications (e.g., notifying students via FCM when notes for their upcoming exam are uploaded).
