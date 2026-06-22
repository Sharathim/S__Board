import { NavLink } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useNotificationContext } from "../../context/NotificationContext";
import {
  LayoutDashboard, Users, GraduationCap, MessageSquare, FolderKanban,
  Newspaper, Settings, HelpCircle, X, ChevronLeft
} from "lucide-react";
import clsx from "clsx";

const allNavItems = [
  { to: "/dashboard", label: "Dashboard",      icon: LayoutDashboard, roles: ["HOD"]          },
  { to: "/faculty",   label: "Faculty",         icon: Users,           roles: ["HOD", "FACULTY"] },
  { to: "/classes",   label: "Classes",         icon: GraduationCap,   roles: ["HOD", "FACULTY", "STUDENT"] },
  { to: "/forum",     label: "Forum Members",   icon: MessageSquare,   roles: ["HOD", "FACULTY", "STUDENT"] },
  { to: "/projects",  label: "Projects",        icon: FolderKanban,    roles: ["HOD", "FACULTY", "STUDENT"] },
  { to: "/updates",   label: "Updates",         icon: Newspaper,       roles: ["HOD", "FACULTY", "STUDENT"] },
  { to: "/settings",  label: "Settings",        icon: Settings,        roles: ["HOD", "FACULTY", "STUDENT"] },
];

export function Sidebar({ open, onClose, collapsed, onToggle }) {
  const { unreadCount } = useNotificationContext();
  const { user } = useAuth();

  // Filter nav items based on user role
  const navItems = allNavItems.filter(item =>
    !item.roles || item.roles.includes(user?.role)
  );

  return (
    <>
      {open && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={onClose} />
      )}
      <aside
        className={clsx(
          "fixed lg:static inset-y-0 left-0 z-50 flex flex-col bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 transition-all duration-300",
          collapsed ? "w-16" : "w-64",
          open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* ── Header / Logo ── */}
        <div className="flex items-center h-16 px-3 border-b border-gray-200 dark:border-gray-800">
          {collapsed ? (
            /* Collapsed: icon-only logo, centered */
            <div className="flex items-center justify-center w-full">
              <img
                src="/logo-icon.png"
                alt="DPMS"
                className="w-9 h-9 object-contain"
              />
            </div>
          ) : (
            /* Expanded: full logo + control buttons */
            <div className="flex items-center w-full gap-2 min-w-0">
              {/* Full brand logo */}
              <img
                src="/logo-full.png"
                alt="DPMS — Department Project Management System"
                className="h-9 w-auto object-contain max-w-[148px] shrink-0"
              />

              {/* Controls pushed to the right */}
              <div className="flex items-center gap-1 ml-auto shrink-0">
                {/* Desktop collapse toggle */}
                <button
                  onClick={onToggle}
                  className="hidden lg:flex p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-600 transition-all duration-150"
                  title="Collapse sidebar"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                {/* Mobile close */}
                <button
                  onClick={onClose}
                  className="flex lg:hidden p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-600 transition-all duration-150"
                  title="Close menu"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── Navigation ── */}
        <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
          {navItems.map(item => {
            const Icon = item.icon;
            const showBadge = item.badge && unreadCount > 0;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={onClose}
                className={({ isActive }) => clsx(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150",
                  isActive
                    ? "bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-sm"
                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200",
                  collapsed && "lg:justify-center lg:px-2"
                )}
              >
                <div className="relative shrink-0">
                  <Icon className="w-5 h-5" />
                  {showBadge && (
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white dark:border-gray-900" />
                  )}
                </div>
                {!collapsed && (
                  <span className="flex-1 truncate">{item.label}</span>
                )}
                {!collapsed && showBadge && (
                  <span className="bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5 min-w-[20px] text-center shrink-0">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* ── Footer help block ── */}
        {!collapsed && (
          <div className="p-4 border-t border-gray-200 dark:border-gray-800">
            <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
              <HelpCircle className="w-5 h-5 text-primary-600 mb-2" />
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">Need help?</p>
              <a href="mailto:support@dpms.com" className="text-xs text-primary-600 hover:underline">
                Contact Support
              </a>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
