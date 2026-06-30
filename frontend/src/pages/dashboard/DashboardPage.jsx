
import { useQuery } from "@tanstack/react-query";
import { getProjectStats } from "../../api/projects";
import { listClasses } from "../../api/classes";
import { listFaculty } from "../../api/faculty";
import { listUpdates } from "../../api/updates";
import { listForumPosts } from "../../api/forum";
import { Spinner } from "../../components/ui/Spinner";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useState, useEffect } from "react";
import { Avatar } from "../../components/ui/Avatar";
import { parseUpdateContent } from "../../utils/updateContent";
import {
  FolderKanban, TrendingUp, Users, CheckCircle,
  Clock, MessageSquare, Megaphone, Heart, ChevronRight
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

function parseForumPostContent(content = "") {
  if (!content) return { title: "", body: "" };
  const lines = content.split("\n").map(l => l.trim()).filter(Boolean);
  if (lines.length > 1) {
    return { title: lines[0], body: lines.slice(1).join("\n") };
  }
  return { title: "", body: content };
}

function DashboardAttachmentPreview({ attachmentUrl }) {
  if (!attachmentUrl) return null;
  const urls = attachmentUrl.split(",").filter(Boolean);
  if (urls.length === 0) return null;

  const isVideo = (url) => url.endsWith(".mp4") || url.endsWith(".webm") || url.includes("/video/upload/");

  if (urls.length === 1) {
    const url = urls[0];
    return (
      <div className="rounded-xl overflow-hidden mb-2.5 border border-slate-100 dark:border-slate-800/60 bg-slate-50 dark:bg-slate-950/20 h-28 w-full">
        {isVideo(url) ? (
          <video src={url} className="w-full h-full object-cover" />
        ) : (
          <img src={url} alt="attachment preview" className="w-full h-full object-cover" />
        )}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-1.5 mb-2.5 h-20 w-full">
      {urls.slice(0, 3).map((url, idx) => {
        const isLast = idx === 2 && urls.length > 3;
        return (
          <div key={idx} className="relative rounded-lg overflow-hidden border border-slate-100 dark:border-slate-800/60 bg-slate-50 dark:bg-slate-950/20 h-full w-full">
            {isVideo(url) ? (
              <video src={url} className="w-full h-full object-cover" />
            ) : (
              <img src={url} alt="attachment preview" className="w-full h-full object-cover" />
            )}
            {isLast && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white text-xs font-black">
                +{urls.length - 3}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ─── Live Date & Time Card ──────────────────────────────────────────────── */
function LiveClockCard() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const timeString = time.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  const dateString = time.toLocaleDateString([], {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="bg-gradient-to-br from-indigo-50 to-violet-50 dark:from-indigo-950/20 dark:to-violet-950/20 border border-slate-100 dark:border-slate-800/80 rounded-2xl p-4 flex items-center gap-4 shadow-sm h-full">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-indigo-100/60 dark:bg-indigo-900/40 text-indigo-650 dark:text-indigo-400 shrink-0">
        <Clock className="w-5 h-5 animate-pulse" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-2xl font-black text-slate-900 dark:text-white tracking-tight tabular-nums">
          {timeString}
        </div>
        <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1">
          {dateString}
        </div>
      </div>
    </div>
  );
}

/* ─── Latest Forum Post Card ─────────────────────────────────────────────── */
function LatestForumPostCard({ posts }) {
  const post = posts && posts.length > 0 ? posts[0] : null;

  if (!post) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-2xl p-4 flex flex-col justify-between shadow-sm h-full min-h-[160px]">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-805/40">
          <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
            <MessageSquare className="w-4 h-4 text-violet-500" />
            Latest Forum Post
          </span>
          <Link to="/forum" className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline">
            View Forum
          </Link>
        </div>
        <div className="flex flex-col items-center justify-center py-6 text-center">
          <MessageSquare className="w-8 h-8 text-slate-350 dark:text-slate-600 mb-2" />
          <p className="text-xs font-medium text-slate-400 dark:text-slate-500">No posts yet</p>
        </div>
      </div>
    );
  }

  const relativeTime = timeAgo(post.created_at);
  const { title, body } = parseForumPostContent(post.content);

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-805/65 rounded-2xl p-4 flex flex-col justify-between shadow-sm h-full hover:border-violet-200 dark:hover:border-violet-800/30 transition-colors">
      <div>
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
            <MessageSquare className="w-4 h-4 text-violet-500" />
            Latest Forum Post
          </span>
          <Link to="/forum" className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 flex items-center gap-0.5" style={{ textDecoration: "none" }}>
            Go to Forum <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="flex items-center gap-2 mb-2.5">
          <Avatar src={post.posted_by?.profile_picture} name={post.posted_by?.name} size="xs" />
          <div className="min-w-0 flex-1 flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
              {post.posted_by?.name}
            </span>
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-105 dark:bg-slate-800 text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              {post.posted_by?.role}
            </span>
            <span className="text-[10px] text-slate-400 dark:text-slate-500 flex items-center gap-0.5 ml-auto">
              <Clock className="w-2.5 h-2.5" />
              {relativeTime}
            </span>
          </div>
        </div>

        <div className="space-y-1 mb-2.5">
          {title ? (
            <>
              <h4 className="text-xs font-bold text-slate-900 dark:text-white line-clamp-1 leading-snug">
                {title}
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                {body}
              </p>
            </>
          ) : (
            <p className="text-xs text-slate-700 dark:text-slate-350 line-clamp-2 leading-relaxed">
              {body}
            </p>
          )}
        </div>

        <DashboardAttachmentPreview attachmentUrl={post.attachment_url} />
      </div>

      <div className="flex items-center gap-4 pt-2 text-slate-400 mt-auto">
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold">
          <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
          <span>{post.like_count || 0}</span>
        </span>
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold">
          <MessageSquare className="w-3.5 h-3.5 text-violet-500" />
          <span>0</span>
        </span>
      </div>
    </div>
  );
}

/* ─── Latest Update Card ─────────────────────────────────────────────────── */
function LatestUpdateCard({ updates }) {
  const update = updates && updates.length > 0 ? updates[0] : null;

  if (!update) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-2xl p-4 flex flex-col justify-between shadow-sm h-full min-h-[160px]">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-805/40">
          <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
            <Megaphone className="w-4 h-4 text-violet-500" />
            Latest Update
          </span>
          <Link to="/updates" className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline">
            View Updates
          </Link>
        </div>
        <div className="flex flex-col items-center justify-center py-6 text-center">
          <Megaphone className="w-8 h-8 text-slate-350 dark:text-slate-600 mb-2" />
          <p className="text-xs font-medium text-slate-400 dark:text-slate-500">No updates yet</p>
        </div>
      </div>
    );
  }

  const parsed = parseUpdateContent(update.content);
  const relativeTime = timeAgo(update.created_at);

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-805/65 rounded-2xl p-4 flex flex-col justify-between shadow-sm h-full hover:border-violet-200 dark:hover:border-violet-800/30 transition-colors">
      <div>
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
            <Megaphone className="w-4 h-4 text-violet-500" />
            Latest Update
          </span>
          <Link to="/updates" className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 flex items-center gap-0.5" style={{ textDecoration: "none" }}>
            Go to Updates <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="flex items-center gap-2 mb-2.5">
          <div className="w-6 h-6 rounded-full bg-violet-900 text-white flex items-center justify-center font-extrabold text-[10px] shrink-0 shadow-sm">
            {(parsed.department || "D").charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1 flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
              {parsed.department || "PG Department of CS"}
            </span>
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-105 dark:bg-slate-800 text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              {parsed.updateType || "Info"}
            </span>
            <span className="text-[10px] text-slate-400 dark:text-slate-500 flex items-center gap-0.5 ml-auto">
              <Clock className="w-2.5 h-2.5" />
              {relativeTime}
            </span>
          </div>
        </div>

        <div className="space-y-1 mb-2.5">
          {parsed.title && parsed.title !== parsed.department && parsed.title !== "Update" && parsed.title !== "Announcement" && parsed.title !== "Event" && (
            <h4 className="text-xs font-bold text-slate-900 dark:text-white line-clamp-1 leading-snug">
              {parsed.title}
            </h4>
          )}
          <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
            {parsed.description || "No updates yet"}
          </p>
        </div>

        <DashboardAttachmentPreview attachmentUrl={update.attachment_url} />
      </div>
      <div className="flex items-center gap-4 pt-2 text-slate-400 mt-auto">
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold">
          <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
          <span>{update.like_count || 0}</span>
        </span>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();

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

  const classesList = classesData?.classes || [];
  const totalStudentsCount = classesList.reduce((s, c) => s + (c.student_count ?? 0), 0);

  const facultyList = facultyData || [];
  const facultyCount = facultyList.length;

  const updatesList = updatesData?.updates || [];
  const forumPostsList = forumPostsData || [];

  const allStats = [
    {
      key: "total",
      label: "Total Projects",
      value: total,
      icon: FolderKanban,
      iconBg: "rgba(139, 92, 246, 0.1)",
      iconColor: "#8B5CF6",
      to: "/projects",
    },
    {
      key: "in_progress",
      label: "In Progress",
      value: stats?.in_progress ?? 0,
      icon: TrendingUp,
      iconBg: "rgba(16, 185, 129, 0.1)",
      iconColor: "#10B981",
      to: "/projects",
    },
    {
      key: "student_count",
      label: "Students in Projects",
      value: stats?.student_count ?? 0,
      icon: Users,
      iconBg: "rgba(34, 197, 94, 0.1)",
      iconColor: "#22C55E",
      to: "/projects",
    },
    {
      key: "completed",
      label: "Completed",
      value: stats?.completed ?? 0,
      icon: CheckCircle,
      iconBg: "rgba(16, 185, 129, 0.1)",
      iconColor: "#10B981",
      to: "/projects",
    },
    {
      key: "total_students",
      label: "Total Students",
      value: totalStudentsCount,
      icon: Users,
      iconBg: "rgba(59, 130, 246, 0.1)",
      iconColor: "#3B82F6",
      to: "/classes",
    },
    {
      key: "total_faculty",
      label: "Total Faculty",
      value: facultyCount,
      icon: Users,
      iconBg: "rgba(245, 158, 11, 0.1)",
      iconColor: "#F59E0B",
      to: "/faculty",
    },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
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

      {/* ── Centralized Department Statistics Hub ── */}
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
            Department Statistics Hub
          </h2>
          <p className="text-xs text-slate-400 dark:text-slate-500">
            Real-time statistics compiled from all sections of the portal.
          </p>
        </div>

        {/* Row 1: Unified Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 lg:gap-3">
          {allStats.map(card => {
            const Icon = card.icon;
            return (
              <Link
                key={card.key}
                to={card.to}
                id={`stat-card-${card.key}`}
                className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-xl p-2.5 sm:p-3.5 flex items-center gap-2.5 sm:gap-3 transition-all duration-200 hover:shadow-md group block"
                style={{ textDecoration: "none" }}
              >
                {/* Left Node */}
                <div
                  className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl flex items-center justify-center shrink-0"
                  style={{ backgroundColor: card.iconBg, color: card.iconColor }}
                >
                  <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </div>
                {/* Right Node */}
                <div className="min-w-0 flex-1 flex flex-col">
                  <span className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white tracking-tight leading-none">
                    {card.value}
                  </span>
                  <span className="text-[9px] sm:text-[10px] font-bold uppercase text-slate-405 dark:text-slate-500 mt-1 truncate">
                    {card.label}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* ── Live clock, Latest Forum Post, and Latest Update Row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <LiveClockCard />
        <LatestForumPostCard posts={forumPostsList} />
        <LatestUpdateCard updates={updatesList} />
      </div>
    </div>
  );
}
