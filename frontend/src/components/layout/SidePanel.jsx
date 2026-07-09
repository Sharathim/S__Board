import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useNotificationContext } from "../../context/NotificationContext";
import {
  LayoutDashboard, FolderKanban, GraduationCap,
  MessageSquare, Megaphone, Settings,
  BookOpen, LogOut, ChevronLeft, ChevronRight, X
} from "lucide-react";
import clsx from "clsx";

const allNavItems = [
  {
    to: "/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    roles: ["HOD", "FACULTY", "STUDENT"],
  },
  {
    to: "/projects",
    label: "Projects",
    icon: FolderKanban,
    roles: ["HOD", "FACULTY", "STUDENT"],
  },
  {
    to: "/faculty",
    label: "Faculty",
    icon: GraduationCap,
    roles: ["HOD", "FACULTY", "STUDENT"],
  },
  {
    to: "/classes",
    label: "Classes",
    icon: BookOpen,
    roles: ["HOD", "FACULTY", "STUDENT"],
  },
  {
    to: "/forum",
    label: "Forum",
    icon: MessageSquare,
    roles: ["HOD", "FACULTY", "STUDENT"],
  },
  {
    to: "/updates",
    label: "Updates",
    icon: Megaphone,
    roles: ["HOD", "FACULTY", "STUDENT"],
  },
  {
    to: "/settings",
    label: "Settings",
    icon: Settings,
    roles: ["HOD", "FACULTY", "STUDENT"],
  },
];

function getRoleLabel(role) {
  const map = { HOD: "Administrator", FACULTY: "Faculty", STUDENT: "Student" };
  return map[role] || role;
}

function getInitials(name) {
  if (!name) return "?";
  const parts = name.trim().split(" ");
  return parts.length >= 2
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : parts[0][0].toUpperCase();
}

export function SidePanel({ isCollapsed, onToggleCollapse, mobileOpen, onMobileClose }) {
  const { user, logout } = useAuth();
  const { unreadCount } = useNotificationContext();
  const location = useLocation();

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
      {/* Mobile overlay backdrop */}
      {mobileOpen && (
        <div
          className="side-panel-backdrop lg:hidden"
          onClick={onMobileClose}
        />
      )}

      <aside
        className={clsx(
          "side-panel",
          isCollapsed && "side-panel-collapsed",
          mobileOpen ? "side-panel-mobile-open" : "side-panel-mobile-closed"
        )}
      >
        {/* ── Logo Section ── */}
        <div className="side-panel-logo">
          <div className="side-panel-logo-icon">
            <img src="/logo-icon.png" alt="Hive" className="w-8 h-8 object-contain" />
          </div>
          {!isCollapsed && (
            <span className="side-panel-logo-text">Hive</span>
          )}
          
          {/* Mobile close button */}
          <button
            className="side-panel-mobile-close lg:hidden"
            onClick={onMobileClose}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── Navigation Items ── */}
        <nav className="side-panel-nav">
          {uniqueNavItems.map(item => {
            const Icon = item.icon;
            const isActive = location.pathname === item.to || 
              (item.to !== "/" && location.pathname.startsWith(item.to + "/"));

            return (
              <NavLink
                key={item.label}
                to={item.to}
                onClick={onMobileClose}
                className={clsx(
                  "side-panel-nav-item",
                  isActive && "side-panel-nav-item-active",
                  isCollapsed && "side-panel-nav-item-collapsed"
                )}
                title={isCollapsed ? item.label : undefined}
              >
                <div className={clsx(
                  "side-panel-nav-icon",
                  isActive && "side-panel-nav-icon-active"
                )}>
                  <Icon className="w-[20px] h-[20px]" />
                </div>
                
                {!isCollapsed && (
                  <span className="side-panel-nav-label">{item.label}</span>
                )}

                {/* Notification badge for forum */}
                {item.to === "/forum" && unreadCount > 0 && (
                  <span className={clsx(
                    "side-panel-badge",
                    isCollapsed && "side-panel-badge-collapsed"
                  )}>
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}

                {/* Tooltip when collapsed */}
                {isCollapsed && (
                  <div className="side-panel-tooltip">
                    {item.label}
                    <span className="side-panel-tooltip-arrow" />
                  </div>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* ── Collapse Toggle (Desktop only) ── */}
        <button
          className="side-panel-collapse-btn hidden lg:flex"
          onClick={onToggleCollapse}
          title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronLeft className="w-4 h-4" />
          )}
        </button>

        {/* ── User Profile & Logout ── */}
        <div className="side-panel-footer">
          {!isCollapsed ? (
            <div className="side-panel-user">
              <div className="side-panel-avatar">
                {user?.profile_picture ? (
                  <img src={user.profile_picture} alt={user?.name} className="w-full h-full object-cover" />
                ) : (
                  <span>{getInitials(user?.name)}</span>
                )}
              </div>
              <div className="side-panel-user-info">
                <p className="side-panel-user-name">{user?.name || "User"}</p>
                <p className="side-panel-user-role">{getRoleLabel(user?.role)}</p>
              </div>
            </div>
          ) : (
            <div className="side-panel-avatar side-panel-avatar-collapsed" title={user?.name}>
              {user?.profile_picture ? (
                <img src={user.profile_picture} alt={user?.name} className="w-full h-full object-cover" />
              ) : (
                <span>{getInitials(user?.name)}</span>
              )}
            </div>
          )}

          <button
            onClick={logout}
            className={clsx(
              "side-panel-logout",
              isCollapsed && "side-panel-logout-collapsed"
            )}
            title="Log Out"
          >
            <LogOut className="w-[18px] h-[18px]" />
            {!isCollapsed && <span>Log Out</span>}
          </button>
        </div>
      </aside>
    </>
  );
}
