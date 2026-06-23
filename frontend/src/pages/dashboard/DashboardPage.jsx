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
    IN_PROGRESS:  { label: "In Progress",  color: "#6366F1", bg: "#EEF2FF" },
    REVIEW:       { label: "Review",       color: "#F59E0B", bg: "#FFFBEB" },
    COMPLETED:    { label: "Completed",    color: "#10B981", bg: "#ECFDF5" },
    ON_HOLD:      { label: "On Hold",      color: "#F97316", bg: "#FFF7ED" },
    CANCELLED:    { label: "Cancelled",    color: "#EF4444", bg: "#FEF2F2" },
    LOW_ACTIVITY: { label: "Low Activity", color: "#F97316", bg: "#FFF7ED" },
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
      iconBg: "#EEF2FF",
      iconColor: "#6366F1",
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
    { label: "In Progress",  value: stats?.in_progress ?? 0,  color: "#6366F1" },
    { label: "Review",       value: stats?.review ?? 0,        color: "#F59E0B" },
    { label: "Completed",    value: stats?.completed ?? 0,     color: "#10B981" },
    { label: "On Hold",      value: stats?.on_hold ?? 0,       color: "#F97316" },
    { label: "Cancelled",    value: (stats?.cancelled ?? 0) + (stats?.low_activity ?? 0), color: "#EF4444" },
  ];

  /* ─ Quick actions ─ */
  const quickActions = [
    { to: "/faculty",  label: "Add Faculty",         desc: "Manage faculty & access",     icon: GraduationCap, iconBg: "#EEF2FF", iconColor: "#6366F1" },
    { to: "/classes",  label: "Add Class",           desc: "Create new classes",           icon: BookOpen,       iconBg: "#F0FDF4", iconColor: "#22C55E" },
    { to: "/classes",  label: "Register Students",   desc: "Add students to projects",     icon: Users,          iconBg: "#FFF7ED", iconColor: "#F97316" },
    { to: "/forum",    label: "Forum Members",       desc: "Go to department forum",       icon: MessageSquare,  iconBg: "#F5F3FF", iconColor: "#8B5CF6" },
    { to: "/updates",  label: "Post Announcement",   desc: "Share updates",                icon: Megaphone,      iconBg: "#FFF1F2", iconColor: "#F43F5E" },
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

            <div className="flex flex-col md:flex-row gap-6 items-start">
              {/* Donut */}
              <div className="flex-shrink-0 flex flex-col items-center">
                <DonutChart segments={donutSegments} total={total} />
              </div>

              {/* Status Legend Table */}
              <div className="flex-1 min-w-0">
                <div className="space-y-2.5">
                  {donutSegments.map(seg => {
                    const pct = total > 0 ? Math.round((seg.value / total) * 100) : 0;
                    return (
                      <div key={seg.label} className="flex items-center gap-3">
                        <span
                          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                          style={{ background: seg.color }}
                        />
                        <span
                          className="flex-1 text-sm"
                          style={{ color: "var(--text-secondary)" }}
                        >
                          {seg.label}
                        </span>
                        <span
                          className="text-sm font-semibold w-6 text-right"
                          style={{ color: "var(--text-primary)" }}
                        >
                          {seg.value}
                        </span>
                        <span
                          className="text-xs w-8 text-right"
                          style={{ color: "var(--text-muted)" }}
                        >
                          {pct}%
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Empty state or summary */}
              {total === 0 && (
                <div className="flex-1 flex flex-col items-center justify-center py-4 text-center">
                  <div
                    className="w-16 h-16 rounded-full flex items-center justify-center mb-3"
                    style={{ background: "var(--surface-secondary)" }}
                  >
                    <FolderKanban className="w-8 h-8" style={{ color: "var(--text-muted)" }} />
                  </div>
                  <p className="text-sm font-semibold mb-1" style={{ color: "var(--text-primary)" }}>
                    No projects to display
                  </p>
                  <p className="text-xs mb-4" style={{ color: "var(--text-muted)" }}>
                    Create your first project to see analytics and insights here.
                  </p>
                  <button
                    id="overview-create-project-btn"
                    onClick={() => navigate("/projects")}
                    className="text-sm font-semibold px-4 py-2 rounded-lg text-white transition-all duration-150"
                    style={{ background: "var(--primary)" }}
                    onMouseEnter={e => e.currentTarget.style.background = "var(--primary-hover)"}
                    onMouseLeave={e => e.currentTarget.style.background = "var(--primary)"}
                  >
                    Create Project
                  </button>
                </div>
              )}
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

          {/* Quick Actions */}
          <div className="dh-card p-6">
            <h2 className="text-base font-bold mb-4" style={{ color: "var(--text-primary)" }}>
              Quick Actions
            </h2>
            <div className="space-y-1">
              {quickActions.map((action, i) => {
                const Icon = action.icon;
                return (
                  <Link
                    key={i}
                    to={action.to}
                    id={`quick-action-${action.label.toLowerCase().replace(/\s+/g, "-")}`}
                    className="quick-action-row flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-150 group"
                    style={{ textDecoration: "none" }}
                  >
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: action.iconBg }}
                    >
                      <Icon className="w-4 h-4" style={{ color: action.iconColor }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold leading-tight" style={{ color: "var(--text-primary)" }}>
                        {action.label}
                      </p>
                      <p className="text-xs mt-0.5 truncate" style={{ color: "var(--text-muted)" }}>
                        {action.desc}
                      </p>
                    </div>
                    <ChevronRight
                      className="w-4 h-4 qa-chevron flex-shrink-0"
                      style={{ color: "var(--text-muted)" }}
                    />
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
