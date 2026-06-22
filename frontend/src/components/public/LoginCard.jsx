import { useState } from "react";
import { Shield, User, GraduationCap, Lock, AlertCircle } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

function GoogleIcon() {
  return (
    <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

function ButtonSpinner() {
  return (
    <svg className="animate-spin w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

const ROLE_INFO = {
  HOD:     { icon: Shield,        label: "HOD",     color: "text-purple-600", desc: "Head of Department" },
  FACULTY: { icon: User,          label: "Faculty",  color: "text-blue-600",   desc: "Faculty Member" },
  STUDENT: { icon: GraduationCap, label: "Student",  color: "text-green-600",  desc: "Student" },
};

const ROLE_TAG = {
  HOD:     "hod",
  FACULTY: "faculty",
  STUDENT: "student",
};

export function LoginCard() {
  const [activeTab, setActiveTab] = useState("hod");
  const [pending, setPending]     = useState(false);
  const { loginWithGoogle, authError, setAuthError, loading } = useAuth();

  const activeRole = activeTab === "hod" ? "HOD" : activeTab === "faculty" ? "FACULTY" : "STUDENT";
  const roleInfo = ROLE_INFO[activeRole];
  const Icon = roleInfo.icon;

  const handleGoogleLogin = async () => {
    setPending(true);
    await loginWithGoogle(activeRole);
    setPending(false);
  };

  const isBusy = pending || loading;

  return (
    <div
      id="login"
      className="bg-white rounded-2xl shadow-login border border-gray-100/70 p-8 w-full animate-slide-up"
    >
      {/* Icon header */}
      <div className="flex flex-col items-center mb-7">
        <div className="relative mb-4">
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary-400/20 to-violet-400/20 blur-sm scale-110" />
          <div className="relative w-14 h-14 rounded-full bg-gradient-to-br from-primary-50 to-violet-50 border border-primary-100/80 flex items-center justify-center shadow-sm">
            <Icon className={`w-7 h-7 ${roleInfo.color}`} />
          </div>
        </div>
        <h2 className="text-xl font-bold text-gray-900 tracking-tight">Welcome Back!</h2>
        <p className="text-sm text-gray-400 mt-1.5">Sign in to access your dashboard</p>
      </div>

      {/* Login tabs — 3 roles always visible */}
      <div className="flex bg-gray-50/80 rounded-xl p-1 mb-4 gap-1">
        {Object.entries(ROLE_TAG).map(([role, tag]) => {
          const info = ROLE_INFO[role];
          const TagIcon = info.icon;
          const isActive = activeTab === tag;
          return (
            <button
              key={role}
              onClick={() => { setActiveTab(tag); setAuthError?.(null); }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-[10px] text-sm font-medium transition-all duration-200 ${
                isActive
                  ? "bg-white shadow-[0_1px_4px_rgba(0,0,0,0.08)] border border-gray-100"
                  : "text-gray-400 hover:text-gray-600 hover:bg-white/60"
              }`}
            >
              <TagIcon className={`w-4 h-4 ${isActive ? info.color : ""}`} />
              {info.label} Login
            </button>
          );
        })}
      </div>

      {/* Secure label */}
      <div className="flex items-center justify-center gap-1.5 mb-5">
        <Lock className="w-3.5 h-3.5 text-gray-300" />
        <span className="text-xs text-gray-400">
          {activeRole === "HOD"
            ? "Secure access for Head of Department"
            : `Sign in as ${roleInfo.label}`}
        </span>
      </div>

      {/* Auth error banner */}
      {authError && (
        <div className="flex items-start gap-2.5 px-3.5 py-3 rounded-xl bg-red-50 border border-red-100 mb-4">
          <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
          <p className="text-xs text-red-600 leading-relaxed">{authError}</p>
        </div>
      )}

      {/* Google button */}
      <button
        onClick={handleGoogleLogin}
        disabled={isBusy}
        className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-700
          hover:bg-gray-50/80 hover:border-gray-300 hover:-translate-y-0.5 hover:shadow-sm
          active:translate-y-0 active:shadow-none
          transition-all duration-200
          disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0
          mb-4"
      >
        {isBusy ? <ButtonSpinner /> : <GoogleIcon />}
        {isBusy ? "Signing in…" : `Continue with Google as ${roleInfo.label}`}
      </button>

      {/* Divider */}
      <div className="relative flex items-center gap-3 mb-4">
        <div className="flex-1 h-px bg-gray-100" />
        <span className="text-[11px] text-gray-400 shrink-0 tracking-wide">or</span>
        <div className="flex-1 h-px bg-gray-100" />
      </div>

      {/* Info footer per role */}
      {activeRole === "HOD" && (
        <div className="flex items-center justify-center gap-1.5 mb-4">
          <Shield className="w-3.5 h-3.5 text-purple-400" />
          <span className="text-xs text-gray-400">Only authorized HOD email can access</span>
        </div>
      )}
      {activeRole === "FACULTY" && (
        <div className="flex items-center justify-center gap-1.5 mb-4">
          <User className="w-3.5 h-3.5 text-blue-400" />
          <span className="text-xs text-gray-400">New faculty registration requires HOD approval</span>
        </div>
      )}
      {activeRole === "STUDENT" && (
        <div className="flex items-center justify-center gap-1.5 mb-4">
          <GraduationCap className="w-3.5 h-3.5 text-green-400" />
          <span className="text-xs text-gray-400">New student registration requires HOD approval</span>
        </div>
      )}

      {/* Help text */}
      <p className="text-center text-xs text-gray-400">
        Need help?{" "}
        <a
          href="mailto:admin@dpms.edu"
          className="text-primary-500 hover:text-primary-600 hover:underline font-medium transition-colors"
        >
          Contact
        </a>{" "}
        your system administrator
      </p>
    </div>
  );
}
