import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import gsap from "gsap";
import {
  LayoutDashboard, FolderKanban, GraduationCap, BookOpen, Megaphone, Settings,
  Sun, Moon, HelpCircle, LogOut
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../hooks/useTheme";
import { ConfirmDialog } from "../ui/ConfirmDialog";

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/projects", label: "Projects", icon: FolderKanban },
  { to: "/faculty", label: "Faculty", icon: GraduationCap },
  { to: "/classes", label: "Classes", icon: BookOpen },
  { to: "/updates", label: "Announcements", icon: Megaphone },
  { to: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const { theme, toggleTheme } = useTheme();
  const { logout } = useAuth();
  const location = useLocation();
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);

  const handleMouseEnter = (e) => {
    gsap.to(e.currentTarget, {
      scale: 1.12,
      duration: 0.2,
      ease: "power2.out",
    });
  };

  const handleMouseLeave = (e) => {
    gsap.to(e.currentTarget, {
      scale: 1.0,
      duration: 0.2,
      ease: "power2.out",
    });
  };

  return (
    <>
      {/* ── Floating Vertical Side Capsules (Desktop Only) ── */}
      <aside className="fixed left-6 top-24 z-40 hidden lg:flex flex-col gap-5 select-none transition-all duration-300">
        
        {/* 1. Theme Switcher Capsule Pill */}
        <div className="side-capsule-pill">
          <button
            onClick={() => theme === "dark" && toggleTheme()}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            className={`side-pill-icon ${theme !== "dark" ? "side-pill-icon-active" : ""}`}
            title="Light Mode"
          >
            <Sun className="w-4.5 h-4.5" />
          </button>

          <button
            onClick={() => theme !== "dark" && toggleTheme()}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            className={`side-pill-icon ${theme === "dark" ? "side-pill-icon-active" : ""}`}
            title="Dark Mode"
          >
            <Moon className="w-4.5 h-4.5" />
          </button>
        </div>

        {/* 2. Main Routes Navigation Capsule Pill */}
        <div className="side-capsule-pill py-3">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.to;

            return (
              <NavLink
                key={item.to}
                to={item.to}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                className={`side-pill-icon relative group ${isActive ? "side-pill-icon-active" : ""}`}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />

                {/* Tooltip Popup */}
                <div className="absolute left-full ml-3 px-3 py-1.5 rounded-xl bg-[#171717] dark:bg-white text-white dark:text-[#171717] text-xs font-bold opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 whitespace-nowrap shadow-xl z-50">
                  {item.label}
                  <span className="absolute top-1/2 -translate-y-1/2 -left-1.5 w-2 h-2 rotate-45 bg-[#171717] dark:bg-white" />
                </div>
              </NavLink>
            );
          })}
        </div>

        {/* 3. Help & Sign Out Capsule Pill */}
        <div className="side-capsule-pill">
          <button
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onClick={() => window.open("https://github.com/Sharathim/S__Board", "_blank")}
            className="side-pill-icon relative group"
            title="Help & Info"
          >
            <HelpCircle className="w-4.5 h-4.5" />
            <div className="absolute left-full ml-3 px-3 py-1.5 rounded-xl bg-[#171717] dark:bg-white text-white dark:text-[#171717] text-xs font-bold opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 whitespace-nowrap shadow-xl z-50">
              Help
              <span className="absolute top-1/2 -translate-y-1/2 -left-1.5 w-2 h-2 rotate-45 bg-[#171717] dark:bg-white" />
            </div>
          </button>

          <button
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onClick={() => setLogoutConfirmOpen(true)}
            className="side-pill-icon text-rose-500 hover:text-rose-600 relative group"
            title="Sign Out"
          >
            <LogOut className="w-4.5 h-4.5" />
            <div className="absolute left-full ml-3 px-3 py-1.5 rounded-xl bg-rose-600 text-white text-xs font-bold opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 whitespace-nowrap shadow-xl z-50">
              Sign Out
              <span className="absolute top-1/2 -translate-y-1/2 -left-1.5 w-2 h-2 rotate-45 bg-rose-600" />
            </div>
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
