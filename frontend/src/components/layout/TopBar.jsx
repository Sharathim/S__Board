import { useState, useEffect, useRef } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import gsap from "gsap";
import {
  Bell, Moon, Sun, LogOut, X, Sparkles, Settings, ChevronRight,
  LayoutDashboard, FolderKanban, GraduationCap, BookOpen, MessageSquare, Megaphone
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../hooks/useTheme";
import { useNotificationContext } from "../../context/NotificationContext";
import { usePageTransition } from "../../context/TransitionContext";
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

/* ─── Premium GSAP Hover Rolling Text Component ─────────────────────────── */
function HoverRollText({ text, isHovered, className = "" }) {
  return <span className={className}>{text}</span>;
}

/* ─── Drawer link items with isolated hover state tracking ───────────────── */
function DrawerLink({ idx, item, isActive, drawerOpen, navigateWithTransition, setDrawerOpen }) {
  const [isHovered, setIsHovered] = useState(false);
  const indexStr = String(idx + 1).padStart(2, "0");

  return (
    <div
      onClick={() => {
        setDrawerOpen(false);
        navigateWithTransition(item.to, item.label, item.icon);
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`drawer-nav-item ${isActive ? "active" : ""} stagger-item cursor-pointer`}
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
        <HoverRollText text={item.label} isHovered={isHovered} className="tracking-tight font-extrabold" />
      </div>
      <div className="drawer-nav-arrow">
        <ChevronRight className="w-4 h-4" />
      </div>
    </div>
  );
}

function DrawerSettingsLink({ idx, drawerOpen, navigateWithTransition, setDrawerOpen }) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      onClick={() => {
        setDrawerOpen(false);
        navigateWithTransition("/settings", "Settings", Settings);
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="drawer-nav-item-secondary stagger-item cursor-pointer"
      style={{
        transitionDelay: `${idx * 40}ms`,
        transform: drawerOpen ? "translateY(0)" : "translateY(15px)",
        opacity: drawerOpen ? 1 : 0,
      }}
    >
      <div className="flex items-center gap-3">
        <Settings className="w-4 h-4" />
        <HoverRollText text="Settings" isHovered={isHovered} className="font-semibold text-sm" />
      </div>
      <div className="drawer-nav-arrow-sm">
        <ChevronRight className="w-3.5 h-3.5" />
      </div>
    </div>
  );
}

function DrawerSignOutLink({ idx, drawerOpen, setDrawerOpen, setLogoutConfirmOpen }) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <button
      onClick={() => {
        setDrawerOpen(false);
        setLogoutConfirmOpen(true);
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="drawer-nav-item-secondary text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 stagger-item w-full text-left"
      style={{
        transitionDelay: `${idx * 40}ms`,
        transform: drawerOpen ? "translateY(0)" : "translateY(15px)",
        opacity: drawerOpen ? 1 : 0,
      }}
    >
      <div className="flex items-center gap-3">
        <LogOut className="w-4 h-4" />
        <HoverRollText text="Sign Out" isHovered={isHovered} className="font-semibold text-sm" />
      </div>
      <div className="drawer-nav-arrow-sm bg-rose-500/10 text-rose-500 dark:bg-rose-500/20">
        <ChevronRight className="w-3.5 h-3.5" />
      </div>
    </button>
  );
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
  const { navigateWithTransition, triggerPortalTransition } = usePageTransition();
  const [notifOpen, setNotifOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const drawerRef = useRef(null);

  const roleColors = getRoleColor(user?.role);

  const getBadgeDetails = () => {
    if (!user) return { text: "", bg: "bg-gray-100", textClass: "text-gray-600" };
    if (user.role === "HOD") {
      return { text: "HOD", bg: "bg-violet-50 dark:bg-violet-950/40", textClass: "text-violet-600 dark:text-violet-400" };
    }
    if (user.role === "FACULTY") {
      if (user.faculty?.class_incharge_of) {
        return { text: "Incharge", bg: "bg-emerald-50 dark:bg-emerald-950/40", textClass: "text-emerald-600 dark:text-emerald-400" };
      }
      return { text: "Faculty", bg: "bg-blue-50 dark:bg-blue-950/40", textClass: "text-blue-600 dark:text-blue-400" };
    }
    if (user.role === "STUDENT") {
      return { text: "Student", bg: "bg-amber-50 dark:bg-amber-950/40", textClass: "text-amber-600 dark:text-amber-400" };
    }
    return { text: user.role, bg: "bg-gray-50 dark:bg-gray-900/40", textClass: "text-gray-650 dark:text-gray-400" };
  };

  const badge = getBadgeDetails();

  // Filter nav items by role and deduplicate
  const filteredNavs = allNavItems.filter(item =>
    (!item.roles || item.roles.includes(user?.role)) &&
    item.to !== "/forum" &&
    item.to !== "/updates"
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
      <header className="fixed top-0 left-0 right-0 h-[72px] z-[99] bg-[var(--background)]/85 backdrop-blur-md border-b border-gray-150 flex items-center justify-between px-6 transition-all duration-300">
        {/* ── Left Side: Hamburger & Brand Logo ── */}
        <div className="flex items-center gap-3">
          {/* Hamburger Menu Button */}
          <div className="hamburger-btn-wrapper mr-2">
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

          {/* Logo & Brand Name */}
          <div 
            onClick={() => navigateWithTransition("/dashboard", "Dashboard", LayoutDashboard)}
            className="flex items-center gap-3.5 select-none hover:scale-[1.02] transition-all duration-300 cursor-pointer"
          >
            <img
              src="/website-name-logo.png"
              alt="Hive Logo"
              className="h-[72px] w-auto object-contain flex-shrink-0"
            />
          </div>
        </div>

        {/* ── Action controls ── */}
        <div className="flex items-center gap-3">
          


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

          {/* User Profile Avatar & Badge */}
          <div className="flex items-center gap-2.5 border-l border-gray-150 dark:border-slate-800/80 pl-3.5 ml-1 select-none">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-black text-white shadow-md overflow-hidden flex-shrink-0 ring-1 ring-violet-500/10 dark:ring-violet-400/20"
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

            <div className="hidden sm:flex flex-col text-left">
              <span className="text-xs font-extrabold text-slate-800 dark:text-slate-100 leading-none">
                {user?.name}
              </span>
              <span
                className={`inline-flex items-center text-[9px] font-black px-1.5 py-0.5 rounded-md mt-1 font-mono uppercase tracking-wider leading-none self-start ${badge.bg} ${badge.textClass}`}
              >
                {badge.text}
              </span>
            </div>
          </div>

        </div>
      </header>

      {/* ── Side Menu Drawer (Right Panel) ── */}
      <div ref={drawerRef} className={`drawer-container ${drawerOpen ? "open" : ""}`}>
        
        {/* Drawer Brand Logo */}
        <div className="absolute top-[22px] left-5 flex items-center gap-3 select-none">
          <img
            src="/logo-icon.png?v=2"
            alt="Hive Logo Icon"
            className="h-9 w-9 object-contain"
          />
          <span className="text-lg font-black tracking-tight text-slate-800 dark:text-slate-100">
            Hive
          </span>
        </div>

        {/* Close Menu Button */}
        <button
          onClick={() => setDrawerOpen(false)}
          className="drawer-close-btn"
          title="Close Menu"
        >
          <X className="w-4.5 h-4.5" />
        </button>

        {/* Content wrapper (scrollable layout) */}
        <div className="flex-1 overflow-y-auto scrollbar-thin pr-1 my-4 flex flex-col justify-between min-h-0 gap-6 mt-20">
          
          {/* Navigation Items list (Staggered load) */}
          <div className="flex flex-col gap-1.5">
            {navItems.map((item, idx) => {
              const isActive = location.pathname === item.to;
              return (
                <DrawerLink
                  key={item.label}
                  idx={idx}
                  item={item}
                  isActive={isActive}
                  drawerOpen={drawerOpen}
                  navigateWithTransition={navigateWithTransition}
                  setDrawerOpen={setDrawerOpen}
                />
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
              <DrawerSettingsLink
                idx={navItems.length}
                drawerOpen={drawerOpen}
                navigateWithTransition={navigateWithTransition}
                setDrawerOpen={setDrawerOpen}
              />

              <DrawerSignOutLink
                idx={navItems.length + 1}
                drawerOpen={drawerOpen}
                setDrawerOpen={setDrawerOpen}
                setLogoutConfirmOpen={setLogoutConfirmOpen}
              />
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
          triggerPortalTransition("logout", () => logout());
        }}
        title="Confirm Log Out"
        message="Are you sure you want to log out of your account?"
        confirmText="Log Out"
        danger
      />
    </>
  );
}
