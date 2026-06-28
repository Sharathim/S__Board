import { useState, useEffect, useRef } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import {
  Bell, Moon, Sun, LogOut, Menu, X, Sparkles,
  LayoutDashboard, FolderKanban, Users, GraduationCap,
  MessageSquare, Megaphone, BookOpen
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../hooks/useTheme";
import { useNotificationContext } from "../../context/NotificationContext";
import { NotificationsPanel } from "./NotificationsPanel";
import { Dropdown, DropdownItem } from "../ui/Dropdown";

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
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["HOD", "FACULTY", "STUDENT"] },
  { to: "/projects", label: "Projects", icon: FolderKanban, roles: ["HOD", "FACULTY", "STUDENT"] },
  { to: "/faculty", label: "Faculty", icon: GraduationCap, roles: ["HOD", "FACULTY"] },
  { to: "/classes", label: "Classes", icon: BookOpen, roles: ["HOD", "FACULTY"] },
  { to: "/classes", label: "Students", icon: Users, roles: ["STUDENT"] },
  { to: "/forum", label: "Forum", icon: MessageSquare, roles: ["HOD", "FACULTY", "STUDENT"] },
  { to: "/updates", label: "Announcements", icon: Megaphone, roles: ["HOD", "FACULTY", "STUDENT"] },
];

export function TopBar() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { unreadCount } = useNotificationContext();
  const [notifOpen, setNotifOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
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
      {/* ── Floating Glassmorphic Pill Navbar ── */}
      <nav className="navbar-glass" id="main-navbar">
        {/* ── Left: Logo + Brand ── */}
        <div className="flex items-center gap-2.5 flex-shrink-0">
          <img
            src="/logo-icon.png"
            alt="Hive"
            className="w-7 h-7 object-contain flex-shrink-0"
          />
          <span
            className="font-bold text-base tracking-tight"
            style={{ color: "var(--text-primary)" }}
          >
            Hive
          </span>
        </div>

        {/* ── Center: Nav Links (Desktop only) ── */}
        <div className="hidden md:flex items-center gap-1">
          {navItems.map(item => {
            const Icon = item.icon;
            const isForumWithBadge = item.to === "/forum" && unreadCount > 0;

            return (
              <NavLink
                key={item.label}
                to={item.to}
                className={({ isActive }) =>
                  `nav-pill ${isActive ? "nav-pill-active" : ""}`
                }
              >
                <Icon className="nav-pill-icon w-4 h-4" />
                <span>{item.label}</span>
                {isForumWithBadge && (
                  <span className="nav-badge">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </NavLink>
            );
          })}
        </div>

        {/* ── Right: Actions + Profile ── */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {/* Mobile hamburger */}
          <button
            id="navbar-mobile-menu-btn"
            onClick={() => setMobileMenuOpen(prev => !prev)}
            className="navbar-icon-btn md:hidden"
            title="Menu"
          >
            {mobileMenuOpen ? (
              <X className="w-5 h-5" />
            ) : (
              <Menu className="w-5 h-5" />
            )}
          </button>

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
            className="hidden sm:block w-px h-6 mx-1"
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

            <DropdownItem onClick={logout} danger>
              <LogOut className="w-4 h-4 inline mr-2" />
              Sign Out
            </DropdownItem>
          </Dropdown>
        </div>
      </nav>

      {/* ── Mobile Nav Sheet ── */}
      {mobileMenuOpen && (
        <>
          <div
            className="mobile-nav-backdrop md:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div ref={mobileMenuRef} className="mobile-nav-sheet md:hidden">
            {navItems.map(item => {
              const Icon = item.icon;
              const isForumWithBadge = item.to === "/forum" && unreadCount > 0;

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
          </div>
        </>
      )}
    </>
  );
}
