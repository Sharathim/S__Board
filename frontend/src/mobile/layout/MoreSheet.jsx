import { useNavigate } from "react-router-dom";
import {
  GraduationCap, BookOpen, Settings, Bell, Sun, Moon,
  LogOut, Monitor, ChevronRight, Sparkles
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../hooks/useTheme";
import { useNotificationContext } from "../../context/NotificationContext";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import BottomSheet from "./BottomSheet";
import { useState } from "react";

const MORE_ITEMS = [
  { icon: GraduationCap, label: "Faculty", to: "/faculty", roles: ["HOD", "FACULTY", "STUDENT"] },
  { icon: BookOpen, label: "Classes", to: "/classes", roles: ["HOD", "FACULTY", "STUDENT"] },
  { icon: Bell, label: "Notifications", to: "/notifications", roles: ["HOD", "FACULTY", "STUDENT"] },
  { icon: Settings, label: "Settings", to: "/settings", roles: ["HOD", "FACULTY", "STUDENT"] },
];

export default function MoreSheet({ open, onClose }) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { unreadCount } = useNotificationContext();
  const navigate = useNavigate();
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);

  const filteredItems = MORE_ITEMS.filter(
    (item) => !item.roles || item.roles.includes(user?.role)
  );

  const handleNav = (to) => {
    onClose();
    navigate(to);
  };

  const roleColors = {
    HOD: { from: "#F4B315", to: "#8E5915", light: "rgba(244, 179, 21, 0.1)", text: "#8E5915" },
    FACULTY: { from: "#E59312", to: "#8E5915", light: "rgba(229, 147, 18, 0.1)", text: "#8E5915" },
    STUDENT: { from: "#D3AF85", to: "#8E5915", light: "rgba(211, 175, 133, 0.1)", text: "#8E5915" },
  };
  const rc = roleColors[user?.role] || roleColors.HOD;

  return (
    <>
      <BottomSheet open={open} onClose={onClose} title="More">
        {/* Profile card */}
        <div className="flex items-center gap-3 p-3 rounded-2xl bg-gray-50 dark:bg-slate-800/60 border border-gray-100 dark:border-slate-700/50 mb-4">
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center text-sm font-bold text-white shadow-md overflow-hidden shrink-0"
            style={{ background: `linear-gradient(135deg, ${rc.from}, ${rc.to})` }}
          >
            {user?.profile_picture ? (
              <img src={user.profile_picture} alt={user?.name} className="w-full h-full object-cover" />
            ) : (
              (user?.name || "?").charAt(0).toUpperCase()
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{user?.name}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{user?.email}</p>
            <span
              className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md mt-1"
              style={{ background: rc.light, color: rc.text }}
            >
              <Sparkles className="w-2.5 h-2.5" />
              {user?.role === "HOD" ? "Administrator" : user?.role === "FACULTY" ? "Faculty" : "Student"}
            </span>
          </div>
        </div>

        {/* Nav items */}
        <div className="space-y-1 mb-4">
          {filteredItems.map((item) => {
            const Icon = item.icon;
            const showBadge = item.label === "Notifications" && unreadCount > 0;
            return (
              <button
                key={item.to}
                onClick={() => handleNav(item.to)}
                className="mobile-tappable w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors"
              >
                <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-gray-400 shrink-0">
                  <Icon className="w-4.5 h-4.5" />
                </div>
                <span className="flex-1 text-left text-sm font-semibold text-gray-700 dark:text-gray-200">
                  {item.label}
                </span>
                {showBadge && (
                  <span className="min-w-[20px] h-5 rounded-full flex items-center justify-center text-white font-bold text-[10px] px-1.5 bg-rose-500">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
                <ChevronRight className="w-4 h-4 text-gray-300 dark:text-gray-600" />
              </button>
            );
          })}
        </div>

        {/* Divider */}
        <div className="h-px bg-gray-100 dark:bg-slate-800 my-2" />





        {/* Sign Out */}
        <button
          onClick={() => { onClose(); setTimeout(() => setLogoutConfirmOpen(true), 300); }}
          className="mobile-tappable w-full flex items-center gap-3 px-3 py-3 rounded-xl text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
        >
          <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-red-50 dark:bg-red-950/30 text-red-500 dark:text-red-400 shrink-0">
            <LogOut className="w-4.5 h-4.5" />
          </div>
          <span className="flex-1 text-left text-sm font-bold">Sign Out</span>
        </button>
      </BottomSheet>

      <ConfirmDialog
        open={logoutConfirmOpen}
        onClose={() => setLogoutConfirmOpen(false)}
        onConfirm={() => { setLogoutConfirmOpen(false); logout(); }}
        title="Confirm Log Out"
        message="Are you sure you want to log out of your account?"
        confirmText="Log Out"
        danger
      />
    </>
  );
}
