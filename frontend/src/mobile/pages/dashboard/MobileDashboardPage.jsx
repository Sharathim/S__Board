import { useQuery } from "@tanstack/react-query";
import { getProjectStats, getRecentActivity } from "../../../api/projects";
import { listClasses } from "../../../api/classes";
import { listFaculty } from "../../../api/faculty";
import { useAuth } from "../../../context/AuthContext";
import { Spinner } from "../../../components/ui/Spinner";
import { Link } from "react-router-dom";
import {
  FolderKanban, TrendingUp, Users, CheckCircle,
  CalendarDays, ChevronRight, Activity, Clock,
} from "lucide-react";
import MobileCard from "../../components/MobileCard";
import MobileStatGrid, { MobileStatCell } from "../../components/MobileStatGrid";
import MobileSectionHeader from "../../components/MobileSectionHeader";

/* ─── Helpers (same as desktop) ─── */
function getFirstName(name) {
  if (!name) return "there";
  return name.trim().split(" ")[0];
}

function timeAgo(isoStr) {
  if (!isoStr) return "";
  const diff = (Date.now() - new Date(isoStr)) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function statusMeta(status) {
  const map = {
    NOT_STARTED: { label: "Not Started", color: "#9CA3AF", bg: "#F3F4F6" },
    IN_PROGRESS: { label: "In Progress", color: "#8B5CF6", bg: "#EDE9FE" },
    REVIEW: { label: "Review", color: "#F59E0B", bg: "#FFFBEB" },
    COMPLETED: { label: "Completed", color: "#059669", bg: "#E6F4EA" },
    ON_HOLD: { label: "On Hold", color: "#F59E0B", bg: "#FEF3C7" },
    CANCELLED: { label: "Cancelled", color: "#EF4444", bg: "#FEF2F2" },
  };
  return map[status] || { label: status, color: "#9CA3AF", bg: "#F3F4F6" };
}

/* ─── SVG Donut Chart (compact for mobile) ─── */
function DonutChart({ segments, total }) {
  const size = 140;
  const cx = size / 2;
  const cy = size / 2;
  const r = 48;
  const stroke = 16;
  const circumference = 2 * Math.PI * r;

  if (total === 0) {
    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--border-light, #e5e7eb)" strokeWidth={stroke} />
        <text x={cx} y={cy - 4} textAnchor="middle" fontSize="20" fontWeight="700" fill="var(--text-primary, #1e293b)">0</text>
        <text x={cx} y={cy + 12} textAnchor="middle" fontSize="9" fill="var(--text-muted, #94a3b8)">Total</text>
      </svg>
    );
  }

  let offset = 0;
  const arcs = segments.filter(s => s.value > 0).map(s => {
    const pct = s.value / total;
    const dash = pct * circumference;
    const gap = circumference - dash;
    const arc = { ...s, dash, gap, offset };
    offset += dash;
    return arc;
  });

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: "rotate(-90deg)" }}>
      {arcs.map((arc, i) => (
        <circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={arc.color} strokeWidth={stroke}
          strokeDasharray={`${arc.dash} ${arc.gap}`} strokeDashoffset={-arc.offset} strokeLinecap="butt" />
      ))}
      <g style={{ transform: `rotate(90deg) translate(-${size}px, 0)` }}>
        <text x={size - cx} y={cy - 4} textAnchor="middle" fontSize="20" fontWeight="700" fill="var(--text-primary, #1e293b)">{total}</text>
        <text x={size - cx} y={cy + 12} textAnchor="middle" fontSize="9" fill="var(--text-muted, #94a3b8)">Total</text>
      </g>
    </svg>
  );
}

