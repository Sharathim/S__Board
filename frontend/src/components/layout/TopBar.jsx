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
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["HOD"] },
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

      {/* ── Search Bar ── */}
      <div ref={searchRef} className="flex-1 max-w-lg relative">
        <div
          className={`relative flex items-center gap-2.5 px-4 py-2.5 rounded-2xl transition-all duration-200 cursor-text ${
            isFocused
              ? "ring-2 ring-[var(--primary)]/20 border-[var(--primary)]/40"
              : "border-[var(--border-light)] hover:border-[var(--border-medium)]"
          }`}
          style={{
            background: "var(--surface-secondary)",
            border: `1px solid ${isFocused ? "rgba(79,70,229,0.3)" : "var(--border-light)"}`,
            boxShadow: isFocused ? "0 0 0 3px rgba(79,70,229,0.08), 0 4px 12px rgba(0,0,0,0.05)" : "none",
          }}
          onClick={() => document.getElementById("topbar-search")?.focus()}
        >
          <Search
            className="w-4 h-4 flex-shrink-0 transition-colors duration-200"
            style={{ color: isFocused ? "var(--primary)" : "var(--text-muted)" }}
          />
          <input
            id="topbar-search"
            type="text"
            placeholder="Search pages, projects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setIsFocused(true)}
            className="flex-1 bg-transparent outline-none text-sm"
            style={{ color: "var(--text-primary)" }}
          />
          {searchQuery ? (
            <button
              onClick={() => { setSearchQuery(""); setIsFocused(false); }}
              className="flex-shrink-0 p-0.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-all"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : (
            <div
              className="hidden sm:flex items-center gap-1 px-1.5 py-0.5 rounded-lg flex-shrink-0"
              style={{
                background: "var(--border-light)",
                color: "var(--text-muted)",
                border: "1px solid var(--border-medium)",
                fontSize: "10px",
              }}
            >
              <Command className="w-2.5 h-2.5" />
              <span className="font-semibold">K</span>
            </div>
          )}
        </div>

        {/* Search Dropdown */}
        {isFocused && (
          <div
            className="absolute left-0 right-0 mt-2 rounded-2xl overflow-hidden z-50 animate-fade-in"
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border-light)",
              boxShadow: "0 20px 60px rgba(0,0,0,0.15), 0 4px 12px rgba(0,0,0,0.08)",
            }}
          >
            <div className="max-h-80 overflow-y-auto">
              {/* Quick navigation */}
              {uniqueNavs.length > 0 && (
                <div className="p-3">
                  <div className="flex items-center gap-1.5 px-1 mb-2">
                    <Zap className="w-3 h-3 text-[var(--primary)]" />
                    <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
                      Quick Navigation
                    </p>
                  </div>
                  <div className="space-y-0.5">
                    {uniqueNavs.map((nav) => {
                      const NavIcon = nav.icon;
                      return (
                        <button
                          key={`${nav.label}-${nav.to}`}
                          onClick={() => { navigate(nav.to); setIsFocused(false); setSearchQuery(""); }}
                          className="w-full text-left px-3 py-2 rounded-xl text-sm transition-all duration-150 flex items-center gap-3 group"
                          style={{ color: "var(--text-secondary)" }}
                          onMouseEnter={e => e.currentTarget.style.background = "var(--surface-hover)"}
                          onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                        >
                          <div
                            className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                            style={{ background: "var(--surface-secondary)" }}
                          >
                            <NavIcon className="w-3.5 h-3.5" style={{ color: "var(--primary)" }} />
                          </div>
                          <span className="flex-1 font-medium">{nav.label}</span>
                          <ChevronDown
                            className="w-3 h-3 -rotate-90 opacity-0 group-hover:opacity-50 transition-opacity"
                            style={{ color: "var(--text-muted)" }}
                          />
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Projects */}
              {searchQuery.trim() && (
                <div
                  className="px-3 py-3"
                  style={{ borderTop: "1px solid var(--border-light)" }}
                >
                  <div className="flex items-center gap-1.5 px-1 mb-2">
                    <FolderKanban className="w-3 h-3 text-blue-500" />
                    <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
                      Projects
                    </p>
                  </div>
                  {isLoading ? (
                    <div className="py-3 text-center text-xs text-[var(--text-muted)] flex items-center justify-center gap-2">
                      <span className="w-3 h-3 rounded-full border-2 border-[var(--primary)] border-t-transparent animate-spin" />
                      Searching...
                    </div>
                  ) : projects.length > 0 ? (
                    <div className="space-y-0.5">
                      {projects.map((project) => (
                        <button
                          key={project.id}
                          onClick={() => { navigate(`/projects/${project.id}`); setIsFocused(false); setSearchQuery(""); }}
                          className="w-full text-left px-3 py-2 rounded-xl transition-all duration-150 flex items-center gap-3"
                          onMouseEnter={e => e.currentTarget.style.background = "var(--surface-hover)"}
                          onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                        >
                          <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center flex-shrink-0">
                            <FolderKanban className="w-3.5 h-3.5 text-blue-500" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>{project.name}</p>
                            {project.description && (
                              <p className="text-xs truncate mt-0.5" style={{ color: "var(--text-muted)" }}>{project.description}</p>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="py-3 text-center text-xs" style={{ color: "var(--text-muted)" }}>
                      No matching projects found
                    </div>
                  )}
                </div>
              )}

              {uniqueNavs.length === 0 && !searchQuery.trim() && (
                <div className="py-10 text-center">
                  <Search className="w-6 h-6 mx-auto mb-2" style={{ color: "var(--text-muted)" }} />
                  <p className="text-sm" style={{ color: "var(--text-muted)" }}>Start typing to search...</p>
                </div>
              )}
            </div>

            {/* Footer hint */}
            <div
              className="px-4 py-2.5 flex items-center gap-3 text-[10px] font-medium"
              style={{
                background: "var(--surface-secondary)",
                borderTop: "1px solid var(--border-light)",
                color: "var(--text-muted)",
              }}
            >
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 rounded-md text-[9px] font-bold" style={{ background: "var(--border-light)", border: "1px solid var(--border-medium)" }}>↑↓</kbd>
                to navigate
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 rounded-md text-[9px] font-bold" style={{ background: "var(--border-light)", border: "1px solid var(--border-medium)" }}>↵</kbd>
                to select
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 rounded-md text-[9px] font-bold" style={{ background: "var(--border-light)", border: "1px solid var(--border-medium)" }}>Esc</kbd>
                to close
              </span>
            </div>
          </div>
        )}
      </div>

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
