import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "../../../context/AuthContext";
import { useTheme } from "../../../hooks/useTheme";
import { ConfirmDialog } from "../../../components/ui/ConfirmDialog";
import api from "../../../api/axios";
import {
  Moon, Sun, Bell, LogOut, User, Shield,
  ChevronRight, CheckCircle2, Sparkles,
  Lock, Info, Smartphone, Save,
} from "lucide-react";

function getRoleGradient(role) {
  const map = {
    HOD: { from: "#7C3AED", to: "#5B21B6" },
    FACULTY: { from: "#3B82F6", to: "#1D4ED8" },
    STUDENT: { from: "#10B981", to: "#059669" },
  };
  return map[role] || map.HOD;
}

function SettingsRow({ icon: Icon, title, subtitle, trailing, onClick, danger = false }) {
  const Comp = onClick ? "button" : "div";
  return (
    <Comp
      onClick={onClick}
      className={`mobile-tappable w-full flex items-center gap-3 px-4 py-3 min-h-[48px] transition-colors ${
        onClick ? "cursor-pointer active:bg-gray-50 dark:active:bg-slate-800/60" : ""
      } ${danger ? "text-red-600 dark:text-red-400" : ""}`}
    >
      {Icon && (
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
          danger
            ? "bg-red-50 dark:bg-red-950/30 text-red-500"
            : "bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-gray-400"
        }`}>
          <Icon className="w-4 h-4" />
        </div>
      )}
      <div className="flex-1 min-w-0 text-left">
        <p className={`text-sm font-semibold truncate ${
          danger ? "" : "text-gray-900 dark:text-gray-100"
        }`}>{title}</p>
        {subtitle && (
          <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5 truncate">{subtitle}</p>
        )}
      </div>
      {trailing && <div className="shrink-0">{trailing}</div>}
      {onClick && !trailing && (
        <ChevronRight className="w-4 h-4 text-gray-300 dark:text-gray-600 shrink-0" />
      )}
    </Comp>
  );
}

function SettingsSection({ title, children }) {
  return (
    <div className="mb-5">
      {title && (
        <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest px-4 mb-1.5">
          {title}
        </p>
      )}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200/70 dark:border-slate-800/80 overflow-hidden divide-y divide-gray-100 dark:divide-slate-800/60">
        {children}
      </div>
    </div>
  );
}

function ToggleSwitch({ checked, onChange }) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onChange(!checked); }}
      className={`mobile-tappable relative w-[46px] h-[28px] rounded-full transition-colors duration-200 shrink-0 ${
        checked ? "bg-primary-500" : "bg-gray-300 dark:bg-slate-600"
      }`}
    >
      <div
        className={`absolute top-[3px] w-[22px] h-[22px] bg-white rounded-full shadow-md transition-transform duration-200 ${
          checked ? "translate-x-[21px]" : "translate-x-[3px]"
        }`}
      />
    </button>
  );
}

export default function MobileSettingsPage() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [name, setName] = useState(user?.name || "");
  const [pushEnabled, setPushEnabled] = useState(user?.push_enabled !== false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);

  const rc = getRoleGradient(user?.role);

  const updatePushMutation = useMutation({
    mutationFn: (enabled) => api.patch("/settings/push-notifications", { enabled }),
  });

  const updateProfileMutation = useMutation({
    mutationFn: (data) => api.patch("/settings/profile", data),
    onSuccess: () => {
      setSaveSuccess(true);
      setEditingName(false);
      setTimeout(() => { setSaveSuccess(false); window.location.reload(); }, 1500);
    },
  });

  const handleSaveProfile = () => {
    if (name.trim() && name !== user?.name) {
      updateProfileMutation.mutate({ name: name.trim() });
    }
  };

  const togglePush = (val) => {
    setPushEnabled(val);
    updatePushMutation.mutate(val);
  };

  return (
    <div className="mobile-fade-in pb-6">
      {/* Profile Hero Card */}
      <div
        className="rounded-2xl p-5 mb-6 relative overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${rc.from}, ${rc.to})` }}
      >
        <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -bottom-4 -left-4 w-20 h-20 rounded-full bg-black/10 blur-xl" />
        <div className="relative flex items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl ring-3 ring-white/30 shadow-xl overflow-hidden">
              {user?.profile_picture ? (
                <img src={user.profile_picture} alt={user?.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xl font-black text-white bg-white/20">
                  {(user?.name || "?").charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <span className="absolute -bottom-1 -right-1 w-5 h-5 bg-white rounded-lg flex items-center justify-center shadow-md">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            </span>
          </div>
          <div className="text-white min-w-0 flex-1">
            <h2 className="text-lg font-black leading-tight truncate">{user?.name}</h2>
            <p className="text-xs text-white/70 mt-0.5 truncate">{user?.email}</p>
            <div className="flex items-center gap-1.5 mt-2">
              <Sparkles className="w-3 h-3 text-white/70" />
              <span className="text-[10px] font-bold text-white/90 uppercase tracking-widest bg-white/15 px-2 py-0.5 rounded-full">
                {user?.role === "HOD" ? "Administrator" : user?.role === "FACULTY" ? "Faculty" : "Student"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Profile Section */}
      <SettingsSection title="Profile">
        {editingName ? (
          <div className="px-4 py-3 space-y-3">
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">
              Display Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500/30"
              placeholder="Enter your name"
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={() => { setEditingName(false); setName(user?.name || ""); }}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 text-xs font-bold text-gray-600 dark:text-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveProfile}
                disabled={updateProfileMutation.isPending || !name.trim() || name === user?.name}
                className="flex-1 py-2.5 rounded-xl bg-primary-600 text-white text-xs font-bold disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {updateProfileMutation.isPending ? (
                  <span className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                ) : (
                  <Save className="w-3.5 h-3.5" />
                )}
                Save
              </button>
            </div>
            {saveSuccess && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 text-xs font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Saved! Reloading...
              </div>
            )}
          </div>
        ) : (
          <SettingsRow
            icon={User}
            title={user?.name || "—"}
            subtitle="Tap to change display name"
            onClick={() => setEditingName(true)}
          />
        )}
        <SettingsRow
          icon={Lock}
          title={user?.email || "—"}
          subtitle="Email address (read-only)"
          trailing={
            <span className="text-[9px] font-bold text-gray-400 uppercase bg-gray-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
              Locked
            </span>
          }
        />
      </SettingsSection>

      {/* Preferences */}
      <SettingsSection title="Preferences">
        <SettingsRow
          icon={Smartphone}
          title="Push Notifications"
          subtitle="Real-time alerts on your device"
          trailing={<ToggleSwitch checked={pushEnabled} onChange={togglePush} />}
        />
      </SettingsSection>

      {/* Account Info */}
      <SettingsSection title="Account">
        <SettingsRow
          icon={Shield}
          title="Role"
          trailing={
            <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">{user?.role}</span>
          }
        />
        <SettingsRow
          icon={Info}
          title="Department"
          trailing={
            <span className="text-xs font-semibold text-gray-600 dark:text-gray-300 truncate max-w-[140px] block">
              {user?.department || "Computer Science"}
            </span>
          }
        />
      </SettingsSection>

      {/* Danger Zone */}
      <SettingsSection title="Account Actions">
        <SettingsRow
          icon={LogOut}
          title="Sign Out"
          subtitle="Log out of your account"
          danger
          onClick={() => setLogoutConfirmOpen(true)}
        />
      </SettingsSection>

      <ConfirmDialog
        open={logoutConfirmOpen}
        onClose={() => setLogoutConfirmOpen(false)}
        onConfirm={() => { setLogoutConfirmOpen(false); logout(); }}
        title="Confirm Log Out"
        message="Are you sure you want to log out of your account?"
        confirmText="Log Out"
        danger
      />
    </div>
  );
}