/* ─── Component ─── */
export default function MobileDashboardPage() {
  const { user } = useAuth();

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["project-stats"],
    queryFn: () => getProjectStats().then(r => r.data),
  });

  const { data: activityData, isLoading: activityLoading } = useQuery({
    queryKey: ["recent-activity"],
    queryFn: () => getRecentActivity(5).then(r => r.data),
  });

  const { data: classesData } = useQuery({
    queryKey: ["classes"],
    queryFn: () => listClasses().then(r => r.data),
  });

  const { data: facultyData } = useQuery({
    queryKey: ["faculty"],
    queryFn: () => listFaculty().then(r => r.data.faculty),
  });

  if (statsLoading) {
    return <div className="flex items-center justify-center h-64"><Spinner /></div>;
  }

  const total = stats?.total ?? 0;
  const classesList = classesData?.classes || [];
  const totalStudentsCount = classesList.reduce((s, c) => s + (c.student_count ?? 0), 0);
  const facultyCount = (facultyData || []).length;

  const donutSegments = [
    { label: "Not Started", value: stats?.not_started ?? 0, color: "#9CA3AF" },
    { label: "In Progress", value: stats?.in_progress ?? 0, color: "#8B5CF6" },
    { label: "Review", value: stats?.review ?? 0, color: "#F59E0B" },
    { label: "Completed", value: stats?.completed ?? 0, color: "#059669" },
    { label: "On Hold", value: stats?.on_hold ?? 0, color: "#F59E0B" },
    { label: "Cancelled", value: (stats?.cancelled ?? 0) + (stats?.low_activity ?? 0), color: "#EF4444" },
  ];

  const activities = activityData?.activities ?? [];

  return (
    <div className="space-y-5 mobile-fade-in">
      {/* Welcome */}
      <div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">
          Welcome back, {getFirstName(user?.name)}
        </h1>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
          Here's what's happening today.
        </p>
      </div>

      {/* Core Stats — 2×2 */}
      <MobileStatGrid>
        <MobileStatCell icon={FolderKanban} label="Total Projects" value={total} iconBg="#EDE9FE" iconColor="#8B5CF6" />
        <MobileStatCell icon={TrendingUp} label="In Progress" value={stats?.in_progress ?? 0} iconBg="#ECFDF5" iconColor="#10B981" />
        <MobileStatCell icon={Users} label="Students" value={stats?.student_count ?? 0} iconBg="#F0FDF4" iconColor="#22C55E" />
        <MobileStatCell icon={CheckCircle} label="Completed" value={stats?.completed ?? 0} iconBg="#ECFDF5" iconColor="#10B981" />
      </MobileStatGrid>

      {/* Secondary Stats */}
      <MobileStatGrid>
        <MobileStatCell icon={Users} label="Total Students" value={totalStudentsCount} iconBg="#DBEAFE" iconColor="#3B82F6" />
        <MobileStatCell icon={Users} label="Total Faculty" value={facultyCount} iconBg="#EDE9FE" iconColor="#7C3AED" />
      </MobileStatGrid>

      {/* Projects Overview — Donut + Legend */}
      <MobileCard>
        <MobileSectionHeader title="Projects Overview" subtitle="By status" />
        <div className="flex flex-col items-center py-3">
          <DonutChart segments={donutSegments} total={total} />
        </div>
        <div className="space-y-1 mt-2">
          {donutSegments.map(seg => {
            const pct = total > 0 ? Math.round((seg.value / total) * 100) : 0;
            return (
              <div key={seg.label} className="flex items-center gap-3 py-1.5 px-2 rounded-lg">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: seg.color }} />
                <span className="flex-1 text-xs font-medium text-gray-500 dark:text-gray-400">{seg.label}</span>
                <span className="text-xs font-bold text-gray-900 dark:text-white w-6 text-right">{seg.value}</span>
                <span className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 w-9 text-right">{pct}%</span>
              </div>
            );
          })}
        </div>
      </MobileCard>

      {/* Upcoming Deadlines */}
      <MobileCard>
        <MobileSectionHeader title="Upcoming Deadlines" />
        <div className="flex flex-col items-center py-8 text-center">
          <div className="w-14 h-14 rounded-full flex items-center justify-center mb-3 bg-gray-50 dark:bg-slate-800">
            <CalendarDays className="w-7 h-7 text-gray-400 dark:text-gray-500" />
          </div>
          <p className="text-sm font-semibold text-gray-900 dark:text-white mb-1">No upcoming deadlines</p>
          <p className="text-xs text-gray-400 dark:text-gray-500">New deadlines will appear here.</p>
        </div>
      </MobileCard>

      {/* Recent Activity */}
      <MobileCard>
        <MobileSectionHeader title="Recent Activity" viewAllTo="/projects" />
        {activityLoading ? (
          <div className="flex justify-center py-8"><Spinner /></div>
        ) : activities.length === 0 ? (
          <div className="flex flex-col items-center py-8 text-center">
            <div className="w-14 h-14 rounded-full flex items-center justify-center mb-3 bg-gray-50 dark:bg-slate-800">
              <Activity className="w-7 h-7 text-gray-400 dark:text-gray-500" />
            </div>
            <p className="text-sm font-semibold text-gray-900 dark:text-white mb-1">No recent activity</p>
            <p className="text-xs text-gray-400 dark:text-gray-500">Activities will appear once you start working.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {activities.map(item => {
              const meta = statusMeta(item.status);
              return (
                <Link
                  key={item.id}
                  to={`/projects/${item.id}`}
                  className="mobile-tappable flex items-start gap-3 p-3 rounded-xl border border-gray-100 dark:border-slate-800/60 hover:bg-gray-50/50 dark:hover:bg-slate-800/40 transition-all"
                  style={{ textDecoration: "none" }}
                >
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: meta.bg }}>
                    <FolderKanban className="w-4 h-4" style={{ color: meta.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{item.name}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 truncate mt-0.5">
                      {item.last_message ? `${item.last_message.sender_name}: ${item.last_message.content}` : "No activity yet"}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold" style={{ background: meta.bg, color: meta.color }}>
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: meta.color }} />
                      {meta.label}
                    </span>
                    <span className="text-[10px] text-gray-400 dark:text-gray-500 flex items-center gap-0.5">
                      <Clock className="w-3 h-3" />
                      {timeAgo(item.updated_at)}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </MobileCard>

      {/* Department Insights */}
      <MobileCard>
        <MobileSectionHeader title="Department Insights" />
        <div className="space-y-4 mt-2">
          {/* Completion Rate */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">Project Completion Rate</span>
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                {total > 0 ? Math.round(((stats?.completed ?? 0) / total) * 100) : 0}%
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-gray-100 dark:bg-slate-800/60 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-emerald-500 transition-all duration-500"
                style={{ width: `${total > 0 ? Math.round(((stats?.completed ?? 0) / total) * 100) : 0}%` }}
              />
            </div>
            <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">
              {stats?.completed ?? 0} out of {total} projects completed
            </p>
          </div>

          {/* Activity Status */}
          <div className="flex items-center justify-between p-3 rounded-xl border border-gray-100 dark:border-slate-800/60 bg-gray-50/50 dark:bg-slate-900/40">
            <div>
              <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Activity Status</p>
              <p className="text-sm font-bold mt-0.5 text-gray-800 dark:text-gray-200">
                {stats?.low_activity > 2 ? "Attention Required" : stats?.low_activity > 0 ? "Active & Stable" : total > 0 ? "100% Active" : "No Active Projects"}
              </p>
            </div>
            <span
              className="text-[10px] font-semibold px-2 py-1 rounded-full flex items-center gap-1"
              style={{
                background: stats?.low_activity > 2 ? "rgba(239,68,68,0.1)" : stats?.low_activity > 0 ? "rgba(245,158,11,0.1)" : "rgba(16,185,129,0.1)",
                color: stats?.low_activity > 2 ? "#EF4444" : stats?.low_activity > 0 ? "#F59E0B" : "#10B981",
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{
                background: stats?.low_activity > 2 ? "#EF4444" : stats?.low_activity > 0 ? "#F59E0B" : "#10B981",
              }} />
              {stats?.low_activity > 2 ? "Attention" : stats?.low_activity > 0 ? "Warning" : "Excellent"}
            </span>
          </div>

          {/* Student Coverage */}
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 bg-indigo-50 dark:bg-indigo-950/50">
              <Users className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500">Student Coverage</p>
              <p className="text-sm font-bold mt-0.5 text-gray-800 dark:text-gray-200">{stats?.student_count ?? 0} Students Assigned</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Actively collaborating in projects</p>
            </div>
          </div>
        </div>
      </MobileCard>
    </div>
  );
}
