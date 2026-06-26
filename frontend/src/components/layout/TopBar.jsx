import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Menu, Bell, Moon, Sun, LogOut, Search, Settings,
  ChevronDown, Command, PanelLeftOpen, X, Sparkles,
  LayoutDashboard, FolderKanban, Users, GraduationCap,
  MessageSquare, Megaphone, BookOpen, Zap
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../hooks/useTheme";
import { listProjects } from "../../api/projects";
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

const PAGE_TITLES = {
  "/dashboard": { label: "Dashboard", icon: LayoutDashboard, color: "text-violet-600 dark:text-violet-400" },
  "/projects": { label: "Projects", icon: FolderKanban, color: "text-blue-600 dark:text-blue-400" },
  "/classes": { label: "Classes", icon: BookOpen, color: "text-cyan-600 dark:text-cyan-400" },
  "/faculty": { label: "Faculty", icon: GraduationCap, color: "text-orange-600 dark:text-orange-400" },
  "/forum": { label: "Forum", icon: MessageSquare, color: "text-rose-600 dark:text-rose-400" },
  "/updates": { label: "Announcements", icon: Megaphone, color: "text-yellow-600 dark:text-yellow-500" },
  "/settings": { label: "Settings", icon: Settings, color: "text-gray-600 dark:text-gray-400" },
};

const allNavItems = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["HOD", "FACULTY", "STUDENT"] },
  { to: "/projects", label: "Projects", icon: FolderKanban, roles: ["HOD", "FACULTY", "STUDENT"] },
  { to: "/faculty", label: "Faculty", icon: GraduationCap, roles: ["HOD", "FACULTY"] },
  { to: "/classes", label: "Classes", icon: BookOpen, roles: ["HOD", "FACULTY"] },
  { to: "/classes", label: "Students", icon: Users, roles: ["STUDENT"] },
  { to: "/forum", label: "Forum", icon: MessageSquare, roles: ["HOD", "FACULTY", "STUDENT"] },
  { to: "/updates", label: "Announcements", icon: Megaphone, roles: ["HOD", "FACULTY", "STUDENT"] },
  { to: "/settings", label: "Settings", icon: Settings, roles: ["HOD", "FACULTY", "STUDENT"] },
];

