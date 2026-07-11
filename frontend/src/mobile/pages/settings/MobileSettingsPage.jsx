import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "../../../context/AuthContext";
import { useTheme } from "../../../hooks/useTheme";
import { ConfirmDialog } from "../../../components/ui/ConfirmDialog";
import { Avatar } from "../../../components/ui/Avatar";
import api from "../../../api/axios";
import {
  Moon, Sun, Bell, LogOut, User, Shield, Settings,
  CheckCircle2, Sparkles, Monitor, Lock, Info
} from "lucide-react";
import MobileCard from "../../components/MobileCard";
import MobileListRow from "../../components/MobileListRow";

function ToggleSwitch({ enabled, onChange }) {
  return (
    <button
      onClick={onChange}
      className={`relative w-11 h-6 rounded-full transition-all duration-300 ${
        enabled ? "bg-gradient-to-r from-primary-500 to-indigo-500" : "bg-gray-200 dark:bg-slate-700"
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-300 ${
          enabled ? "translate-x-5" : "translate-x-0"
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
  const [logoutConfirm, setLogoutConfirm] = useState(false);

  const updatePushMutation = useMutation({ mutationFn: (enabled) => api.patch("/settings/push-notifications", { enabled }) });
  const updateProfileMutation = useMutation({
    mutationFn: (data) => api.patch("/settings/profile", data),
    onSuccess: () => { setSaveSuccess(true); setTimeout(() => { setSaveSuccess(false); window.location.reload(); }, 1500); },
  });

  const handleSaveProfile = () => {
    if (name.trim() && name !== user?.name) updateProfileMutation.mutate({ name: name.trim() });
  };

  const togglePush = () => {
    const v = !pushEnabled;
    setPushEnabled(v);
    updatePushMutation.mutate(v);
  };

  const roleColors = {
    HOD: "from-violet-500 to-purple-600",
    FACULTY: "from-blue-500 to-indigo-600",
    STUDENT: "from-emerald-500 to-teal-600",
  };

  return (
    <div className="space-y-4 mobile-fade-in pb-4">
      {/* Profile Hero Card */}
      <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${roleColors[user?.role] || "from-primary-500 to-indigo-600"} p-5 shadow-lg`}>
        <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-white/5 -translate-y-6 translate-x-6" />
        <div className="relative flex items-center gap-4">
          <div className="relative">
            <div className="w-14 h-14 rounded-2xl ring-3 ring-white/30 shadow-xl overflow-hidden">
              <Avatar src={user?.profile_picture} name={user?.name} size="xl" className="w-full h-full" />
            </div>
            <span className="absolute -bottom-1 -right-1 w-5 h-5 bg-white rounded-lg flex items-center justify-center shadow-md">
              <CheckCircle2 className="w-3 h-3 text-emerald-500" />
            </span>
          </div>
          <div className="text-white min-w-0">
            <h2 className="text-base font-bold leading-tight truncate">{user?.name}</h2>
            <p className="text-xs text-white/70 mt-0.5 truncate">{user?.email}</p>
            <div className="flex items-center gap-1 mt-1.5">
              <Shield className="w-3 h-3 text-white/70" />
              <span className="text-[10px] font-bold text-white/90 uppercase tracking-widest bg-white/15 px-2 py-0.5 rounded-full">{user?.role}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Profile Edit */}
      <MobileCard>
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
          <User className="w-3.5 h-3.5 text-blue-500" /> Profile
        </h3>
        <div className="space-y-3">
          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 block">Display Name</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)}
              className="w-full px-3 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500/30" />
          </div>
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-slate-800/50 border border-gray-100 dark:border-slate-700/50">
            <Lock className="w-3.5 h-3.5 text-gray-400" />
            <span className="text-xs text-gray-500 flex-1 truncate">{user?.email}</span>
            <span className="text-[9px] font-bold text-gray-400 uppercase bg-gray-100 dark:bg-slate-700 px-1.5 py-0.5 rounded-full">Read-only</span>
          </div>
          {saveSuccess ? (
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5" /> Saved! Reloading...
            </div>
          ) : (
            <button onClick={handleSaveProfile} disabled={updateProfileMutation.isPending || !name.trim() || name === user?.name}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-primary-600 to-indigo-600 text-white text-xs font-bold shadow-sm disabled:opacity-50 transition-all flex items-center justify-center gap-1.5">
              {updateProfileMutation.isPending ? (
                <><span className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" /> Saving...</>
              ) : (
                <><Sparkles className="w-3.5 h-3.5" /> Save Changes</>
              )}
            </button>
          )}
        </div>
      </MobileCard>

      {/* Preferences */}
      <MobileCard>
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
          <Settings className="w-3.5 h-3.5 text-violet-500" /> Preferences
        </h3>
        <div className="space-y-1">

          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-2.5">
              <Bell className="w-4 h-4 text-blue-500" />
              <div>
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">Push Notifications</p>
                <p className="text-[10px] text-gray-400">Get notified about updates</p>
              </div>
            </div>
            <ToggleSwitch enabled={pushEnabled} onChange={togglePush} />
          </div>
        </div>
      </MobileCard>

      {/* Account Info */}
      <MobileCard>
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
          <Info className="w-3.5 h-3.5 text-gray-400" /> Account Info
        </h3>
        <div className="space-y-2">
          {[
            { label: "Role", value: user?.role },
            { label: "Account ID", value: user?.id || "—" },
            { label: "Department", value: user?.department || "Computer Science" },
          ].map(item => (
            <div key={item.label} className="flex items-center justify-between py-1.5">
              <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{item.label}</span>
              <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{item.value}</span>
            </div>
          ))}
        </div>
      </MobileCard>



      {/* Sign Out */}
      <MobileCard onClick={() => setLogoutConfirm(true)} className="!border-red-100 dark:!border-red-900/30">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-red-50 dark:bg-red-950/30 text-red-500">
            <LogOut className="w-4.5 h-4.5" />
          </div>
          <span className="text-sm font-bold text-red-600 dark:text-red-400">Sign Out</span>
        </div>
      </MobileCard>

      <ConfirmDialog open={logoutConfirm} onClose={() => setLogoutConfirm(false)} onConfirm={() => { setLogoutConfirm(false); logout(); }}
        title="Confirm Log Out" message="Are you sure you want to log out?" confirmText="Log Out" danger />
    </div>
  );
}
