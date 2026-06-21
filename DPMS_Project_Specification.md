# DPMS — Department Project Management System
### Technical & Functional Specification (v2)

---

## 1. Overview

DPMS is a Progressive Web App (PWA) for a college department to manage faculty, classes, students, forum members, projects, and departmental updates. It has two distinct sides:

- **Public side** — informative only, for visitors/parents/outsiders.
- **Authenticated app side** — full management dashboard, unlocked via HOD login (and onward access for Faculty, Students, Forum Members through their own invite-based onboarding).

**Non-negotiable qualities:** fully responsive (mobile/tablet/desktop), low time & space complexity, robust error handling (high-traffic, student/faculty/HOD-facing — must not break), light theme by default with a dark theme toggle, installable as a PWA. This is being built as a **production system for AWS hosting, not an MVP** — no cut corners on reliability, scalability, or data integrity.

**Build priority:** Projects module first, fully functional, within 2 days. Remaining modules built incrementally afterward.

---

## 2. Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React (Vite), Tailwind CSS, React Router, Context API, Axios |
| PWA | vite-plugin-pwa (manifest + service worker) |
| Backend | Python Flask, SQLAlchemy (ORM), Alembic (migrations), Gunicorn |
| Database | PostgreSQL |
| Auth | Firebase Authentication (Google OAuth) — verified server-side with firebase-admin; session kept via httpOnly JWT cookie |
| File/Media Storage | Cloudinary (images, videos, and general documents/files) |
| Real-time chat (Progress Monitor) | Firebase Firestore *(reuses existing Firebase setup, avoids building custom WebSocket infra)* |
| Push Notifications | Firebase Cloud Messaging (FCM) — alongside in-app notifications, not instead of |
| Containerization (local dev) | Docker + docker-compose (frontend, backend, postgres as separate services) |
| Hosting (production) | AWS — see Section 9 |

---

## 3. System Architecture (high level)

```
                ┌─────────────────────┐
                │   React Frontend    │  (PWA, Tailwind, light/dark theme)
                └─────────┬────────────┘
                          │ REST (Axios) + Firestore SDK (chat) + FCM SDK (push)
                          ▼
                ┌─────────────────────┐
                │   Flask Backend     │  (REST API, role-based access control)
                │  - Auth middleware  │
                │  - Business logic  │
                │  - FCM dispatch    │
                └─────┬─────────┬─────┘
                      │         │
          ┌───────────▼──┐   ┌──▼─────────────┐
          │  PostgreSQL   │   │   Cloudinary    │
          │ (structured   │   │ (media storage) │
          │  app data)    │   └─────────────────┘
          └───────────────┘
                      ▲
                      │ Token verification
          ┌───────────┴────────────────┐
          │ Firebase Auth + Firestore  │
          │     + Cloud Messaging      │
          └─────────────────────────────┘
```

---

## 4. Site Structure

### 4.1 Public Side (no login required)
- Department information pages (informative only)
- Public "Updates" feed (read-only, likes visible, no posting)
- "HOD Login" button → Google OAuth (Firebase) → on success, becomes the entry point into the authenticated app side

### 4.2 Authenticated App Side
Unlocked for HOD, Faculty, Students, and Forum Members (each via their own onboarding flow). Sidebar navigation:

1. Dashboard
2. Faculty
3. Classes
4. Forum Members
5. Projects
6. Updates
7. Notifications
8. Settings

The visible content/actions within each section differ by role (see Section 5).

---

## 5. Roles & Permissions Summary

| Role | Who | Key Powers |
|---|---|---|
| **HOD** | Single admin account | Full control: manage faculty, classes, forum members, projects, updates, notifications, invite toggles, class-access grants |
| **Faculty** | Onboarded via faculty invite link | View own classes/projects, handle assigned classes, act as class incharge (if assigned), participate in assigned projects, post Updates (if made coordinator) |
| **Class Incharge** | A Faculty member assigned by HOD | View/manage their class's student list, toggle that class's own student invite link on/off, grant class-access to other faculty |
| **Student** | Onboarded via that class's invite link | View own class's student list, participate in assigned projects |
| **Forum Member** | A 3A/3B Student appointed by HOD | All Student powers + post report-style comments in Forum Members section, participate in projects as "Forum Member" role |
| **Update Coordinator** | A Faculty or Forum Member appointed by HOD | Can post/edit/delete Updates |

---

## 6. Module Specifications

### 6.1 Dashboard
Overview/summary widgets aggregating the latest activity across Projects, Updates, Forum Members, etc. *(Detailed widget list to be finalized later — built after Projects module.)*

---

### 6.2 Faculty Module

- **Invite link:** HOD can enable/disable faculty **signup** via a single, permanent invite link (link itself never changes — only toggled on/off). Disabling does **not** affect already-registered faculty logging in.
- **Onboarding flow:**
  1. Click invite link → Google OAuth via Firebase.
  2. If new user → onboarding form:
     - Name (prefilled, **mutable**)
     - Gmail (prefilled, **immutable**)
     - Profile picture (prefilled, **mutable**)
     - Designation (default `"Professor"`, editable text)
     - Classes Handling — multi-select grid of buttons: UG 1A, 1B, 2A, 2B, 3A, 3B + PG 1A, 2A (none selected by default; multiple allowed)
  3. Faculty record is created **only** after full form submission. Abandoning the form = no account created, no login permitted.
  4. On successful signup, a session cookie is set — no repeat OAuth needed on future visits.
