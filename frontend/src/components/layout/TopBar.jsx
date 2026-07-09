import { useState, useEffect, useRef } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import {
  Bell, Moon, Sun, LogOut, Menu, X, Sparkles,
  LayoutDashboard, FolderKanban, Users, GraduationCap,
  MessageSquare, Megaphone, BookOpen, Settings
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../hooks/useTheme";
import { useNotificationContext } from "../../context/NotificationContext";
import { NotificationsPanel } from "./NotificationsPanel";
import { Dropdown, DropdownItem } from "../ui/Dropdown";
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

export function TopBar() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { unreadCount } = useNotificationContext();
  const [notifOpen, setNotifOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const mobileMenuRef = useRef(null);

  const roleColors = getRoleColor(user?.role);

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

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  // Close mobile menu on escape
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape") setMobileMenuOpen(false);
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, []);

  // Close mobile menu on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(e.target)) {
        setMobileMenuOpen(false);
      }
    };
    if (mobileMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [mobileMenuOpen]);

  return (
    <>
      {/* ── Desktop Top Utility Bar (hidden on mobile) ── */}
      <header className="desktop-topbar hidden md:flex" id="main-topbar">
        {/* Right-aligned actions */}
        <div className="flex items-center gap-1.5 ml-auto">
          {/* Theme Toggle */}
          <button
            id="navbar-theme-btn"
            onClick={toggleTheme}
            className="navbar-icon-btn"
            title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          >
            <div className={`transition-all duration-300 ${theme === "dark" ? "rotate-0" : "rotate-180"}`}>
              {theme === "dark"
                ? <Sun className="w-[18px] h-[18px]" />
                : <Moon className="w-[18px] h-[18px]" />
              }
            </div>
          </button>

          {/* Notification Bell */}
          <div className="relative flex items-center">
            <button
              id="navbar-notif-btn"
              onClick={() => setNotifOpen(o => !o)}
              className="navbar-icon-btn"
              title="Notifications"
            >
              <Bell
                className={`w-[18px] h-[18px] ${unreadCount > 0 ? "animate-[wiggle_1s_ease-in-out_infinite]" : ""}`}
              />
              {unreadCount > 0 && (
                <span
                  className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 rounded-full flex items-center justify-center text-white font-bold leading-none bg-rose-500"
                  style={{ fontSize: "9px", padding: "0 3px" }}
                >
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </button>
            <NotificationsPanel open={notifOpen} onClose={() => setNotifOpen(false)} />
          </div>

          {/* Separator */}
          <div
            className="w-px h-6 mx-1"
            style={{ background: "var(--border-light)", opacity: 0.5 }}
          />

          {/* User Profile Dropdown */}
          <Dropdown
            trigger={
              <div id="navbar-user-menu" className="navbar-avatar">
                {user?.profile_picture ? (
                  <img
                    src={user.profile_picture}
                    alt={user?.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div
                    className="w-full h-full flex items-center justify-center text-xs font-bold text-white"
                    style={{
                      background: `linear-gradient(135deg, ${roleColors.from}, ${roleColors.to})`,
                    }}
                  >
                    {getInitials(user?.name)}
                  </div>
                )}
              </div>
            }
            align="right"
          >
            {/* Dropdown Header */}
            <div
              className="px-4 py-4"
              style={{ borderBottom: "1px solid var(--border-light)" }}
            >
              <div className="flex items-center gap-3 mb-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-base font-black text-white shadow-md overflow-hidden flex-shrink-0"
                  style={{ background: `linear-gradient(135deg, ${roleColors.from}, ${roleColors.to})` }}
                >
                  {user?.profile_picture
                    ? <img src={user.profile_picture} alt={user?.name} className="w-full h-full object-cover" />
                    : getInitials(user?.name)
                  }
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold truncate" style={{ color: "var(--text-primary)" }}>{user?.name}</p>
                  <p className="text-xs truncate mt-0.5" style={{ color: "var(--text-muted)" }}>{user?.email}</p>
                </div>
              </div>
              <span
                className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-lg"
                style={{
                  background: roleColors.light,
                  color: roleColors.text,
                }}
              >
                <Sparkles className="w-3 h-3" />
                {getRoleLabel(user?.role)}
              </span>
            </div>

            <DropdownItem onClick={() => navigate("/settings")}>
              <Settings className="w-4 h-4 inline mr-2" />
              Settings
            </DropdownItem>

            <div
              className="mx-3 my-1"
              style={{ height: "1px", background: "var(--border-light)" }}
            />

            <DropdownItem onClick={logout} danger>
              <LogOut className="w-4 h-4 inline mr-2" />
              Sign Out
            </DropdownItem>
          </Dropdown>
        </div>
      </header>

      {/* ── Mobile Floating Pill Navbar (visible only on mobile) ── */}
      <nav
        className="navbar-glass md:hidden"
        id="main-navbar-mobile"
      >
        {/* Left: Logo + Brand */}
        <div className="flex items-center gap-2.5 flex-shrink-0">
          <img
            src="/logo-icon.png"
            alt="Hive"
            className="w-9 h-9 object-contain flex-shrink-0"
          />
          <span
            className="font-bold text-base tracking-tight"
            style={{ color: "var(--text-primary)" }}
          >
            Hive
          </span>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="navbar-icon-btn"
            title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          >
            <div className={`transition-all duration-300 ${theme === "dark" ? "rotate-0" : "rotate-180"}`}>
              {theme === "dark"
                ? <Sun className="w-[18px] h-[18px]" />
                : <Moon className="w-[18px] h-[18px]" />
              }
            </div>
          </button>

          {/* Notification Bell */}
          <div className="relative flex items-center">
            <button
              onClick={() => setNotifOpen(o => !o)}
              className="navbar-icon-btn"
              title="Notifications"
            >
              <Bell
                className={`w-[18px] h-[18px] ${unreadCount > 0 ? "animate-[wiggle_1s_ease-in-out_infinite]" : ""}`}
              />
              {unreadCount > 0 && (
                <span
                  className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 rounded-full flex items-center justify-center text-white font-bold leading-none bg-rose-500"
                  style={{ fontSize: "9px", padding: "0 3px" }}
                >
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </button>
            <NotificationsPanel open={notifOpen} onClose={() => setNotifOpen(false)} />
          </div>

          {/* Mobile hamburger */}
          <button
            id="navbar-mobile-menu-btn"
            onClick={() => setMobileMenuOpen(prev => !prev)}
            className="navbar-icon-btn"
            title="Menu"
          >
            {mobileMenuOpen ? (
              <X className="w-5 h-5" />
            ) : (
              <Menu className="w-5 h-5" />
            )}
          </button>
        </div>
      </nav>

      {/* ── Mobile Nav Sheet (unchanged) ── */}
      {mobileMenuOpen && (
        <>
          <div
            className="mobile-nav-backdrop md:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div ref={mobileMenuRef} className="mobile-nav-sheet md:hidden">
            {/* Header */}
            <div className="flex items-center justify-between pb-2 mb-1 border-b border-gray-100 dark:border-slate-800 flex-shrink-0">
              <div className="flex items-center gap-2">
                <img
                  src="/logo-icon.png"
                  alt="Hive"
                  className="w-8 h-8 object-contain"
                />
                <span className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>
                  Hive Menu
                </span>
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
                style={{ color: "var(--text-secondary)" }}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Nav list, Settings and Theme toggles */}
            <div className="flex-1 overflow-y-auto flex flex-col gap-1.5 pr-0.5">
              {navItems.map(item => {
                const Icon = item.icon;
                const isForumWithBadge = false;

                return (
                  <NavLink
                    key={item.label}
                    to={item.to}
                    onClick={() => setMobileMenuOpen(false)}
                    className={({ isActive }) =>
                      `mobile-nav-link ${isActive ? "mobile-nav-link-active" : ""}`
                    }
                  >
                    <Icon className="w-5 h-5" />
                    <span className="flex-1">{item.label}</span>
                    {isForumWithBadge && (
                      <span
                        className="min-w-[20px] h-5 rounded-full flex items-center justify-center text-white font-bold text-[10px] px-1.5"
                        style={{ background: "#EF4444" }}
                      >
                        {unreadCount > 99 ? "99+" : unreadCount}
                      </span>
                    )}
                  </NavLink>
                );
              })}

              <NavLink
                to="/settings"
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `mobile-nav-link ${isActive ? "mobile-nav-link-active" : ""}`
                }
              >
                <Settings className="w-5 h-5" />
                <span className="flex-1">Settings</span>
              </NavLink>

            </div>

            {/* Horizontal line to split content */}
            <div
              className="w-full h-px my-1 flex-shrink-0"
              style={{ background: "var(--border-light)", opacity: 0.6 }}
            />

            {/* Profile Section (profile picture, name, gmail/email, login role) */}
            <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50/50 dark:bg-slate-800/30 border border-gray-100 dark:border-slate-800/50 flex-shrink-0">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-base font-black text-white shadow-md overflow-hidden flex-shrink-0"
                style={{ background: `linear-gradient(135deg, ${roleColors.from}, ${roleColors.to})` }}
              >
                {user?.profile_picture ? (
                  <img src={user.profile_picture} alt={user?.name} className="w-full h-full object-cover" />
                ) : (
                  getInitials(user?.name)
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold truncate" style={{ color: "var(--text-primary)" }}>
                  {user?.name}
                </p>
                <p className="text-xs truncate" style={{ color: "var(--text-muted)", marginTop: "1px" }}>
                  {user?.email}
                </p>
                <span
                  className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md"
                  style={{
                    background: roleColors.light,
                    color: roleColors.text,
                    marginTop: "6px"
                  }}
                >
                  <Sparkles className="w-2.5 h-2.5" />
                  {user?.role === "HOD" ? "HOD" : (user?.role === "FACULTY" ? "Faculty" : (user?.role === "STUDENT" ? "Student" : user?.role))}
                </span>
              </div>
            </div>

            {/* Logout button at the bottom */}
            <button
              onClick={() => setLogoutConfirmOpen(true)}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-semibold text-sm transition-all duration-200 border border-red-200/50 hover:border-red-300 bg-red-50/50 hover:bg-red-50 text-red-600 dark:bg-red-950/20 dark:hover:bg-red-950/40 dark:border-red-900/30 dark:text-red-400 flex-shrink-0"
            >
              <LogOut className="w-4 h-4" />
              <span>Log Out</span>
            </button>
          </div>
        </>
      )}

      {/* Logout confirmation Dialog */}
      <ConfirmDialog
        open={logoutConfirmOpen}
        onClose={() => setLogoutConfirmOpen(false)}
        onConfirm={() => {
          setLogoutConfirmOpen(false);
          setMobileMenuOpen(false);
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