export function TopBar({ onMenuClick, isCollapsed, onToggleCollapse }) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { unreadCount } = useNotificationContext();
  const [notifOpen, setNotifOpen] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [projects, setProjects] = useState([]);
  const [isFocused, setIsFocused] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const searchRef = useRef(null);

  const roleColors = getRoleColor(user?.role);

  const currentPage = Object.entries(PAGE_TITLES).find(([path]) =>
    location.pathname.startsWith(path)
  );
  const PageIcon = currentPage?.[1]?.icon;
  const pageLabel = currentPage?.[1]?.label;
  const pageColor = currentPage?.[1]?.color;

  const visibleNavs = allNavItems.filter(item =>
    (!item.roles || item.roles.includes(user?.role)) &&
    item.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Deduplicate by label+to
  const seen = new Set();
  const uniqueNavs = visibleNavs.filter(item => {
    const key = `${item.label}-${item.to}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        document.getElementById("topbar-search")?.focus();
      }
      if (e.key === "Escape") {
        setIsFocused(false);
        setSearchQuery("");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setIsFocused(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!searchQuery.trim()) { setProjects([]); return; }
    setIsLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await listProjects({ search: searchQuery, per_page: 5 });
        setProjects(res.data?.projects || []);
      } catch { } finally {
        setIsLoading(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  return (
    <header
      className="h-16 flex items-center justify-between px-4 lg:px-5 relative z-40 gap-4 flex-shrink-0"
      style={{
        background: "var(--surface)",
        borderBottom: "1px solid var(--border-light)",
      }}
    >
      {/* ── Mobile hamburger ── */}
      <button
        id="topbar-menu-btn"
        onClick={onMenuClick}
        className="p-2 rounded-xl lg:hidden flex-shrink-0 transition-all duration-150 hover:bg-[var(--surface-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] active:scale-95"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* ── Desktop expand button ── */}
      {isCollapsed && (
        <button
          onClick={onToggleCollapse}
          className="hidden lg:flex p-2 rounded-xl flex-shrink-0 transition-all duration-150 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] active:scale-95"
          title="Open sidebar"
        >
          <PanelLeftOpen className="w-5 h-5" />
        </button>
      )}

      {/* ── Current Page Breadcrumb ── */}
      {pageLabel && (
        <div className="hidden lg:flex items-center gap-2 flex-shrink-0">
          {PageIcon && (
            <div className="w-7 h-7 rounded-lg bg-[var(--surface-secondary)] border border-[var(--border-light)] flex items-center justify-center">
              <PageIcon className={`w-4 h-4 ${pageColor}`} />
            </div>
          )}
          <span className="text-sm font-bold text-[var(--text-primary)]">{pageLabel}</span>
        </div>
      )}


      {/* ── Right Actions ── */}
      <div className="flex items-center gap-1.5 flex-shrink-0">

        {/* Theme Toggle */}
        <button
          id="topbar-theme-btn"
          onClick={toggleTheme}
          className="relative p-2 rounded-xl transition-all duration-200 hover:bg-[var(--surface-hover)] active:scale-95"
          style={{ color: "var(--text-secondary)" }}
          title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        >
          <div className={`transition-all duration-300 ${theme === "dark" ? "rotate-0" : "rotate-180"}`}>
            {theme === "dark"
              ? <Sun style={{ width: "18px", height: "18px" }} />
              : <Moon style={{ width: "18px", height: "18px" }} />
            }
          </div>
        </button>

        {/* Notification Bell */}
        <div className="relative">
          <button
            id="topbar-notif-btn"
            onClick={() => setNotifOpen(o => !o)}
            className={`relative p-2 rounded-xl transition-all duration-200 active:scale-95 ${
              notifOpen ? "bg-[var(--surface-hover)]" : "hover:bg-[var(--surface-hover)]"
            }`}
            style={{ color: "var(--text-secondary)" }}
            title="Notifications"
          >
            <Bell style={{ width: "18px", height: "18px" }} className={unreadCount > 0 ? "animate-[wiggle_1s_ease-in-out_infinite]" : ""} />
            {unreadCount > 0 && (
              <span
                className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full flex items-center justify-center text-white font-bold leading-none shadow-lg"
                style={{
                  background: "linear-gradient(135deg, #ef4444, #dc2626)",
                  fontSize: "10px",
                  padding: "0 4px",
                }}
              >
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </button>
          <NotificationsPanel open={notifOpen} onClose={() => setNotifOpen(false)} />
        </div>

        {/* Divider */}
        <div className="w-px h-6 mx-1" style={{ background: "var(--border-light)" }} />

        {/* User Profile Dropdown */}
        <Dropdown
          trigger={
            <div
              id="topbar-user-menu"
              className="flex items-center gap-2.5 cursor-pointer px-2.5 py-1.5 rounded-xl transition-all duration-150 hover:bg-[var(--surface-hover)] active:scale-95"
            >
              {/* Avatar */}
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center text-sm font-black text-white shadow-md flex-shrink-0 overflow-hidden"
                style={{
                  background: `linear-gradient(135deg, ${roleColors.from}, ${roleColors.to})`,
                }}
              >
                {user?.profile_picture
                  ? <img src={user.profile_picture} alt={user?.name} className="w-full h-full object-cover" />
                  : getInitials(user?.name)
                }
              </div>

              {/* Name + Role */}
              <div className="hidden md:block text-left">
                <p className="text-sm font-bold leading-tight" style={{ color: "var(--text-primary)" }}>
                  {user?.name || "User"}
                </p>
                <p className="text-[10px] font-medium leading-tight" style={{ color: "var(--text-muted)" }}>
                  {getRoleLabel(user?.role)}
                </p>
              </div>
              <ChevronDown className="w-3.5 h-3.5 hidden md:block flex-shrink-0" style={{ color: "var(--text-muted)" }} />
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

          <DropdownItem onClick={() => window.location.href = "/settings"}>
            <Settings className="w-4 h-4 inline mr-2" />
            Settings
          </DropdownItem>
          <DropdownItem onClick={logout} danger>
            <LogOut className="w-4 h-4 inline mr-2" />
            Sign Out
          </DropdownItem>
        </Dropdown>
      </div>
    </header>
  );
}
