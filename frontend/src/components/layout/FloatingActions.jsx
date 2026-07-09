import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell, Moon, Sun, Search, X, Sparkles, LogOut, Settings,
  Menu
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

function getRoleColor(role) {
  const map = {
    HOD: { from: "#7C3AED", to: "#5B21B6", light: "#EDE9FE", text: "#6D28D9" },
    FACULTY: { from: "#3B82F6", to: "#1D4ED8", light: "#DBEAFE", text: "#1D4ED8" },
    STUDENT: { from: "#10B981", to: "#059669", light: "#D1FAE5", text: "#059669" },
  };
  return map[role] || { from: "#6B7280", to: "#4B5563", light: "#F3F4F6", text: "#6B7280" };
}

function getRoleLabel(role) {
  const map = { HOD: "Administrator", FACULTY: "Faculty", STUDENT: "Student" };
  return map[role] || role;
}

export function FloatingActions({ onMobileMenuToggle }) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { unreadCount } = useNotificationContext();
  const [notifOpen, setNotifOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const searchInputRef = useRef(null);
  const navigate = useNavigate();
  const roleColors = getRoleColor(user?.role);

  // Focus search input when opened
  useEffect(() => {
    if (searchOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [searchOpen]);

  // Keyboard shortcut: Cmd/Ctrl+K to toggle search
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(prev => !prev);
      }
      if (e.key === "Escape") {
        setSearchOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <>
      <div className="floating-actions">
        {/* Mobile menu button */}
        <button
          className="floating-action-btn lg:hidden"
          onClick={onMobileMenuToggle}
          title="Menu"
        >
          <Menu className="w-[20px] h-[20px]" />
        </button>

        {/* Search Button */}
        <button
          className="floating-action-btn floating-search-btn"
          onClick={() => setSearchOpen(prev => !prev)}
          title="Search (⌘K)"
        >
          <Search className="w-[18px] h-[18px]" />
          {!searchOpen && (
            <span className="floating-search-shortcut hidden sm:flex">⌘K</span>
          )}
        </button>

        {/* Theme Toggle */}
        <button
          className="floating-action-btn"
          onClick={toggleTheme}
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
            className="floating-action-btn"
            onClick={() => setNotifOpen(o => !o)}
            title="Notifications"
          >
            <Bell
              className={`w-[18px] h-[18px] ${unreadCount > 0 ? "animate-[wiggle_1s_ease-in-out_infinite]" : ""}`}
            />
            {unreadCount > 0 && (
              <span className="floating-badge">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </button>
          <NotificationsPanel open={notifOpen} onClose={() => setNotifOpen(false)} />
        </div>

        {/* User Avatar Dropdown */}
        <Dropdown
          trigger={
            <div className="floating-avatar">
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

          <DropdownItem onClick={() => setLogoutConfirmOpen(true)} danger>
            <LogOut className="w-4 h-4 inline mr-2" />
            Sign Out
          </DropdownItem>
        </Dropdown>
      </div>

      {/* Expandable Search Bar */}
      {searchOpen && (
        <div className="floating-search-overlay" onClick={() => setSearchOpen(false)}>
          <div className="floating-search-container" onClick={(e) => e.stopPropagation()}>
            <Search className="w-5 h-5 text-slate-400 flex-shrink-0" />
            <input
              ref={searchInputRef}
              type="text"
              className="floating-search-input"
              placeholder="Search for projects, students, classes..."
            />
            <button
              className="floating-search-close"
              onClick={() => setSearchOpen(false)}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Logout confirmation */}
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
