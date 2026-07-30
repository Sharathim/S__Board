import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";
import { Logo } from "../../../components/ui/Logo";
import {
  ShieldCheck, ArrowLeft, Lock, GraduationCap,
  Users, Shield, ArrowRight, Sparkles
} from "lucide-react";

const ROLES = [
  { value: "HOD", label: "HOD", desc: "Authorized HOD account access", icon: Shield },
  { value: "FACULTY", label: "Faculty", desc: "Faculty invite-only authentication", icon: GraduationCap },
  { value: "STUDENT", label: "Student", desc: "College student Google account", icon: Users },
];

export default function MobileLoginPage() {
  const navigate = useNavigate();
  const { loginWithGoogle } = useAuth();
  const [role, setRole] = useState("HOD");

  const currentRole = ROLES.find(r => r.value === role);

  return (
    <div className="min-h-screen w-full bg-[#F3F3F5] dark:bg-[#0B0F17] text-slate-900 dark:text-slate-100 flex flex-col justify-between p-4 select-none transition-colors duration-300">
      
      {/* Top Bar */}
      <div className="flex items-center justify-between pt-2">
        <button
          onClick={() => navigate("/")}
          className="mobile-tappable p-2 rounded-xl bg-white dark:bg-white/5 border border-slate-200/80 dark:border-white/10 text-slate-700 dark:text-slate-300 flex items-center gap-1.5 text-xs font-bold shadow-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>

        <Logo variant="icon" className="w-9 h-9 object-contain" />
      </div>

      {/* Login Card */}
      <div className="my-auto py-6 max-w-sm mx-auto w-full">
        <div className="p-6 rounded-3xl bg-white dark:bg-[#18181B] border border-gray-200/80 dark:border-[#2E2E34] shadow-xl space-y-6 text-center mobile-fade-in">
          
          {/* Header */}
          <div>
            <div className="w-12 h-12 rounded-2xl bg-[#F05A2B]/10 flex items-center justify-center mx-auto mb-3">
              <Lock className="w-6 h-6 text-[#F05A2B]" />
            </div>
            <h1 
              className="font-black text-slate-900 dark:text-white tracking-tight"
              style={{ fontSize: "clamp(1.25rem, 4vw + 0.5rem, 1.75rem)" }}
            >
              Sign In to Hive
            </h1>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1">
              Department Project Management Portal
            </p>
          </div>

          {/* Role Segmented Selector */}
          <div className="space-y-1.5">
            <label className="block text-[10px] font-extrabold uppercase tracking-widest text-slate-400 text-left px-1">
              Select Your Academic Role
            </label>
            <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-2xl">
              {ROLES.map((r) => {
                const Icon = r.icon;
                const active = role === r.value;
                return (
                  <button
                    key={r.value}
                    onClick={() => setRole(r.value)}
                    className={`mobile-tappable flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                      active
                        ? "bg-[#F05A2B] text-white shadow-md shadow-[#F05A2B]/20"
                        : "text-slate-500 dark:text-slate-400 hover:text-slate-800"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{r.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Role Description */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/[0.05]">
            <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
              {currentRole?.desc}
            </p>
          </div>

          {/* Google Sign-in Action Button */}
          <button
            onClick={() => loginWithGoogle(role)}
            className="mobile-tappable w-full py-3.5 px-4 rounded-full bg-[#F05A2B] hover:bg-[#E04A1B] text-white font-bold text-sm shadow-lg shadow-[#F05A2B]/25 transition-all flex items-center justify-center gap-3"
          >
            <svg viewBox="0 0 48 48" className="w-5 h-5 shrink-0 bg-white rounded-full p-0.5">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
            </svg>
            <span>Continue as {currentRole?.label}</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          {/* Security Badge */}
          <div className="flex items-center justify-center gap-1.5 text-[10px] font-semibold text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>Secured via Firebase & Google OAuth 2.0</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center text-[10px] text-slate-400 font-medium pb-2">
        Hive Academic Department Management Portal
      </div>

    </div>
  );
}
