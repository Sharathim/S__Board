
import { useQuery } from "@tanstack/react-query";
import gsap from "gsap";
import { getProjectStats } from "../../api/projects";
import { listClasses } from "../../api/classes";
import { listFaculty } from "../../api/faculty";
import { listUpdates } from "../../api/updates";
import { listForumPosts } from "../../api/forum";
import { Spinner } from "../../components/ui/Spinner";
import { usePageTransition } from "../../context/TransitionContext";
import { useAuth } from "../../context/AuthContext";
import { useState, useEffect, useRef, useCallback } from "react";
import { Avatar } from "../../components/ui/Avatar";
import { parseUpdateContent } from "../../utils/updateContent";
import MailComposerModal from "./MailComposerModal";
import {
  FolderKanban, TrendingUp, Users, CheckCircle,
  Clock, MessageSquare, Megaphone, Heart, ChevronRight, Eye, Mail
} from "lucide-react";

/* ─── Helpers ────────────────────────────────────────────────────────────── */
function getFirstName(name) {
  if (!name) return "there";
  return name.trim().split(" ")[0];
}

/* ─── Premium GSAP Username Roll Component ─────────────────────────────── */
function DashboardRollingName({ name }) {
  const containerRef = useRef(null);

  const triggerRoll = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;

    const primaries = el.querySelectorAll(".name-char-primary");
    const secondaries = el.querySelectorAll(".name-char-secondary");
    if (primaries.length === 0) return;

    const tl = gsap.timeline();
    
    gsap.killTweensOf([primaries, secondaries]);
    gsap.set(primaries, { yPercent: 0 });
    gsap.set(secondaries, { yPercent: 100 });

    tl.to(primaries, {
      yPercent: -100,
      duration: 0.4,
      ease: "power2.inOut",
      stagger: 0.02
    });
    tl.to(secondaries, {
      yPercent: 0,
      duration: 0.4,
      ease: "power2.inOut",
      stagger: 0.02
    }, 0);

    // Roll back down
    tl.to(primaries, {
      yPercent: 0,
      duration: 0.3,
      ease: "power2.out",
      stagger: 0.015,
      delay: 0.15
    });
    tl.to(secondaries, {
      yPercent: 100,
      duration: 0.3,
      ease: "power2.out",
      stagger: 0.015
    }, "-=0.3");
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      triggerRoll();
    }, 600); // delay to trigger after page unfolds
    return () => clearTimeout(timer);
  }, [name, triggerRoll]);

  if (!name) return null;
  const chars = name.split("");

  return (
    <span
      ref={containerRef}
      onMouseEnter={triggerRoll}
      className="inline-flex overflow-hidden relative cursor-pointer font-black"
    >
      {chars.map((char, idx) => {
        if (char === " ") return <span key={idx}>&nbsp;</span>;
        return (
          <span key={idx} className="relative inline-block overflow-hidden h-[1.25em] leading-none select-none">
            <span className="name-char-primary inline-block transform-gpu">{char}</span>
            <span className="name-char-secondary absolute left-0 top-0 inline-block transform-gpu text-primary-600 dark:text-primary-400" style={{ transform: "translateY(100%)" }}>
              {char}
            </span>
          </span>
        );
      })}
    </span>
  );
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
function LiveClockCard({ inline }) {
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

  if (inline) {
    return (
      <div className="flex items-center gap-3.5 bg-slate-50/50 dark:bg-slate-800/40 rounded-xl px-4 py-2.5 border border-slate-100/50 dark:border-slate-800/50 w-fit">
        <Clock className="w-4.5 h-4.5 text-primary-600 dark:text-primary-400 animate-pulse shrink-0" />
        <div className="flex items-baseline gap-2.5">
          <span className="text-lg font-black text-slate-900 dark:text-white tabular-nums tracking-tight">
            {timeString}
          </span>
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            {dateString}
          </span>
        </div>
      </div>
    );
  }

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
function LatestForumPostCard({ posts, onNavigate }) {
  const post = posts && posts.length > 0 ? posts[0] : null;

  if (!post) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-2xl p-4 flex flex-col justify-between shadow-sm h-full min-h-[160px]">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-805/40">
          <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
            <MessageSquare className="w-4 h-4 text-violet-500" />
            Latest Forum Post
          </span>
          <div onClick={() => onNavigate("/forum", "Forum", MessageSquare)} className="text-xs font-bold text-indigo-650 dark:text-indigo-400 hover:underline cursor-pointer">
            View Forum
          </div>
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
    <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850/65 rounded-2xl p-4 flex flex-col justify-between shadow-sm h-full hover:border-violet-200 dark:hover:border-violet-800/30 transition-colors">
      <div>
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
            <MessageSquare className="w-4 h-4 text-violet-500" />
            Latest Forum Post
          </span>
          <div onClick={() => onNavigate("/forum", "Forum", MessageSquare)} className="text-xs font-bold text-indigo-650 dark:text-indigo-400 hover:text-indigo-700 flex items-center gap-0.5 cursor-pointer">
            Go to Forum <ChevronRight className="w-3.5 h-3.5" />
          </div>
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
function LatestUpdateCard({ updates, onNavigate }) {
  const update = updates && updates.length > 0 ? updates[0] : null;

  if (!update) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-2xl p-4 flex flex-col justify-between shadow-sm h-full min-h-[160px]">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-805/40">
          <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
            <Megaphone className="w-4 h-4 text-violet-500" />
            Latest Update
          </span>
          <div onClick={() => onNavigate("/updates", "Updates", Megaphone)} className="text-xs font-bold text-indigo-650 dark:text-indigo-400 hover:underline cursor-pointer">
            View Updates
          </div>
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
    <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850/65 rounded-2xl p-4 flex flex-col justify-between shadow-sm h-full hover:border-violet-200 dark:hover:border-violet-800/30 transition-colors">
      <div>
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
            <Megaphone className="w-4 h-4 text-violet-500" />
            Latest Update
          </span>
          <div onClick={() => onNavigate("/updates", "Updates", Megaphone)} className="text-xs font-bold text-indigo-650 dark:text-indigo-400 hover:text-indigo-700 flex items-center gap-0.5 cursor-pointer">
            Go to Updates <ChevronRight className="w-3.5 h-3.5" />
          </div>
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
  const [isMailModalOpen, setIsMailModalOpen] = useState(false);
  const { navigateWithTransition } = usePageTransition();

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

  const totalViews = parseInt(localStorage.getItem("dpms_total_views") || "1420", 10);
  const totalUsers = 1 + facultyCount + totalStudentsCount;

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
    <div className="space-y-8">
      {/* ── Welcome Header Banner ── */}
      <div data-animate className="relative overflow-hidden bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-2xl p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-sm">
        <div className="space-y-2 z-10 max-w-xl">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight">
            <span className="text-primary-600 dark:text-primary-400 block mb-1.5">Welcome back,</span>
            <span className="block text-3xl sm:text-4xl">
              <DashboardRollingName name={getFirstName(user?.name)} />
            </span>
          </h1>
          <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 font-medium">
            Here's what's happening in your department today.
          </p>
          {/* Live Clock inside the Banner */}
          <div className="pt-3 flex flex-col sm:flex-row sm:items-center gap-3">
            <LiveClockCard inline={true} />
            {(user?.role === "HOD" || user?.role === "FACULTY") && (
              <button
                onClick={() => setIsMailModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-indigo-650 bg-indigo-50/50 hover:bg-indigo-100/60 dark:text-indigo-400 dark:bg-indigo-950/20 dark:hover:bg-indigo-900/40 rounded-xl border border-indigo-100/40 dark:border-indigo-850/40 transition-colors w-fit"
              >
                <Mail className="w-4 h-4 shrink-0" />
                Send Mail to Hive
              </button>
            )}
          </div>
        </div>
        <div className="shrink-0 z-10 hidden md:block">
          <img src="/dashboard-light.png" alt="Dashboard Overview" className="block dark:hidden h-48 lg:h-56 w-auto object-contain" />
          <img src="/dashboard-dark.png" alt="Dashboard Overview" className="hidden dark:block h-48 lg:h-56 w-auto object-contain" />
        </div>
      </div>

      {/* Row 1: Unified Metrics Grid */}
      <div data-animate className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 lg:gap-3">
        {allStats.map(card => {
          const Icon = card.icon;
          return (
            <div
              key={card.key}
              onClick={() => navigateWithTransition(card.to, card.label, card.icon)}
              id={`stat-card-${card.key}`}
              className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-xl p-2.5 sm:p-3.5 flex flex-row items-center md:flex-col md:items-start gap-2.5 sm:gap-3 transition-all duration-205 hover:shadow-md group block cursor-pointer"
            >
              {/* Desktop layout: Icon and count on the same line */}
              <div className="flex items-center justify-between w-auto md:w-full md:flex-row md:items-center">
                <div
                  className="w-8 h-8 sm:w-9 sm:h-9 md:w-7 md:h-7 rounded-lg sm:rounded-xl md:rounded-lg flex items-center justify-center shrink-0"
                  style={{ backgroundColor: card.iconBg, color: card.iconColor }}
                >
                  <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-3.5 md:h-3.5" />
                </div>
                {/* Count (Desktop-only) */}
                <span className="hidden md:block text-lg lg:text-xl font-black text-slate-900 dark:text-white tracking-tight leading-none">
                  {card.value}
                </span>
              </div>

              {/* Content block: Count on top for Mobile, title below */}
              <div className="min-w-0 flex-1 flex flex-col md:w-full">
                {/* Count (Mobile-only) */}
                <span className="block md:hidden text-lg sm:text-xl font-bold text-slate-900 dark:text-white tracking-tight leading-none">
                  {card.value}
                </span>
                {/* Title */}
                <span className="text-[9px] sm:text-[10px] md:text-[10.5px] font-bold uppercase text-slate-400 dark:text-slate-500 mt-1 md:mt-1 truncate block">
                  {card.label}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Latest Forum Post, Latest Update, and Views/Users Row ── */}
      <div data-animate className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <LatestForumPostCard posts={forumPostsList} onNavigate={navigateWithTransition} />
        <LatestUpdateCard updates={updatesList} onNavigate={navigateWithTransition} />

        {/* Two vertical cards: Total Views and Total Users */}
        <div className="flex flex-col gap-4 justify-between h-full">
          {/* Total Views Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-2xl p-5 flex items-center justify-between shadow-sm flex-1 min-h-[120px]">
            <div className="space-y-1">
              <span className="text-xs font-bold uppercase text-slate-400 dark:text-slate-500 tracking-wider">Total Views</span>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-none">{totalViews}</h3>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1.5">Logged-in & public sections</p>
            </div>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-violet-100/60 dark:bg-violet-900/40 text-violet-600 dark:text-violet-400 shrink-0">
              <Eye className="w-5 h-5 animate-pulse" />
            </div>
          </div>

          {/* Total Users Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-2xl p-5 flex items-center justify-between shadow-sm flex-1 min-h-[120px]">
            <div className="space-y-1">
              <span className="text-xs font-bold uppercase text-slate-400 dark:text-slate-500 tracking-wider">Total Users</span>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-none">{totalUsers}</h3>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1.5">HOD, Faculty & Students</p>
            </div>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-emerald-100/60 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 shrink-0">
              <Users className="w-5 h-5" />
            </div>
          </div>
        </div>
      </div>
      <MailComposerModal isOpen={isMailModalOpen} onClose={() => setIsMailModalOpen(false)} />
    </div>
  );
}
