import { useQuery } from "@tanstack/react-query";
import { Navigate, useNavigate } from "react-router-dom";
import { getProjectStats, getRecentActivity } from "../../../api/projects";
import { listClasses } from "../../../api/classes";
import { listFaculty } from "../../../api/faculty";
import { listUpdates } from "../../../api/updates";
import { Spinner } from "../../../components/ui/Spinner";
import { useAuth } from "../../../context/AuthContext";
import { parseUpdateContent } from "../../../utils/updateContent";
import { parseUTCDate } from "../../../utils/dateUtils";
import MobileStatGrid, { MobileStatCell } from "../../components/MobileStatGrid";
import MobileCard from "../../components/MobileCard";
import MobileSectionHeader from "../../components/MobileSectionHeader";
import {
  FolderKanban, Users, CheckCircle,
  Megaphone, BookOpen, GraduationCap, Building2,
  Clock, BarChart3, Zap, ChevronRight,
} from "lucide-react";

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function timeAgo(isoStr) {
  if (!isoStr) return "";
  const diff = (Date.now() - parseUTCDate(isoStr)) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function StatusProgressBar({ label, value, max, color, dotColor }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-1.5 min-w-[80px]">
        <span className={`w-2 h-2 rounded-full ${dotColor} shrink-0`} />
        <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">{label}</span>
      </div>
      <div className="flex-1 h-2 rounded-full bg-gray-100 dark:bg-slate-800 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
      <span className="text-xs font-bold text-gray-700 dark:text-gray-300 tabular-nums w-6 text-right">{value}</span>
    </div>
  );
}

