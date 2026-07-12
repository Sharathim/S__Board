import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Shield, User, GraduationCap, ArrowLeft, AlertCircle, Loader2, ChevronRight } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import gsap from "gsap";

/* ── Google Icon ── */
function GoogleIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

/* ── Role configs ── */
const ROLES = [
  {
    id: "HOD",
    label: "Head of Department",
    shortLabel: "HOD",
    icon: Shield,
    desc: "Manage faculty, students, projects and the entire department from one powerful dashboard.",
    gradient: "from-violet-600 to-purple-700",
    glow: "shadow-violet-500/30",
    glowHover: "group-hover:shadow-violet-500/50",
    border: "border-violet-500/30",
    borderHover: "group-hover:border-violet-400/60",
    iconBg: "bg-violet-500/20",
    iconColor: "text-violet-300",
    badge: "Admin",
    badgeColor: "bg-violet-500/20 text-violet-300",
    accentLight: "bg-violet-600/10",
  },
  {
    id: "FACULTY",
    label: "Faculty Member",
    shortLabel: "Faculty",
    icon: User,
    desc: "Oversee classes, guide student projects, post updates and collaborate with peers seamlessly.",
    gradient: "from-blue-600 to-cyan-700",
    glow: "shadow-blue-500/30",
    glowHover: "group-hover:shadow-blue-500/50",
    border: "border-blue-500/30",
    borderHover: "group-hover:border-blue-400/60",
    iconBg: "bg-blue-500/20",
    iconColor: "text-blue-300",
    badge: "Educator",
    badgeColor: "bg-blue-500/20 text-blue-300",
    accentLight: "bg-blue-600/10",
  },
  {
    id: "STUDENT",
    label: "Student",
    shortLabel: "Student",
    icon: GraduationCap,
    desc: "Track your projects, engage in the forum, access class resources and stay updated in real-time.",
    gradient: "from-emerald-600 to-teal-700",
    glow: "shadow-emerald-500/30",
    glowHover: "group-hover:shadow-emerald-500/50",
    border: "border-emerald-500/30",
    borderHover: "group-hover:border-emerald-400/60",
    iconBg: "bg-emerald-500/20",
    iconColor: "text-emerald-300",
    badge: "Learner",
    badgeColor: "bg-emerald-500/20 text-emerald-300",
    accentLight: "bg-emerald-600/10",
  },
];

/* ── Role Card ── */
function RoleCard({ role, selected, onSelect }) {
  const { id, label, shortLabel, icon: Icon, desc, gradient, glow, glowHover, border, borderHover, iconBg, iconColor, badge, badgeColor } = role;
  const isSelected = selected === id;

  return (
    <button
      onClick={() => onSelect(id)}
      className={`role-card group relative w-full text-left p-6 rounded-2xl border transition-all duration-300 cursor-pointer overflow-hidden
        ${isSelected
          ? `${border.replace("border-", "border-")} bg-white/10 shadow-2xl ${glow} scale-[1.02]`
          : `border-white/8 bg-white/4 hover:bg-white/7 hover:${border} hover:shadow-xl hover:${glow} hover:scale-[1.01]`
        }`}
    >
      {/* Background gradient on selected */}
      <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-0 transition-opacity duration-300 ${isSelected ? "opacity-[0.08]" : "group-hover:opacity-[0.05]"}`} />

      {/* Selected ring */}
      {isSelected && (
        <div className={`absolute inset-0 rounded-2xl border-2 ${border} pointer-events-none`} />
      )}

      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className={`w-14 h-14 rounded-xl ${iconBg} flex items-center justify-center`}>
            <Icon className={`w-7 h-7 ${iconColor}`} />
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${badgeColor}`}>
              {badge}
            </span>
            {isSelected && (
              <div className={`w-6 h-6 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center`}>
                <ChevronRight className="w-3.5 h-3.5 text-white" />
              </div>
            )}
          </div>
        </div>

        {/* Text */}
        <h3 className="text-lg font-bold text-white mb-1">{label}</h3>
        <p className="text-sm text-slate-400 leading-relaxed line-clamp-2">{desc}</p>
      </div>
    </button>
  );
}

