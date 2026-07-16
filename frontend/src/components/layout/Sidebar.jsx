import { useState, useEffect, useRef } from "react";
import { NavLink, useLocation } from "react-router-dom";
import gsap from "gsap";
import {
  LayoutDashboard, FolderKanban, GraduationCap, BookOpen, Megaphone, Settings, LogOut
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { ConfirmDialog } from "../ui/ConfirmDialog";

const mainNavItems = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/projects", label: "Projects", icon: FolderKanban },
  { to: "/faculty", label: "Faculty", icon: GraduationCap },
  { to: "/classes", label: "Classes", icon: BookOpen },
  { to: "/updates", label: "Announcements", icon: Megaphone },
];

export function Sidebar() {
  const { logout } = useAuth();
  const location = useLocation();
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const sidebarRef = useRef(null);

  useEffect(() => {
    if (sidebarRef.current) {
      gsap.from(sidebarRef.current.children, {
        opacity: 0,
        x: -25,
        duration: 0.5,
        stagger: 0.08,
        ease: "power3.out",
      });
    }
  }, []);

  const handleMouseEnter = (e) => {
    gsap.to(e.currentTarget, {
      scale: 1.15,
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
      <aside
        ref={sidebarRef}
        className="fixed left-6 top-24 z-40 hidden lg:flex flex-col gap-4 select-none transition-all duration-300"
      >
        {/* 1. Main Routes Navigation Capsule Pill */}
        <div className="side-capsule-pill py-2.5">
          {mainNavItems.map((item) => {
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
                <Icon className="w-4.5 h-4.5 flex-shrink-0" />

                {/* Tooltip Popup */}
                <div className="absolute left-full ml-3 px-3 py-1.5 rounded-xl bg-[#171717] dark:bg-white text-white dark:text-[#171717] text-xs font-bold opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 whitespace-nowrap shadow-xl z-50">
                  {item.label}
                  <span className="absolute top-1/2 -translate-y-1/2 -left-1.5 w-2 h-2 rotate-45 bg-[#171717] dark:bg-white" />
                </div>
              </NavLink>
            );
          })}
        </div>

        {/* 2. Single Bottom Card Pill: Grouped Settings & Sign Out ── */}
        <div className="side-capsule-pill">
          {/* Settings Nav Item */}
          <NavLink
            to="/settings"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            className={`side-pill-icon relative group ${location.pathname === "/settings" ? "side-pill-icon-active" : ""}`}
            title="Settings"
          >
            <Settings className="w-4.5 h-4.5 flex-shrink-0" />
            <div className="absolute left-full ml-3 px-3 py-1.5 rounded-xl bg-[#171717] dark:bg-white text-white dark:text-[#171717] text-xs font-bold opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 whitespace-nowrap shadow-xl z-50">
              Settings
              <span className="absolute top-1/2 -translate-y-1/2 -left-1.5 w-2 h-2 rotate-45 bg-[#171717] dark:bg-white" />
            </div>
          </NavLink>

          {/* Sign Out Button */}
          <button
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onClick={() => setLogoutConfirmOpen(true)}
            className="side-pill-icon text-rose-500 hover:text-rose-600 relative group"
            title="Sign Out"
          >
            <LogOut className="w-4.5 h-4.5 flex-shrink-0" />
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
