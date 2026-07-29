import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Logo } from "../../../components/ui/Logo";
import BottomSheet from "../../layout/BottomSheet";
import MobileLoginSheetContent from "./MobileLoginSheetContent";
import {
  FolderKanban, GraduationCap, Users, Megaphone,
  CalendarClock, FileText, CheckCircle2, Shield,
  ArrowRight, LogIn, ChevronRight, Zap, Sparkles,
  Layers, Lock, Database, Compass
} from "lucide-react";

export default function MobileHomePage({ autoOpenLogin = false }) {
  const navigate = useNavigate();
  const [loginOpen, setLoginOpen] = useState(autoOpenLogin);
  const [selectedRole, setSelectedRole] = useState("hod");

  const STATS = [
    { value: "500+", label: "Active Students", color: "text-[#F05A2B]" },
    { value: "30+", label: "Expert Faculty", color: "text-amber-500" },
    { value: "200+", label: "Projects Tracked", color: "text-emerald-500" },
    { value: "99.9%", label: "System Uptime", color: "text-blue-500" },
  ];

  const ROLES = [
    {
      id: "hod",
      title: "HOD Command Center",
      badge: "HOD Role",
      badgeCls: "bg-[#F05A2B]/10 text-[#F05A2B] border-[#F05A2B]/20",
      icon: Shield,
      desc: "Full administrative governance over department projects, faculty assignments, classroom allocation, and leave approvals.",
      points: [
        "Instant approval of faculty & student leave requests",
        "Comprehensive department project progress dashboard",
        "Automated classroom timetable coordination",
        "Role permission assignment and audit logs"
      ]
    },
    {
      id: "faculty",
      title: "Faculty Mentorship Hub",
      badge: "Faculty Role",
      badgeCls: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
      icon: GraduationCap,
      desc: "Streamlined project evaluation, milestone reviewing, classroom management, and student communication.",
      points: [
        "Real-time student team milestone review",
        "Classroom roster and attendance management",
        "Department-wide announcement publishing",
        "Document & notes sharing with project teams"
      ]
    },
    {
      id: "student",
      title: "Student Workspace",
      badge: "Student Role",
      badgeCls: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
      icon: Users,
      desc: "Collaborative environment for student project teams to log accomplishments, manage files, and interact with mentors.",
      points: [
        "Secure student registration with Google Single Sign-On",
        "Milestone progress logging & file submissions",
        "Academic forum participation and discussions",
        "Real-time notifications on project approvals"
      ]
    }
  ];

  const FEATURES = [
    {
      icon: FolderKanban,
      title: "Projects Registry",
      desc: "Live tracking of student team projects, milestones, accomplishments, and faculty approvals.",
      tag: "Core Module",
      bg: "bg-orange-50 dark:bg-orange-950/30 text-[#F05A2B]"
    },
    {
      icon: CalendarClock,
      title: "Leave & Permissions",
      desc: "Digital leave application and instant approval workflow with automated balance tracking.",
      tag: "Workflows",
      bg: "bg-blue-50 dark:bg-blue-950/30 text-blue-600"
    },
    {
      icon: Megaphone,
      title: "Announcements",
      desc: "Official department updates, event notices, and priority alerts delivered instantly.",
      tag: "Communication",
      bg: "bg-amber-50 dark:bg-amber-950/30 text-amber-600"
    },
    {
      icon: FileText,
      title: "Notes & Docs",
      desc: "Centralized repository for academic syllabus, lab guidelines, and project documentation.",
      tag: "Resources",
      bg: "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600"
    }
  ];

  return (
    <div className="w-full bg-[#F3F3F5] dark:bg-[#0B0F17] text-slate-900 dark:text-slate-100 select-none pb-24 transition-colors duration-300">
      
      {/* ── 1. Fluid Mobile Hero Section ── */}
      <section className="relative px-4 pt-6 pb-8 text-center overflow-hidden">
        {/* Background glow orb */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-72 h-72 bg-[#F05A2B]/10 dark:bg-[#F05A2B]/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/80 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 shadow-sm mb-4 backdrop-blur-md">
            <Sparkles className="w-3.5 h-3.5 text-[#F05A2B]" />
            <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 tracking-tight">
              Hive — Academic Command Centre
            </span>
          </div>

          {/* Headline using clamp math */}
          <h1 
            className="font-black text-slate-900 dark:text-white tracking-tight leading-[1.12] mb-3"
            style={{ fontSize: "clamp(1.75rem, 5.5vw + 0.5rem, 2.5rem)" }}
          >
            The Intelligent Hub for <span className="bg-gradient-to-r from-[#F05A2B] to-amber-500 bg-clip-text text-transparent">Academic Excellence</span>
          </h1>

          {/* Subtitle using clamp math */}
          <p 
            className="font-medium text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed mb-6"
            style={{ fontSize: "clamp(0.85rem, 1.8vw + 0.4rem, 1.05rem)" }}
          >
            Hive unifies HODs, Faculty, and Students in one unified mobile platform — manage projects, track progress, coordinate classes, and collaborate in real-time.
          </p>

          {/* Action CTA Buttons */}
          <div className="w-full max-w-xs space-y-3">
            <button
              onClick={() => setLoginOpen(true)}
              className="mobile-tappable w-full py-3.5 px-6 rounded-full bg-[#F05A2B] text-white font-bold text-sm shadow-lg shadow-[#F05A2B]/25 hover:bg-[#E04A1B] transition-all flex items-center justify-center gap-2"
            >
              <LogIn className="w-4 h-4" />
              Sign In to Hive
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={() => {
                const el = document.getElementById("mobile-features");
                el?.scrollIntoView({ behavior: "smooth" });
              }}
              className="mobile-tappable w-full py-3 px-6 rounded-full bg-white dark:bg-white/5 border border-slate-200/80 dark:border-white/10 text-slate-700 dark:text-slate-300 font-bold text-xs shadow-sm flex items-center justify-center gap-1.5"
            >
              <Compass className="w-3.5 h-3.5 text-slate-400" />
              Explore Platform Features
            </button>
          </div>
        </div>
      </section>

      {/* ── 2. Platform Stats Grid (Responsive Clamp) ── */}
      <section className="px-4 py-4">
        <div className="grid grid-cols-2 gap-2.5">
          {STATS.map((stat, idx) => (
            <div
              key={idx}
              className="p-4 rounded-2xl bg-white dark:bg-[#121722] border border-gray-200/80 dark:border-white/[0.06] shadow-sm text-center flex flex-col items-center justify-center"
            >
              <span
                className={`font-black tracking-tight ${stat.color}`}
                style={{ fontSize: "clamp(1.4rem, 4vw + 0.5rem, 2rem)" }}
              >
                {stat.value}
              </span>
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
                {stat.label}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* ── 3. Role-Based Ecosystem Section ── */}
      <section className="px-4 py-6">
        <div className="text-center mb-4">
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#F05A2B]">
            Tailored Ecosystem
          </span>
          <h2 
            className="font-bold text-slate-900 dark:text-white tracking-tight mt-1"
            style={{ fontSize: "clamp(1.25rem, 3.5vw + 0.4rem, 1.65rem)" }}
          >
            Built for Every Academic Role
          </h2>
        </div>

        {/* Role Selector Tabs */}
        <div className="flex gap-1 p-1 bg-white dark:bg-[#121722] border border-gray-200/80 dark:border-white/[0.06] rounded-2xl shadow-sm mb-4">
          {ROLES.map((r) => (
            <button
              key={r.id}
              onClick={() => setSelectedRole(r.id)}
              className={`mobile-tappable flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                selectedRole === r.id
                  ? "bg-[#F05A2B] text-white shadow-md shadow-[#F05A2B]/20"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-800"
              }`}
            >
              {r.id === "hod" ? "HOD" : r.id === "faculty" ? "Faculty" : "Student"}
            </button>
          ))}
        </div>

        {/* Active Role Content Card */}
        {ROLES.filter((r) => r.id === selectedRole).map((r) => {
          const RoleIcon = r.icon;
          return (
            <div
              key={r.id}
              className="p-5 rounded-2xl bg-white dark:bg-[#121722] border border-gray-200/80 dark:border-white/[0.06] shadow-sm space-y-4 mobile-fade-in"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#F05A2B]/10 flex items-center justify-center">
                    <RoleIcon className="w-5 h-5 text-[#F05A2B]" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">{r.title}</h3>
                    <span className={`inline-block text-[9px] font-extrabold px-2 py-0.5 rounded-full border ${r.badgeCls} uppercase mt-0.5`}>
                      {r.badge}
                    </span>
                  </div>
                </div>
              </div>

              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                {r.desc}
              </p>

              <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-white/[0.05]">
                {r.points.map((pt, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-xs font-medium text-slate-700 dark:text-slate-300">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span>{pt}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </section>

      {/* ── 4. Key Platform Features Grid ── */}
      <section id="mobile-features" className="px-4 py-6">
        <div className="text-center mb-5">
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#F05A2B]">
            Platform Modules
          </span>
          <h2 
            className="font-bold text-slate-900 dark:text-white tracking-tight mt-1"
            style={{ fontSize: "clamp(1.25rem, 3.5vw + 0.4rem, 1.65rem)" }}
          >
            Core Department Capabilities
          </h2>
        </div>

        <div className="space-y-3">
          {FEATURES.map((feat, idx) => {
            const FeatIcon = feat.icon;
            return (
              <div
                key={idx}
                className="p-4 rounded-2xl bg-white dark:bg-[#121722] border border-gray-200/80 dark:border-white/[0.06] shadow-sm flex items-start gap-3.5"
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${feat.bg}`}>
                  <FeatIcon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <h3 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {feat.title}
                    </h3>
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400">
                      {feat.tag}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                    {feat.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── 5. Enterprise Security & Architecture Banner ── */}
      <section className="px-4 py-4">
        <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 text-white shadow-xl relative overflow-hidden">
          <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none">
            <Shield className="w-40 h-40" />
          </div>
          <div className="relative z-10 space-y-3">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold">
              <Lock className="w-3 h-3" />
              Enterprise Security & Google SSO
            </div>
            <h3 className="text-base font-bold text-white tracking-tight">
              Protected by Google Authentication & Role Authorization
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed font-medium">
              Every login is authenticated via Google Workspace credentials. HOD, Faculty, and Student privileges are assigned instantly by department database records.
            </p>
          </div>
        </div>
      </section>

      {/* ── 6. Bottom Sticky Quick Action Card ── */}
      <section className="px-4 py-6 text-center">
        <div className="p-6 rounded-2xl bg-white dark:bg-[#121722] border border-gray-200/80 dark:border-white/[0.06] shadow-md flex flex-col items-center">
          <Logo variant="icon" className="w-10 h-10 object-contain mb-3" />
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            Ready to Access Hive?
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-4 max-w-xs font-medium">
            Sign in with your registered college Google account to launch your workspace.
          </p>
          <button
            onClick={() => setLoginOpen(true)}
            className="mobile-tappable w-full py-3.5 rounded-full bg-[#F05A2B] text-white text-xs font-bold shadow-lg shadow-[#F05A2B]/25 hover:bg-[#E04A1B] transition-all flex items-center justify-center gap-2"
          >
            <LogIn className="w-4 h-4" />
            Sign In with Google
          </button>
        </div>
      </section>

      {/* Login Bottom Sheet */}
      <BottomSheet open={loginOpen} onClose={() => setLoginOpen(false)} title="Sign In">
        <MobileLoginSheetContent onClose={() => setLoginOpen(false)} />
      </BottomSheet>

    </div>
  );
}