- **Returning login:** Check if Gmail is already registered → log in directly. If not registered → treat as new signup (subject to the invite toggle being **enabled**). Existing faculty can always log in regardless of toggle state.
- **Class Incharge assignment:** HOD assigns a faculty member as incharge of a class from this module. One faculty can be incharge of **only one** class at a time.

---

### 6.3 Classes Module

- 8 fixed class cards: UG 1A, 1B, 2A, 2B, 3A, 3B, PG 1A, 2A.
- Each card displays: class name, class incharge, number of students, number of forum members (**forum member count shown only on 3A and 3B cards**).
- Clicking a card opens that class's student list.
- **Per-class invite links:** each of the 8 classes has its **own distinct, permanent invite link** (8 links total — not one shared link).
- **Invite toggle:** each class's link can be switched on/off independently, by **HOD** or by **that class's incharge**.
- **Student onboarding flow:**
  1. Click a specific class's invite link → Google OAuth via Firebase.
  2. The **class field is automatically locked to the class tied to that link** and is **immutable** — the student cannot pick a different class, preventing wrong-class signups.
  3. If new user → onboarding form:
     - Name (prefilled, mutable)
     - Gmail (prefilled, **immutable**)
     - Profile picture (prefilled, mutable)
     - Roll No (manually entered)
     - Register No (manually entered)
     - Class — **pre-filled and locked**, not selectable
