
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { getProjectStats, getRecentActivity } from "../../api/projects";
import { listForumPosts } from "../../api/forum";
import { Spinner } from "../../components/ui/Spinner";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  FolderKanban, TrendingUp, Users, CheckCircle,
  Clock, Heart, MessageSquare, ArrowRight,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

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
    NOT_STARTED: { label: "Not Started", color: "#9CA3AF", bg: "#F3F4F6" },
    IN_PROGRESS: { label: "In Progress", color: "#8B5CF6", bg: "#EDE9FE" },
    REVIEW: { label: "Review", color: "#F59E0B", bg: "#FFFBEB" },
    COMPLETED: { label: "Completed", color: "#059669", bg: "#E6F4EA" },
    ON_HOLD: { label: "On Hold", color: "#F59E0B", bg: "#FEF3C7" },
    CANCELLED: { label: "Cancelled", color: "#EF4444", bg: "#FEF2F2" },
    LOW_ACTIVITY: { label: "Low Activity", color: "#F59E0B", bg: "#FEF3C7" },
  };
  return map[status] || { label: status, color: "#9CA3AF", bg: "#F3F4F6" };
}

function formatPostTime(dateString) {
  try {
    if (!dateString) return "";
    return formatDistanceToNow(new Date(dateString), { addSuffix: true });
  } catch {
    return "just now";
  }
}

/* ─── Component ──────────────────────────────────────────────────────────── */
export default function DashboardPage() {
  const { user } = useAuth();

  /* ── Live clock state ── */
  const [currentTime, setCurrentTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["project-stats"],
    queryFn: () => getProjectStats().then(r => r.data),
  });

  const { data: activityData } = useQuery({
    queryKey: ["recent-activity"],
    queryFn: () => getRecentActivity(5).then(r => r.data),
  });

  const { data: forumPostsData } = useQuery({
    queryKey: ["forum-posts"],
    queryFn: () => listForumPosts({ page: 1, per_page: 100 }).then(r => r.data.posts),
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
      emptyLabel: "No projects created yet",
    },
    {
      key: "in_progress",
      label: "In Progress",
      value: stats?.in_progress ?? 0,
      icon: TrendingUp,
      emptyLabel: "No projects in progress",
    },
    {
      key: "student_count",
      label: "Students in Projects",
      value: stats?.student_count ?? 0,
      icon: Users,
      emptyLabel: "No students assigned",
    },
    {
      key: "completed",
      label: "Completed",
      value: stats?.completed ?? 0,
      icon: CheckCircle,
      emptyLabel: "No projects completed",
    },
  ];

  const activities = activityData?.activities ?? [];
  const latestActivity = activities[0] || null;

  const forumPostsList = forumPostsData || [];
  const sortedPosts = [...forumPostsList].sort(
    (a, b) => new Date(b.created_at) - new Date(a.created_at)
  );
  const latestPost = sortedPosts[0] || null;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ── Welcome Header ── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            Welcome back, {getFirstName(user?.name)}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Here's what's happening in your department today.
          </p>
        </div>
      </div>

      {/* ── Department Statistics Hub ── */}
      <div className="space-y-5">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
            Department Statistics Hub
          </h2>
          <p className="text-xs text-slate-400 dark:text-slate-500">
            Real-time statistics compiled from all sections of the portal.
          </p>
        </div>

        {/* Core Metrics Grid */}
        <div className="grid grid-cols-4 gap-4">
          {statCards.map(card => {
            const Icon = card.icon;
            return (
              <Link
                key={card.key}
                to="/projects"
                id={`stat-card-${card.key}`}
                className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/60 rounded-2xl p-4 flex items-center gap-3.5 transition-all duration-200 hover:shadow-sm group block"
                style={{ textDecoration: "none" }}
              >
                {/* Left Node */}
                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 shrink-0">
                  <Icon className="w-5 h-5" />
                </div>
                {/* Right Node */}
                <div className="min-w-0 flex flex-col">
                  <span className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">{card.value}</span>
                  <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 mt-0.5">
                    {card.label} &bull; {card.value === 0 ? card.emptyLabel : `${card.value} total`}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* ── Date & Time Card ── */}
      <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/60 rounded-2xl p-4 flex items-center gap-4">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-violet-50 dark:bg-violet-950/50 text-violet-600 dark:text-violet-400 shrink-0">
          <Clock className="w-5 h-5" />
        </div>
        <div className="min-w-0 flex flex-col">
          <span className="text-xs font-semibold text-slate-400 dark:text-slate-500">
            {format(currentTime, "EEEE, d MMMM yyyy")}
          </span>
          <span className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight tabular-nums">
            {format(currentTime, "hh:mm:ss a")}
          </span>
        </div>
      </div>

      {/* ── Latest Forum Post + Latest Project Update ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Card A — Latest Forum Post */}
        <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-800/80 rounded-2xl p-4 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3">Latest Forum Post</h3>
            {latestPost ? (
              <div className="space-y-2.5">
                <div className="flex items-center gap-2.5">
                  {/* Avatar */}
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                    {(latestPost.posted_by?.name || "?").charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                      {latestPost.posted_by?.name || "Unknown"}
                    </p>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500">
                      {formatPostTime(latestPost.created_at)}
                    </p>
                  </div>
                  {/* Like count */}
                  <div className="flex items-center gap-1 text-[10px] text-slate-400 dark:text-slate-500 shrink-0">
                    <Heart className="w-3 h-3" />
                    <span>{latestPost.like_count || 0}</span>
                  </div>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-2">
                  {latestPost.content}
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center py-6 text-center">
                <div className="w-10 h-10 rounded-full flex items-center justify-center mb-2 bg-slate-50 dark:bg-slate-700/40">
                  <MessageSquare className="w-5 h-5 text-slate-400 dark:text-slate-500" />
                </div>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">No forum posts yet</p>
              </div>
            )}
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700/50">
            <Link
              to="/forum"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors"
              style={{ textDecoration: "none" }}
            >
              View Forum
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Card B — Latest Project Update */}
        <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-800/80 rounded-2xl p-4 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3">Latest Project Update</h3>
            {latestActivity ? (() => {
              const meta = statusMeta(latestActivity.status);
              return (
                <div className="space-y-2.5">
                  <div className="flex items-center gap-2.5">
                    {/* Status icon */}
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: meta.bg }}
                    >
                      <FolderKanban className="w-4 h-4" style={{ color: meta.color }} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                        {latestActivity.name}
                      </p>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500">
                        {timeAgo(latestActivity.updated_at)}
                      </p>
                    </div>
                    {/* Status pill */}
                    <span
                      className="status-pill shrink-0"
                      style={{ background: meta.bg, color: meta.color }}
                    >
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: meta.color }} />
                      {meta.label}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-2">
                    {latestActivity.last_message
                      ? `${latestActivity.last_message.sender_name}: ${latestActivity.last_message.content}`
                      : "No activity yet"}
                  </p>
                </div>
              );
            })() : (
              <div className="flex flex-col items-center py-6 text-center">
                <div className="w-10 h-10 rounded-full flex items-center justify-center mb-2 bg-slate-50 dark:bg-slate-700/40">
                  <FolderKanban className="w-5 h-5 text-slate-400 dark:text-slate-500" />
                </div>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">No recent project activity</p>
              </div>
            )}
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700/50">
            <Link
              to="/projects"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors"
              style={{ textDecoration: "none" }}
            >
              View Projects
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
