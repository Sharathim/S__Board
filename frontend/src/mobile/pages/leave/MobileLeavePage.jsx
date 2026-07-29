import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../../../context/AuthContext";
import { Button } from "../../../components/ui/Button";
import BottomSheet from "../../layout/BottomSheet";
import {
  getMyLeaves, getMyBalance, getPendingLeaves,
} from "../../../api/leave";

import { FacultyBalanceCards } from "../../../pages/leave/components/LeaveBalanceCards";
import { LeaveRequestModal } from "../../../pages/leave/components/LeaveRequestModal";
import { LeaveHistoryTable } from "../../../pages/leave/components/LeaveHistoryTable";
import { PendingApprovalTable } from "../../../pages/leave/components/PendingApprovalTable";
import { LeaveCalendarView } from "../../../pages/leave/components/LeaveCalendarView";
import { HODGrantLeaveModal } from "../../../pages/leave/components/HODGrantLeaveModal";
import { HODLeaveSettingsModal } from "../../../pages/leave/components/HODLeaveSettingsModal";

import { StatusFilter } from "../../../components/shared/SearchFilter";
import {
  CalendarClock, Plus, Gift, Clock, LayoutList, CalendarDays, BarChart3, Sliders
} from "lucide-react";

const STATUS_OPTS = [
  { value: "PENDING",   label: "Pending"   },
  { value: "APPROVED",  label: "Approved"  },
  { value: "REJECTED",  label: "Rejected"  },
  { value: "CANCELLED", label: "Cancelled" },
];

// ── Faculty mobile view ───────────────────────────────────────────────────
function MobileFacultyView() {
  const [requestOpen, setRequestOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState("");
  const [section, setSection] = useState("history"); // history | balance | calendar

  const { data: leaves, isLoading } = useQuery({
    queryKey: ["leave", "my", statusFilter],
    queryFn: () => getMyLeaves(statusFilter || undefined).then((r) => r.data.leaves),
  });

  return (
    <div className="flex flex-col min-h-full">
      {/* Mobile header */}
      <div className="px-4 pt-4 pb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center">
            <CalendarClock className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-base font-black text-gray-900 dark:text-white leading-none">Leave & Permission</h1>
            <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">Track your leave balance</p>
          </div>
        </div>
        <button
          onClick={() => setRequestOpen(true)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary-600 text-white text-xs font-bold shadow-sm active:scale-95 transition-transform"
        >
          <Plus className="w-3.5 h-3.5" />
          Request
        </button>
      </div>

      {/* Section tabs */}
      <div className="px-4 flex gap-2 overflow-x-auto scrollbar-none pb-2">
        {[
          { id: "history",  label: "History",  icon: LayoutList  },
          { id: "balance",  label: "Balance",  icon: BarChart3   },
          { id: "calendar", label: "Calendar", icon: CalendarDays },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setSection(t.id)}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              section === t.id
                ? "bg-primary-600 text-white shadow-sm shadow-primary-500/20"
                : "bg-gray-100 dark:bg-slate-800/80 text-gray-600 dark:text-slate-300 border border-transparent dark:border-slate-700/60"
            }`}
          >
            <t.icon className="w-3.5 h-3.5" />
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="px-4 flex-1 pb-6 space-y-4">
        {section === "history" && (
          <>
            <StatusFilter
              value={statusFilter}
              onChange={setStatusFilter}
              options={STATUS_OPTS}
            />
            <LeaveHistoryTable leaves={leaves} isLoading={isLoading} />
          </>
        )}
        {section === "balance" && <FacultyBalanceCards />}
        {section === "calendar" && <LeaveCalendarView />}
      </div>

      <LeaveRequestModal open={requestOpen} onClose={() => setRequestOpen(false)} />
    </div>
  );
}

// ── HOD mobile view ───────────────────────────────────────────────────────
function MobileHODView() {
  const [grantOpen, setGrantOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [section, setSection] = useState("pending");

  const { data: pending, isLoading: pendingLoading } = useQuery({
    queryKey: ["leave", "pending"],
    queryFn: () => getPendingLeaves().then((r) => r.data.leaves),
  });

  const pendingCount = pending?.length || 0;

  return (
    <div className="flex flex-col min-h-full">
      {/* Mobile header */}
      <div className="px-4 pt-4 pb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-violet-700 flex items-center justify-center">
            <CalendarClock className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-base font-black text-gray-900 dark:text-white leading-none">Leave & Permission</h1>
            <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">
              {pendingCount > 0 ? `${pendingCount} pending review` : "Department leave management"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setSettingsOpen(true)}
            className="flex items-center gap-1 px-2.5 py-2 rounded-xl bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-200 text-xs font-bold border border-gray-200 dark:border-slate-700/80 active:scale-95 transition-transform"
            title="Set Default Limits"
          >
            <Sliders className="w-3.5 h-3.5" />
            Limits
          </button>
          <button
            onClick={() => setGrantOpen(true)}
            className="flex items-center gap-1 px-3 py-2 rounded-xl bg-violet-600 text-white text-xs font-bold shadow-sm active:scale-95 transition-transform"
          >
            <Gift className="w-3.5 h-3.5" />
            Grant
          </button>
        </div>
      </div>

      {/* Section tabs */}
      <div className="px-4 flex gap-2 overflow-x-auto scrollbar-none pb-2">
        {[
          { id: "pending",  label: "Pending",  icon: Clock,       badge: pendingCount },
          { id: "calendar", label: "Calendar", icon: CalendarDays },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setSection(t.id)}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all relative ${
              section === t.id
                ? "bg-violet-600 text-white shadow-sm shadow-violet-500/20"
                : "bg-gray-100 dark:bg-slate-800/80 text-gray-600 dark:text-slate-300 border border-transparent dark:border-slate-700/60"
            }`}
          >
            <t.icon className="w-3.5 h-3.5" />
            {t.label}
            {t.badge > 0 && (
              <span className="ml-0.5 min-w-[16px] h-4 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center px-1">
                {t.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="px-4 flex-1 pb-6 space-y-4">
        {section === "pending" && (
          <PendingApprovalTable leaves={pending} isLoading={pendingLoading} />
        )}
        {section === "calendar" && <LeaveCalendarView />}
      </div>

      <HODGrantLeaveModal open={grantOpen} onClose={() => setGrantOpen(false)} />
      <HODLeaveSettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}

// ── Root mobile leave page ────────────────────────────────────────────────
export default function MobileLeavePage() {
  const { user } = useAuth();
  return user?.role === "HOD" ? <MobileHODView /> : <MobileFacultyView />;
}
