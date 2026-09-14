import { useNavigate } from "react-router-dom";
import {
  GraduationCap, BookOpen, Settings, Bell,
  LogOut, Monitor, ChevronRight, Sparkles, Megaphone, FileText, CalendarClock, Briefcase
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useNotificationContext } from "../../context/NotificationContext";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import BottomSheet from "./BottomSheet";
import { useState } from "react";

const getMoreItemsForRole = (user) => {
  const role = user?.role;
  const isIncharge = Boolean(user?.faculty_profile?.class_incharge_of);

  if (role === "HOD") {
    return [
      { icon: Briefcase, label: "Placement AI", to: "/placement" },
      { icon: CalendarClock, label: "Leave & Permission", to: "/leave" },
      { icon: FileText, label: "Notes & Docs", to: "/notes" },
      { icon: Megaphone, label: "Updates", to: "/updates" },
      { icon: Settings, label: "Settings", to: "/settings" },
    ];
  } else if (role === "FACULTY") {
    const items = [];
    if (isIncharge) {
      items.push({ icon: Briefcase, label: "Placement AI", to: "/placement" });
    }
    items.push({ icon: CalendarClock, label: "Leave & Permission", to: "/leave" });
    items.push({ icon: Megaphone, label: "Updates", to: "/updates" });
    items.push({ icon: Settings, label: "Settings", to: "/settings" });
    return items;
  } else {
    // STUDENT
    return [
      { icon: Briefcase, label: "Placement AI", to: "/placement" },
      { icon: Megaphone, label: "Updates", to: "/updates" },
      { icon: Settings, label: "Settings", to: "/settings" },
    ];
  }
};

export default function MoreSheet({ open, onClose }) {
  const { user, logout } = useAuth();
  const { unreadCount } = useNotificationContext();
  const navigate = useNavigate();
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);

  const filteredItems = getMoreItemsForRole(user);

  const handleNav = (to) => {
    onClose();
    navigate(to);
  };

  const roleColors = {
    HOD: { from: "#7C3AED", to: "#5B21B6", light: "#EDE9FE", text: "#6D28D9" },
    FACULTY: { from: "#3B82F6", to: "#1D4ED8", light: "#DBEAFE", text: "#1D4ED8" },
    STUDENT: { from: "#10B981", to: "#059669", light: "#D1FAE5", text: "#059669" },
  };
  const rc = roleColors[user?.role] || roleColors.HOD;

  return (
    <>
      <BottomSheet open={open} onClose={onClose} title="More">
        {/* Profile card */}
        <div className="flex items-center gap-3 p-3 rounded-2xl bg-gray-50 border border-gray-100 mb-4">
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
            <p className="text-sm font-bold text-gray-900 truncate">{user?.name}</p>
            <p className="text-xs text-gray-400 truncate">{user?.email}</p>
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
                className="mobile-tappable w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-gray-50 transition-colors"
              >
                <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-gray-100 text-gray-500 shrink-0">
                  <Icon className="w-4.5 h-4.5" />
                </div>
                <span className="flex-1 text-left text-sm font-semibold text-gray-700">
                  {item.label}
                </span>
                {showBadge && (
                  <span className="min-w-[20px] h-5 rounded-full flex items-center justify-center text-white font-bold text-[10px] px-1.5 bg-rose-500">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
                <ChevronRight className="w-4 h-4 text-gray-300"/>
              </button>
            );
          })}
        </div>

        {/* Divider */}
        <div className="h-px bg-gray-100 my-2"/>





        {/* Sign Out */}
        <button
          onClick={() => { onClose(); setTimeout(() => setLogoutConfirmOpen(true), 300); }}
          className="mobile-tappable w-full flex items-center gap-3 px-3 py-3 rounded-xl text-red-600 hover:bg-red-50 transition-colors"
        >
          <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-red-50 text-red-500 shrink-0">
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
