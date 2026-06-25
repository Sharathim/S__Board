import { useQuery } from "@tanstack/react-query";
import { getProjectStats, getRecentActivity } from "../../api/projects";
import { getUnreadCount } from "../../api/notifications";
import { Spinner } from "../../components/ui/Spinner";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  FolderKanban, TrendingUp, Users, CheckCircle, AlertTriangle,
  Plus, CalendarDays, ChevronRight, GraduationCap, BookOpen,
  MessageSquare, Megaphone, Clock, Activity,
} from "lucide-react";

/* ─── Helpers ────────────────────────────────────────────────────────────── */
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
    NOT_STARTED:  { label: "Not Started",  color: "#9CA3AF", bg: "#F3F4F6" },
    IN_PROGRESS:  { label: "In Progress",  color: "#8B5CF6", bg: "#EDE9FE" },
    REVIEW:       { label: "Review",       color: "#F59E0B", bg: "#FFFBEB" },
    COMPLETED:    { label: "Completed",    color: "#059669", bg: "#E6F4EA" },
    ON_HOLD:      { label: "On Hold",      color: "#F59E0B", bg: "#FEF3C7" },
    CANCELLED:    { label: "Cancelled",    color: "#EF4444", bg: "#FEF2F2" },
    LOW_ACTIVITY: { label: "Low Activity", color: "#F59E0B", bg: "#FEF3C7" },
  };
  return map[status] || { label: status, color: "#9CA3AF", bg: "#F3F4F6" };
}

/* ─── SVG Donut Chart ────────────────────────────────────────────────────── */
function DonutChart({ segments, total }) {
  const size = 160;
  const cx = size / 2;
  const cy = size / 2;
  const r = 56;
  const stroke = 18;
  const circumference = 2 * Math.PI * r;

  if (total === 0) {
    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={cx} cy={cy} r={r}
          fill="none"
          stroke="var(--border-light)"
          strokeWidth={stroke}
        />
        <text x={cx} y={cy - 4} textAnchor="middle" fontSize="22" fontWeight="700" fill="var(--text-primary)">0</text>
        <text x={cx} y={cy + 14} textAnchor="middle" fontSize="9" fill="var(--text-muted)">Total Projects</text>
      </svg>
    );
  }

  let offset = 0;
  const arcs = segments
    .filter(s => s.value > 0)
    .map(s => {
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
        <circle
          key={i}
          cx={cx} cy={cy} r={r}
          fill="none"
          stroke={arc.color}
          strokeWidth={stroke}
          strokeDasharray={`${arc.dash} ${arc.gap}`}
          strokeDashoffset={-arc.offset}
          strokeLinecap="butt"
        />
      ))}
      {/* Center text — rotate back to normal */}
      <g style={{ transform: `rotate(90deg) translate(-${size}px, 0)` }}>
        <text x={size - cx} y={cy - 4} textAnchor="middle" fontSize="22" fontWeight="700" fill="var(--text-primary)">{total}</text>
        <text x={size - cx} y={cy + 14} textAnchor="middle" fontSize="9" fill="var(--text-muted)">Total Projects</text>
      </g>
    </svg>
  );
}

