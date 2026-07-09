import { useState, useEffect, useRef } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import {
  Bell, Moon, Sun, LogOut, X, Sparkles, Settings, ChevronRight,
  LayoutDashboard, FolderKanban, GraduationCap, BookOpen, MessageSquare, Megaphone
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../hooks/useTheme";
import { useNotificationContext } from "../../context/NotificationContext";
import { NotificationsPanel } from "./NotificationsPanel";
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
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const drawerRef = useRef(null);

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

  // Close drawer & notifications on route change
  useEffect(() => {
    setDrawerOpen(false);
    setNotifOpen(false);
  }, [location.pathname]);

  // Close drawer & notifications on escape key
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape") {
        setDrawerOpen(false);
        setNotifOpen(false);
      }
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, []);

  // Close drawer on clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        drawerOpen &&
        drawerRef.current &&
        !drawerRef.current.contains(e.target) &&
        !e.target.closest("#navbar-hamburger-btn")
      ) {
        setDrawerOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [drawerOpen]);

  return (
    <>
      {/* ── Top-Left: Logo & Brand Name (Floating) ── */}
      <div 
        onClick={() => navigate("/dashboard")}
        className="fixed top-4 left-6 z-[100] flex items-center gap-3.5 select-none hover:scale-[1.02] transition-all duration-300 cursor-pointer"
      >
        <img
          src="/logo-icon.png"
          alt="Hive Logo"
          className="w-14 h-14 object-contain flex-shrink-0 filter drop-shadow-[0_4px_12px_rgba(139,92,246,0.25)] dark:drop-shadow-[0_4px_12px_rgba(167,139,250,0.35)] transition-transform duration-300 hover:rotate-6"
        />
        <span
          className="font-extrabold text-3xl tracking-tighter bg-gradient-to-r from-gray-900 via-purple-950 to-black dark:from-white dark:via-purple-100 dark:to-gray-200 bg-clip-text text-transparent"
        >
          Hive
        </span>
      </div>

      {/* ── Top-Right: Action controls (Three floating buttons) ── */}
      <div className="fixed top-5 right-6 z-[100] flex items-center gap-3">
        
        {/* Button 1: Mode Switcher */}
        <button
          id="navbar-theme-btn"
          onClick={toggleTheme}
          className="neomorphic-glass-btn"
          title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        >
          <div className={`transition-all duration-300 ${theme === "dark" ? "rotate-0" : "rotate-180"}`}>
            {theme === "dark"
              ? <Sun className="w-[19px] h-[19px] text-amber-400" />
              : <Moon className="w-[19px] h-[19px]" />
            }
          </div>
        </button>

        {/* Button 2: Notification Bell */}
        <div className="relative flex items-center">
          <button
            id="navbar-notif-btn"
            onClick={() => setNotifOpen(o => !o)}
            className="neomorphic-glass-btn"
            title="Notifications"
          >
            <Bell
              className={`w-[19px] h-[19px] ${unreadCount > 0 ? "animate-[wiggle_1s_ease-in-out_infinite]" : ""}`}
            />
            {unreadCount > 0 && (
              <span
                className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full flex items-center justify-center text-white font-bold leading-none bg-rose-500 shadow-sm border border-white dark:border-slate-900"
                style={{ fontSize: "9px", padding: "0 4px" }}
              >
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </button>
          <NotificationsPanel open={notifOpen} onClose={() => setNotifOpen(false)} />
        </div>

        {/* Button 3: Hamburger Menu Button with Spacing */}
        <div className="hamburger-btn-wrapper ml-5">
          <div className="hamburger-hover-dot" />
          <button
            id="navbar-hamburger-btn"
            onClick={() => setDrawerOpen(true)}
            className="neomorphic-glass-btn"
            title="Open Menu"
          >
            <div className="flex flex-col gap-1.5 justify-center items-center w-5">
              <span className="hamburger-line w-5" />
              <span className="hamburger-line w-5" />
            </div>
          </button>
        </div>

      </div>

      {/* ── Side Menu Drawer (Right Panel) ── */}
      <div ref={drawerRef} className={`drawer-container ${drawerOpen ? "open" : ""}`}>
        
        {/* Close Menu Button */}
        <button
          onClick={() => setDrawerOpen(false)}
          className="drawer-close-btn"
          title="Close Menu"
        >
          <X className="w-4.5 h-4.5" />
        </button>

        {/* Scrollable Content wrapper (prevent bottom profile card cutoff) */}
        <div className="flex-1 overflow-y-auto pr-1 my-4 flex flex-col justify-between min-h-0 gap-6 mt-12 scrollbar-thin">
          
          {/* Navigation Items list (Staggered load) */}
          <div className="flex flex-col gap-1.5">
            {navItems.map((item, idx) => {
              const indexStr = String(idx + 1).padStart(2, "0");
              return (
                <NavLink
                  key={item.label}
                  to={item.to}
                  onClick={() => setDrawerOpen(false)}
                  className={({ isActive }) =>
                    `drawer-nav-item ${isActive ? "active" : ""} stagger-item`
                  }
                  style={{
                    transitionDelay: `${idx * 40}ms`,
                    transform: drawerOpen ? "translateY(0)" : "translateY(15px)",
                    opacity: drawerOpen ? 1 : 0,
                  }}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-[11px] font-mono opacity-50 tracking-wider align-super mr-1">
                      {indexStr}
                    </span>
                    <span className="tracking-tight">{item.label}</span>
                  </div>
                  <div className="drawer-nav-arrow">
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </NavLink>
              );
            })}
          </div>

          {/* Divider and Quick Actions */}
          <div className="flex flex-col gap-4">
            <div
              className="w-full h-px"
              style={{
                background: "linear-gradient(90deg, transparent, var(--border-light), transparent)",
              }}
            />

            <div className="flex flex-col gap-1.5">
              <NavLink
                to="/settings"
                onClick={() => setDrawerOpen(false)}
                className="drawer-nav-item-secondary stagger-item"
                style={{
                  transitionDelay: `${(navItems.length) * 40}ms`,
                  transform: drawerOpen ? "translateY(0)" : "translateY(15px)",
                  opacity: drawerOpen ? 1 : 0,
                }}
              >
                <div className="flex items-center gap-3">
                  <Settings className="w-4 h-4" />
                  <span>Settings</span>
                </div>
                <div className="drawer-nav-arrow-sm">
                  <ChevronRight className="w-3.5 h-3.5" />
                </div>
              </NavLink>

              <button
                onClick={() => {
                  setDrawerOpen(false);
                  setLogoutConfirmOpen(true);
                }}
                className="drawer-nav-item-secondary text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 stagger-item"
                style={{
                  transitionDelay: `${(navItems.length + 1) * 40}ms`,
                  transform: drawerOpen ? "translateY(0)" : "translateY(15px)",
                  opacity: drawerOpen ? 1 : 0,
                }}
              >
                <div className="flex items-center gap-3">
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </div>
                <div className="drawer-nav-arrow-sm bg-rose-500/10 text-rose-500 dark:bg-rose-500/20">
                  <ChevronRight className="w-3.5 h-3.5" />
                </div>
              </button>
            </div>
          </div>

        </div>

        {/* User Profile Card (Bottom of Drawer, mt-auto keeps it anchored) */}
        <div
          className="profile-section-card stagger-item mt-auto"
          style={{
            transitionDelay: `${(navItems.length + 2) * 40}ms`,
            transform: drawerOpen ? "translateY(0)" : "translateY(15px)",
            opacity: drawerOpen ? 1 : 0,
          }}
        >
          <div className="flex items-center gap-3.5">
            
            {/* Profile Image/Initials */}
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center text-base font-black text-white shadow-md overflow-hidden flex-shrink-0"
              style={{
                background: `linear-gradient(135deg, ${roleColors.from}, ${roleColors.to})`,
              }}
            >
              {user?.profile_picture ? (
                <img
                  src={user.profile_picture}
                  alt={user?.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                getInitials(user?.name)
              )}
            </div>

            {/* User details */}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold truncate text-gray-900 dark:text-white">
                {user?.name}
              </p>
              <p className="text-xs truncate text-gray-500 dark:text-gray-400 mt-0.5">
                {user?.email}
              </p>
              <span
                className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded-md mt-2"
                style={{
                  background: roleColors.light,
                  color: roleColors.text,
                }}
              >
                <Sparkles className="w-2.5 h-2.5" />
                {getRoleLabel(user?.role)}
              </span>
            </div>

          </div>
        </div>

      </div>

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
