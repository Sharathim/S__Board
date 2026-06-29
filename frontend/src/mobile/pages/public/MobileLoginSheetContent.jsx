import { useState } from "react";
import { useAuth } from "../../../context/AuthContext";
import {
  ShieldCheck, Users, BarChart3, Zap, ArrowRight,
  FolderKanban, MessageSquare, Activity, Bell
} from "lucide-react";

const ROLES = [
  { value: "HOD", label: "HOD", desc: "Only authorized HOD email can access" },
  { value: "FACULTY", label: "Faculty", desc: "Faculty accounts are invite-only" },
  { value: "STUDENT", label: "Student", desc: "Use your college email to sign in" },
];

export default function MobileLoginSheetContent({ onClose }) {
  const { loginWithGoogle } = useAuth();
  const [role, setRole] = useState("HOD");

  const currentRole = ROLES.find(r => r.value === role);

  return (
    <div className="space-y-5 pb-4 mobile-fade-in">
      {/* Logo + Title */}
      <div className="text-center">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-500 to-violet-600 flex items-center justify-center shadow-lg mx-auto mb-3">
          <img src="/logo-icon.png" alt="Hive" className="w-8 h-8 object-contain brightness-0 invert" />
        </div>
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">Sign in to Hive</h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Department Project Management System</p>
      </div>

      {/* Role Segmented Control */}
      <div className="flex gap-1 p-1 bg-gray-100 dark:bg-slate-800/80 rounded-xl">
        {ROLES.map(r => (
          <button
            key={r.value}
            onClick={() => setRole(r.value)}
            className={`mobile-tappable flex-1 py-2.5 rounded-lg text-xs font-bold transition-all ${
              role === r.value
                ? "bg-white dark:bg-slate-700 text-gray-900 dark:text-white shadow-sm"
                : "text-gray-500 dark:text-gray-400"
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      {/* Role description */}
      <p className="text-center text-[11px] text-gray-400 dark:text-gray-500 px-4 leading-relaxed">
        {currentRole?.desc}
      </p>

      {/* Google Sign-in button */}
      <button
        onClick={() => { loginWithGoogle(role); onClose?.(); }}
        className="mobile-tappable w-full py-3.5 rounded-xl bg-gradient-to-r from-primary-600 to-violet-600 text-white text-sm font-bold shadow-lg shadow-primary-500/25 hover:shadow-primary-500/40 transition-all flex items-center justify-center gap-2.5"
      >
        <svg viewBox="0 0 48 48" className="w-5 h-5">
          <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
          <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
          <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
          <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
        </svg>
        Continue with Google as {currentRole?.label}
      </button>

      <p className="text-center text-[10px] text-gray-400 dark:text-gray-500 leading-relaxed">
        Need help? Contact your system administrator.
      </p>
    </div>
  );
}