- **Visibility rules:**
  - Normal faculty see all class cards with stats, but **not** the student list.
  - Only the class incharge can view that class's student list by default.
  - Other faculty can be granted access via a **direct grant** (HOD or that class's incharge picks the faculty and toggles access on — no request/approval flow).
  - Students can view only their own class's list.

---

### 6.4 Forum Members Module

- HOD selects forum members **only** from 3A/3B students, and assigns each a role.
- **Role input:** dropdown of preset roles **plus** a custom text option.
- Forum members can post report-style comments:
  - Text + optional image **and/or file/document** attachment (via Cloudinary).
  - Editable for 30 minutes after posting; edited posts show an **"edited"** label.
  - Each post shows: author name, date/time, like button (others can like).
  - Default visibility: **public** (all users can see). HOD can restrict visibility of individual posts to make them private/limited.

---

### 6.5 Projects Module *(highest priority — build first)*

**Reference UI** (from provided screenshot):
- Stat cards: Total Projects, In Progress, No. of Students, Completed, Low Activity
- Search bar + Status filter + Faculty filter
- Table columns: `#`, Project Title + description, Faculty, Forum Member, Students (avatars), Status, Updated, Actions
- "Create Project" button, pagination

**Creation rules:**
- HOD creates projects.
- Requires: a project **name** + a **minimum of one member total**, from any combination of Students, Faculty, and/or Forum Members (no category is mandatory; any number per category allowed).
- A project becomes **active immediately** upon creation — there is no draft state.

**Role exclusivity rule:**
- Forum Members are a subset of Students (drawn from 3A/3B). Within a **single project**, a person cannot be assigned as both "Student" and "Forum Member."
- If a person is already selected under one role for that project, they must appear as **already-selected/disabled** in the picker for the other role, for that same project.

**Post-creation visibility:**
- The project appears in the "My Projects" view of every assigned student/faculty/forum member.
- HOD sees all projects (the full table view).

**Project Detail Screen:**
- Clicking a project opens a detail screen containing a chat space called **"Progress Monitor"** — functions like a WhatsApp group containing HOD + all assigned members.
- Students report their progress here; Faculty/Forum Members view and can reply/give reviews; HOD oversees everything.

**Progress Monitor chat rules:**
- Messages support text + optional image **and/or file/document** attachment (Cloudinary).
- Editable within **30 minutes** of posting.
- **Deletion:** only the original sender can delete their own message — not even HOD can delete someone else's message. Deletion is a **soft delete**: the message is replaced with a placeholder, **"This message was deleted"** (never hard-removed).

**Status rules:**
- Only **HOD** can manually mark a project as **"Completed"** or otherwise change its status.
- **"Low Activity"** status is **auto-triggered** when there has been no message in that project's Progress Monitor chat for **3 consecutive days**.

---

### 6.6 Updates Module (Blog/Announcements)

- Only **Update Coordinators** can post — assigned by HOD from either Faculty or Forum Members.
- Posts support text + optional image **and/or file/document** attachment (Cloudinary).
- Posts show **date/time only** — no author attribution shown publicly.
- Editable for 30 minutes after posting.
- Has a delete option.
- Has a like button.
- Visible to **all** — both public (visitor) side and the authenticated app side.

---

### 6.7 Notifications Module

- **Delivery channels — both used together, not either/or:**
  1. **In-app:** existing red-dot indicator system.
  2. **Push:** Firebase Cloud Messaging (FCM), so users get notified even when the app/tab isn't open. Each account's device(s) register an FCM token, stored server-side, used to dispatch pushes alongside the in-app record.
- **Broad notifications** to all students/faculty when:
  - A new faculty member or forum member is assigned.
  - A new Update is posted.
- **Targeted notifications** sent only to specifically involved users — e.g., when a student is assigned to a project along with a faculty member and forum member, only those involved are notified.
- **Unread indicator:** a red dot appears on the Notifications nav icon when there's a new notification; it clears the moment the section is opened.

---

### 6.8 Settings Module

- Theme selector (Light default / Dark)
- Notification on/off toggle
- Logout
- Space reserved for future settings/options

---

## 7. Data Model (Entity Sketch)

> Starting schema for the dev team — adjust field types/constraints during implementation.

- **accounts** — `id, gmail (unique, immutable), name, profile_picture_url, role (hod/faculty/student), created_at, last_login_at`
- **faculty_profiles** — `account_id (FK), designation, classes_handling (array), is_update_coordinator (bool)`
- **student_profiles** — `account_id (FK), roll_no, register_no, class_id (FK)`
- **forum_members** — `student_account_id (FK, unique), role_text, assigned_by, assigned_at, is_update_coordinator (bool)`
- **classes** — `id, name (e.g. "UG 1A"), incharge_account_id (FK, nullable), invite_link_enabled (bool)` *(per-class toggle, since each class has its own link)*
- **faculty_class_access** — `faculty_account_id (FK), class_id (FK), granted_by (FK), granted_at` *(direct-grant access records)*
- **invite_settings** — `faculty_invite_enabled (bool)` *(global faculty signup toggle only — student invites are per-class, tracked on `classes`)*
- **device_tokens** — `id, account_id (FK), fcm_token, created_at` *(for push notification dispatch)*
- **projects** — `id, title, description, status (in_progress/completed/low_activity), created_by, created_at, updated_at, last_activity_at`
- **project_members** — `project_id (FK), account_id (FK), role_in_project (student/faculty/forum_member)`
- **project_messages** *(Firestore collection, not Postgres)* — `project_id, sender_account_id, content, attachment_url, attachment_type, created_at, edited_at, is_edited, is_deleted`
- **updates_posts** — `id, content, attachment_url, attachment_type, posted_by_account_id (hidden from public output), created_at, edited_at, is_edited`
- **forum_posts** — `id, forum_member_account_id (FK), content, attachment_url, attachment_type, created_at, edited_at, is_edited, visibility (public/restricted)`
- **likes** — `id, target_type (update/forum_post), target_id, account_id, created_at` *(unique per account per target)*
- **notifications** — `id, recipient_account_id (FK), type, message, related_entity_type, related_entity_id, is_read (bool), created_at`
- **user_preferences** — `account_id (FK), theme (light/dark), notifications_enabled (bool)`

---

## 8. Non-Functional Requirements

- **Responsiveness:** mobile-first design; Tailwind breakpoints; sidebar collapses to a bottom/hamburger nav on small screens.
- **PWA:** installable, manifest.json + service worker (offline shell caching); FCM integrated for push.
- **Performance:** indexed columns (`gmail`, `class_id`, `role`) for O(1)/O(log n) lookups; paginated API responses for tables (Projects, Students, Updates); lazy-loaded routes on the frontend.
- **Error handling:** centralized error-handling middleware in Flask (consistent JSON error responses); React error boundaries around major sections; client + server-side input validation; graceful fallback UI on network/API failure — critical given the high-traffic, can't-break requirement, and that this is a production deployment, not an MVP.
- **Security:** Firebase ID token verification on every protected backend route; httpOnly + secure session cookies; role-based access control checks on every endpoint (not just hidden in the UI); CSRF protection on state-changing requests.
- **Theming:** CSS variables / Tailwind `dark:` class strategy; preference stored in `localStorage` (instant, no extra network call) and optionally synced to `user_preferences` table.

---

## 9. Deployment

### 9.1 Local Development
`docker-compose.yml` services:
- **frontend** — React build, served via Vite preview/Nginx
- **backend** — Flask app via Gunicorn
- **db** — `postgres:16-alpine` with a named volume for persistent data

### 9.2 AWS Production Architecture
- **Compute:** ECS (Fargate) running the frontend and backend containers — scales automatically, no single point of failure like a lone EC2 instance.
- **Database:** Amazon RDS for PostgreSQL — managed backups, automated failover, easier scaling than a self-managed DB container.
- **Routing/SSL:** Application Load Balancer (ALB) in front of the backend; Route 53 for DNS; ACM for SSL certificates.
- **Frontend delivery:** CloudFront serving the React build for CDN caching and faster global load times.
- **Media:** Cloudinary remains the storage layer (no S3 needed for this).
- **Secrets:** AWS Secrets Manager (or SSM Parameter Store) for Firebase/Cloudinary/DB credentials instead of plain `.env` files in production.

---

## 10. Open Items

- Dashboard's exact widget set is not yet finalized — to be detailed after Projects ships.
