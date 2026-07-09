import { useState, useEffect, useRef } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard, FolderKanban, GraduationCap,
  MessageSquare, Megaphone, Settings, BookOpen,
  LogOut, Sparkles, ChevronLeft, ChevronRight
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useNotificationContext } from "../../context/NotificationContext";
import { ConfirmDialog } from "../ui/ConfirmDialog";

function getInitials(name) {
  if (!name) return "?";
  const parts = name.trim().split(" ");
  return parts.length >= 2
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : parts[0][0].toUpperCase();
}

function getRoleLabel(role) {
  const map = { HOD: "Administrator", FACULTY: "Faculty", STUDENT: "Student" };
  return map[role] || role;
}

function getRoleColor(role) {
  const map = {
    HOD: { from: "#7C3AED", to: "#5B21B6", light: "#EDE9FE", text: "#6D28D9" },
    FACULTY: { from: "#3B82F6", to: "#1D4ED8", light: "#DBEAFE", text: "#1D4ED8" },
    STUDENT: { from: "#10B981", to: "#059669", light: "#D1FAE5", text: "#059669" },
  };
  return map[role] || { from: "#6B7280", to: "#4B5563", light: "#F3F4F6", text: "#6B7280" };
}

const allNavItems = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["HOD"] },
  { to: "/projects", label: "Projects", icon: FolderKanban, roles: ["HOD", "FACULTY", "STUDENT"] },
  { to: "/faculty", label: "Faculty", icon: GraduationCap, roles: ["HOD", "FACULTY", "STUDENT"] },
  { to: "/classes", label: "Classes", icon: BookOpen, roles: ["HOD", "FACULTY", "STUDENT"] },
  { to: "/forum", label: "Forum", icon: MessageSquare, roles: ["HOD", "FACULTY", "STUDENT"] },
  { to: "/updates", label: "Updates", icon: Megaphone, roles: ["HOD", "FACULTY", "STUDENT"] },
];

