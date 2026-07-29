## How the Leave Tracker Works — Simple Explanation

---

### 🗂️ The Big Picture

There are **two actors**: Faculty (submits leave) and HOD (approves/rejects). The system does three things when leave is approved: **records it**, **cancels timetable classes**, and **deducts the balance**. When rejected/cancelled, it does the exact reverse.

---

### 📋 Step-by-Step Flow

```
Faculty submits → HOD gets notification → HOD approves/rejects
                                               ↓           ↓
                                         Classes        Faculty
                                         cancelled      notified
                                         Balance        Balance
                                         deducted       untouched
```

---

### 🗃️ What's Stored in the Database

**3 new tables:**

| Table | Stores |
|---|---|
| `academic_years` | The current June–May year (e.g. "2026-27"). Auto-created on first use. |
| `leave_balances` | Per faculty, per year, per type — how many days are `entitled` vs `used`. |
| `leave_requests` | Every leave request with its status, dates, reason, and document. |

---

### 🔄 The Approval Lifecycle

```
PENDING  ──(HOD approves)──→  APPROVED  ──(HOD reverses)──→  REJECTED
   │                              │
   │ (Faculty cancels)            │ (Faculty cancels)
   ↓                              ↓
CANCELLED                    CANCELLED
  (silent)              (restores classes + refund)
```

**PENDING → no class changes yet.** The timetable is only touched on approval.

---

### 🏫 The Timetable Part (The Clever Bit)

When the HOD approves, the system:
1. Looks at each date in the leave range (skips Sundays)
2. Finds the faculty's `TimetableEntry` rows for that weekday
3. Marks them `is_cancelled = True`
4. **Records the exact entry IDs** it touched in a JSON field called `affected_entries`:
   ```json
   { "2026-08-04": [101, 102], "2026-08-05": [205] }
   ```

When the leave is later rejected or cancelled:
- It reads back those **exact IDs** and restores only those rows
- If the HOD manually cancelled a class on the same day for a different reason, that class is **never touched** — because its ID wasn't recorded

**Why this matters:** The old `cancel-faculty-day` / `restore-faculty-day` endpoints blindly affected all entries matching `(faculty, day)`. This new approach is surgical.

---

### 💰 Balance Math

Each faculty has a balance row like this for each leave type:

```
CL:  entitled=12,  used=3  →  remaining=9
ML:  entitled=12,  used=0  →  remaining=12
OD:  entitled=999, used=5  →  (unlimited, just tracked)
```

- **On approval** → `used += days_count`
- **On reject/cancel** → `used -= days_count` (never goes below 0)
- Full day = 1, Half day = 0.5, Permission = 0 (quota-based, not deducted)

**Permission is different** — it doesn't use the balance table at all. Instead it counts "how many Permission requests exist this calendar month" and caps at 3. This is because Permission is "times per month", not "days per year".

---

### 📅 Leave Types & Duration Combos

| Type | Duration | What gets cancelled |
|---|---|---|
| Casual Leave | Full Day | All faculty classes that day |
| Casual Leave | First Half | Only periods 1–2 |
| Casual Leave | Second Half | Only periods 3–5 |
| Permission | Specific Periods | Only the 1–2 periods the faculty selects |
| Medical Leave | Full Day | Same as CL full day |
| On Duty | Full Day | Same as CL full day |

---

### 🔔 Notifications (4 events)

| Event | Who gets notified |
|---|---|
| Faculty submits a request | HOD |
| HOD approves | Faculty |
| HOD rejects | Faculty |
| Faculty cancels an *already-approved* leave | HOD (classes are being restored) |

Cancelling a **pending** request doesn't notify the HOD — nothing for them to act on.

---

### 🖥️ Frontend Flow

**Faculty sees:**
```
/leave → "My Leaves" tab (history + cancel button)
         "Balance" tab (5 cards: CL/ML/OD/Permission/CompOff)
         "Calendar" tab (their approved leaves on a month grid)
         [Request Leave] button → 4-step modal
```

**HOD sees:**
```
/leave → "Pending" tab (approve/reject queue with badge count)
         "All Requests" tab (filterable by status)
         "Calendar" tab (all faculty's approved leaves)
         "Overview" tab (faculty × leave-type balance grid)
         [Grant Leave] button → direct grant modal
```

Both views are on the **same `/leave` URL** — the page detects `user.role` and renders the right view.

---

### 🌊 Data Flow Summary

```
Frontend (React)
    │  TanStack Query fetches/mutates
    ↓
Flask API (/api/leave/*)
    │  require_auth / require_hod decorators
    ↓
leave_service.py (business logic)
    │  approve_leave() / reject_leave() / cancel_leave()
    ↓
Database (PostgreSQL)
    ├── leave_requests    ← updated status
    ├── leave_balances    ← used += / -= days_count
    └── timetable_entries ← is_cancelled flipped (only specific IDs)
    │
    └── fcm_helper.send_notification() → Push notification
```

That's the entire system. The core idea is: **one approval triggers three writes** (status, balance, timetable), and the timetable write records exactly what it did so it can be perfectly undone later.