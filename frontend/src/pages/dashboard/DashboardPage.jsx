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
  Megaphone, ChevronRight, Mail,
  BookOpen, Clock, Zap, Activity,
  GraduationCap, Building2,
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

  /* GSAP entrance – clearProps prevents style lock */
  useEffect(() => {
    if (!containerRef.current || statsLoading) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".da",
        { opacity: 0, y: 18 },
        { opacity: 1, y: 0, stagger: 0.05, duration: 0.42, ease: "power3.out", clearProps: "all" }
      );
    }, containerRef);
    return () => ctx.revert();
  }, [statsLoading]);

  if (statsLoading) {
    return <div className="flex items-center justify-center h-64"><Spinner /></div>;
  }

  /* Computed values from real data */
  const total          = stats?.total ?? 0;
  const inProgress     = stats?.in_progress ?? 0;
  const completed      = stats?.completed ?? 0;
  const classesList    = classesData?.classes || [];
  const totalStudents  = classesList.reduce((s, c) => s + (c.student_count ?? 0), 0);
  const facultyList    = facultyData || [];
  const facultyCount   = facultyList.length;
  const totalMembers   = 1 + facultyCount + totalStudents;
  const updatesList    = updatesData?.updates || [];
  const activePercent  = total > 0 ? Math.round((inProgress / total) * 100) : 0;

  const TAG_COLORS = {
    Notice:       "bg-blue-50   text-blue-700   border-blue-200/70",
    Announcement: "bg-amber-50  text-amber-700  border-amber-200/70",
    Event:        "bg-violet-50 text-violet-700 border-violet-200/70",
    Alert:        "bg-red-50    text-red-700    border-red-200/70",
  };

  return (
    <div
      ref={containerRef}
      className="flex flex-col gap-4 overflow-hidden"
      style={{ height: "calc(100vh - 100px)" }}
    >

      {/* ── ROW 1: Greeting ────────────────────────────────────────── */}
      <div className="da flex items-center justify-between gap-3 shrink-0">
        <div>
          <h1 className="font-black text-slate-900 dark:text-white tracking-tight leading-none"
            style={{ fontSize: "clamp(1.25rem, 2vw, 1.75rem)" }}>
            {getGreeting()},{" "}
            <span className="text-slate-900 dark:text-white">
              {user?.name?.split(" ")[0] ?? "Administrator"}
            </span>
          </h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium mt-1 text-xs">
            Stay on top of your department tasks, monitor progress, and track status.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Live</span>
          </div>
          {(user?.role === "HOD" || user?.role === "FACULTY") && (
            <button
              onClick={() => setIsMailModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200 hover:border-[#F05A2B]/50 hover:text-[#F05A2B] transition-all shadow-sm"
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Compose Mail</span>
            </button>
          )}
        </div>
      </div>

      {/* ── ROW 2: 4 Metric Cards ─────────────────────────────────── */}
      <div className="da grid grid-cols-4 gap-3 shrink-0" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>

        {/* Card 1 — Active Projects (orange hero) */}
        <div
          onClick={() => navigateWithTransition("/projects", "Projects", FolderKanban)}
          className="relative rounded-[20px] p-4 cursor-pointer group overflow-hidden"
          style={{
            background: "linear-gradient(135deg, #F05A2B 0%, #D94517 100%)",
            boxShadow: "0 8px 28px rgba(240,90,43,0.25), 0 2px 8px rgba(240,90,43,0.12)",
          }}
        >
          {/* Subtle blob decoration */}
          <div className="absolute -top-3 -right-3 w-20 h-20 rounded-full bg-white/10 blur-2xl pointer-events-none" />
          <div className="relative">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-white/80">Active Projects</span>
              <div className="w-7 h-7 rounded-xl bg-white/20 flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                <FolderKanban className="w-3.5 h-3.5 text-white" />
              </div>
            </div>
            <p className="text-3xl font-black text-white leading-none tabular-nums">{inProgress}</p>
            <div className="mt-2.5">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-bold text-white/75">{activePercent}% of total</span>
                <span className="text-[10px] font-bold text-white/75">{total} total</span>
              </div>
              <div className="h-1 rounded-full bg-white/25">
                <div
                  className="h-full rounded-full bg-white/90"
                  style={{ width: `${activePercent}%`, transition: "width 1s cubic-bezier(0.4,0,0.2,1)" }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Card 2 — Completed Projects */}
        <div
          onClick={() => navigateWithTransition("/projects", "Projects", FolderKanban)}
          className="rounded-[20px] p-4 cursor-pointer group hover:-translate-y-0.5 transition-all duration-200 bg-white dark:bg-slate-900"
          style={{ border: "1.5px solid #EBEBEB", boxShadow: "0 4px 16px rgba(0,0,0,0.04)" }}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500 dark:text-slate-400">Completed</span>
            <div className="w-7 h-7 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            </div>
          </div>
          <p className="text-3xl font-black text-slate-900 dark:text-white leading-none tabular-nums">{completed}</p>
          <p className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 mt-2">
            Archived &amp; Verified
          </p>
        </div>

        {/* Card 3 — Students Portal */}
        <div
          onClick={() => navigateWithTransition("/classes", "Classes", BookOpen)}
          className="rounded-[20px] p-4 cursor-pointer group hover:-translate-y-0.5 transition-all duration-200 bg-white dark:bg-slate-900"
          style={{ border: "1.5px solid #EBEBEB", boxShadow: "0 4px 16px rgba(0,0,0,0.04)" }}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500 dark:text-slate-400">Students Portal</span>
            <div className="w-7 h-7 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
              <GraduationCap className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            </div>
          </div>
          <p className="text-3xl font-black text-slate-900 dark:text-white leading-none tabular-nums">{totalStudents}</p>
          <p className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 mt-2">
            enrolled in {classesList.length} classrooms
          </p>
        </div>

        {/* Card 4 — Faculty Board */}
        <div
          onClick={() => navigateWithTransition("/faculty", "Faculty", Users)}
          className="rounded-[20px] p-4 cursor-pointer group hover:-translate-y-0.5 transition-all duration-200 bg-white dark:bg-slate-900"
          style={{ border: "1.5px solid #EBEBEB", boxShadow: "0 4px 16px rgba(0,0,0,0.04)" }}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500 dark:text-slate-400">Faculty Board</span>
            <div className="w-7 h-7 rounded-xl bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
              <Building2 className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            </div>
          </div>
          <p className="text-3xl font-black text-slate-900 dark:text-white leading-none tabular-nums">{facultyCount}</p>
          <p className="text-[11px] font-bold text-amber-600 dark:text-amber-400 mt-2">
            {totalMembers} total members
          </p>
        </div>

      </div>

      {/* ── ROW 3: Bottom Section ─────────────────────────────────── */}
      <div className="flex gap-3 flex-1 min-h-0">

        {/* Left — Dept Overview + Quick Links */}
        <div className="flex flex-col gap-3 shrink-0" style={{ width: "clamp(220px, 28%, 290px)" }}>

          {/* Dept Stats Card */}
          <div
            className="da rounded-[20px] p-4 bg-white dark:bg-slate-900 shrink-0"
            style={{ border: "1.5px solid #EBEBEB", boxShadow: "0 4px 16px rgba(0,0,0,0.04)" }}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500 dark:text-slate-400">Overview</span>
              <Activity className="w-3.5 h-3.5 text-[#F05A2B]" />
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "Projects", value: total,         color: "#F05A2B" },
                { label: "Faculty",  value: facultyCount,  color: "#6366F1" },
                { label: "Students", value: totalStudents, color: "#22C55E" },
              ].map((s, i) => (
                <div key={i} className="text-center py-2.5 px-1 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                  <span className="block text-lg font-black tabular-nums" style={{ color: s.color }}>{s.value}</span>
                  <span className="block text-[9px] font-bold text-slate-500 dark:text-slate-400 mt-0.5 leading-tight">{s.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div
            className="da rounded-[20px] p-4 bg-white dark:bg-slate-900 flex-1 min-h-0 flex flex-col"
            style={{ border: "1.5px solid #EBEBEB", boxShadow: "0 4px 16px rgba(0,0,0,0.04)" }}
          >
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-3 shrink-0">Quick Links</span>
            <div className="flex flex-col gap-1.5 flex-1">
              {[
                { label: "Classrooms",  sub: `${classesList.length} classes`,          to: "/classes",  Icon: BookOpen,     clr: "#6366F1" },
                { label: "Projects",    sub: `${inProgress} active · ${completed} done`, to: "/projects", Icon: FolderKanban, clr: "#F05A2B" },
                { label: "Faculty",     sub: `${facultyCount} staff`,                   to: "/faculty",  Icon: Users,        clr: "#F59E0B" },
              ].map(({ label, sub, to, Icon, clr }, i) => (
                <button
                  key={i}
                  onClick={() => navigateWithTransition(to, label, Icon)}
                  className="group flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl text-left hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-all duration-150 border border-transparent hover:border-slate-100 dark:hover:border-slate-700/50"
                >
                  <div
                    className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-200"
                    style={{ background: `${clr}18`, color: clr }}
                  >
                    <Icon className="w-3 h-3" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="block text-[11px] font-bold text-slate-800 dark:text-slate-200 group-hover:text-[#F05A2B] transition-colors leading-tight">{label}</span>
                    <span className="block text-[10px] font-medium text-slate-400 dark:text-slate-500 truncate">{sub}</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 group-hover:translate-x-0.5 group-hover:text-[#F05A2B] transition-all shrink-0" />
                </button>
              ))}
            </div>
          </div>

        </div>

        {/* Right — Live Announcements Feed */}
        <div
          className="da flex-1 rounded-[20px] bg-white dark:bg-slate-900 flex flex-col min-h-0"
          style={{ border: "1.5px solid #EBEBEB", boxShadow: "0 4px 16px rgba(0,0,0,0.04)" }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl bg-[#F05A2B]/10 flex items-center justify-center shrink-0">
                <Megaphone className="w-3.5 h-3.5 text-[#F05A2B]" />
              </div>
              <div>
                <h3 className="text-xs font-extrabold text-slate-900 dark:text-white tracking-tight leading-none">Department Announcements</h3>
                <p className="text-[10px] font-medium text-slate-400 dark:text-slate-500 mt-0.5">Live activity stream</p>
              </div>
            </div>
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/50 dark:border-emerald-800/40">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[9px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">Live</span>
            </div>
          </div>

          {/* Feed – flex-1 so it fills remaining height, no external scroll */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0">
            {updatesList.length > 0 ? (
              updatesList.slice(0, 10).map((upd, idx) => {
                const parsed = parseUpdateContent(upd.content);
                const title  = parsed.title || parsed.department || "Department Update";
                const desc   = parsed.description || "Official update issued to department members.";
                const tag    = parsed.updateType || "Notice";
                const tagCls = TAG_COLORS[tag] || "bg-slate-100 text-slate-600 border-slate-200/60";

                return (
                  <div
                    key={idx}
                    className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-100/80 dark:border-slate-700/40 hover:bg-white dark:hover:bg-slate-800/70 hover:border-slate-200 dark:hover:border-slate-600/50 transition-all duration-150"
                  >
                    <div className="w-6 h-6 rounded-lg bg-[#F05A2B]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Zap className="w-3 h-3 text-[#F05A2B]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[11px] font-bold text-slate-900 dark:text-white truncate max-w-[180px]">{title}</span>
                        <span className={`inline-flex text-[9px] font-bold px-1.5 py-0.5 rounded-md border ${tagCls}`}>{tag}</span>
                      </div>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium line-clamp-1 mt-0.5 leading-snug">{desc}</p>
                    </div>
                    <div className="flex items-center gap-1 text-[9px] font-bold text-slate-400 dark:text-slate-500 whitespace-nowrap shrink-0 mt-0.5">
                      <Clock className="w-2.5 h-2.5" />
                      {timeAgo(upd.created_at)}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="flex flex-col items-center justify-center h-full gap-3 py-6">
                <div className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
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

      <MailComposerModal isOpen={isMailModalOpen} onClose={() => setIsMailModalOpen(false)} />
    </div>
  );
}
