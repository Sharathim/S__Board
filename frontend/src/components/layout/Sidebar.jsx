import { NavLink } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useNotificationContext } from "../../context/NotificationContext";
import {
  LayoutDashboard, FolderKanban, Users, GraduationCap,
  MessageSquare, Megaphone, Settings,
  X, BookOpen, ChevronRight, PanelLeftClose, LogOut,
  Sparkles, Shield, Bell
} from "lucide-react";
import clsx from "clsx";

const allNavItems = [
  {
    to: "/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    roles: ["HOD", "FACULTY", "STUDENT"],
    color: "from-violet-500 to-purple-600",
    glow: "shadow-violet-500/30",
  },
  {
    to: "/projects",
    label: "Projects",
    icon: FolderKanban,
    roles: ["HOD", "FACULTY", "STUDENT"],
    color: "from-blue-500 to-indigo-600",
    glow: "shadow-blue-500/30",
  },
  {
    to: "/classes",
    label: "Students",
    icon: Users,
    roles: ["STUDENT"],
    color: "from-emerald-500 to-teal-600",
    glow: "shadow-emerald-500/30",
  },
  {
    to: "/faculty",
    label: "Faculty",
    icon: GraduationCap,
    roles: ["HOD", "FACULTY"],
    color: "from-orange-500 to-amber-600",
    glow: "shadow-orange-500/30",
  },
  {
    to: "/classes",
    label: "Classes",
    icon: BookOpen,
    roles: ["HOD", "FACULTY"],
    color: "from-cyan-500 to-sky-600",
    glow: "shadow-cyan-500/30",
  },
  {
    to: "/forum",
    label: "Forum",
    icon: MessageSquare,
    roles: ["HOD", "FACULTY", "STUDENT"],
    color: "from-rose-500 to-pink-600",
    glow: "shadow-rose-500/30",
  },
  {
    to: "/updates",
    label: "Announcements",
    icon: Megaphone,
    roles: ["HOD", "FACULTY", "STUDENT"],
    color: "from-yellow-500 to-orange-500",
    glow: "shadow-yellow-500/30",
  },
  {
    to: "/settings",
    label: "Settings",
    icon: Settings,
    roles: ["HOD", "FACULTY", "STUDENT"],
    color: "from-slate-500 to-gray-600",
    glow: "shadow-slate-500/30",
  },
];

function getRoleLabel(role) {
  const map = { HOD: "Administrator", FACULTY: "Faculty Member", STUDENT: "Student" };
  return map[role] || role;
}

function getRoleColor(role) {
  const map = {
    HOD: "from-violet-500 to-purple-600",
    FACULTY: "from-blue-500 to-indigo-600",
    STUDENT: "from-emerald-500 to-teal-600",
  };
  return map[role] || "from-gray-500 to-gray-600";
}

function getInitials(name) {
  if (!name) return "?";
  const parts = name.trim().split(" ");
  return parts.length >= 2
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : parts[0][0].toUpperCase();
}

