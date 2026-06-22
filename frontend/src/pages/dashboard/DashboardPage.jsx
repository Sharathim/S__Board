import { useQuery } from "@tanstack/react-query";
import { getProjectStats } from "../../api/projects";
import { getUnreadCount } from "../../api/notifications";
import { Spinner } from "../../components/ui/Spinner";
import {
  FolderKanban, Users, CheckCircle, AlertTriangle, Bell,
  TrendingUp, ArrowUpRight, GraduationCap, Newspaper, MessageSquare,
} from "lucide-react";
import { Link } from "react-router-dom";

const statCards = [
  {
    key: "total",
    label: "Total Projects",
    icon: FolderKanban,
    accent: "text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-900/30",
    ring: "group-hover:ring-blue-200 dark:group-hover:ring-blue-900/50",
    link: "/projects",
  },
  {
    key: "in_progress",
    label: "In Progress",
    icon: TrendingUp,
    accent: "text-primary-600 bg-primary-50 dark:text-primary-400 dark:bg-primary-900/30",
    ring: "group-hover:ring-primary-200 dark:group-hover:ring-primary-900/50",
    link: "/projects",
  },
  {
    key: "student_count",
    label: "Students in Projects",
    icon: Users,
    accent: "text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-900/30",
    ring: "group-hover:ring-green-200 dark:group-hover:ring-green-900/50",
    link: "/projects",
  },
  {
    key: "completed",
    label: "Completed",
    icon: CheckCircle,
    accent: "text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-900/30",
    ring: "group-hover:ring-emerald-200 dark:group-hover:ring-emerald-900/50",
    link: "/projects",
  },
  {
    key: "low_activity",
    label: "Low Activity",
    icon: AlertTriangle,
    accent: "text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-900/30",
    ring: "group-hover:ring-amber-200 dark:group-hover:ring-amber-900/50",
    link: "/projects",
  },
];

const quickLinks = [
  { to: "/faculty", label: "Faculty", icon: Users, desc: "Manage faculty & access" },
  { to: "/classes", label: "Classes", icon: GraduationCap, desc: "Students & registration" },
  { to: "/forum", label: "Forum Members", icon: MessageSquare, desc: "Department forum" },
  { to: "/updates", label: "Updates", icon: Newspaper, desc: "Post announcements" },
];

const statusBreakdown = [
  { key: "in_progress", label: "In Progress", color: "bg-primary-500" },
  { key: "completed", label: "Completed", color: "bg-emerald-500" },
  { key: "low_activity", label: "Low Activity", color: "bg-amber-500" },
];

export default function DashboardPage() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["project-stats"],
    queryFn: () => getProjectStats().then(r => r.data),
  });

  const { data: notifData } = useQuery({
    queryKey: ["unread-count"],
    queryFn: () => getUnreadCount().then(r => r.data),
  });

  if (isLoading) return <Spinner />;

  const total = stats?.total ?? 0;

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Dashboard</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Overview of department activities
          </p>
        </div>
        {notifData?.count > 0 && (
          <Link
            to="/notifications"
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm font-medium hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
          >
            <Bell className="w-4 h-4" />
            {notifData.count} unread
          </Link>
        )}
      </div>

      {/* ── Stat tiles ── */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {statCards.map(card => {
          const Icon = card.icon;
          const value = stats?.[card.key] ?? 0;
          const pct = total > 0 && card.key !== "student_count" && card.key !== "total"
            ? Math.round((value / total) * 100)
            : null;
          return (
            <Link key={card.key} to={card.link} className="group">
              <div className="h-full bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700 ring-1 ring-transparent hover:shadow-card-hover transition-all duration-200">
                <div className="flex items-start justify-between">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${card.accent}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-gray-300 dark:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-3">{value}</p>
                <div className="flex items-center justify-between mt-1">
                  <p className="text-xs text-gray-500 dark:text-gray-400">{card.label}</p>
                  {pct !== null && (
                    <span className="text-xs font-medium text-gray-400 dark:text-gray-500">{pct}%</span>
                  )}
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* ── Dense two-column section ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Projects by status */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
              Projects by Status
            </h2>
            <Link to="/projects" className="text-xs font-medium text-primary-600 hover:underline">
              View all
            </Link>
          </div>

          {total === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 py-8 text-center">
              No projects yet.
            </p>
          ) : (
            <>
              {/* Stacked progress bar */}
              <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700 mb-5">
                {statusBreakdown.map(s => {
                  const value = stats?.[s.key] ?? 0;
                  const width = total > 0 ? (value / total) * 100 : 0;
                  if (width === 0) return null;
                  return (
                    <div
                      key={s.key}
                      className={s.color}
                      style={{ width: `${width}%` }}
                      title={`${s.label}: ${value}`}
                    />
                  );
                })}
              </div>

              <div className="grid grid-cols-3 gap-4">
                {statusBreakdown.map(s => {
                  const value = stats?.[s.key] ?? 0;
                  return (
                    <div key={s.key}>
                      <div className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${s.color}`} />
                        <span className="text-xs text-gray-500 dark:text-gray-400">{s.label}</span>
                      </div>
                      <p className="text-xl font-bold text-gray-900 dark:text-gray-100 mt-1">
                        {value}
                      </p>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Quick actions */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Quick Actions
          </h2>
          <div className="space-y-2">
            {quickLinks.map(link => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors group"
                >
                  <div className="w-9 h-9 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 flex items-center justify-center shrink-0 group-hover:bg-primary-50 group-hover:text-primary-600 dark:group-hover:bg-primary-900/30 transition-colors">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{link.label}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{link.desc}</p>
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-gray-300 dark:text-gray-600 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