/* ── Main LoginPage ── */
export default function LoginPage() {
  const navigate = useNavigate();
  const { loginWithGoogle, authError, setAuthError, loading } = useAuth();
  const [selectedRole, setSelectedRole] = useState(null);
  const [pending, setPending] = useState(false);
  const cardsRef = useRef(null);
  const headerRef = useRef(null);
  const panelRef = useRef(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
      tl
        .from(headerRef.current, { opacity: 0, y: -20, duration: 0.6 })
        .from(".role-card", { opacity: 0, y: 40, stagger: 0.12, duration: 0.7 }, "-=0.3")
        .from(panelRef.current, { opacity: 0, y: 20, duration: 0.5 }, "-=0.3");
    });
    return () => ctx.revert();
  }, []);

  // Animate panel when role selected
  useEffect(() => {
    if (selectedRole && panelRef.current) {
      gsap.from(panelRef.current, {
        opacity: 0, y: 10, duration: 0.35, ease: "power2.out",
      });
    }
  }, [selectedRole]);

  const handleLogin = async () => {
    if (!selectedRole || pending) return;
    setPending(true);
    sessionStorage.setItem("justLoggedIn", "true");
    await loginWithGoogle(selectedRole);
    setPending(false);
  };

  const isBusy = pending || loading;
  const activeRole = ROLES.find((r) => r.id === selectedRole);

  return (
    <div className="min-h-screen bg-[#080B14] flex flex-col overflow-hidden">

      {/* ── Ambient blobs ── */}
      <div className="absolute w-[500px] h-[500px] rounded-full bg-violet-600/20 blur-3xl -top-40 -left-40 pointer-events-none" aria-hidden="true" />
      <div className="absolute w-[400px] h-[400px] rounded-full bg-blue-600/15 bottom-0 right-0 blur-3xl pointer-events-none" aria-hidden="true" />
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSA2MCAwIEwgMCAwIDAgNjAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjAzKSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-100 pointer-events-none" aria-hidden="true" />

      <div className="relative z-10 flex flex-col min-h-screen">

        {/* ── Top bar ── */}
        <div ref={headerRef} className="flex items-center justify-between px-6 py-5 max-w-6xl mx-auto w-full">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors duration-200 group text-sm font-medium"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform duration-200" />
            Back to Home
          </button>
          <div className="flex items-center gap-2.5">
            <img src="/logo-icon.png?v=2" alt="Hive" className="h-8 w-8 object-contain" />
            <span className="text-white font-black text-lg tracking-tight">Hive</span>
          </div>
        </div>

        {/* ── Main content ── */}
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-8">

          {/* Heading */}
          <div className="text-center mb-10">
            <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight mb-3">
              Welcome to Hive
            </h1>
            <p className="text-slate-400 text-lg">
              Choose your role to continue
            </p>
          </div>

          {/* Role cards */}
          <div ref={cardsRef} className="w-full max-w-4xl grid sm:grid-cols-3 gap-5 mb-8">
            {ROLES.map((role) => (
              <RoleCard
                key={role.id}
                role={role}
                selected={selectedRole}
                onSelect={(id) => {
                  setSelectedRole(id);
                  setAuthError?.(null);
                }}
              />
            ))}
          </div>

          {/* Sign-in panel */}
          <div ref={panelRef} className="w-full max-w-md">
            {/* Error */}
            {authError && (
              <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 mb-4">
                <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                <p className="text-sm text-red-300 leading-relaxed">{authError}</p>
              </div>
            )}

            {selectedRole ? (
              <div className="space-y-3">
                {/* Google Sign In */}
                <button
                  onClick={handleLogin}
                  disabled={isBusy}
                  className={`w-full flex items-center justify-center gap-3 px-6 py-4 rounded-2xl font-bold text-sm transition-all duration-300
                    ${isBusy
                      ? "bg-white/5 border border-white/10 text-slate-400 cursor-not-allowed"
                      : `bg-white text-slate-900 hover:bg-slate-100 hover:scale-[1.02] active:scale-[0.98] shadow-2xl`
                    }`}
                >
                  {isBusy ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
                      <span className="text-slate-400">Signing in…</span>
                    </>
                  ) : (
                    <>
                      <GoogleIcon size={20} />
                      <span>Continue with Google as {activeRole?.shortLabel}</span>
                    </>
                  )}
                </button>

                {/* Role note */}
                <p className="text-center text-xs text-slate-500">
                  {selectedRole === "HOD" && "⚡ Only the authorized HOD email can access this role."}
                  {selectedRole === "FACULTY" && "📋 New faculty members require HOD approval to join."}
                  {selectedRole === "STUDENT" && "🎓 New students must be enrolled by your HOD."}
                </p>
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-slate-500 text-sm">
                  ↑ Select a role above to sign in with Google
                </p>
              </div>
            )}

            {/* Help */}
            <p className="text-center text-xs text-slate-600 mt-6">
              Need help?{" "}
              <a href="mailto:admin@dpms.edu" className="text-violet-400 hover:text-violet-300 transition-colors font-medium">
                Contact your system administrator
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
