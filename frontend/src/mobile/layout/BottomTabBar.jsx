import { useLocation, NavLink } from "react-router-dom";
import { LayoutDashboard, FolderKanban, GraduationCap, BookOpen, Megaphone, Menu, FileText } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useNotificationContext } from "../../context/NotificationContext";
import { useState } from "react";
import MoreSheet from "./MoreSheet";

const getTabItemsForRole = (role, studentClass) => {
  if (role === "HOD") {
    return [
      { to: "/dashboard", icon: LayoutDashboard, label: "Home" },
      { to: "/projects", icon: FolderKanban, label: "Projects" },
      { to: "/faculty", icon: GraduationCap, label: "Faculty" },
      { to: "/classes", icon: BookOpen, label: "Classes" },
    ];
  } else if (role === "FACULTY") {
    return [
      { to: "/projects", icon: FolderKanban, label: "Projects" },
      { to: "/faculty", icon: GraduationCap, label: "Faculty" },
      { to: "/classes", icon: BookOpen, label: "Classes" },
      { to: "/notes", icon: FileText, label: "Notes" },
    ];
  } else {
    // STUDENT
    return [
      { to: "/projects", icon: FolderKanban, label: "Projects" },
      { to: "/faculty", icon: GraduationCap, label: "Faculty" },
      { to: studentClass ? `/classes/${studentClass}` : "/classes", icon: BookOpen, label: "Classes" },
      { to: "/notes", icon: FileText, label: "Notes" },
    ];
  }
};

export default function BottomTabBar() {
  const { user } = useAuth();
  const { unreadCount } = useNotificationContext();
  const location = useLocation();

  const [isMoreOpen, setIsMoreOpen] = useState(false);

  const studentClass = user?.student_profile?.class_name;
  const filteredTabs = getTabItemsForRole(user?.role, studentClass);

  // For non-HOD users who don't see Dashboard, default first route
  const isActive = (to) => location.pathname === to || location.pathname.startsWith(to + "/");

  return (
    <>
      <nav
        className="fixed bottom-0 left-0 right-0 z-40 bg-[#FFFFFF] shrink-0 select-none"
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
                        ?"text-primary-600"
                        :"text-gray-400"
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
                      ?"text-primary-600"
                      :"text-gray-400"
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
                  ?"text-primary-600"
                  :"text-gray-400"
              }`}
            />
            <span
              className={`text-[10px] font-semibold tracking-tight transition-colors ${
                isMoreOpen
                  ?"text-primary-600"
                  :"text-gray-400"
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
