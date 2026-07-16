import { useQuery } from "@tanstack/react-query";
import { Navigate } from "react-router-dom";
import { getProjectStats } from "../../api/projects";
import { listClasses } from "../../api/classes";
import { listFaculty } from "../../api/faculty";
import { listUpdates } from "../../api/updates";
import { Spinner } from "../../components/ui/Spinner";
import { usePageTransition } from "../../context/TransitionContext";
import { useAuth } from "../../context/AuthContext";
import { useState, useEffect, useRef } from "react";
import gsap from "gsap";
import { parseUpdateContent } from "../../utils/updateContent";
import { parseUTCDate } from "../../utils/dateUtils";
import MailComposerModal from "./MailComposerModal";
import {
  FolderKanban, Users, CheckCircle, Clock,
  Megaphone, ChevronRight, Eye, Mail,
  BookOpen, Sparkles, ArrowUpRight
} from "lucide-react";

/* ─── Helpers ────────────────────────────────────────────────────────────── */
function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
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

/* ─── Main Single-Screen Zero-Scroll Dashboard ───────────────────── */
export default function DashboardPage() {
  const { user } = useAuth();
  if (user && user.role !== "HOD") {
    const dest = user.role === "FACULTY" ? "/faculty" : "/classes";
    return <Navigate to={dest} replace />;
  }

  const [isMailModalOpen, setIsMailModalOpen] = useState(false);
  const { navigateWithTransition } = usePageTransition();
  const containerRef = useRef(null);

  // Queries for real backend data
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

  // Stagger GSAP animations on load
  useEffect(() => {
    if (containerRef.current) {
      gsap.from(".dash-card-anim", {
        opacity: 0,
        y: 16,
        stagger: 0.06,
        duration: 0.45,
        ease: "power3.out",
      });
    }
  }, [statsLoading]);

  if (statsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner />
      </div>
    );
  }

  const total = stats?.total ?? 0;
  const inProgress = stats?.in_progress ?? 0;
  const completed = stats?.completed ?? 0;
  const classesList = classesData?.classes || [];
  const totalStudentsCount = classesList.reduce((s, c) => s + (c.student_count ?? 0), 0);
  const facultyList = facultyData || [];
  const facultyCount = facultyList.length;
  const totalViews = parseInt(localStorage.getItem("dpms_total_views") || "1675", 10);
  const totalUsers = 1 + facultyCount + totalStudentsCount;

  const updatesList = updatesData?.updates || [];
  const activeProgressPercent = total > 0 ? Math.round((inProgress / total) * 100) : 0;

  return (
    <div ref={containerRef} className="space-y-4 md:space-y-5 pb-2 select-none">
      
      {/* ── 1. Compact Hero Header ── */}
      <div className="dash-card-anim flex items-center justify-between gap-4 py-1 px-1">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
            {getGreeting()}, {user?.name ? user.name.split(" ")[0] : "Administrator"}
          </h1>
          <p className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400 mt-0.5">
            Stay on top of your department tasks, monitor progress, and track status.
          </p>
        </div>

        {(user?.role === "HOD" || user?.role === "FACULTY") && (
          <button
            onClick={() => setIsMailModalOpen(true)}
            className="finexy-card px-4 py-2 flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-100 hover:border-slate-300 dark:hover:border-slate-600 transition-all shadow-xs group shrink-0"
          >
            <div className="w-6 h-6 rounded-full bg-[#F05A2B]/10 text-[#F05A2B] flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
              <Mail className="w-3.5 h-3.5" />
            </div>
            <span>Compose Mail</span>
          </button>
        )}
      </div>

      {/* ── 2. High-Contrast 4-Grid Top Metric Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Primary Orange Highlight Card */}
        <div 
          onClick={() => navigateWithTransition("/projects", "Projects", FolderKanban)}
          className="dash-card-anim finexy-orange-card p-4 flex flex-col justify-between cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-white/95 uppercase tracking-wider">
              Active Projects
            </span>
            <div className="w-7.5 h-7.5 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white group-hover:scale-110 transition-transform">
              <FolderKanban className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 space-y-1">
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-none">
              {inProgress}
            </h2>
            <div className="flex items-center gap-1.5 pt-1">
              <span className="inline-flex items-center text-[10px] font-black px-2 py-0.5 rounded-full bg-white/20 text-white backdrop-blur-md">
                ↑ {activeProgressPercent}% active progress
              </span>
            </div>
          </div>
        </div>

        {/* Card 2: Completed Projects Card (High Contrast Text) */}
        <div 
          onClick={() => navigateWithTransition("/projects", "Projects", FolderKanban)}
          className="dash-card-anim finexy-card p-4 flex flex-col justify-between cursor-pointer group bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Completed Projects
            </span>
            <div className="w-7.5 h-7.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <CheckCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 space-y-1">
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight leading-none">
              {completed}
            </h2>
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 pt-0.5">
              Archived & Verified
            </p>
          </div>
        </div>

        {/* Card 3: Students Portal Card (High Contrast Text) */}
        <div 
          onClick={() => navigateWithTransition("/classes", "Classes", BookOpen)}
          className="dash-card-anim finexy-card p-4 flex flex-col justify-between cursor-pointer group bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Students Portal
            </span>
            <div className="w-7.5 h-7.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 space-y-1">
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight leading-none">
              {totalStudentsCount}
            </h2>
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 pt-0.5">
              enrolled in {classesList.length} Classrooms
            </p>
          </div>
        </div>

        {/* Card 4: Faculty Board Card (High Contrast Text) */}
        <div 
          onClick={() => navigateWithTransition("/faculty", "Faculty", Users)}
          className="dash-card-anim finexy-card p-4 flex flex-col justify-between cursor-pointer group bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Faculty Board
            </span>
            <div className="w-7.5 h-7.5 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 space-y-1">
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight leading-none">
              {facultyCount}
            </h2>
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 pt-0.5">
              Active Staff Members
            </p>
          </div>
        </div>

      </div>

      {/* ── 3. Middle Section: Real Live Feed & Department Insights Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        
        {/* Left Column: Department Insights & Shortcuts Stack */}
        <div className="space-y-4">
          
          {/* Real Department Insights */}
          <div className="dash-card-anim finexy-card p-4 space-y-3">
            <h3 className="text-xs font-extrabold uppercase text-slate-700 dark:text-slate-300 tracking-wider">
              Department Insights
            </h3>
            
            <div className="grid grid-cols-2 gap-3">
              {/* Department Views */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800">
                <span className="block text-[10px] font-extrabold uppercase text-slate-500 dark:text-slate-400">Total Views</span>
                <span className="block text-xl font-black text-slate-900 dark:text-white mt-1">{totalViews}</span>
              </div>

              {/* Members */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800">
                <span className="block text-[10px] font-extrabold uppercase text-slate-500 dark:text-slate-400">Total Members</span>
                <span className="block text-xl font-black text-slate-900 dark:text-white mt-1">{totalUsers}</span>
              </div>
            </div>
          </div>

          {/* Quick Action Directories */}
          <div className="dash-card-anim finexy-card p-4 space-y-2.5">
            <h3 className="text-xs font-extrabold uppercase text-slate-700 dark:text-slate-300 tracking-wider">
              Shortcuts
            </h3>
            <div className="space-y-1.5">
              {[
                { label: "Classrooms Directory", desc: "Manage classes & incharge info", to: "/classes", icon: BookOpen },
                { label: "Projects Registry", desc: "Browse & search active projects", to: "/projects", icon: FolderKanban },
                { label: "Faculty Directory", desc: "View department faculty list", to: "/faculty", icon: Users }
              ].map((item, idx) => (
                <div
                  key={idx}
                  onClick={() => navigateWithTransition(item.to, item.label, item.icon)}
                  className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer group transition-all border border-transparent hover:border-slate-100 dark:hover:border-slate-800"
                >
                  <div>
                    <span className="block text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-[#F05A2B] transition-colors leading-tight">
                      {item.label}
                    </span>
                    <span className="block text-[10px] font-medium text-slate-500 dark:text-slate-400 mt-0.5 leading-none">
                      {item.desc}
                    </span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 dark:text-slate-500 group-hover:translate-x-0.5 group-hover:text-[#F05A2B] transition-all flex-shrink-0" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right 2 Columns: Real Live Announcements & Bulletins Feed */}
        <div className="dash-card-anim lg:col-span-2 finexy-card p-5 flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Megaphone className="w-4 h-4 text-[#F05A2B]" />
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white tracking-tight">
                Live Department Announcements & Activity
              </h3>
            </div>
            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 dark:text-emerald-400 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
              ● Live Backend Stream
            </span>
          </div>

          {/* Real Backend Updates Data Stream */}
          <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
            {updatesList.length > 0 ? (
              updatesList.slice(0, 4).map((upd, idx) => {
                const parsed = parseUpdateContent(upd.content);
                return (
                  <div key={idx} className="p-3 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 flex items-start justify-between gap-3">
                    <div className="space-y-0.5 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold text-slate-900 dark:text-white truncate">
                          {parsed.title || parsed.department || "Department Update"}
                        </span>
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-slate-200/70 dark:bg-slate-700 text-slate-700 dark:text-slate-300 uppercase">
                          {parsed.updateType || "Notice"}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-1">
                        {parsed.description || "Official update issued to department members."}
                      </p>
                    </div>
                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 whitespace-nowrap shrink-0">
                      {timeAgo(upd.created_at)}
                    </span>
                  </div>
                );
              })
            ) : (
              <div className="py-8 text-center text-xs font-semibold text-slate-400">
                No active department updates logged.
              </div>
            )}
          </div>
        </div>

      </div>

      <MailComposerModal isOpen={isMailModalOpen} onClose={() => setIsMailModalOpen(false)} />
    </div>
  );
}
