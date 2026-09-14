import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "../../context/AuthContext";
import { Avatar } from "../../components/ui/Avatar";
import {
  Bell, LogOut, User, Shield, CheckCircle2,
  Smartphone, Lock, Info, Sparkles, Mail, Building2,
  Fingerprint, BadgeCheck, ArrowUpRight, TriangleAlert,
} from "lucide-react";
import api from "../../api/axios";
import { Switch } from "../../components/ui/Switch";

const ROLE_THEME = {
  HOD: {
    gradient: "from-violet-600 via-fuchsia-600 to-purple-700",
    glow: "shadow-violet-500/30",
  },
  FACULTY: {
    gradient: "from-blue-600 via-indigo-600 to-indigo-700",
    glow: "shadow-indigo-500/30",
  },
  STUDENT: {
    gradient: "from-emerald-500 via-teal-600 to-cyan-700",
    glow: "shadow-emerald-500/30",
  },
};

function GlassCard({ children, className = "" }) {
  return (
    <div
      className={`relative rounded-[28px] bg-white/80 backdrop-blur-xl border border-gray-100 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_32px_-16px_rgba(15,23,42,0.15)] ${className}`}
    >
      {children}
    </div>
  );
}

function SectionHeading({ eyebrow, title, icon: Icon }) {
  return (
    <div className="flex items-center gap-3 px-7 pt-7 pb-1">
      {Icon && (
        <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-[#F05A2B] to-[#FF8365] flex items-center justify-center shadow-lg shadow-orange-500/25 shrink-0">
          <Icon className="w-4 h-4 text-white" strokeWidth={2.5} />
        </div>
      )}
      <div>
        {eyebrow && (
          <div className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-[#F05A2B]">{eyebrow}</div>
        )}
        <h2 className="text-base font-black text-gray-900 tracking-tight">{title}</h2>
      </div>
    </div>
  );
}

function FieldLabel({ children }) {
  return (
    <label className="block text-[11px] font-extrabold text-gray-400 uppercase tracking-[0.12em] mb-2">
      {children}
    </label>
  );
}

function StatTile({ icon: Icon, label, value }) {
  return (
    <div className="flex-1 min-w-[140px] rounded-2xl bg-white/10 border border-white/15 px-4 py-3.5 hover:bg-white/15 hover:-translate-y-0.5 transition-all duration-300">
      <div className="w-7 h-7 rounded-lg flex items-center justify-center mb-2 bg-white/15 text-white">
        <Icon className="w-3.5 h-3.5" strokeWidth={2.5} />
      </div>
      <div className="text-[10px] font-bold text-white/60 uppercase tracking-wider">{label}</div>
      <div className="text-sm font-black text-white mt-0.5 truncate">{value}</div>
    </div>
  );
}

function PreferenceRow({ icon: Icon, title, description, control, last }) {
  return (
    <div className={`flex items-center justify-between gap-4 py-4 ${!last ? "border-b border-gray-50" : ""}`}>
      <div className="flex items-center gap-3.5 min-w-0">
        <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-gray-50 text-gray-400 shrink-0 border border-gray-100">
          <Icon className="w-4.5 h-4.5" />
        </div>
        <div className="min-w-0">
          <div className="text-sm font-bold text-gray-900 leading-tight">{title}</div>
          <div className="text-xs text-gray-400 mt-0.5">{description}</div>
        </div>
      </div>
      <div className="shrink-0">{control}</div>
    </div>
  );
}

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const [name, setName] = useState(user?.name || "");
  const [pushEnabled, setPushEnabled] = useState(user?.push_enabled !== false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [confirmingLogout, setConfirmingLogout] = useState(false);

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

  const theme = ROLE_THEME[user?.role] || ROLE_THEME.FACULTY;
  const dirty = name.trim() && name !== user?.name;

  return (
    <div className="space-y-7 max-w-3xl mx-auto pb-16 animate-fade-in">

      {/* Page Header */}
      <div className="flex items-end justify-between gap-4">
        <div>
          <div className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-[#F05A2B] mb-1.5">
            Account Center
          </div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight leading-none">Settings</h1>
          <p className="text-sm text-gray-500 mt-2">Manage your identity, access, and how Hive reaches you.</p>
        </div>
      </div>

      {/* Profile Hero */}
      <div className={`relative overflow-hidden rounded-[32px] bg-gradient-to-br ${theme.gradient} p-8 shadow-2xl ${theme.glow}`}>
        <div className="pointer-events-none absolute inset-0 opacity-[0.15] [background-image:radial-gradient(circle_at_1px_1px,white_1px,transparent_0)] [background-size:20px_20px]" />
        <div className="pointer-events-none absolute -top-16 -right-10 w-64 h-64 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-10 w-56 h-56 rounded-full bg-black/10 blur-2xl" />

        <div className="relative flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-5">
            <div className="relative shrink-0">
              <div className="w-20 h-20 rounded-3xl ring-4 ring-white/25 shadow-2xl overflow-hidden bg-white/10">
                <Avatar src={user?.profile_picture} name={user?.name} size="xl" className="w-full h-full" />
              </div>
              <span className="absolute -bottom-1.5 -right-1.5 w-7 h-7 bg-white rounded-2xl flex items-center justify-center shadow-lg">
                <BadgeCheck className="w-4.5 h-4.5 text-emerald-500" />
              </span>
            </div>
            <div className="text-white min-w-0">
              <h2 className="text-2xl font-black leading-tight truncate tracking-tight">{user?.name}</h2>
              <p className="text-sm text-white/70 mt-1 truncate flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5" />
                {user?.email}
              </p>
              <div className="flex items-center gap-1.5 mt-3">
                <span className="inline-flex items-center gap-1.5 text-[11px] font-black text-white uppercase tracking-widest bg-white/15 backdrop-blur-sm px-3 py-1 rounded-full ring-1 ring-white/20">
                  <Shield className="w-3 h-3" />
                  {user?.role}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick stats strip */}
        <div className="relative flex gap-2.5 mt-7 flex-wrap">
          <StatTile icon={Fingerprint} label="Account ID" value={user?.id || "—"} />
          <StatTile icon={Building2} label="Department" value={user?.department || "Computer Science"} />
          <StatTile icon={Bell} label="Alerts" value={pushEnabled ? "Enabled" : "Muted"} />
        </div>
      </div>

      {/* Profile Edit Section */}
      <GlassCard>
        <SectionHeading eyebrow="Identity" title="Profile Information" icon={User} />
        <div className="p-7 pt-5 space-y-5">
          <div>
            <FieldLabel>Display Name</FieldLabel>
            <div className="relative group">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3.5 text-sm font-medium rounded-2xl border-2 border-gray-100 bg-gray-50/60 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-4 focus:ring-[#F05A2B]/10 focus:border-[#F05A2B] transition-all"
                placeholder="Enter your name"
              />
              {dirty && (
                <span className="absolute right-4 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-[#F05A2B] animate-pulse" />
              )}
            </div>
          </div>

          <div>
            <FieldLabel>Email Address</FieldLabel>
            <div className="flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-gray-50/60 border-2 border-gray-100">
              <Lock className="w-4 h-4 text-gray-400 shrink-0" />
              <span className="text-sm font-medium text-gray-600 truncate">{user?.email}</span>
              <span className="ml-auto shrink-0 text-[10px] font-extrabold text-gray-400 uppercase bg-gray-100 px-2.5 py-1 rounded-full tracking-wider">
                Read-only
              </span>
            </div>
          </div>

          <div className="pt-1">
            {saveSuccess ? (
              <div className="flex items-center gap-2.5 px-5 py-3.5 rounded-2xl bg-emerald-50 border-2 border-emerald-100 text-emerald-600 text-sm font-bold">
                <CheckCircle2 className="w-4.5 h-4.5" />
                Profile saved — refreshing your session...
              </div>
            ) : (
              <button
                onClick={handleSaveProfile}
                disabled={updateProfileMutation.isPending || !dirty}
                className="group w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#F05A2B] to-[#FF7A45] hover:brightness-110 text-white text-sm font-black transition-all shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none flex items-center justify-center gap-2"
              >
                {updateProfileMutation.isPending ? (
                  <>
                    <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    Saving Changes...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 transition-transform group-hover:rotate-12" />
                    Save Profile Changes
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </GlassCard>

      {/* Preferences Section */}
      <GlassCard>
        <SectionHeading eyebrow="Preferences" title="Notifications" icon={Bell} />
        <div className="px-7 pb-2">
          <PreferenceRow
            icon={Smartphone}
            title="Push Notifications"
            description="Receive real-time alerts on your device"
            control={<Switch checked={pushEnabled} onChange={togglePush} loading={updatePushMutation.isPending} />}
            last
          />
        </div>
      </GlassCard>

      {/* Account Info */}
      <GlassCard>
        <SectionHeading eyebrow="Overview" title="Account Information" icon={Info} />
        <div className="px-7 pb-6 pt-3">
          {[
            { label: "Role", value: user?.role, icon: Shield },
            { label: "Account ID", value: user?.id || "—", icon: Fingerprint },
            { label: "Department", value: user?.department || "Computer Science", icon: Building2 },
          ].map((item, i, arr) => (
            <div
              key={item.label}
              className={`flex items-center justify-between py-3.5 ${i !== arr.length - 1 ? "border-b border-gray-50" : ""}`}
            >
              <span className="flex items-center gap-2.5 text-xs font-bold text-gray-400 uppercase tracking-wider">
                <item.icon className="w-3.5 h-3.5" />
                {item.label}
              </span>
              <span className="text-sm font-black text-gray-800">{item.value}</span>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* Danger Zone */}
      <div className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-red-50 via-white to-white border-2 border-red-100 shadow-sm">
        <div className="flex items-center gap-3 px-7 pt-6 pb-1">
          <div className="w-9 h-9 rounded-2xl flex items-center justify-center bg-red-100 text-red-600 shrink-0">
            <TriangleAlert className="w-4 h-4" strokeWidth={2.5} />
          </div>
          <div>
            <div className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-red-500">Careful</div>
            <h2 className="text-base font-black text-red-700 tracking-tight">Danger Zone</h2>
          </div>
        </div>
        <div className="p-7 pt-4">
          <p className="text-sm text-gray-500 mb-5">
            Once you log out, you'll need to sign in again with your Google account to access the dashboard.
          </p>
          {confirmingLogout ? (
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-sm font-bold text-red-600">Are you sure?</span>
              <button
                onClick={logout}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-black shadow-lg shadow-red-600/25 transition-all"
              >
                <LogOut className="w-4 h-4" />
                Yes, sign me out
              </button>
              <button
                onClick={() => setConfirmingLogout(false)}
                className="px-5 py-2.5 rounded-xl text-gray-500 hover:bg-gray-100 text-sm font-bold transition-all"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmingLogout(true)}
              className="group inline-flex items-center gap-2.5 px-5 py-3 rounded-2xl bg-white hover:bg-red-50 text-red-600 text-sm font-black border-2 border-red-100 hover:border-red-200 shadow-sm transition-all"
            >
              <LogOut className="w-4 h-4" />
              Sign out of Account
              <ArrowUpRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          )}
        </div>
      </div>

    </div>
  );
}