export function DesktopSidebar() {
  const { user, logout } = useAuth();
  const { unreadCount } = useNotificationContext();
  const navigate = useNavigate();
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(() => {
    try {
      return localStorage.getItem("sidebar_collapsed") === "true";
    } catch {
      return false;
    }
  });
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const navRef = useRef(null);

  const roleColors = getRoleColor(user?.role);

  // Persist collapse state and notify layout
  useEffect(() => {
    try {
      localStorage.setItem("sidebar_collapsed", isCollapsed.toString());
      window.dispatchEvent(new CustomEvent("sidebar-collapse-change", { detail: { collapsed: isCollapsed } }));
    } catch {}
  }, [isCollapsed]);

  // Filter nav items by role and deduplicate
  const filteredNavs = allNavItems.filter(item =>
    !item.roles || item.roles.includes(user?.role)
  );
  const seen = new Set();
  const navItems = filteredNavs.filter(item => {
    const key = `${item.label}-${item.to}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const toggleCollapse = () => setIsCollapsed(prev => !prev);

  return (
    <>
      <aside
        className={`desktop-sidebar ${isCollapsed ? "desktop-sidebar--collapsed" : ""}`}
        id="desktop-sidebar"
      >
        {/* ── Logo + Brand ── */}
        <div className="sidebar-header">
          <div className="sidebar-logo-area">
            <img
              src="/logo-icon.png"
              alt="Hive"
              className="sidebar-logo-img"
            />
            {!isCollapsed && (
              <span className="sidebar-brand-text">Hive</span>
            )}
          </div>
          <button
            className="sidebar-collapse-btn"
            onClick={toggleCollapse}
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronLeft className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* ── Divider ── */}
        <div className="sidebar-divider" />

        {/* ── Navigation ── */}
        <nav ref={navRef} className="sidebar-nav">
          {navItems.map(item => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.label}
                to={item.to}
                className={({ isActive }) =>
                  `sidebar-nav-item ${isActive ? "sidebar-nav-item--active" : ""} ${isCollapsed ? "sidebar-nav-item--collapsed" : ""}`
                }
                title={isCollapsed ? item.label : undefined}
              >
                {({ isActive }) => (
                  <>
                    <div className={`sidebar-nav-icon ${isActive ? "sidebar-nav-icon--active" : ""}`}>
                      <Icon className="w-[18px] h-[18px]" />
                    </div>
                    {!isCollapsed && (
                      <span className="sidebar-nav-label">{item.label}</span>
                    )}
                    {/* Collapsed tooltip */}
                    {isCollapsed && (
                      <div className="sidebar-tooltip">
                        {item.label}
                        <span className="sidebar-tooltip-arrow" />
                      </div>
                    )}
                  </>
                )}
              </NavLink>
            );
          })}

          {/* Settings link */}
          <div className="sidebar-divider" style={{ margin: "8px 0" }} />
          <NavLink
            to="/settings"
            className={({ isActive }) =>
              `sidebar-nav-item ${isActive ? "sidebar-nav-item--active" : ""} ${isCollapsed ? "sidebar-nav-item--collapsed" : ""}`
            }
            title={isCollapsed ? "Settings" : undefined}
          >
            {({ isActive }) => (
              <>
                <div className={`sidebar-nav-icon ${isActive ? "sidebar-nav-icon--active" : ""}`}>
                  <Settings className="w-[18px] h-[18px]" />
                </div>
                {!isCollapsed && (
                  <span className="sidebar-nav-label">Settings</span>
                )}
                {isCollapsed && (
                  <div className="sidebar-tooltip">
                    Settings
                    <span className="sidebar-tooltip-arrow" />
                  </div>
                )}
              </>
            )}
          </NavLink>
        </nav>

        {/* ── Bottom: User Profile + Logout ── */}
        <div className="sidebar-footer">
          <div className="sidebar-divider" />

          {/* User info */}
          <div
            className={`sidebar-user-section ${isCollapsed ? "sidebar-user-section--collapsed" : ""}`}
          >
            <div className="sidebar-avatar-wrapper">
              <div
                className="sidebar-avatar"
                style={{
                  background: user?.profile_picture
                    ? "transparent"
                    : `linear-gradient(135deg, ${roleColors.from}, ${roleColors.to})`,
                }}
              >
                {user?.profile_picture ? (
                  <img src={user.profile_picture} alt={user?.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-xs font-bold text-white">{getInitials(user?.name)}</span>
                )}
              </div>
              <span className="sidebar-avatar-status" />
            </div>

            {!isCollapsed && (
              <div className="sidebar-user-info">
                <p className="sidebar-user-name">{user?.name || "User"}</p>
                <span
                  className="sidebar-role-badge"
                  style={{
                    background: roleColors.light,
                    color: roleColors.text,
                  }}
                >
                  <Sparkles className="w-2.5 h-2.5" />
                  {getRoleLabel(user?.role)}
                </span>
              </div>
            )}

            {/* Collapsed tooltip for user */}
            {isCollapsed && (
              <div className="sidebar-tooltip">
                {user?.name || "User"}
                <span className="sidebar-tooltip-arrow" />
              </div>
            )}
          </div>

          {/* Logout button */}
          <button
            onClick={() => setLogoutConfirmOpen(true)}
            className={`sidebar-logout-btn ${isCollapsed ? "sidebar-logout-btn--collapsed" : ""}`}
            title={isCollapsed ? "Log Out" : undefined}
          >
            <LogOut className="w-4 h-4" />
            {!isCollapsed && <span>Log Out</span>}
            {isCollapsed && (
              <div className="sidebar-tooltip">
                Log Out
                <span className="sidebar-tooltip-arrow" />
              </div>
            )}
          </button>
        </div>
      </aside>

      {/* Logout confirmation Dialog */}
      <ConfirmDialog
        open={logoutConfirmOpen}
        onClose={() => setLogoutConfirmOpen(false)}
        onConfirm={() => {
          setLogoutConfirmOpen(false);
          logout();
        }}
        title="Confirm Log Out"
        message="Are you sure you want to log out of your account?"
        confirmText="Log Out"
        danger
      />
    </>
  );
}