/* ─── Component ──────────────────────────────────────────────────────────── */
export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["project-stats"],
    queryFn: () => getProjectStats().then(r => r.data),
  });

  const { data: activityData, isLoading: activityLoading } = useQuery({
    queryKey: ["recent-activity"],
    queryFn: () => getRecentActivity(5).then(r => r.data),
  });

  const { data: notifData } = useQuery({
    queryKey: ["unread-count"],
    queryFn: () => getUnreadCount().then(r => r.data),
  });

  if (statsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner />
      </div>
    );
  }

  const total = stats?.total ?? 0;

  /* ─ Stat cards ─ */
  const statCards = [
    {
      key: "total",
      label: "Total Projects",
      value: total,
      icon: FolderKanban,
      iconBg: "#EDE9FE",
      iconColor: "#8B5CF6",
      emptyLabel: "No projects created yet",
    },
    {
      key: "in_progress",
      label: "In Progress",
      value: stats?.in_progress ?? 0,
      icon: TrendingUp,
      iconBg: "#ECFDF5",
      iconColor: "#10B981",
      emptyLabel: "No projects in progress",
    },
    {
      key: "student_count",
      label: "Students in Projects",
      value: stats?.student_count ?? 0,
      icon: Users,
      iconBg: "#F0FDF4",
      iconColor: "#22C55E",
      emptyLabel: "No students assigned",
    },
    {
      key: "completed",
      label: "Completed",
      value: stats?.completed ?? 0,
      icon: CheckCircle,
      iconBg: "#ECFDF5",
      iconColor: "#10B981",
      emptyLabel: "No projects completed",
    },
    {
      key: "low_activity",
      label: "Low Activity",
      value: stats?.low_activity ?? 0,
      icon: AlertTriangle,
      iconBg: "#FFF7ED",
      iconColor: "#F97316",
      emptyLabel: "No low activity projects",
    },
  ];

  /* ─ Donut segments ─ */
  const donutSegments = [
    { label: "Not Started",  value: stats?.not_started ?? 0,  color: "#9CA3AF" },
    { label: "In Progress",  value: stats?.in_progress ?? 0,  color: "#8B5CF6" },
    { label: "Review",       value: stats?.review ?? 0,        color: "#F59E0B" },
    { label: "Completed",    value: stats?.completed ?? 0,     color: "#059669" },
    { label: "On Hold",      value: stats?.on_hold ?? 0,       color: "#F59E0B" },
    { label: "Cancelled",    value: (stats?.cancelled ?? 0) + (stats?.low_activity ?? 0), color: "#EF4444" },
  ];



  const activities = activityData?.activities ?? [];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ── Welcome Header ── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1
            className="text-2xl font-bold flex items-center gap-2"
            style={{ color: "var(--text-primary)" }}
          >
            Welcome back, {getFirstName(user?.name)}
            <span role="img" aria-label="wave">👋</span>
          </h1>
          <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
            Here's what's happening in your department today.
          </p>
        </div>

        <button
          id="dashboard-new-project-btn"
          onClick={() => navigate("/projects")}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all duration-150 shadow-md hover:shadow-lg active:scale-95"
          style={{ background: "var(--primary)" }}
          onMouseEnter={e => e.currentTarget.style.background = "var(--primary-hover)"}
          onMouseLeave={e => e.currentTarget.style.background = "var(--primary)"}
        >
          <Plus className="w-4 h-4" />
          New Project
        </button>
      </div>

      {/* ── 5 Stat Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {statCards.map(card => {
          const Icon = card.icon;
          return (
            <Link
              key={card.key}
              to="/projects"
              id={`stat-card-${card.key}`}
              className="dh-card p-5 hover:shadow-md transition-all duration-200 group block"
              style={{ textDecoration: "none" }}
            >
              <div className="flex items-start gap-3">
                <div
                  className="stat-icon flex-shrink-0"
                  style={{ background: card.iconBg }}
                >
                  <Icon className="w-5 h-5" style={{ color: card.iconColor }} />
                </div>
              </div>
              <p
                className="text-3xl font-bold mt-3 mb-1"
                style={{ color: "var(--text-primary)" }}
              >
                {card.value}
              </p>
              <p className="text-xs font-semibold mb-1" style={{ color: "var(--text-secondary)" }}>
                {card.label}
              </p>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                {card.value === 0 ? card.emptyLabel : `${card.value} total`}
              </p>
            </Link>
          );
        })}
      </div>

      {/* ── Main Grid (Projects Overview + Right Panel) ── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left — Projects Overview */}
        <div className="xl:col-span-2 space-y-6">
          {/* Projects Overview Card */}
          <div className="dh-card p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-base font-bold" style={{ color: "var(--text-primary)" }}>
                  Projects Overview
                </h2>
                <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                  Track your projects by status
                </p>
              </div>
              <button
                className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors"
                style={{
                  color: "var(--text-secondary)",
                  borderColor: "var(--border-light)",
                  background: "var(--surface)",
                }}
              >
                This Month
                <ChevronRight className="w-3 h-3 rotate-90" />
              </button>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-8 md:gap-12 max-w-xl mx-auto py-2">
              {/* Donut */}
              <div className="flex-shrink-0 flex flex-col items-center justify-center">
                <DonutChart segments={donutSegments} total={total} />
              </div>

              {/* Status Legend Table */}
              <div className="w-full max-w-[260px]">
                <div className="space-y-1.5">
                  {donutSegments.map(seg => {
                    const pct = total > 0 ? Math.round((seg.value / total) * 100) : 0;
                    return (
                      <div
                        key={seg.label}
                        className="flex items-center gap-3 py-1.5 px-2.5 rounded-xl transition-all duration-150 hover:bg-gray-50/80 dark:hover:bg-gray-800/40"
                      >
                        <span
                          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                          style={{ background: seg.color }}
                        />
                        <span
                          className="flex-1 text-sm font-medium"
                          style={{ color: "var(--text-secondary)" }}
                        >
                          {seg.label}
                        </span>
                        <span
                          className="text-sm font-bold w-6 text-right"
                          style={{ color: "var(--text-primary)" }}
                        >
                          {seg.value}
                        </span>
                        <span
                          className="text-xs w-10 text-right font-semibold"
                          style={{ color: "var(--text-muted)" }}
                        >
                          {pct}%
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Recent Activity Card */}
          <div className="dh-card p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-base font-bold" style={{ color: "var(--text-primary)" }}>
                  Recent Activity
                </h2>
                <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                  Stay updated with the latest activities
                </p>
              </div>
              <Link
                to="/projects"
                className="text-xs font-semibold transition-colors"
                style={{ color: "var(--primary)", textDecoration: "none" }}
              >
                View All
              </Link>
            </div>

            {activityLoading ? (
              <div className="flex justify-center py-8"><Spinner /></div>
            ) : activities.length === 0 ? (
              <div className="flex flex-col items-center py-10 text-center">
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center mb-3"
                  style={{ background: "var(--surface-secondary)" }}
                >
                  <Activity className="w-8 h-8" style={{ color: "var(--text-muted)" }} />
                </div>
                <p className="text-sm font-semibold mb-1" style={{ color: "var(--text-primary)" }}>
                  No recent activity
                </p>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                  Activities will appear here once you start working on projects.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {activities.map(item => {
                  const meta = statusMeta(item.status);
                  return (
                    <Link
                      key={item.id}
                      to={`/projects/${item.id}`}
                      className="flex items-start gap-3 p-3 rounded-xl transition-all duration-150 group"
                      style={{
                        textDecoration: "none",
                        border: "1px solid var(--border-light)",
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = "var(--surface-secondary)"}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                    >
                      <div
                        className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                        style={{ background: meta.bg }}
                      >
                        <FolderKanban className="w-4 h-4" style={{ color: meta.color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate" style={{ color: "var(--text-primary)" }}>
                          {item.name}
                        </p>
                        <p className="text-xs truncate mt-0.5" style={{ color: "var(--text-muted)" }}>
                          {item.last_message
                            ? `${item.last_message.sender_name}: ${item.last_message.content}`
                            : "No activity yet"
                          }
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                        <span
                          className="status-pill"
                          style={{ background: meta.bg, color: meta.color }}
                        >
                          <span className="w-1.5 h-1.5 rounded-full" style={{ background: meta.color }} />
                          {meta.label}
                        </span>
                        <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                          <Clock className="w-3 h-3 inline mr-0.5" />
                          {timeAgo(item.updated_at)}
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Panel */}
        <div className="space-y-6">
          {/* Upcoming Deadlines */}
          <div className="dh-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold" style={{ color: "var(--text-primary)" }}>
                Upcoming Deadlines
              </h2>
              <button
                className="p-1.5 rounded-lg transition-colors"
                style={{ color: "var(--text-muted)" }}
                onMouseEnter={e => e.currentTarget.style.background = "var(--surface-hover)"}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}
              >
                <CalendarDays className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-col items-center py-8 text-center">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center mb-3"
                style={{ background: "var(--surface-secondary)" }}
              >
                <CalendarDays className="w-8 h-8" style={{ color: "var(--text-muted)" }} />
              </div>
              <p className="text-sm font-semibold mb-1" style={{ color: "var(--text-primary)" }}>
                No upcoming Deadlines
              </p>
              <p className="text-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>
                You're all caught up! New deadlines will appear here.
              </p>
            </div>
          </div>

          {/* Department Insights Card */}
          <div className="dh-card p-6">
            <h2 className="text-base font-bold mb-1" style={{ color: "var(--text-primary)" }}>
              Department Insights
            </h2>
            <p className="text-xs mb-5" style={{ color: "var(--text-muted)" }}>
              Key metrics and project analytics
            </p>
            
            <div className="space-y-5">
              {/* Completion Rate */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>
                    Project Completion Rate
                  </span>
                  <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                    {total > 0 ? Math.round(((stats?.completed ?? 0) / total) * 100) : 0}%
                  </span>
                </div>
                {/* Progress Bar Container */}
                <div className="w-full h-2 rounded-full bg-gray-100 dark:bg-gray-700/60 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-emerald-500 transition-all duration-500"
                    style={{
                      width: `${total > 0 ? Math.round(((stats?.completed ?? 0) / total) * 100) : 0}%`,
                    }}
                  />
                </div>
                <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">
                  {stats?.completed ?? 0} out of {total} projects completed
                </p>
              </div>

              {/* Department Health Indicator */}
              <div className="flex items-center justify-between p-3.5 rounded-xl border border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/40">
                <div>
                  <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                    Activity Status
                  </p>
                  <p className="text-sm font-bold mt-0.5" style={{ color: "var(--text-primary)" }}>
                    {stats?.low_activity > 2
                      ? "Attention Required"
                      : stats?.low_activity > 0
                      ? "Active & Stable"
                      : total > 0
                      ? "100% Active"
                      : "No Active Projects"}
                  </p>
                </div>
                <span
                  className="status-pill text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1.5 leading-none"
                  style={{
                    background:
                      stats?.low_activity > 2
                        ? "rgba(239, 68, 68, 0.1)"
                        : stats?.low_activity > 0
                        ? "rgba(245, 158, 11, 0.1)"
                        : "rgba(16, 185, 129, 0.1)",
                    color:
                      stats?.low_activity > 2
                        ? "#EF4444"
                        : stats?.low_activity > 0
                        ? "#F59E0B"
                        : "#10B981",
                  }}
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{
                      background:
                        stats?.low_activity > 2
                          ? "#EF4444"
                          : stats?.low_activity > 0
                          ? "#F59E0B"
                          : "#10B981",
                    }}
                  />
                  {stats?.low_activity > 2
                    ? "Attention"
                    : stats?.low_activity > 0
                    ? "Warning"
                    : "Excellent"}
                </span>
              </div>

              {/* Engagement Insight */}
              <div className="flex items-start gap-3">
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: "rgba(79, 70, 229, 0.1)" }}
                >
                  <Users className="w-4.5 h-4.5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-400 dark:text-gray-500">
                    Student Coverage
                  </p>
                  <p className="text-sm font-bold mt-0.5" style={{ color: "var(--text-primary)" }}>
                    {stats?.student_count ?? 0} Students Assigned
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                    Actively collaborating in project workspaces
                  </p>
                </div>
              </div>

              {/* Micro Platform Status Indicators */}
              <div className="pt-3 border-t border-gray-100 dark:border-gray-700/50 flex flex-wrap gap-x-4 gap-y-1.5">
                <div className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span>Real-time Gateway</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span>Cloud Sync</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
