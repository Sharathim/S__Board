import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../hooks/useTheme";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Avatar } from "../../components/ui/Avatar";
import { PageHeader } from "../../components/ui/PageHeader";
import { Moon, Sun, Bell, LogOut, User, Shield } from "lucide-react";
import api from "../../api/axios";

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [name, setName] = useState(user?.name || "");
  const [pushEnabled, setPushEnabled] = useState(user?.push_enabled !== false);

  const updatePushMutation = useMutation({
    mutationFn: (enabled) => api.patch("/settings/push-notifications", { enabled }),
  });

  const updateProfileMutation = useMutation({
    mutationFn: (data) => api.patch("/settings/profile", data),
    onSuccess: () => window.location.reload(),
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

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <PageHeader title="Settings" subtitle="Manage your account and preferences" />

      {/* Profile */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 space-y-4">
        <div className="flex items-center gap-3 mb-4">
          <User className="w-5 h-5 text-gray-400" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Profile</h2>
        </div>
        <div className="flex items-center gap-4 mb-4">
          <Avatar src={user?.profile_picture} name={user?.name} size="xl" />
          <div>
            <p className="font-medium text-gray-900 dark:text-gray-100">{user?.name}</p>
            <p className="text-sm text-gray-500">{user?.email}</p>
            <div className="flex items-center gap-1 mt-1">
              <Shield className="w-3.5 h-3.5 text-primary-500" />
              <span className="text-xs text-primary-600 font-medium">{user?.role}</span>
            </div>
          </div>
        </div>
        <Input label="Display Name" value={name} onChange={e => setName(e.target.value)} />
        <Button onClick={handleSaveProfile} loading={updateProfileMutation.isPending} disabled={!name.trim() || name === user?.name}>
          Save Changes
        </Button>
      </div>

      {/* Preferences */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 space-y-6">
        <div className="flex items-center gap-3 mb-4">
          <Bell className="w-5 h-5 text-gray-400" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Preferences</h2>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              {theme === "dark" ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">Theme</span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">Switch between light and dark mode</p>
          </div>
          <button
            onClick={toggleTheme}
            className={`relative w-11 h-6 rounded-full transition-colors ${
              theme === "dark" ? "bg-primary-600" : "bg-gray-300"
            }`}
          >
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${
              theme === "dark" ? "translate-x-5" : ""
            }`} />
          </button>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4" />
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">Push Notifications</span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">Receive push notifications for important updates</p>
          </div>
          <button
            onClick={togglePush}
            className={`relative w-11 h-6 rounded-full transition-colors ${
              pushEnabled ? "bg-primary-600" : "bg-gray-300"
            }`}
          >
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${
              pushEnabled ? "translate-x-5" : ""
            }`} />
          </button>
        </div>
      </div>

      {/* Logout */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
        <Button variant="danger" onClick={logout} className="gap-2">
          <LogOut className="w-4 h-4" /> Logout
        </Button>
      </div>
    </div>
  );
}
