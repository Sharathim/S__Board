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
  FolderKanban, Users, CheckCircle,
  Megaphone, Mail, BookOpen,
  Zap, GraduationCap, Building2,
  Clock, TrendingUp, BarChart3,
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

  const [isMailModalOpen, setIsMailModalOpen] = useState(false);
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
    return <div className="flex items-center justify-center" style={{ height: "calc(100vh - 90px)" }}><Spinner /></div>;
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

  /* Top 3 classrooms by student count */
  const topClasses = [...classesList]
    .sort((a, b) => (b.student_count ?? 0) - (a.student_count ?? 0))
    .slice(0, 3);

  const TAG_COLORS = {
    Notice:       "bg-blue-50 text-blue-700",
    Announcement: "bg-amber-50 text-amber-700",
    Event:        "bg-violet-50 text-violet-700",
    Alert:        "bg-red-50 text-red-700",
  };

  return (
    <>
      {/* ── Root: fills exactly the main content area, no overflow ── */}
      <div
        ref={containerRef}
        className="flex flex-col gap-3.5 select-none"
        style={{ height: "calc(100vh - 90px)", overflow: "hidden" }}
      >

        {/* ═══════════════════════════════════════════════════
             ROW 1 — Hero Section (reference style)
           ═══════════════════════════════════════════════════ */}
        <div className="da flex items-end justify-between gap-4 shrink-0 pt-1">
          <div>
            <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 mb-1 uppercase tracking-wider">
              {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}
            </p>
            <h1
              className="font-black text-slate-900 dark:text-white tracking-tight leading-none"
              style={{ fontSize: "clamp(1.6rem, 2.8vw, 2.25rem)" }}
            >
              {getGreeting()}, {user?.name?.split(" ")[0] ?? "Administrator"}
            </h1>
            <p
              className="text-slate-500 dark:text-slate-400 font-medium mt-2"
              style={{ fontSize: "clamp(0.7rem, 1vw, 0.82rem)" }}
            >
              Stay on top of your department tasks, monitor progress, and track status.
            </p>
          </div>

          {(user?.role === "HOD" || user?.role === "FACULTY") && (
            <button
              onClick={() => setIsMailModalOpen(true)}
              className="shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200 hover:border-[#F05A2B]/60 hover:text-[#F05A2B] transition-all shadow-sm"
            >
              <Mail className="w-3.5 h-3.5" />
              Compose Mail
            </button>
          )}
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
            <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 mt-2.5">Archived &amp; Verified</p>
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

          {/* ── Left: Project Status Breakdown + Top Classrooms ── */}
          <div className="flex flex-col gap-3 shrink-0" style={{ width: "clamp(220px, 27%, 280px)" }}>

            {/* Project Status Breakdown (useful — not duplicating the 4 cards) */}
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
                    <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-[#F05A2B] inline-block" />
                      In Progress
                    </span>
                  </div>
                  <StatusBar value={inProgress} max={total} color="#F05A2B" />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                      Completed
                    </span>
                  </div>
                  <StatusBar value={completed} max={total} color="#22C55E" />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-slate-400 inline-block" />
                      Pending
                    </span>
                  </div>
                  <StatusBar value={pending} max={total} color="#94A3B8" />
                </div>
                <div className="pt-1 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500">Total Projects</span>
                    <span className="text-xs font-black text-slate-900 dark:text-white tabular-nums">{total}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Top Classrooms by Enrollment (real data, useful) */}
            <div
              className="da rounded-[20px] p-4 bg-white dark:bg-slate-900 flex-1 min-h-0 flex flex-col"
              style={{ border: "1.5px solid #EBEBEB", boxShadow: "0 4px 16px rgba(0,0,0,0.04)" }}
            >
              <div className="flex items-center justify-between mb-3 shrink-0">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500 dark:text-slate-400">Top Classrooms</span>
                <TrendingUp className="w-3.5 h-3.5 text-indigo-500" />
              </div>
              {topClasses.length > 0 ? (
                <div className="space-y-2 flex-1">
                  {topClasses.map((cls, i) => {
                    const pct = totalStudents > 0 ? Math.round(((cls.student_count ?? 0) / totalStudents) * 100) : 0;
                    return (
                      <div
                        key={cls.id || i}
                        onClick={() => navigateWithTransition("/classes", "Classes", BookOpen)}
                        className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer transition-all group"
                      >
                        <div className="w-6 h-6 rounded-lg bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center shrink-0">
                          <span className="text-[9px] font-black text-indigo-700 dark:text-indigo-300">{i + 1}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200 group-hover:text-[#F05A2B] transition-colors truncate">{cls.name || `Class ${i + 1}`}</span>
                            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 shrink-0 ml-1">{cls.student_count ?? 0}</span>
                          </div>
                          <div className="h-1 rounded-full bg-slate-100 dark:bg-slate-800 mt-1 overflow-hidden">
                            <div className="h-full rounded-full bg-indigo-400" style={{ width: `${pct}%`, transition: "width 0.8s ease" }} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center">
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">No classrooms yet</p>
                </div>
              )}
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

      <MailComposerModal isOpen={isMailModalOpen} onClose={() => setIsMailModalOpen(false)} />
    </>
  );
}
