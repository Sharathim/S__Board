import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../../context/AuthContext";
import PageHeader from "../../components/ui/PageHeader";
import { Button } from "../../components/ui/Button";
import { StatusFilter } from "../../components/shared/SearchFilter";
import {
  getMyLeaves, getPendingLeaves, getAllLeaves,
} from "../../api/leave";

import { FacultyBalanceCards } from "./components/LeaveBalanceCards";
import { LeaveRequestModal } from "./components/LeaveRequestModal";
import { LeaveHistoryTable } from "./components/LeaveHistoryTable";
import { PendingApprovalTable } from "./components/PendingApprovalTable";
import { LeaveCalendarView } from "./components/LeaveCalendarView";
import { DepartmentOverviewGrid } from "./components/DepartmentOverviewGrid";
import { HODGrantLeaveModal } from "./components/HODGrantLeaveModal";
import { HODLeaveSettingsModal } from "./components/HODLeaveSettingsModal";

import {
  CalendarClock, Clock, LayoutList, CalendarDays,
  BarChart3, Plus, Gift, Sliders
} from "lucide-react";

// ── Tab button ──────────────────────────────────────────────────────────────
function Tab({ id, label, icon: Icon, active, onClick, badge }) {
  return (
    <button
      id={id}
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${
        active
          ? "bg-primary-600 text-white shadow-sm shadow-primary-500/20"
          :"text-gray-600 hover:bg-gray-100"
      }`}
    >
      <Icon className="w-4 h-4" />
      {label}
      {badge > 0 && (
        <span className="min-w-[20px] h-5 rounded-full bg-rose-500 text-white text-[10px] font-black flex items-center justify-center px-1 ml-0.5 shadow-xs">
          {badge}
        </span>
      )}
    </button>
  );
}

// ── Status filter options ───────────────────────────────────────────────────
const STATUS_OPTS = [
  { value: "", label: "All Statuses" },
  { value: "PENDING",   label: "Pending"   },
  { value: "APPROVED",  label: "Approved"  },
  { value: "REJECTED",  label: "Rejected"  },
  { value: "CANCELLED", label: "Cancelled" },
];

// ── Faculty view ─────────────────────────────────────────────────────────────
function FacultyLeaveView() {
  const [tab, setTab] = useState("history");
  const [requestOpen, setRequestOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState("");

  const { data: myLeaves, isLoading } = useQuery({
    queryKey: ["leave", "my", statusFilter],
    queryFn: () => getMyLeaves(statusFilter || undefined).then((r) => r.data.leaves),
  });

  const tabs = [
    { id: "history",  label: "My Leaves",  icon: LayoutList   },
    { id: "balance",  label: "Balance",    icon: BarChart3     },
    { id: "calendar", label: "Calendar",   icon: CalendarDays  },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <PageHeader title="Leave & Permission" subtitle="Manage and track your leave requests" />
        <Button id="request-leave-btn" onClick={() => setRequestOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Request Leave
        </Button>
      </div>

      {/* Tab bar */}
      <div className="flex items-center gap-2 flex-wrap">
        {tabs.map((t) => (
          <Tab key={t.id} {...t} active={tab === t.id} onClick={() => setTab(t.id)} />
        ))}
      </div>

      {/* Content */}
      {tab === "history" && (
        <div className="space-y-4">
          <div className="max-w-xs">
            <StatusFilter
              value={statusFilter}
              onChange={setStatusFilter}
              options={STATUS_OPTS.slice(1)}
            />
          </div>
          <LeaveHistoryTable leaves={myLeaves} isLoading={isLoading} />
        </div>
      )}
      {tab === "balance" && <FacultyBalanceCards />}
      {tab === "calendar" && <LeaveCalendarView />}

      <LeaveRequestModal open={requestOpen} onClose={() => setRequestOpen(false)} />
    </div>
  );
}

// ── HOD view ──────────────────────────────────────────────────────────────────
function HODLeaveView() {
  const [tab, setTab] = useState("pending");
  const [grantOpen, setGrantOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [allFilters, setAllFilters] = useState({ status: "", faculty_id: "" });

  const { data: pending, isLoading: pendingLoading } = useQuery({
    queryKey: ["leave", "pending"],
    queryFn: () => getPendingLeaves().then((r) => r.data.leaves),
  });

  const { data: allLeaves, isLoading: allLoading } = useQuery({
    queryKey: ["leave", "all", allFilters],
    queryFn: () => getAllLeaves({
      ...(allFilters.status ? { status: allFilters.status } : {}),
      ...(allFilters.faculty_id ? { faculty_id: allFilters.faculty_id } : {}),
    }).then((r) => r.data.leaves),
    enabled: tab === "all",
  });

  const tabs = [
    { id: "pending",  label: "Pending",     icon: Clock,        badge: pending?.length || 0 },
    { id: "all",      label: "All Requests", icon: LayoutList   },
    { id: "calendar", label: "Calendar",    icon: CalendarDays  },
    { id: "overview", label: "Overview",    icon: BarChart3     },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <PageHeader title="Leave & Permission" subtitle="Review and approve faculty leave requests" />
        <div className="flex items-center gap-2">
          <Button id="settings-leave-btn" variant="secondary" onClick={() => setSettingsOpen(true)}>
            <Sliders className="w-4 h-4 mr-2" />
            Set Default Limits
          </Button>
          <Button id="grant-leave-btn" variant="secondary" onClick={() => setGrantOpen(true)}>
            <Gift className="w-4 h-4 mr-2" />
            Grant Leave
          </Button>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex items-center gap-2 flex-wrap">
        {tabs.map((t) => (
          <Tab key={t.id} {...t} active={tab === t.id} onClick={() => setTab(t.id)} />
        ))}
      </div>

      {/* Content */}
      {tab === "pending" && (
        <PendingApprovalTable leaves={pending} isLoading={pendingLoading} />
      )}

      {tab === "all" && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="w-44">
              <StatusFilter
                value={allFilters.status}
                onChange={(v) => setAllFilters((f) => ({ ...f, status: v }))}
                options={STATUS_OPTS.slice(1)}
              />
            </div>
          </div>
          <LeaveHistoryTable leaves={allLeaves} isLoading={allLoading} />
        </div>
      )}

      {tab === "calendar" && <LeaveCalendarView />}
      {tab === "overview" && <DepartmentOverviewGrid />}

      <HODGrantLeaveModal open={grantOpen} onClose={() => setGrantOpen(false)} />
      <HODLeaveSettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}

// ── Root page ─────────────────────────────────────────────────────────────────
export default function LeavePage() {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      {user?.role === "HOD" ? <HODLeaveView /> : <FacultyLeaveView />}
    </div>
  );
}
