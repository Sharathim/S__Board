import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Menu, Bell, Moon, Sun, LogOut, Search, Settings, ChevronDown, Command } from "lucide-react";
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
  if (!role) return "";
  const map = { HOD: "Administrator", FACULTY: "Faculty", STUDENT: "Student" };
  return map[role] || role;
}

const allNavItems = [
  { to: "/dashboard",  label: "Dashboard",     roles: ["HOD"] },
  { to: "/projects",   label: "Projects",       roles: ["HOD", "FACULTY", "STUDENT"] },
  { to: "/classes",    label: "Students",       roles: ["HOD", "FACULTY", "STUDENT"] },
  { to: "/faculty",    label: "Faculty",        roles: ["HOD", "FACULTY"] },
  { to: "/classes",    label: "Classes",        roles: ["HOD", "FACULTY", "STUDENT"] },
  { to: "/forum",      label: "Forum",          roles: ["HOD", "FACULTY", "STUDENT"] },
  { to: "/updates",    label: "Announcements",  roles: ["HOD", "FACULTY", "STUDENT"] },
  { to: "/settings",   label: "Settings",       roles: ["HOD", "FACULTY", "STUDENT"] },
];

export function TopBar({ onMenuClick }) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { unreadCount } = useNotificationContext();
  const [notifOpen, setNotifOpen] = useState(false);

  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [projects, setProjects] = useState([]);
  const [isFocused, setIsFocused] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const searchRef = useRef(null);

  const visibleNavs = allNavItems.filter(item => 
    (!item.roles || item.roles.includes(user?.role)) &&
    item.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  useEffect(() => {
    // ⌘K / Ctrl+K shortcut to focus search
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        document.getElementById("topbar-search")?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    // Click outside to close search results dropdown
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setIsFocused(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setProjects([]);
      return;
    }

    setIsLoading(true);
    const delayDebounceFn = setTimeout(async () => {
      try {
        const res = await listProjects({ search: searchQuery, per_page: 5 });
        setProjects(res.data?.projects || []);
      } catch (err) {
        console.error("Search API error:", err);
      } finally {
        setIsLoading(false);
      }
    }, 250);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  return (
    <header
      className="h-16 flex items-center justify-between px-4 lg:px-6 relative z-40 gap-4 flex-shrink-0"
      style={{
        background: "var(--surface)",
        borderBottom: "1px solid var(--border-light)",
      }}
    >
      {/* ── Mobile hamburger ── */}
      <button
        id="topbar-menu-btn"
        onClick={onMenuClick}
        className="p-2 rounded-lg lg:hidden flex-shrink-0 transition-colors"
        style={{ color: "var(--text-secondary)" }}
        onMouseEnter={e => e.currentTarget.style.background = "var(--surface-hover)"}
        onMouseLeave={e => e.currentTarget.style.background = "transparent"}
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* ── Search Bar ── */}
      <div
        ref={searchRef}
        className="flex-1 max-w-md relative"
      >
        <div
          className="search-bar rounded-lg flex items-center gap-2 px-3 py-2 transition-all duration-200 cursor-text"
          style={{
            background: "var(--surface-secondary)",
            border: "1px solid var(--border-light)",
          }}
          onClick={() => document.getElementById("topbar-search")?.focus()}
        >
          <Search className="w-4 h-4 flex-shrink-0" style={{ color: "var(--text-muted)" }} />
          <input
            id="topbar-search"
            type="text"
            placeholder="Search for anything..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setIsFocused(true)}
            className="flex-1 bg-transparent outline-none text-sm"
            style={{ color: "var(--text-primary)" }}
          />
          <div
            className="hidden sm:flex items-center gap-1 px-1.5 py-0.5 rounded text-xs flex-shrink-0"
            style={{
              background: "var(--border-light)",
              color: "var(--text-muted)",
              border: "1px solid var(--border-medium)",
              fontSize: "11px",
            }}
          >
            <Command className="w-2.5 h-2.5" />
            <span>K</span>
          </div>
        </div>

        {/* Dropdown Overlay */}
        {isFocused && (
          <div
            className="absolute left-0 right-0 mt-1 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-lg z-50 overflow-hidden"
          >
            <div className="max-h-80 overflow-y-auto py-2">
              {/* Navigation links section */}
              {visibleNavs.length > 0 && (
                <div className="px-3 py-1.5">
                  <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">
                    Navigation
                  </p>
                  <div className="space-y-0.5">
                    {visibleNavs.map((nav) => (
                      <button
                        key={`${nav.label}-${nav.to}`}
                        onClick={() => {
                          navigate(nav.to);
                          setIsFocused(false);
                        }}
                        className="w-full text-left px-2 py-1.5 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 hover:text-gray-900 dark:hover:text-white transition-colors flex items-center justify-between"
                      >
                        <span>{nav.label}</span>
                        <span className="text-xs text-gray-400 dark:text-gray-500">Go to page</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Projects section */}
              {searchQuery.trim() && (
                <div className="border-t border-gray-100 dark:border-gray-700/50 px-3 py-2 mt-1">
                  <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">
                    Projects
                  </p>
                  {isLoading ? (
                    <div className="py-2 text-center text-xs text-gray-400 dark:text-gray-500">
                      Searching projects...
                    </div>
                  ) : projects.length > 0 ? (
                    <div className="space-y-0.5">
                      {projects.map((project) => (
                        <button
                          key={project.id}
                          onClick={() => {
                            navigate(`/projects/${project.id}`);
                            setIsFocused(false);
                          }}
                          className="w-full text-left px-2 py-1.5 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 hover:text-gray-900 dark:hover:text-white transition-colors flex flex-col"
                        >
                          <span className="font-medium truncate">{project.name}</span>
                          {project.description && (
                            <span className="text-xs text-gray-400 dark:text-gray-500 truncate mt-0.5">
                              {project.description}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="py-2 text-center text-xs text-gray-400 dark:text-gray-500">
                      No matching projects found
                    </div>
                  )}
                </div>
              )}

              {visibleNavs.length === 0 && !searchQuery.trim() && (
                <div className="py-6 text-center text-sm text-gray-400 dark:text-gray-500">
                  No results found
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Right Actions ── */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {/* Theme toggle */}
        <button
          id="topbar-theme-btn"
          onClick={toggleTheme}
          className="p-2 rounded-lg transition-colors"
          style={{ color: "var(--text-secondary)" }}
          onMouseEnter={e => e.currentTarget.style.background = "var(--surface-hover)"}
          onMouseLeave={e => e.currentTarget.style.background = "transparent"}
          title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        >
          {theme === "dark"
            ? <Sun className="w-4.5 h-4.5" style={{ width: "18px", height: "18px" }} />
            : <Moon className="w-4.5 h-4.5" style={{ width: "18px", height: "18px" }} />
          }
        </button>

        {/* Bell */}
        <div className="relative">
          <button
            id="topbar-notif-btn"
            onClick={() => setNotifOpen(o => !o)}
            className="p-2 rounded-lg transition-colors relative"
            style={{
              color: "var(--text-secondary)",
              background: notifOpen ? "var(--surface-hover)" : "transparent",
            }}
            onMouseEnter={e => { if (!notifOpen) e.currentTarget.style.background = "var(--surface-hover)"; }}
            onMouseLeave={e => { if (!notifOpen) e.currentTarget.style.background = "transparent"; }}
            title="Notifications"
          >
            <Bell style={{ width: "18px", height: "18px" }} />
            {unreadCount > 0 && (
              <span
                className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full flex items-center justify-center text-white font-bold leading-none"
                style={{
                  background: "var(--primary)",
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

        {/* User Dropdown */}
        <Dropdown
          trigger={
            <div
              id="topbar-user-menu"
              className="flex items-center gap-2 cursor-pointer px-2 py-1.5 rounded-lg transition-colors"
              onMouseEnter={e => e.currentTarget.style.background = "var(--surface-hover)"}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}
            >
              {/* Avatar circle with initials */}
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                style={{
                  background: "var(--primary)",
                  color: "#fff",
                }}
              >
                {user?.profile_picture
                  ? <img
                      src={user.profile_picture}
                      alt={user.name}
                      className="w-8 h-8 rounded-full object-cover"
                    />
                  : getInitials(user?.name)
                }
              </div>
              {/* Name + Role (hidden on small screens) */}
              <div className="hidden md:block text-left">
                <p className="text-sm font-semibold leading-tight" style={{ color: "var(--text-primary)" }}>
                  {user?.name || "User"}
                </p>
                <p className="text-xs leading-tight" style={{ color: "var(--text-muted)" }}>
                  {getRoleLabel(user?.role)}
                </p>
              </div>
              <ChevronDown className="w-3.5 h-3.5 hidden md:block flex-shrink-0" style={{ color: "var(--text-muted)" }} />
            </div>
          }
          align="right"
        >
          <div className="px-4 py-3" style={{ borderBottom: "1px solid var(--border-light)" }}>
            <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{user?.name}</p>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{user?.email}</p>
            <span
              className="inline-block mt-1.5 text-xs font-medium px-2 py-0.5 rounded-full"
              style={{ background: "var(--primary-light)", color: "var(--primary)" }}
            >
              {getRoleLabel(user?.role)}
            </span>
          </div>
          <DropdownItem onClick={() => window.location.href = "/settings"}>
            <Settings className="w-4 h-4 inline mr-2" />
            Settings
          </DropdownItem>
          <DropdownItem onClick={logout} danger>
            <LogOut className="w-4 h-4 inline mr-2" />
            Logout
          </DropdownItem>
        </Dropdown>
      </div>
    </header>
  );
}
