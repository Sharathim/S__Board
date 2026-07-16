import { useQuery } from "@tanstack/react-query";
import { Navigate } from "react-router-dom";
import { getProjectStats, getRecentActivity } from "../../api/projects";
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
import {
  FolderKanban, Users, CheckCircle,
  Megaphone, Mail, BookOpen,
  Zap, GraduationCap, Building2,
  Clock, TrendingUp, BarChart3, MessageSquare,
} from "lucide-react";

/* ─── Helpers ───────────────────────────────────────────────────── */
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

/* ─── Thin horizontal bar for status breakdown ─────────────────── */
function StatusBar({ value, max, color }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
      <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 tabular-nums w-6 text-right">{value}</span>
    </div>
  );
}

/* ─── Main Dashboard ─────────────────────────────────────────────── */
export default function DashboardPage() {
  const { user } = useAuth();
  if (user && user.role !== "HOD") {
    const dest = user.role === "FACULTY" ? "/faculty" : "/classes";
    return <Navigate to={dest} replace />;
  }

  const { navigateWithTransition } = usePageTransition();
  const containerRef = useRef(null);

  /* Real backend queries */
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
    queryFn: () => getRecentActivity(3).then(r => r.data.activities),
  });

  /* GSAP entrance */
  useEffect(() => {
    if (!containerRef.current || statsLoading) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".da",
        { opacity: 0, y: 16 },
        { opacity: 1, y: 0, stagger: 0.05, duration: 0.4, ease: "power3.out", clearProps: "all" }
      );
    }, containerRef);
    return () => ctx.revert();
  }, [statsLoading]);

  if (statsLoading) {
    return <div className="flex items-center justify-center" style={{ height: "calc(100vh - 140px)" }}><Spinner /></div>;
  }

  /* Computed from real data */
  const total          = stats?.total ?? 0;
  const inProgress     = stats?.in_progress ?? 0;
  const completed      = stats?.completed ?? 0;
  const pending        = Math.max(0, total - inProgress - completed);
  const classesList    = classesData?.classes || [];
  const totalStudents  = classesList.reduce((s, c) => s + (c.student_count ?? 0), 0);
  const facultyList    = facultyData || [];
  const facultyCount   = facultyList.length;
  const totalMembers   = 1 + facultyCount + totalStudents;
  const updatesList    = updatesData?.updates || [];
  const activePercent  = total > 0 ? Math.round((inProgress / total) * 100) : 0;

  const TAG_COLORS = {
    Notice:       "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 border-blue-100 dark:border-blue-900/40",
    Announcement: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border-amber-100 dark:border-amber-900/40",
    Event:        "bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-400 border-violet-100 dark:border-violet-900/40",
    Alert:        "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400 border-red-100 dark:border-red-900/40",
  };

  const STATUS_CHIPS = {
    "not started": "bg-slate-50 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-100 dark:border-slate-800",
    "in progress": "bg-orange-50 text-orange-700 dark:bg-orange-950/30 dark:text-orange-400 border-orange-100 dark:border-orange-900/35",
    "review":      "bg-purple-50 text-purple-700 dark:bg-purple-950/30 dark:text-purple-400 border-purple-100 dark:border-purple-900/35",
    "completed":   "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/35",
  };

  return (
    <>
      {/* ── Root: fills exactly the main content area, no overflow ── */}
      <div
        ref={containerRef}
        className="flex flex-col gap-3.5 select-none"
        style={{ height: "calc(100vh - 140px)", overflow: "hidden" }}
      >

        {/* ═══════════════════════════════════════════════════
             ROW 1 — Hero Section (reference style)
           ═══════════════════════════════════════════════════ */}
        <div className="da flex items-end justify-between gap-4 shrink-0 pt-1">
          <div>
            <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 mb-0.5 uppercase tracking-wider">
              {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}
            </p>
            <h1
              className="font-semibold text-slate-900 dark:text-white tracking-tight leading-none"
              style={{ fontSize: "clamp(1.5rem, 2.6vw, 2.1rem)" }}
            >
              {getGreeting()}, {user?.name?.split(" ")[0] ?? "Administrator"}
            </h1>
            <p
              className="text-slate-500 dark:text-slate-400 font-medium mt-1.5"
              style={{ fontSize: "clamp(0.7rem, 0.95vw, 0.8rem)" }}
            >
              Stay on top of your department tasks, monitor progress, and track status.
            </p>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════
             ROW 2 — 4 Horizontal Metric Cards
           ═══════════════════════════════════════════════════ */}
        <div className="da grid grid-cols-4 gap-3 shrink-0">

          {/* Card 1 — Active Projects (orange gradient hero) */}
          <div
            onClick={() => navigateWithTransition("/projects", "Projects", FolderKanban)}
            className="relative rounded-[20px] p-4 cursor-pointer group overflow-hidden shrink-0"
            style={{
              background: "linear-gradient(135deg, #F05A2B 0%, #D94517 100%)",
              boxShadow: "0 8px 24px rgba(240,90,43,0.22)",
            }}
          >
            <div className="absolute -top-4 -right-4 w-20 h-20 rounded-full bg-white/10 blur-2xl pointer-events-none" />
            <div className="relative">
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-white/80">Active Projects</span>
                <div className="w-6 h-6 rounded-lg bg-white/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <FolderKanban className="w-3.5 h-3.5 text-white" />
                </div>
              </div>
              <p className="text-4xl font-black text-white leading-none tabular-nums">{inProgress}</p>
              <div className="mt-2.5">
                <div className="flex justify-between mb-1">
                  <span className="text-[9px] font-bold text-white/70">{activePercent}% of {total} total</span>
                </div>
                <div className="h-1 rounded-full bg-white/25">
                  <div className="h-full rounded-full bg-white/90" style={{ width: `${activePercent}%`, transition: "width 1s ease" }} />
                </div>
              </div>
            </div>
          </div>

          {/* Card 2 — Completed */}
          <div
            onClick={() => navigateWithTransition("/projects", "Projects", FolderKanban)}
            className="rounded-[20px] p-4 cursor-pointer group hover:-translate-y-0.5 transition-all duration-200 bg-white dark:bg-slate-900"
            style={{ border: "1.5px solid #EBEBEB", boxShadow: "0 4px 16px rgba(0,0,0,0.04)" }}
          >
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500 dark:text-slate-400">Completed</span>
              <div className="w-6 h-6 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center group-hover:scale-110 transition-transform">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
            <p className="text-4xl font-black text-slate-900 dark:text-white leading-none tabular-nums">{completed}</p>
            <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 mt-2.5 font-sans">Archived &amp; Verified</p>
          </div>

          {/* Card 3 — Students */}
          <div
            onClick={() => navigateWithTransition("/classes", "Classes", BookOpen)}
            className="rounded-[20px] p-4 cursor-pointer group hover:-translate-y-0.5 transition-all duration-200 bg-white dark:bg-slate-900"
            style={{ border: "1.5px solid #EBEBEB", boxShadow: "0 4px 16px rgba(0,0,0,0.04)" }}
          >
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500 dark:text-slate-400">Students Portal</span>
              <div className="w-6 h-6 rounded-lg bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center group-hover:scale-110 transition-transform">
                <GraduationCap className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              </div>
            </div>
            <p className="text-4xl font-black text-slate-900 dark:text-white leading-none tabular-nums">{totalStudents}</p>
            <p className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 mt-2.5">in {classesList.length} classrooms</p>
          </div>

          {/* Card 4 — Faculty */}
          <div
            onClick={() => navigateWithTransition("/faculty", "Faculty", Users)}
            className="rounded-[20px] p-4 cursor-pointer group hover:-translate-y-0.5 transition-all duration-200 bg-white dark:bg-slate-900"
            style={{ border: "1.5px solid #EBEBEB", boxShadow: "0 4px 16px rgba(0,0,0,0.04)" }}
          >
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500 dark:text-slate-400">Faculty Board</span>
              <div className="w-6 h-6 rounded-lg bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Building2 className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
            <p className="text-4xl font-black text-slate-900 dark:text-white leading-none tabular-nums">{facultyCount}</p>
            <p className="text-[10px] font-bold text-amber-600 dark:text-amber-400 mt-2.5">{totalMembers} total members</p>
          </div>

        </div>

        {/* ═══════════════════════════════════════════════════
             ROW 3 — Bottom: Left Panel + Right Feed
             flex-1 min-h-0 ensures it never overflows
           ═══════════════════════════════════════════════════ */}
        <div className="flex gap-3 flex-1 min-h-0">

          {/* ── Left: Project Status Breakdown + Recent Project Activity ── */}
          <div className="flex flex-col gap-3 shrink-0" style={{ width: "clamp(240px, 30%, 310px)" }}>

            {/* Project Status Breakdown */}
            <div
              className="da rounded-[20px] p-4 bg-white dark:bg-slate-900 shrink-0"
              style={{ border: "1.5px solid #EBEBEB", boxShadow: "0 4px 16px rgba(0,0,0,0.04)" }}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500 dark:text-slate-400">Project Status</span>
                <BarChart3 className="w-3.5 h-3.5 text-[#F05A2B]" />
              </div>
              <div className="space-y-2.5">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-bold text-slate-650 dark:text-slate-400 flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-[#F05A2B] inline-block" />
                      In Progress
                    </span>
                  </div>
                  <StatusBar value={inProgress} max={total} color="#F05A2B" />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-bold text-slate-650 dark:text-slate-400 flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                      Completed
                    </span>
                  </div>
                  <StatusBar value={completed} max={total} color="#22C55E" />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-bold text-slate-650 dark:text-slate-400 flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-slate-450 inline-block" />
                      Pending
                    </span>
                  </div>
                  <StatusBar value={pending} max={total} color="#94A3B8" />
                </div>
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500">Total Projects</span>
                    <span className="text-xs font-black text-slate-900 dark:text-white tabular-nums">{total}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Project Activity (Replaced Top Classrooms section) */}
            <div
              className="da rounded-[20px] p-4 bg-white dark:bg-slate-900 flex-1 min-h-0 flex flex-col"
              style={{ border: "1.5px solid #EBEBEB", boxShadow: "0 4px 16px rgba(0,0,0,0.04)" }}
            >
              <div className="flex items-center justify-between mb-3 shrink-0">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500 dark:text-slate-400">Recent Projects</span>
                <MessageSquare className="w-3.5 h-3.5 text-[#F05A2B]" />
              </div>
              
              <div className="space-y-2.5 flex-1 overflow-hidden">
                {recentActivity && recentActivity.length > 0 ? (
                  recentActivity.map((act) => {
                    const statusClass = STATUS_CHIPS[act.status.toLowerCase()] || "bg-slate-50 text-slate-600";
                    return (
                      <div
                        key={act.id}
                        onClick={() => navigateWithTransition("/projects", "Projects", FolderKanban)}
                        className="p-2 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-100/60 dark:border-slate-800/80 hover:bg-white dark:hover:bg-slate-800 hover:border-slate-200 dark:hover:border-slate-600/50 cursor-pointer transition-all duration-150 group"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200 group-hover:text-[#F05A2B] transition-colors truncate max-w-[130px]">
                            {act.name}
                          </span>
                          <span className={`text-[9px] font-semibold px-2 py-0.5 rounded-full border ${statusClass} uppercase`}>
                            {act.status}
                          </span>
                        </div>
                        <p className="text-[10px] font-medium text-slate-400 dark:text-slate-500 truncate mt-1">
                          {act.last_message ? (
                            <>
                              <span className="font-semibold text-slate-550 dark:text-slate-400">{act.last_message.sender_name}: </span>
                              {act.last_message.content}
                            </>
                          ) : (
                            "No messages logged yet."
                          )}
                        </p>
                      </div>
                    );
                  })
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
                    <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500">No project activity logged.</p>
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* ── Right: Department Announcements (3 items, no scroll) ── */}
          <div
            className="da flex-1 rounded-[20px] bg-white dark:bg-slate-900 flex flex-col min-h-0"
            style={{ border: "1.5px solid #EBEBEB", boxShadow: "0 4px 16px rgba(0,0,0,0.04)" }}
          >
            {/* Header — no live badge */}
            <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-[#F05A2B]/10 flex items-center justify-center">
                  <Megaphone className="w-3.5 h-3.5 text-[#F05A2B]" />
                </div>
                <div>
                  <h3 className="text-xs font-extrabold text-slate-900 dark:text-white tracking-tight leading-none">Department Announcements</h3>
                  <p className="text-[10px] font-medium text-slate-400 dark:text-slate-500 mt-0.5">Latest 3 updates</p>
                </div>
              </div>
            </div>

            {/* 3 announcements — fixed, no scroll */}
            <div className="flex-1 p-3.5 flex flex-col gap-2.5 min-h-0">
              {updatesList.length > 0 ? (
                updatesList.slice(0, 3).map((upd, idx) => {
                  const parsed = parseUpdateContent(upd.content);
                  const title  = parsed.title || parsed.department || "Department Update";
                  const desc   = parsed.description || "Official update issued to department members.";
                  const tag    = parsed.updateType || "Notice";
                  const tagCls = TAG_COLORS[tag] || "bg-slate-100 text-slate-600";

                  return (
                    <div
                      key={idx}
                      className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-100/80 dark:border-slate-700/40 hover:bg-white dark:hover:bg-slate-800 hover:border-slate-200 dark:hover:border-slate-600/50 transition-all duration-150 flex-1"
                    >
                      <div className="w-7 h-7 rounded-xl bg-[#F05A2B]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Zap className="w-3.5 h-3.5 text-[#F05A2B]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[11px] font-bold text-slate-900 dark:text-white truncate max-w-[200px]">{title}</span>
                          <span className={`inline-flex text-[9px] font-bold px-1.5 py-0.5 rounded-md ${tagCls}`}>{tag}</span>
                        </div>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium line-clamp-2 mt-0.5 leading-relaxed">{desc}</p>
                      </div>
                      <div className="flex items-center gap-1 text-[9px] font-bold text-slate-400 dark:text-slate-500 whitespace-nowrap shrink-0">
                        <Clock className="w-2.5 h-2.5" />
                        {timeAgo(upd.created_at)}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                    <Megaphone className="w-5 h-5 text-slate-400" />
                  </div>
                  <div className="text-center">
                    <p className="text-xs font-bold text-slate-500 dark:text-slate-400">No announcements yet</p>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">Department updates will appear here</p>
                  </div>
                </div>
              )}
            </div>

          </div>

        </div>

      </div>
    </>
  );
}
