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
          "fixed inset-y-0 left-0 z-50 flex flex-col h-full border-r transition-transform duration-300 ease-in-out lg:z-30",
          "lg:static lg:translate-x-0 lg:transition-all lg:duration-300 lg:ease-in-out",
          open ? "translate-x-0" : "-translate-x-full",
          isCollapsed ? "lg:w-[72px]" : "lg:w-[260px]",
          "w-[260px]"
        )}
        style={{
          background: "var(--sidebar-bg)",
          borderColor: "var(--sidebar-border)",
        }}
      >
        <div className={clsx(
          "flex flex-col h-full flex-shrink-0 transition-all duration-300",
          isCollapsed ? "w-[72px]" : "w-[260px]"
        )}>

          {/* ── Logo / Brand ── */}
          <div
            className={clsx(
              "flex items-center h-16 flex-shrink-0 transition-all duration-300",
              isCollapsed ? "justify-center px-0" : "gap-3 px-5"
            )}
            style={{ borderBottom: "1px solid var(--border-light)" }}
          >
            {isCollapsed ? (
              <button
                onClick={onToggleCollapse}
                className="p-1 rounded-xl transition-all duration-150 active:scale-95 hover:bg-[var(--sidebar-hover)]"
                title="Expand sidebar"
              >
                <img src="/logo-icon.png" alt="DPMS" className="w-8 h-8 object-contain" />
              </button>
            ) : (
              <>
                <div className="relative">
                  <img src="/logo-icon.png" alt="DPMS" className="w-8 h-8 object-contain flex-shrink-0" />
                  <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-[var(--sidebar-bg)] shadow-sm" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-base font-black tracking-tight leading-none block" style={{ color: "var(--text-primary)" }}>
                    Hive
                  </span>
                  <span className="text-[10px] font-medium tracking-widest uppercase" style={{ color: "var(--text-muted)" }}>
                    Dept. Portal
                  </span>
                </div>
                <button
                  onClick={onToggleCollapse}
                  className="hidden lg:flex p-1.5 rounded-lg hover:bg-[var(--sidebar-hover)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all duration-150 active:scale-95"
                  title="Collapse sidebar"
                >
                  <PanelLeftClose className="w-[18px] h-[18px]" />
                </button>
                <button
                  onClick={onClose}
                  className="ml-auto p-1.5 rounded-lg lg:hidden hover:bg-[var(--sidebar-hover)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all duration-150"
                  title="Close"
                >
                  <X className="w-[18px] h-[18px]" />
                </button>
              </>
            )}
          </div>

          {/* ── Navigation ── */}
          <nav className={clsx(
            "flex-1 overflow-y-auto py-4 space-y-1",
            isCollapsed ? "px-2" : "px-3"
          )}>

            {/* Section label */}
            {!isCollapsed && (
              <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-[0.15em] px-3 pb-2 opacity-60">
                Navigation
              </p>
            )}

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
                      "group relative flex items-center rounded-xl text-sm font-medium transition-all duration-200",
                      isCollapsed
                        ? "justify-center p-2.5 mx-0"
                        : "gap-3 px-3 py-2.5",
                      isActive
                        ? "bg-[var(--sidebar-active-bg)] text-[var(--sidebar-active-fg)] shadow-sm"
                        : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--sidebar-hover)]"
                    )
                  }
                  title={isCollapsed ? item.label : undefined}
                >
                  {({ isActive }) => (
                    <>
                      {/* Active left indicator */}
                      {isActive && !isCollapsed && (
                        <span
                          className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full"
                          style={{ background: "var(--primary)" }}
                        />
                      )}

                      {/* Icon container */}
                      <div
                        className={clsx(
                          "flex items-center justify-center rounded-lg flex-shrink-0 transition-all duration-200",
                          isCollapsed ? "w-9 h-9" : "w-8 h-8",
                          isActive
                            ? `bg-gradient-to-br ${item.color} shadow-lg ${item.glow} text-white`
                            : "bg-[var(--surface-secondary)] text-[var(--text-secondary)] group-hover:bg-[var(--sidebar-hover)] group-hover:text-[var(--text-primary)]"
                        )}
                      >
                        <Icon className={isCollapsed ? "w-4.5 h-4.5" : "w-4 h-4"} style={{ width: isCollapsed ? "18px" : "16px", height: isCollapsed ? "18px" : "16px" }} />
                      </div>

                      {/* Label */}
                      {!isCollapsed && (
                        <span className={clsx(
                          "flex-1 truncate transition-all duration-200",
                          isActive ? "font-semibold" : "font-medium"
                        )}>
                          {item.label}
                        </span>
                      )}

                      {/* Badge */}
                      {showBadge && (
                        isCollapsed ? (
                          <span
                            className="absolute top-1 right-1 w-2 h-2 rounded-full bg-rose-500 border border-[var(--sidebar-bg)] animate-pulse"
                          />
                        ) : (
                          <span className="text-[10px] font-black rounded-full px-1.5 py-0.5 min-w-[20px] text-center leading-none bg-rose-500 text-white shadow-sm">
                            {unreadCount > 99 ? "99+" : unreadCount}
                          </span>
                        )
                      )}

                      {/* Collapsed tooltip */}
                      {isCollapsed && (
                        <div className="absolute left-full ml-3 px-3 py-1.5 rounded-lg bg-[var(--surface)] text-[var(--text-primary)] text-xs font-semibold opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-150 whitespace-nowrap z-50 shadow-xl border border-[var(--border-light)]">
                          {item.label}
                          <span className="absolute top-1/2 -translate-y-1/2 -left-1.5 w-2 h-2 rotate-45 bg-[var(--surface)] border-l border-b border-[var(--border-light)]" />
                        </div>
                      )}
                    </>
                  )}
                </NavLink>
              );
            })}
          </nav>

          {/* ── User Profile / Logout ── */}
          <div
            className="flex-shrink-0 p-3"
            style={{ borderTop: "1px solid var(--border-light)" }}
          >
            {isCollapsed ? (
              <button
                onClick={logout}
                className="w-full flex items-center justify-center p-2.5 rounded-xl text-[var(--text-muted)] hover:text-rose-400 hover:bg-rose-500/10 transition-all duration-150 active:scale-95 group"
                title="Log Out"
              >
                <LogOut className="w-[18px] h-[18px]" />
                <div className="absolute left-full ml-3 px-3 py-1.5 rounded-lg bg-[var(--surface)] text-[var(--text-primary)] text-xs font-semibold opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-150 whitespace-nowrap z-50 shadow-xl border border-[var(--border-light)]">
                  Log Out
                </div>
              </button>
            ) : (
              <div
                className="relative rounded-2xl p-3.5 overflow-hidden group transition-all duration-300 hover:bg-[var(--sidebar-hover)] cursor-default"
                style={{ border: "1px solid var(--border-light)" }}
              >
                {/* Background gradient glow */}
                <div
                  className={`absolute inset-0 opacity-10 bg-gradient-to-br ${getRoleColor(user?.role)} transition-opacity duration-300 group-hover:opacity-20`}
                />

                {/* User info row */}
                <div className="relative flex items-center gap-3 mb-3">
                  {/* Avatar */}
                  <div className="relative shrink-0">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-black text-white bg-gradient-to-br ${getRoleColor(user?.role)} shadow-lg`}>
                      {user?.profile_picture
                        ? <img src={user.profile_picture} alt={user?.name} className="w-9 h-9 rounded-xl object-cover" />
                        : getInitials(user?.name)
                      }
                    </div>
                    <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-[var(--sidebar-bg)]" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold truncate leading-tight" style={{ color: "var(--text-primary)" }}>{user?.name || "User"}</p>
                    <div className="flex items-center gap-1 mt-0.5">
                      <Shield className="w-2.5 h-2.5 flex-shrink-0" style={{ color: "var(--text-muted)" }} />
                      <span className="text-[10px] font-semibold truncate" style={{ color: "var(--text-muted)" }}>{getRoleLabel(user?.role)}</span>
                    </div>
                  </div>
                </div>

                {/* Logout button */}
                <button
                  onClick={logout}
                  className="relative w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-[var(--text-secondary)] hover:text-rose-400 hover:bg-rose-500/10 border border-[var(--border-light)] hover:border-rose-500/20 transition-all duration-200 active:scale-95"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Sign Out
                </button>
              </div>
            )}
          </div>

        </div>
      </aside>
    </>
  );
}