export default function MobileDashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  if (user && user.role !== "HOD") {
    const dest = user.role === "FACULTY" ? "/faculty" : "/classes";
    return <Navigate to={dest} replace />;
  }

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["project-stats"],
    queryFn: () => getProjectStats().then(r => r.data),
  });
  const { data: classesData } = useQuery({
    queryKey: ["classes"],
    queryFn: () => listClasses().then(r => r.data),
  });
  const { data: facultyData } = useQuery({
    queryKey: ["faculty"],
    queryFn: () => listFaculty().then(r => r.data.faculty),
  });
  const { data: updatesData } = useQuery({
    queryKey: ["updates"],
    queryFn: () => listUpdates().then(r => r.data),
  });
  const { data: recentActivity } = useQuery({
    queryKey: ["recent-activity-dashboard"],
    queryFn: () => getRecentActivity(5).then(r => r.data.activities),
  });

  if (statsLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner />
      </div>
    );
  }

  const total = stats?.total ?? 0;
  const inProgress = stats?.in_progress ?? 0;
  const completed = stats?.completed ?? 0;
  const pending = Math.max(0, total - inProgress - completed);
  const classesList = classesData?.classes || [];
  const totalStudents = classesList.reduce((s, c) => s + (c.student_count ?? 0), 0);
  const facultyList = facultyData || [];
  const facultyCount = facultyList.length;
  const updatesList = updatesData?.updates || [];

  const TAG_COLORS = {
    Notice: "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400",
    Announcement: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400",
    Event: "bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-400",
    Alert: "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400",
  };

  const STATUS_CHIPS = {
    "not started": "bg-slate-50 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
    "in progress": "bg-orange-50 text-[#F05A2B] dark:bg-orange-950/30 dark:text-orange-400",
    "review": "bg-purple-50 text-purple-700 dark:bg-purple-950/30 dark:text-purple-400",
    "completed": "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400",
  };

  return (
    <div className="mobile-fade-in pb-6 space-y-5">
      {/* Greeting */}
      <div>
        <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-0.5">
          {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}
        </p>
        <h1 className="text-xl font-black text-gray-900 dark:text-white tracking-tight leading-tight">
          {getGreeting()}, {user?.name?.split(" ")[0] ?? "Admin"}
        </h1>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Department overview at a glance.
        </p>
      </div>

      {/* Hero Stat Card */}
      <div
        onClick={() => navigate("/projects")}
        className="mobile-tappable rounded-2xl p-4 relative overflow-hidden"
        style={{
          background: "linear-gradient(135deg, #F05A2B 0%, #D94517 100%)",
          boxShadow: "0 8px 24px rgba(240,90,43,0.22)",
        }}
      >
        <div className="absolute -top-4 -right-4 w-20 h-20 rounded-full bg-white/10 blur-2xl pointer-events-none" />
        <div className="relative flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/80">Active Projects</p>
            <p className="text-3xl font-black text-white leading-none mt-1 tabular-nums">{inProgress}</p>
            <p className="text-[10px] font-bold text-white/70 mt-1">of {total} total projects</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center">
            <FolderKanban className="w-6 h-6 text-white" />
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <MobileStatGrid>
        <MobileStatCell
          icon={CheckCircle}
          label="Completed"
          value={completed}
          iconBg="#D1FAE5"
          iconColor="#10B981"
          onClick={() => navigate("/projects")}
        />
        <MobileStatCell
          icon={GraduationCap}
          label="Students"
          value={totalStudents}
          iconBg="#E0E7FF"
          iconColor="#6366F1"
          onClick={() => navigate("/classes")}
        />
        <MobileStatCell
          icon={Building2}
          label="Faculty"
          value={facultyCount}
          iconBg="#FEF3C7"
          iconColor="#D97706"
          onClick={() => navigate("/faculty")}
        />
        <MobileStatCell
          icon={BookOpen}
          label="Classes"
          value={classesList.length}
          iconBg="#FCE7F3"
          iconColor="#EC4899"
          onClick={() => navigate("/classes")}
        />
      </MobileStatGrid>

      {/* Project Status Breakdown */}
      <MobileCard>
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-bold text-gray-900 dark:text-white">Project Status</span>
          <BarChart3 className="w-4 h-4 text-[#F05A2B]" />
        </div>
        <div className="space-y-3">
          <StatusProgressBar label="Active" value={inProgress} max={total} color="#F05A2B" dotColor="bg-[#F05A2B]" />
          <StatusProgressBar label="Done" value={completed} max={total} color="#22C55E" dotColor="bg-emerald-500" />
          <StatusProgressBar label="Pending" value={pending} max={total} color="#94A3B8" dotColor="bg-slate-400" />
        </div>
        <div className="mt-3 pt-3 border-t border-gray-100 dark:border-slate-800 flex items-center justify-between">
          <span className="text-[10px] font-semibold text-gray-400">Total Projects</span>
          <span className="text-sm font-black text-gray-900 dark:text-white tabular-nums">{total}</span>
        </div>
      </MobileCard>

      {/* Recent Activity */}
      <div>
        <MobileSectionHeader title="Recent Projects" viewAllTo="/projects" />
        {recentActivity && recentActivity.length > 0 ? (
          <div className="space-y-2 mt-2">
            {recentActivity.map((act) => {
              const statusClass = STATUS_CHIPS[act.status.toLowerCase()] || "bg-slate-50 text-slate-600";
              return (
                <MobileCard key={act.id} onClick={() => navigate("/projects")}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-bold text-gray-800 dark:text-gray-200 truncate flex-1">
                      {act.name}
                    </span>
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${statusClass} uppercase shrink-0`}>
                      {act.status}
                    </span>
                  </div>
                  {act.last_message && (
                    <p className="text-[11px] text-gray-400 dark:text-gray-500 truncate mt-1.5">
                      <span className="font-semibold text-gray-500 dark:text-gray-400">{act.last_message.sender_name}: </span>
                      {act.last_message.content}
                    </p>
                  )}
                </MobileCard>
              );
            })}
          </div>
        ) : (
          <MobileCard className="mt-2">
            <p className="text-xs text-gray-400 text-center py-4">No recent project activity</p>
          </MobileCard>
        )}
      </div>

      {/* Announcements */}
      <div>
        <MobileSectionHeader title="Announcements" viewAllTo="/updates" />
        {updatesList.length > 0 ? (
          <div className="space-y-2 mt-2">
            {updatesList.slice(0, 3).map((upd, idx) => {
              const parsed = parseUpdateContent(upd.content);
              const title = parsed.title || parsed.department || "Department Update";
              const desc = parsed.description || "Official department update.";
              const tag = parsed.updateType || "Notice";
              const tagCls = TAG_COLORS[tag] || "bg-slate-100 text-slate-600";

              return (
                <MobileCard key={idx} onClick={() => navigate("/updates")}>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-xl bg-[#F05A2B]/10 flex items-center justify-center shrink-0 mt-0.5">
                      <Zap className="w-4 h-4 text-[#F05A2B]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-gray-900 dark:text-white truncate">{title}</span>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md ${tagCls}`}>{tag}</span>
                      </div>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400 line-clamp-2 mt-1 leading-relaxed">{desc}</p>
                      <div className="flex items-center gap-1 text-[10px] text-gray-400 mt-1.5">
                        <Clock className="w-3 h-3" />
                        {timeAgo(upd.created_at)}
                      </div>
                    </div>
                  </div>
                </MobileCard>
              );
            })}
          </div>
        ) : (
          <MobileCard className="mt-2">
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <Megaphone className="w-8 h-8 text-gray-300 dark:text-gray-600 mb-2" />
              <p className="text-xs font-bold text-gray-500 dark:text-gray-400">No announcements yet</p>
            </div>
          </MobileCard>
        )}
      </div>
    </div>
  );
}