export function Sidebar({ open, onClose, isCollapsed, onToggleCollapse }) {
  const { unreadCount } = useNotificationContext();
  const { user, logout } = useAuth();

  const navItems = allNavItems.filter(item =>
    !item.roles || item.roles.includes(user?.role)
  );

  const seen = new Set();
  const uniqueNavItems = navItems.filter(item => {
    const key = `${item.label}-${item.to}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-md"
          onClick={onClose}
        />
      )}

      <aside
        className={clsx(
          "fixed inset-y-0 left-0 z-50 flex flex-col transition-transform duration-300 ease-in-out lg:z-30 lg:translate-y-0 lg:static lg:translate-x-0 lg:transition-all lg:duration-300 lg:ease-in-out bg-white dark:bg-slate-900 border-r border-slate-100 dark:border-slate-800/80 p-4",
          open ? "translate-x-0" : "-translate-x-full",
          isCollapsed ? "lg:w-[72px]" : "lg:w-[260px]",
          "w-[260px] h-screen lg:h-[calc(100vh-72px)] flex flex-col justify-between"
        )}
      >
        {/* ── Logo / Brand (Mobile Only) ── */}
        <div className="flex items-center h-16 flex-shrink-0 gap-3 px-4 lg:hidden border-b border-slate-100 dark:border-slate-800/80">
          <div className="relative">
            <img src="/logo-icon.png" alt="Hive" className="w-8 h-8 object-contain flex-shrink-0" />
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-base font-semibold tracking-tight leading-none block text-slate-900 dark:text-white">
              Hive
            </span>
          </div>
          <button
            onClick={onClose}
            className="ml-auto p-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-400 dark:text-slate-500 transition-all duration-150"
            title="Close"
          >
            <X className="w-[18px] h-[18px]" />
          </button>
        </div>

        {/* ── Navigation Menu Links ── */}
        <nav className={clsx(
          "flex-1 overflow-y-auto py-4 space-y-1",
          isCollapsed ? "px-0" : "px-0"
        )}>
          {uniqueNavItems.map(item => {
            const Icon = item.icon;
            const showBadge = item.to === "/forum" && unreadCount > 0;

            return (
              <NavLink
                key={item.label}
                to={item.to}
                end={item.exact}
                onClick={onClose}
                className={({ isActive }) =>
                  clsx(
                    "group relative flex items-center rounded-xl text-[14px] font-medium transition-all duration-150",
                    isCollapsed
                      ? "justify-center p-2.5 mx-0"
                      : "gap-3 px-4 py-3",
                    isActive
                      ? "bg-indigo-600 text-white"
                      : "bg-transparent text-slate-500 dark:text-slate-400 hover:text-indigo-600 hover:bg-slate-50/50 dark:hover:bg-slate-800/40"
                  )
                }
                title={isCollapsed ? item.label : undefined}
              >
                {({ isActive }) => (
                  <>
                    {/* Icon vector */}
                    <Icon
                      className={clsx(
                        "flex-shrink-0 transition-colors duration-150",
                        isCollapsed ? "w-5 h-5" : "w-5 h-5",
                        isActive
                          ? "text-white"
                          : "text-slate-500 dark:text-slate-400 group-hover:text-indigo-600"
                      )}
                    />

                    {/* Label */}
                    {!isCollapsed && (
                      <span className="flex-1 truncate">
                        {item.label}
                      </span>
                    )}

                    {/* Badge */}
                    {showBadge && (
                      isCollapsed ? (
                        <span
                          className="absolute top-1 right-1 w-2 h-2 rounded-full bg-rose-500 border border-white dark:border-slate-900 animate-pulse"
                        />
                      ) : (
                        <span className={clsx(
                          "text-[10px] font-black rounded-full px-1.5 py-0.5 min-w-[20px] text-center leading-none",
                          isActive ? "bg-white text-indigo-600" : "bg-rose-500 text-white shadow-sm"
                        )}>
                          {unreadCount > 99 ? "99+" : unreadCount}
                        </span>
                      )
                    )}

                    {/* Collapsed tooltip */}
                    {isCollapsed && (
                      <div className="absolute left-full ml-3 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-semibold opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-150 whitespace-nowrap z-50 shadow-xl border border-slate-100 dark:border-slate-700">
                        {item.label}
                        <span className="absolute top-1/2 -translate-y-1/2 -left-1.5 w-2 h-2 rotate-45 bg-white dark:bg-slate-800 border-l border-b border-slate-100 dark:border-slate-700" />
                      </div>
                    )}
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* ── User Profile & Sign Out Module ── */}
        <div className="flex-shrink-0 pt-4 border-t border-slate-100 dark:border-slate-800/80">
          {isCollapsed ? (
            <button
              onClick={logout}
              className="w-full flex items-center justify-center p-2.5 rounded-xl text-slate-400 dark:text-slate-500 hover:text-rose-500 hover:bg-rose-50/50 dark:hover:bg-rose-950/20 transition-all duration-150 active:scale-95 group relative"
              title="Log Out"
            >
              <LogOut className="w-5 h-5" />
              <div className="absolute left-full ml-3 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-semibold opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-150 whitespace-nowrap z-50 shadow-xl border border-slate-100 dark:border-slate-700">
                Log Out
                <span className="absolute top-1/2 -translate-y-1/2 -left-1.5 w-2 h-2 rotate-45 bg-white dark:bg-slate-800 border-l border-b border-slate-100 dark:border-slate-700" />
              </div>
            </button>
          ) : (
            <div className="flex flex-col gap-4 p-2 cursor-default">
              {/* User info row */}
              <div className="flex items-center gap-3">
                {/* Avatar (circular, borderless, bg-gradient as fallback) */}
                <div className="relative shrink-0">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white overflow-hidden bg-gradient-to-br from-indigo-500 to-purple-600">
                    {user?.profile_picture ? (
                      <img src={user.profile_picture} alt={user?.name} className="w-full h-full object-cover" />
                    ) : (
                      getInitials(user?.name)
                    )}
                  </div>
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-white dark:border-slate-900" />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold truncate text-slate-800 dark:text-slate-200">{user?.name || "User"}</p>
                  <p className="text-xs font-medium truncate text-slate-400 dark:text-slate-500 mt-0.5">{getRoleLabel(user?.role)}</p>
                </div>
              </div>

              {/* Sign Out row / button */}
              <button
                onClick={logout}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-rose-500 hover:bg-rose-50/50 dark:hover:bg-rose-950/20 transition-all duration-150 active:scale-95"
              >
                <LogOut className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                Sign Out
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
