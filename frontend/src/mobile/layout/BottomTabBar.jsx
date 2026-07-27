import { useLocation, NavLink } from "react-router-dom";
import { LayoutDashboard, FolderKanban, GraduationCap, BookOpen, Megaphone, Menu, FileText } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useNotificationContext } from "../../context/NotificationContext";
import { useState } from "react";
import MoreSheet from "./MoreSheet";

const getTabItemsForRole = (role) => {
  if (role === "HOD") {
    return [
      { to: "/dashboard", icon: LayoutDashboard, label: "Home" },
      { to: "/projects", icon: FolderKanban, label: "Projects" },
      { to: "/notes", icon: FileText, label: "Notes" },
      { to: "/classes", icon: BookOpen, label: "Classes" },
    ];
  } else if (role === "FACULTY") {
    return [
      { to: "/projects", icon: FolderKanban, label: "Projects" },
      { to: "/notes", icon: FileText, label: "Notes" },
      { to: "/classes", icon: BookOpen, label: "Classes" },
      { to: "/updates", icon: Megaphone, label: "Updates" },
    ];
  } else {
    // STUDENT
    return [
      { to: "/projects", icon: FolderKanban, label: "Projects" },
      { to: "/notes", icon: FileText, label: "Notes" },
      { to: "/classes", icon: BookOpen, label: "Classes" },
      { to: "/updates", icon: Megaphone, label: "Updates" },
    ];
  }
};

export default function BottomTabBar() {
  const { user } = useAuth();
  const { unreadCount } = useNotificationContext();
  const location = useLocation();

  const [isMoreOpen, setIsMoreOpen] = useState(false);

  const filteredTabs = getTabItemsForRole(user?.role);

  // For non-HOD users who don't see Dashboard, default first route
  const isActive = (to) => location.pathname === to || location.pathname.startsWith(to + "/");

  return (
    <>
      <nav
        className="fixed bottom-0 left-0 right-0 z-40 bg-[#FFFFFF] dark:bg-[#000000] shrink-0 select-none"
        style={{
          height: `calc(60px + env(safe-area-inset-bottom, 0px))`,
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
        }}
      >
        <div className="flex items-center justify-around h-[60px] px-2">
          {filteredTabs.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.to);
            const showBadge = item.badge && unreadCount > 0;

            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={`mobile-tappable flex flex-col items-center justify-center gap-0.5 py-1 px-3 min-h-[44px] min-w-[44px] rounded-xl transition-all relative ${
                  active ? "mobile-tab-active" : ""
                }`}
              >
                <div className="relative">
                  <Icon
                    className={`w-5 h-5 transition-colors ${
                      active
                        ? "text-primary-600 dark:text-primary-400"
                        : "text-gray-400 dark:text-gray-500"
                    }`}
                  />
                  {showBadge && (
                    <span className="absolute -top-1 -right-2 min-w-[16px] h-4 rounded-full flex items-center justify-center text-white font-bold bg-rose-500 text-[9px] px-1">
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                  )}
                </div>
                <span
                  className={`text-[10px] font-semibold tracking-tight transition-colors ${
                    active
                      ? "text-primary-600 dark:text-primary-400"
                      : "text-gray-400 dark:text-gray-500"
                  }`}
                >
                  {item.label}
                </span>
              </NavLink>
            );
          })}

          {/* More tab button */}
          <button
            onClick={() => setIsMoreOpen(true)}
            className={`mobile-tappable flex flex-col items-center justify-center gap-0.5 py-1 px-3 min-h-[44px] min-w-[44px] rounded-xl transition-all relative ${
              isMoreOpen ? "mobile-tab-active" : ""
            }`}
          >
            <Menu
              className={`w-5 h-5 transition-colors ${
                isMoreOpen
                  ? "text-primary-600 dark:text-primary-400"
                  : "text-gray-400 dark:text-gray-500"
              }`}
            />
            <span
              className={`text-[10px] font-semibold tracking-tight transition-colors ${
                isMoreOpen
                  ? "text-primary-600 dark:text-primary-400"
                  : "text-gray-400 dark:text-gray-500"
              }`}
            >
              More
            </span>
          </button>
        </div>
      </nav>
      <MoreSheet open={isMoreOpen} onClose={() => setIsMoreOpen(false)} />
    </>
  );
}
