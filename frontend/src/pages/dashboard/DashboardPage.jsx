import { useQuery } from "@tanstack/react-query";
import { getProjectStats } from "../../api/projects";
import { listClasses } from "../../api/classes";
import { listFaculty } from "../../api/faculty";
import { listUpdates } from "../../api/updates";
import { listForumPosts } from "../../api/forum";
import { Spinner } from "../../components/ui/Spinner";
import { usePageTransition } from "../../context/TransitionContext";
import { useAuth } from "../../context/AuthContext";
import { useState, useEffect } from "react";
import { Avatar } from "../../components/ui/Avatar";
import { parseUpdateContent } from "../../utils/updateContent";
import MailComposerModal from "./MailComposerModal";
import {
  FolderKanban, TrendingUp, Users, CheckCircle,
  Clock, MessageSquare, Megaphone, Heart, ChevronRight, Eye, Mail,
  BookOpen, ArrowRight, LayoutDashboard, Calendar, Sparkles
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
      <div className="rounded-xl overflow-hidden mb-2 border border-slate-100 bg-slate-50/50 h-28 w-full max-w-md">
        {isVideo(url) ? (
          <video src={url} className="w-full h-full object-cover" />
        ) : (
          <img src={url} alt="attachment preview" className="w-full h-full object-cover" />
        )}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-1.5 mb-2 h-16 w-full max-w-md">
      {urls.slice(0, 3).map((url, idx) => {
        const isLast = idx === 2 && urls.length > 3;
        return (
          <div key={idx} className="relative rounded-lg overflow-hidden border border-slate-100 bg-slate-50/50 h-full w-full">
            {isVideo(url) ? (
              <video src={url} className="w-full h-full object-cover" />
            ) : (
              <img src={url} alt="attachment preview" className="w-full h-full object-cover" />
            )}
            {isLast && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white text-[10px] font-black">
                +{urls.length - 3}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ─── Live Date & Time Widget ────────────────────────────────────────────── */
function LiveClockWidget() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const timeString = time.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  const dateString = time.toLocaleDateString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  return (
    <div className="flex items-center justify-between p-4 bg-slate-50/60 rounded-2xl border border-slate-100">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-650 flex items-center justify-center shrink-0">
          <Clock className="w-4.5 h-4.5" />
        </div>
        <div>
          <span className="block text-sm font-extrabold text-slate-800 leading-none">
            {timeString}
          </span>
          <span className="block text-[11px] font-semibold text-slate-400 mt-1 leading-none">
            {dateString}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-1 text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0">
        <Sparkles className="w-3 h-3 text-indigo-600 animate-spin-slow" /> Live
      </div>
    </div>
  );
}

/* ─── Borderless Feed Items ────────────────────────────────────────────── */
function UpdateFeedItem({ update }) {
  const parsed = parseUpdateContent(update.content);
  const relativeTime = timeAgo(update.created_at);

  return (
    <div className="py-4 border-b border-slate-100 flex gap-3.5 items-start hover:bg-slate-50/30 px-2.5 rounded-xl transition-colors duration-150">
      <div className="w-9 h-9 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center font-black text-xs shrink-0 shadow-sm border border-emerald-100">
        {(parsed.department || "D").charAt(0).toUpperCase()}
      </div>
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[13px] font-bold text-slate-800">
            {parsed.department || "PG Department of CS"}
          </span>
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 uppercase tracking-wider">
            {parsed.updateType || "Info"}
          </span>
          <span className="text-[10px] text-slate-400 flex items-center gap-0.5 ml-auto">
            <Clock className="w-2.5 h-2.5" />
            {relativeTime}
          </span>
        </div>
        {parsed.title && parsed.title !== parsed.department && parsed.title !== "Update" && parsed.title !== "Announcement" && (
          <h4 className="text-xs font-bold text-slate-800 leading-snug">
            {parsed.title}
          </h4>
        )}
        <p className="text-xs text-slate-500 leading-relaxed max-w-2xl">
          {parsed.description || "No description provided"}
        </p>
        <DashboardAttachmentPreview attachmentUrl={update.attachment_url} />
        <div className="flex items-center gap-1 pt-1 text-[11px] font-bold text-slate-400">
          <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500 shrink-0" />
          <span>{update.like_count || 0} Likes</span>
        </div>
      </div>
    </div>
  );
}

function ForumFeedItem({ post }) {
  const relativeTime = timeAgo(post.created_at);
  const { title, body } = parseForumPostContent(post.content);

  return (
    <div className="py-4 border-b border-slate-100 flex gap-3.5 items-start hover:bg-slate-50/30 px-2.5 rounded-xl transition-colors duration-150">
      <Avatar src={post.posted_by?.profile_picture} name={post.posted_by?.name} size="sm" className="w-9 h-9 ring-1 ring-slate-100 shrink-0" />
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[13px] font-bold text-slate-800">
            {post.posted_by?.name}
          </span>
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 uppercase tracking-wider">
            {post.posted_by?.role}
          </span>
          <span className="text-[10px] text-slate-400 flex items-center gap-0.5 ml-auto">
            <Clock className="w-2.5 h-2.5" />
            {relativeTime}
          </span>
        </div>
        {title && (
          <h4 className="text-xs font-bold text-slate-800 leading-snug">
            {title}
          </h4>
        )}
        <p className="text-xs text-slate-500 leading-relaxed max-w-2xl">
          {body}
        </p>
        <DashboardAttachmentPreview attachmentUrl={post.attachment_url} />
        <div className="flex items-center gap-3 pt-1 text-[11px] font-bold text-slate-400">
          <span className="flex items-center gap-1">
            <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500 shrink-0" />
            <span>{post.like_count || 0}</span>
          </span>
          <span className="flex items-center gap-1">
            <MessageSquare className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            <span>Discussion</span>
          </span>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [isMailModalOpen, setIsMailModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("updates");
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

  // Modern integrated stats row data
  const metrics = [
    { label: "Active Projects", val: stats?.in_progress ?? 0, desc: `of ${total} total`, icon: FolderKanban, color: "text-emerald-500", to: "/projects", iconRef: FolderKanban },
    { label: "Completed", val: stats?.completed ?? 0, desc: "archived", icon: CheckCircle, color: "text-emerald-600", to: "/projects", iconRef: CheckCircle },
    { label: "Students Portal", val: totalStudentsCount, desc: "enrolled", icon: Users, color: "text-indigo-605", to: "/classes", iconRef: Users },
    { label: "Faculty Board", val: facultyCount, desc: "active staff", icon: Users, color: "text-indigo-600", to: "/faculty", iconRef: Users },
  ];

  return (
    <div className="space-y-8 pb-10">
      
      {/* ── Welcome Header (Premium Typographic) ── */}
      <div 
        className="relative overflow-hidden py-8 px-2 flex flex-col md:flex-row md:items-center justify-between gap-6"
        style={{
          backgroundImage: "radial-gradient(circle, rgba(5, 150, 105, 0.05) 1px, transparent 1px)",
          backgroundSize: "20px 20px"
        }}
      >
        <div className="space-y-1.5">
          <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full uppercase tracking-wider w-fit block">
            Workspace Hub
          </span>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900 leading-tight">
            Welcome back, <span className="text-emerald-600">{getFirstName(user?.name)}</span>
          </h1>
          <p className="text-sm sm:text-base text-slate-500 font-medium">
            Here's what's happening in your department today.
          </p>
        </div>

        {(user?.role === "HOD" || user?.role === "FACULTY") && (
          <button
            onClick={() => setIsMailModalOpen(true)}
            className="group relative flex items-center gap-2 px-5 py-3 text-xs font-black text-white bg-gradient-to-r from-[#4F46E5] to-[#06B6D4] hover:from-[#4338CA] hover:to-[#0891B2] rounded-xl transition-all shadow-md hover:shadow-lg shadow-indigo-500/15 hover:shadow-indigo-500/25 hover:-translate-y-0.5 active:translate-y-0 w-fit shrink-0 overflow-hidden mt-2 md:mt-0"
          >
            <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
            <Mail className="w-4 h-4 shrink-0 transition-transform duration-300 group-hover:rotate-6 group-hover:scale-110" />
            <span>Compose Mail</span>
          </button>
        )}
      </div>

      {/* ── Metrics Strip (Deprecates card grid) ── */}
      <div className="bg-white border border-slate-100 rounded-2xl p-4 sm:p-5 shadow-sm">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 divide-y md:divide-y-0 md:divide-x divide-slate-100">
          {metrics.map((m, idx) => (
            <div 
              key={idx} 
              onClick={() => navigateWithTransition(m.to, m.label, m.iconRef)}
              className={`flex flex-col justify-center cursor-pointer group transition-all duration-150 p-2 rounded-xl hover:bg-slate-50/50 ${
                idx > 1 ? "pt-4 md:pt-2 md:pl-6" : "pt-2"
              } ${idx === 1 ? "md:pl-6" : ""} ${idx === 3 ? "pt-4 md:pt-2" : ""}`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">
                  {m.label}
                </span>
                <m.icon className={`w-4 h-4 ${m.color} opacity-80 group-hover:scale-110 transition-transform`} />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-slate-800 leading-none">
                  {m.val}
                </span>
                <span className="text-[10px] font-semibold text-slate-400">
                  {m.desc}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Main Activity Feed vs Sidebar Layout ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Column 1: Unified Activity Feed (65%) */}
        <div className="lg:col-span-2 bg-white border border-slate-100 rounded-2xl p-5 shadow-sm flex flex-col min-h-[400px]">
          
          {/* Workspace Tabs Header */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 flex-wrap gap-3">
            <h3 className="text-sm font-black text-slate-800 flex items-center gap-1.5">
              <Megaphone className="w-4 h-4 text-emerald-600" />
              Activity Feed
            </h3>
            
            {/* Sliding Tab Switcher */}
            <div className="flex bg-slate-50 p-1 rounded-xl border border-slate-100">
              <button
                onClick={() => setActiveTab("updates")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeTab === "updates"
                    ? "bg-white text-emerald-600 shadow-sm"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Announcements
              </button>
              <button
                onClick={() => setActiveTab("forum")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeTab === "forum"
                    ? "bg-white text-indigo-600 shadow-sm"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Discussions
              </button>
            </div>
          </div>

          {/* Feed Content Area */}
          <div className="flex-1 mt-2">
            {activeTab === "updates" ? (
              updatesList.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <Megaphone className="w-8 h-8 text-slate-300 mb-2.5" />
                  <p className="text-xs font-semibold text-slate-400">No updates or announcements yet</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-50">
                  {updatesList.slice(0, 4).map((up) => (
                    <UpdateFeedItem key={up.id} update={up} />
                  ))}
                </div>
              )
            ) : (
              forumPostsList.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <MessageSquare className="w-8 h-8 text-slate-300 mb-2.5" />
                  <p className="text-xs font-semibold text-slate-400">No discussion posts yet</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-50">
                  {forumPostsList.slice(0, 4).map((fp) => (
                    <ForumFeedItem key={fp.id} post={fp} />
                  ))}
                </div>
              )
            )}
          </div>

          {/* Footer View More Action */}
          <div className="pt-3 border-t border-slate-50 mt-4 flex justify-end">
            <button
              onClick={() => {
                if (activeTab === "updates") {
                  navigateWithTransition("/updates", "Updates", Megaphone);
                } else {
                  navigateWithTransition("/forum", "Forum", MessageSquare);
                }
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === "updates"
                  ? "text-emerald-600 hover:bg-emerald-50/50"
                  : "text-indigo-600 hover:bg-indigo-50/50"
              }`}
            >
              See all {activeTab === "updates" ? "Announcements" : "Discussions"}{" "}
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Column 2: Insights & Action Sidebar (35%) */}
        <div className="space-y-6">
          
          {/* Live Date/Time widget */}
          <LiveClockWidget />

          {/* Engagement Metrics Card */}
          <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-extrabold uppercase text-slate-400 tracking-wider">
              Department Insights
            </h3>
            
            <div className="space-y-3.5">
              {/* Total Views */}
              <div className="flex items-center justify-between p-3 bg-slate-50/50 rounded-xl border border-slate-100">
                <div className="min-w-0">
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider leading-none">
                    Department Views
                  </span>
                  <span className="block text-xl font-black text-slate-800 mt-1 leading-none">
                    {totalViews}
                  </span>
                  <span className="block text-[9px] text-slate-400 mt-1 font-medium leading-none">
                    Logged-in & public sections
                  </span>
                </div>
                <div className="w-8.5 h-8.5 rounded-lg bg-indigo-50 text-indigo-605 flex items-center justify-center shrink-0">
                  <Eye className="w-4 h-4" />
                </div>
              </div>

              {/* Total Users */}
              <div className="flex items-center justify-between p-3 bg-slate-50/50 rounded-xl border border-slate-100">
                <div className="min-w-0">
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider leading-none">
                    Total Members
                  </span>
                  <span className="block text-xl font-black text-slate-800 mt-1 leading-none">
                    {totalUsers}
                  </span>
                  <span className="block text-[9px] text-slate-400 mt-1 font-medium leading-none">
                    HOD, Faculty & Students
                  </span>
                </div>
                <div className="w-8.5 h-8.5 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                  <Users className="w-4 h-4" />
                </div>
              </div>
            </div>
          </div>

          {/* Quick Action Directories */}
          <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-3">
            <h3 className="text-xs font-extrabold uppercase text-slate-400 tracking-wider mb-1">
              Shortcuts
            </h3>
            <div className="space-y-2">
              {[
                { label: "Classrooms Directory", desc: "Manage classes & view incharge info", to: "/classes", icon: BookOpen },
                { label: "Projects Registry", desc: "Browse, filter & search projects", to: "/projects", icon: FolderKanban },
                { label: "Faculty Directory", desc: "View department active faculty list", to: "/faculty", icon: Users }
              ].map((item, idx) => (
                <div
                  key={idx}
                  onClick={() => navigateWithTransition(item.to, item.label, item.icon)}
                  className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-100 cursor-pointer group transition-all"
                >
                  <div className="min-w-0">
                    <span className="block text-xs font-bold text-slate-800 group-hover:text-emerald-600 transition-colors leading-tight">
                      {item.label}
                    </span>
                    <span className="block text-[10px] text-slate-400 mt-0.5 truncate leading-none">
                      {item.desc}
                    </span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-300 group-hover:translate-x-0.5 group-hover:text-emerald-600 transition-all shrink-0" />
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>

      <MailComposerModal isOpen={isMailModalOpen} onClose={() => setIsMailModalOpen(false)} />
    </div>
  );
}
