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
  BookOpen, ArrowUpRight, TrendingUp,
  Activity, GraduationCap, Building2,
  Clock, Zap,
} from "lucide-react";

/* ─── Helpers ───────────────────────────────────────────────────────────── */
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

/* ─── Mini Progress Ring ────────────────────────────────────────────────── */
function ProgressRing({ percent, size = 44, stroke = 3.5, color = "#F05A2B" }) {
  const r = (size - stroke * 2) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (percent / 100) * circ;
  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#F3F3F5" strokeWidth={stroke} />
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: "stroke-dashoffset 1s cubic-bezier(0.4,0,0.2,1)" }}
      />
    </svg>
  );
}

/* ─── Main Dashboard ────────────────────────────────────────────────────── */
export default function DashboardPage() {
  const { user } = useAuth();
  if (user && user.role !== "HOD") {
    const dest = user.role === "FACULTY" ? "/faculty" : "/classes";
    return <Navigate to={dest} replace />;
  }

  const [isMailModalOpen, setIsMailModalOpen] = useState(false);
  const { navigateWithTransition } = usePageTransition();
  const containerRef = useRef(null);

  /* ── Real Backend Queries ── */
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

  /* ── GSAP stagger entrance — clearProps prevents style lock ── */
  useEffect(() => {
    if (!containerRef.current || statsLoading) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".dash-anim",
        { opacity: 0, y: 22, scale: 0.97 },
        {
          opacity: 1, y: 0, scale: 1,
          stagger: 0.055,
          duration: 0.5,
          ease: "power3.out",
          clearProps: "all",
        }
      );
    }, containerRef);
    return () => ctx.revert();
  }, [statsLoading]);

  if (statsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner />
      </div>
    );
  }

  /* ── Real computed values ── */
  const total        = stats?.total ?? 0;
  const inProgress   = stats?.in_progress ?? 0;
  const completed    = stats?.completed ?? 0;
  const pending      = stats?.pending ?? (total - inProgress - completed);
  const classesList  = classesData?.classes || [];
  const totalStudents = classesList.reduce((s, c) => s + (c.student_count ?? 0), 0);
  const facultyList  = facultyData || [];
  const facultyCount = facultyList.length;
  const totalMembers = 1 + facultyCount + totalStudents;

  const updatesList       = updatesData?.updates || [];
  const activePercent     = total > 0 ? Math.round((inProgress / total) * 100) : 0;
  const completedPercent  = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div
      ref={containerRef}
      className="select-none"
      style={{
        display: "grid",
        gridTemplateRows: "auto auto 1fr",
        gap: "clamp(14px, 2.2vw, 22px)",
        height: "calc(100vh - 102px)",
        overflow: "hidden",
      }}
    >

      {/* ══════════════════════════════════════════════════════════
           ROW 1 — Greeting + Action Button
         ══════════════════════════════════════════════════════════ */}
      <div className="dash-anim flex items-center justify-between gap-4">
        <div>
          <h1
            className="font-black text-slate-900 dark:text-white tracking-tight leading-none"
            style={{ fontSize: "clamp(1.35rem, 2.4vw, 2rem)" }}
          >
            {getGreeting()}, <span className="text-[#F05A2B]">{user?.name?.split(" ")[0] ?? "Administrator"}</span>
          </h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium mt-1" style={{ fontSize: "clamp(0.72rem, 1vw, 0.82rem)" }}>
            Monitor your department · Track projects · Stay connected
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          {/* Live indicator */}
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800/50">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">Live</span>
          </div>

          {(user?.role === "HOD" || user?.role === "FACULTY") && (
            <button
              onClick={() => setIsMailModalOpen(true)}
              className="group flex items-center gap-2 px-4 py-2 rounded-full bg-[#F05A2B] hover:bg-[#E04818] text-white text-xs font-bold shadow-lg shadow-orange-500/20 hover:shadow-orange-500/30 transition-all duration-200 hover:-translate-y-0.5"
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Compose Mail</span>
            </button>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════
           ROW 2 — 4 Primary Metric Cards
         ══════════════════════════════════════════════════════════ */}
      <div
        className="grid gap-3"
        style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(200px, 100%), 1fr))" }}
      >

        {/* Card 1 — Active Projects (Orange Hero Card) */}
        <div
          onClick={() => navigateWithTransition("/projects", "Projects", FolderKanban)}
          className="dash-anim relative overflow-hidden rounded-[22px] p-5 cursor-pointer group"
          style={{
            background: "linear-gradient(135deg, #F05A2B 0%, #E0471A 60%, #C93D14 100%)",
            boxShadow: "0 12px 32px rgba(240,90,43,0.28), 0 2px 8px rgba(240,90,43,0.15)",
          }}
        >
          {/* subtle background texture blobs */}
          <div className="absolute -top-4 -right-4 w-24 h-24 rounded-full bg-white/10 blur-xl" />
          <div className="absolute bottom-2 left-6 w-12 h-12 rounded-full bg-white/5 blur-md" />

          <div className="relative flex items-start justify-between">
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-widest text-white/80">Active Projects</p>
              <h2 className="text-4xl font-black text-white mt-1 leading-none tabular-nums">{inProgress}</h2>
              <div className="mt-2 flex items-center gap-1.5">
                <TrendingUp className="w-3 h-3 text-white/70" />
                <span className="text-[10px] font-bold text-white/90">{activePercent}% of total</span>
              </div>
            </div>
            <div className="relative w-11 h-11 flex items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm group-hover:scale-110 transition-transform duration-200">
              <FolderKanban className="w-5 h-5 text-white" />
            </div>
          </div>

          {/* Progress bar */}
          <div className="relative mt-4">
            <div className="h-1.5 rounded-full bg-white/20">
              <div
                className="h-full rounded-full bg-white/90 transition-all duration-1000"
                style={{ width: `${activePercent}%` }}
              />
            </div>
          </div>

          <div className="relative mt-2 flex items-center gap-1 text-white/70 text-[9px] font-semibold uppercase tracking-widest">
            <ArrowUpRight className="w-3 h-3" />
            <span>View all projects</span>
          </div>
        </div>

        {/* Card 2 — Completed Projects */}
        <div
          onClick={() => navigateWithTransition("/projects", "Projects", FolderKanban)}
          className="dash-anim relative rounded-[22px] p-5 cursor-pointer group bg-white dark:bg-slate-900 hover:-translate-y-0.5 transition-all duration-200"
          style={{ border: "1.5px solid #EBEBEB", boxShadow: "0 4px 20px rgba(0,0,0,0.04)" }}
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500 dark:text-slate-400">Completed</p>
              <h2 className="text-4xl font-black text-slate-900 dark:text-white mt-1 leading-none tabular-nums">{completed}</h2>
              <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 mt-2 flex items-center gap-1">
                <CheckCircle className="w-3 h-3" />
                {completedPercent}% completion rate
              </p>
            </div>
            <ProgressRing percent={completedPercent} size={46} color="#22C55E" />
          </div>
          <div
            className="absolute bottom-0 left-0 right-0 h-0.5 rounded-b-[22px] bg-gradient-to-r from-emerald-400 to-emerald-600 opacity-0 group-hover:opacity-100 transition-opacity"
          />
        </div>

        {/* Card 3 — Students Portal */}
        <div
          onClick={() => navigateWithTransition("/classes", "Classes", BookOpen)}
          className="dash-anim relative rounded-[22px] p-5 cursor-pointer group bg-white dark:bg-slate-900 hover:-translate-y-0.5 transition-all duration-200"
          style={{ border: "1.5px solid #EBEBEB", boxShadow: "0 4px 20px rgba(0,0,0,0.04)" }}
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500 dark:text-slate-400">Students Portal</p>
              <h2 className="text-4xl font-black text-slate-900 dark:text-white mt-1 leading-none tabular-nums">{totalStudents}</h2>
              <p className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 mt-2 flex items-center gap-1">
                <GraduationCap className="w-3 h-3" />
                {classesList.length} active classrooms
              </p>
            </div>
            <ProgressRing percent={classesList.length > 0 ? Math.min(100, (totalStudents / (classesList.length * 30)) * 100) : 0} size={46} color="#6366F1" />
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-0.5 rounded-b-[22px] bg-gradient-to-r from-indigo-400 to-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>

        {/* Card 4 — Faculty Board */}
        <div
          onClick={() => navigateWithTransition("/faculty", "Faculty", Users)}
          className="dash-anim relative rounded-[22px] p-5 cursor-pointer group bg-white dark:bg-slate-900 hover:-translate-y-0.5 transition-all duration-200"
          style={{ border: "1.5px solid #EBEBEB", boxShadow: "0 4px 20px rgba(0,0,0,0.04)" }}
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500 dark:text-slate-400">Faculty Board</p>
              <h2 className="text-4xl font-black text-slate-900 dark:text-white mt-1 leading-none tabular-nums">{facultyCount}</h2>
              <p className="text-[10px] font-bold text-amber-600 dark:text-amber-400 mt-2 flex items-center gap-1">
                <Building2 className="w-3 h-3" />
                {totalMembers} total members
              </p>
            </div>
            <ProgressRing
              percent={facultyCount > 0 ? Math.min(100, (facultyCount / Math.max(facultyCount, 10)) * 100) : 0}
              size={46}
              color="#F59E0B"
            />
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-0.5 rounded-b-[22px] bg-gradient-to-r from-amber-400 to-amber-600 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>

      </div>

      {/* ══════════════════════════════════════════════════════════
           ROW 3 — Bottom Grid: Insights + Quick Links | Live Feed
         ══════════════════════════════════════════════════════════ */}
      <div
        className="grid gap-3 min-h-0"
        style={{ gridTemplateColumns: "clamp(240px, 30%, 320px) 1fr" }}
      >

        {/* Left Column — Dept Stats + Quick Links */}
        <div className="flex flex-col gap-3 min-h-0">

          {/* Department Stats Mini-Card */}
          <div
            className="dash-anim rounded-[22px] p-4 bg-white dark:bg-slate-900 flex-shrink-0"
            style={{ border: "1.5px solid #EBEBEB", boxShadow: "0 4px 20px rgba(0,0,0,0.04)" }}
          >
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                Department Overview
              </p>
              <Activity className="w-3.5 h-3.5 text-[#F05A2B]" />
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "Total Projects", value: total, color: "text-[#F05A2B]" },
                { label: "Faculty", value: facultyCount, color: "text-indigo-600" },
                { label: "Students", value: totalStudents, color: "text-emerald-600" },
              ].map((item, i) => (
                <div key={i} className="text-center p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                  <span className={`block text-lg font-black leading-none ${item.color} tabular-nums`}>{item.value}</span>
                  <span className="block text-[9px] font-bold text-slate-500 dark:text-slate-400 mt-0.5 leading-tight">{item.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Navigation Links */}
          <div
            className="dash-anim rounded-[22px] p-4 bg-white dark:bg-slate-900 flex-1 min-h-0"
            style={{ border: "1.5px solid #EBEBEB", boxShadow: "0 4px 20px rgba(0,0,0,0.04)" }}
          >
            <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-3">
              Quick Navigation
            </p>
            <div className="flex flex-col gap-1.5">
              {[
                { label: "Classrooms",   sub: `${classesList.length} active classes`,          to: "/classes",  icon: BookOpen,      color: "#6366F1" },
                { label: "Projects",     sub: `${total} total · ${inProgress} in progress`,    to: "/projects", icon: FolderKanban,  color: "#F05A2B" },
                { label: "Faculty",      sub: `${facultyCount} staff members`,                  to: "/faculty",  icon: Users,         color: "#F59E0B" },
              ].map((item, i) => {
                const Icon = item.icon;
                return (
                  <button
                    key={i}
                    onClick={() => navigateWithTransition(item.to, item.label, item.icon)}
                    className="group flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-left hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-all duration-150 border border-transparent hover:border-slate-100 dark:hover:border-slate-700/60"
                  >
                    <div
                      className="w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-200"
                      style={{ background: `${item.color}18`, color: item.color }}
                    >
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="block text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-[#F05A2B] transition-colors leading-tight">{item.label}</span>
                      <span className="block text-[10px] font-medium text-slate-400 dark:text-slate-500 leading-tight mt-0.5 truncate">{item.sub}</span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 group-hover:translate-x-0.5 group-hover:text-[#F05A2B] transition-all flex-shrink-0" />
                  </button>
                );
              })}
            </div>
          </div>

        </div>

        {/* Right Column — Live Department Announcements Feed */}
        <div
          className="dash-anim rounded-[22px] bg-white dark:bg-slate-900 flex flex-col min-h-0"
          style={{ border: "1.5px solid #EBEBEB", boxShadow: "0 4px 20px rgba(0,0,0,0.04)" }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-slate-100 dark:border-slate-800 flex-shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl bg-[#F05A2B]/10 flex items-center justify-center">
                <Megaphone className="w-3.5 h-3.5 text-[#F05A2B]" />
              </div>
              <div>
                <h3 className="text-xs font-extrabold text-slate-900 dark:text-white tracking-tight">
                  Department Announcements
                </h3>
                <p className="text-[10px] font-medium text-slate-400 dark:text-slate-500">Live activity stream</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/50 dark:border-emerald-800/40">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[9px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">Live</span>
            </div>
          </div>

          {/* Feed body — scrollable */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2.5 min-h-0">
            {updatesList.length > 0 ? (
              updatesList.slice(0, 8).map((upd, idx) => {
                const parsed = parseUpdateContent(upd.content);
                const title  = parsed.title || parsed.department || "Department Update";
                const desc   = parsed.description || "Official update issued to department members.";
                const tag    = parsed.updateType || "Notice";
                const ago    = timeAgo(upd.created_at);

                const tagColors = {
                  Notice:      "bg-blue-50 text-blue-700 border-blue-200/60",
                  Announcement:"bg-amber-50 text-amber-700 border-amber-200/60",
                  Event:       "bg-purple-50 text-purple-700 border-purple-200/60",
                  Alert:       "bg-red-50 text-red-700 border-red-200/60",
                };
                const tagCls = tagColors[tag] || "bg-slate-100 text-slate-600 border-slate-200/60";

                return (
                  <div
                    key={idx}
                    className="group flex items-start gap-3 p-3 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-100/80 dark:border-slate-700/40 hover:border-slate-200 dark:hover:border-slate-600/60 hover:bg-white dark:hover:bg-slate-800/70 transition-all duration-150"
                  >
                    {/* Icon */}
                    <div className="w-7 h-7 rounded-lg bg-[#F05A2B]/10 flex items-center justify-center flex-shrink-0 mt-0.5 group-hover:scale-105 transition-transform">
                      <Zap className="w-3.5 h-3.5 text-[#F05A2B]" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-slate-900 dark:text-white truncate max-w-[160px]">
                          {title}
                        </span>
                        <span className={`inline-flex text-[9px] font-bold px-1.5 py-0.5 rounded-md border ${tagCls}`}>
                          {tag}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium line-clamp-1 mt-0.5 leading-snug">
                        {desc}
                      </p>
                    </div>

                    {/* Time */}
                    <div className="flex items-center gap-1 text-[9px] font-bold text-slate-400 dark:text-slate-500 whitespace-nowrap flex-shrink-0 mt-0.5">
                      <Clock className="w-2.5 h-2.5" />
                      {ago}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="flex flex-col items-center justify-center h-full py-10 text-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                  <Megaphone className="w-5 h-5 text-slate-400" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-500 dark:text-slate-400">No announcements yet</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Department updates will appear here</p>
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
