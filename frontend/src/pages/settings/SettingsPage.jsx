import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../hooks/useTheme";
import { Avatar } from "../../components/ui/Avatar";
import {
  Moon, Sun, Bell, LogOut, User, Shield, Settings,
  ChevronRight, CheckCircle2, Palette, Smartphone,
  Lock, Info, Sparkles
} from "lucide-react";
import api from "../../api/axios";

function ToggleSwitch({ enabled, onChange }) {
  return (
    <button
      onClick={onChange}
      className={`relative w-12 h-6 rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 ${
        enabled
          ? "bg-gradient-to-r from-primary-500 to-indigo-500"
          : "bg-gray-200 dark:bg-gray-700"
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-300 ${
          enabled ? "translate-x-6" : "translate-x-0"
        }`}
      />
    </button>
  );
}

function SectionCard({ title, icon: Icon, accentColor = "text-primary-500", children }) {
  return (
    <div className="bg-white dark:bg-gray-800/80 rounded-2xl border border-gray-100 dark:border-gray-700/60 shadow-sm overflow-hidden">
      <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-50 dark:border-gray-700/40">
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center bg-gray-50 dark:bg-gray-700/40 ${accentColor}`}>
          <Icon className="w-4 h-4" />
        </div>
        <h2 className="text-sm font-bold text-gray-900 dark:text-white">{title}</h2>
      </div>
      <div className="p-6 space-y-5">
        {children}
      </div>
    </div>
  );
}

function PreferenceRow({ icon: Icon, title, description, control }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-gray-50 dark:bg-gray-700/40 text-gray-400 shrink-0">
          <Icon className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <div className="text-sm font-semibold text-gray-900 dark:text-white leading-tight">{title}</div>
          <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{description}</div>
        </div>
      </div>
      <div className="shrink-0">{control}</div>
    </div>
  );
}

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [name, setName] = useState(user?.name || "");
  const [pushEnabled, setPushEnabled] = useState(user?.push_enabled !== false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const updatePushMutation = useMutation({
    mutationFn: (enabled) => api.patch("/settings/push-notifications", { enabled }),
  });

  const updateProfileMutation = useMutation({
    mutationFn: (data) => api.patch("/settings/profile", data),
    onSuccess: () => {
      setSaveSuccess(true);
      setTimeout(() => { setSaveSuccess(false); window.location.reload(); }, 1500);
    },
  });

  const handleSaveProfile = () => {
    if (name.trim() && name !== user?.name) {
      updateProfileMutation.mutate({ name: name.trim() });
    }
  };

  const togglePush = () => {
    const newVal = !pushEnabled;
    setPushEnabled(newVal);
    updatePushMutation.mutate(newVal);
  };

  const roleColors = {
    HOD: "from-violet-500 to-purple-600",
    FACULTY: "from-blue-500 to-indigo-600",
    STUDENT: "from-emerald-500 to-teal-600",
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto pb-12 animate-fade-in">

      {/* Page Header */}
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-gray-700 to-gray-900 dark:from-gray-600 dark:to-gray-800 flex items-center justify-center shadow-lg">
          <Settings className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">Settings</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Manage your account and preferences</p>
        </div>
      </div>

      {/* Profile Hero Card */}
      <div className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${roleColors[user?.role] || "from-primary-500 to-indigo-600"} p-6 shadow-2xl`}>
        <div className="absolute top-0 right-0 w-40 h-40 rounded-full bg-white/5 -translate-y-8 translate-x-8" />
        <div className="absolute bottom-0 left-0 w-32 h-32 rounded-full bg-black/10 translate-y-8 -translate-x-6" />
        <div className="relative flex items-center gap-5">
          <div className="relative">
            <div className="w-18 h-18 rounded-2xl ring-4 ring-white/30 shadow-xl overflow-hidden">
              <Avatar src={user?.profile_picture} name={user?.name} size="xl" className="w-full h-full" />
            </div>
            <span className="absolute -bottom-1 -right-1 w-6 h-6 bg-white rounded-xl flex items-center justify-center shadow-md">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            </span>
          </div>
          <div className="text-white min-w-0">
            <h2 className="text-xl font-black leading-tight truncate">{user?.name}</h2>
            <p className="text-sm text-white/70 mt-0.5 truncate">{user?.email}</p>
            <div className="flex items-center gap-1.5 mt-2">
              <Shield className="w-3.5 h-3.5 text-white/70" />
              <span className="text-xs font-bold text-white/90 uppercase tracking-widest bg-white/15 px-2 py-0.5 rounded-full">
                {user?.role}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Profile Edit Section */}
      <SectionCard title="Profile Information" icon={User} accentColor="text-blue-500">
        <div>
          <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Display Name</label>
          <div className="relative">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 text-sm rounded-xl border border-gray-200 dark:border-gray-600/60 bg-gray-50 dark:bg-gray-700/40 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400 dark:focus:border-primary-600 transition-all"
              placeholder="Enter your name"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Email Address</label>
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-700/30 border border-gray-100 dark:border-gray-700/40">
            <Lock className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-600 dark:text-gray-400">{user?.email}</span>
            <span className="ml-auto text-[10px] font-bold text-gray-400 uppercase bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full">Read-only</span>
          </div>
        </div>

        <div className="pt-1">
          {saveSuccess ? (
            <div className="flex items-center gap-2 px-5 py-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800/30 text-emerald-600 dark:text-emerald-400 text-sm font-semibold">
              <CheckCircle2 className="w-4 h-4" />
              Profile saved! Reloading...
            </div>
          ) : (
            <button
              onClick={handleSaveProfile}
              disabled={updateProfileMutation.isPending || !name.trim() || name === user?.name}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-primary-600 to-indigo-600 hover:from-primary-700 hover:to-indigo-700 text-white text-sm font-bold transition-all shadow-md hover:shadow-primary-500/30 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
            >
              {updateProfileMutation.isPending ? (
                <>
                  <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  Saving Changes...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Save Profile Changes
                </>
              )}
            </button>
          )}
        </div>
      </SectionCard>

      {/* Preferences Section */}
      <SectionCard title="Preferences" icon={Palette} accentColor="text-violet-500">
        <PreferenceRow
          icon={theme === "dark" ? Moon : Sun}
          title={theme === "dark" ? "Dark Mode" : "Light Mode"}
          description="Switch between light and dark interface"
          control={<ToggleSwitch enabled={theme === "dark"} onChange={toggleTheme} />}
        />

        <div className="w-full h-px bg-gray-50 dark:bg-gray-700/40" />

        <PreferenceRow
          icon={Bell}
          title="Push Notifications"
          description="Get notified about important updates and announcements"
          control={<ToggleSwitch enabled={pushEnabled} onChange={togglePush} />}
        />

        <div className="w-full h-px bg-gray-50 dark:bg-gray-700/40" />

        <PreferenceRow
          icon={Smartphone}
          title="Theme Preview"
          description={`Currently using ${theme === "dark" ? "dark" : "light"} mode`}
          control={
            <div className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold ${
              theme === "dark"
                ? "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400"
                : "bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400"
            }`}>
              {theme === "dark" ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
              {theme === "dark" ? "Dark" : "Light"}
            </div>
          }
        />
      </SectionCard>

      {/* Account Info */}
      <SectionCard title="Account Information" icon={Info} accentColor="text-gray-400">
        <div className="space-y-3">
          {[
            { label: "Role", value: user?.role },
            { label: "Account ID", value: user?.id || "—" },
            { label: "Department", value: user?.department || "Computer Science" },
          ].map(item => (
            <div key={item.label} className="flex items-center justify-between py-2">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{item.label}</span>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{item.value}</span>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* Danger Zone - Logout */}
      <div className="bg-white dark:bg-gray-800/80 rounded-2xl border border-red-100 dark:border-red-900/30 shadow-sm overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-red-50 dark:border-red-900/20">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-red-50 dark:bg-red-900/20 text-red-500">
            <LogOut className="w-4 h-4" />
          </div>
          <h2 className="text-sm font-bold text-red-600 dark:text-red-400">Danger Zone</h2>
        </div>
        <div className="p-6">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Once you log out, you'll need to sign in again with your credentials to access the dashboard.
          </p>
          <button
            onClick={logout}
            className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-xl bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 text-sm font-bold border border-red-100 dark:border-red-900/40 hover:border-red-200 dark:hover:border-red-800/40 transition-all"
          >
            <LogOut className="w-4 h-4" />
            Sign out of Account
          </button>
        </div>
      </div>

    </div>
  );
}
