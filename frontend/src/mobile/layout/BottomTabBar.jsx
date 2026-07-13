import { useLocation, NavLink } from "react-router-dom";
import { LayoutDashboard, FolderKanban, BookOpen, GraduationCap, Menu } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useNotificationContext } from "../../context/NotificationContext";
import { useState, useEffect, useRef } from "react";
import MoreSheet from "./MoreSheet";

const TAB_ITEMS = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Home", roles: ["HOD"] },
  { to: "/projects", icon: FolderKanban, label: "Projects", roles: ["HOD", "FACULTY", "STUDENT"] },
  { to: "/classes", icon: BookOpen, label: "Classes", roles: ["HOD", "FACULTY", "STUDENT"] },
  { to: "/faculty", icon: GraduationCap, label: "Faculty", roles: ["HOD", "FACULTY", "STUDENT"] },
];

export default function BottomTabBar() {
  const { user } = useAuth();
  const { unreadCount } = useNotificationContext();
  const location = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);

  const [visible, setVisible] = useState(true);
  const lastScrollY = useRef(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      // If close to top (scrollY < 10), always show
      if (currentScrollY < 10) {
        setVisible(true);
      } else if (currentScrollY > lastScrollY.current) {
        // Scrolling down
        setVisible(false);
      } else {
        // Scrolling up
        setVisible(true);
      }
      
      lastScrollY.current = currentScrollY;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const filteredTabs = TAB_ITEMS.filter(
    (item) => !item.roles || item.roles.includes(user?.role)
  );

  // For non-HOD users who don't see Dashboard, default first route
  const isActive = (to) => location.pathname === to || location.pathname.startsWith(to + "/");

  return (
    <>
      <nav
        className="fixed bottom-0 left-0 right-0 z-[100] mobile-glass border-t transition-transform duration-300 ease-in-out"
        style={{
          height: `calc(60px + env(safe-area-inset-bottom, 0px))`,
          borderRadius: "20px 20px 0 0",
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
          transform: visible ? "translateY(0)" : "translateY(100%)",
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
                className={`mobile-tappable flex flex-col items-center justify-center gap-0.5 py-1 px-3 rounded-xl transition-all relative ${
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
                  className={`text-[10px] font-semibold transition-colors ${
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

          {/* More tab */}
          <button
            onClick={() => setMoreOpen(true)}
            className="mobile-tappable flex flex-col items-center justify-center gap-0.5 py-1 px-3 rounded-xl transition-all"
          >
            <Menu className="w-5 h-5 text-gray-400 dark:text-gray-500" />
            <span className="text-[10px] font-semibold text-gray-400 dark:text-gray-500">
              More
            </span>
          </button>
        </div>
      </nav>

      <MoreSheet open={moreOpen} onClose={() => setMoreOpen(false)} />
    </>
  );
}
