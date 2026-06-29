import { useLocation, useNavigate } from "react-router-dom";
import { ChevronLeft, Bell } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useNotificationContext } from "../../context/NotificationContext";
import { useState } from "react";
import MoreSheet from "./MoreSheet";

const ROUTE_TITLES = {
  "/dashboard": "Dashboard",
  "/projects": "Projects",
  "/faculty": "Faculty",
  "/classes": "Classes",
  "/forum": "Forum",
  "/updates": "Updates",
  "/notifications": "Notifications",
  "/settings": "Settings",
};

// Routes that show back button instead of logo
const DETAIL_PATTERNS = ["/projects/", "/classes/"];

function getRoleColor(role) {
  const map = {
    HOD: { from: "#7C3AED", to: "#5B21B6" },
    FACULTY: { from: "#3B82F6", to: "#1D4ED8" },
    STUDENT: { from: "#10B981", to: "#059669" },
  };
  return map[role] || map.HOD;
}

export default function MobileTopBar({ title: titleProp }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { unreadCount } = useNotificationContext();
  const [moreOpen, setMoreOpen] = useState(false);

  const isDetail = DETAIL_PATTERNS.some((p) => location.pathname.startsWith(p) && location.pathname !== p.slice(0, -1));
  const rc = getRoleColor(user?.role);

  // Determine title
  let pageTitle = titleProp || ROUTE_TITLES[location.pathname] || "";
  if (!pageTitle && location.pathname.startsWith("/projects/")) pageTitle = "Project";
  if (!pageTitle && location.pathname.startsWith("/classes/")) pageTitle = "Class";

  return (
    <>
      <header
        className="fixed top-0 left-0 right-0 z-[100] mobile-glass border-b flex items-center justify-between px-4"
        style={{ height: "56px", paddingTop: "env(safe-area-inset-top, 0px)" }}
      >
        {/* Left */}
        <div className="flex items-center gap-2 min-w-0">
          {isDetail ? (
            <button
              onClick={() => navigate(-1)}
              className="mobile-tappable w-9 h-9 rounded-xl flex items-center justify-center hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
            </button>
          ) : (
            <img
              src="/logo-icon.png"
              alt="Hive"
              className="w-7 h-7 object-contain shrink-0"
            />
          )}
        </div>

        {/* Center title */}
        <h1 className="text-base font-bold text-gray-900 dark:text-white tracking-tight truncate absolute left-1/2 -translate-x-1/2 max-w-[50%] text-center">
          {pageTitle}
        </h1>

        {/* Right */}
        <div className="flex items-center gap-1">
          {/* Bell */}
          <button
            onClick={() => navigate("/notifications")}
            className="mobile-tappable relative w-9 h-9 rounded-xl flex items-center justify-center hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
          >
            <Bell className={`w-5 h-5 text-gray-500 dark:text-gray-400 ${unreadCount > 0 ? "animate-[wiggle_1s_ease-in-out_infinite]" : ""}`} />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 min-w-[14px] h-3.5 rounded-full flex items-center justify-center text-white font-bold bg-rose-500 text-[8px] px-0.5">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </button>

          {/* Avatar */}
          <button
            onClick={() => setMoreOpen(true)}
            className="mobile-tappable w-8 h-8 rounded-xl overflow-hidden shrink-0"
          >
            {user?.profile_picture ? (
              <img src={user.profile_picture} alt={user?.name} className="w-full h-full object-cover" />
            ) : (
              <div
                className="w-full h-full flex items-center justify-center text-xs font-bold text-white"
                style={{ background: `linear-gradient(135deg, ${rc.from}, ${rc.to})` }}
              >
                {(user?.name || "?").charAt(0).toUpperCase()}
              </div>
            )}
          </button>
        </div>
      </header>

      <MoreSheet open={moreOpen} onClose={() => setMoreOpen(false)} />
    </>
  );
}
