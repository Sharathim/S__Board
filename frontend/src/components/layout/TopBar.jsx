import { useState } from "react";
import { Menu, Bell, Moon, Sun, LogOut, Search, Settings, ChevronDown, Command } from "lucide-react";
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
  if (!role) return "";
  const map = { HOD: "Administrator", FACULTY: "Faculty", STUDENT: "Student" };
  return map[role] || role;
}

export function TopBar({ onMenuClick }) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { unreadCount } = useNotificationContext();
  const [notifOpen, setNotifOpen] = useState(false);

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
        className="flex-1 max-w-md search-bar rounded-lg flex items-center gap-2 px-3 py-2 transition-all duration-200 cursor-text"
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
