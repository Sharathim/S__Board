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
  { to: "/projects", label: "Projects Registry", icon: FolderKanban },
  { to: "/faculty", label: "Faculty Directory", icon: GraduationCap },
  { to: "/classes", label: "Classrooms", icon: BookOpen },
  { to: "/updates", label: "Announcements", icon: Megaphone },
];

export function Sidebar() {
  const { logout } = useAuth();
  const location = useLocation();
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const sidebarRef = useRef(null);

  useEffect(() => {
    if (sidebarRef.current) {
      gsap.from(sidebarRef.current, {
        opacity: 0,
        x: -30,
        duration: 0.6,
        ease: "power3.out",
      });
    }
  }, []);

  const handleMouseEnter = (e) => {
    gsap.to(e.currentTarget, {
      scale: 1.14,
      rotation: 3,
      duration: 0.25,
      ease: "back.out(2)",
    });
  };

  const handleMouseLeave = (e) => {
    gsap.to(e.currentTarget, {
      scale: 1.0,
      rotation: 0,
      duration: 0.25,
      ease: "power2.out",
    });
  };

  const handleMouseDown = (e) => {
    gsap.to(e.currentTarget, {
      scale: 0.92,
      duration: 0.1,
      ease: "power1.inOut",
    });
  };

  return (
    <>
      {/* ── High Quality Glassmorphic Side Capsule Sidebar (Desktop Only) ── */}
      <aside
        ref={sidebarRef}
        className="fixed left-6 top-[92px] z-40 hidden lg:flex flex-col select-none transition-all duration-300"
      >
        <div className="premium-side-panel py-3.5 px-1.5 flex flex-col items-center gap-2">
          {/* Main Navigation Items */}
          {mainNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.to;

            return (
              <NavLink
                key={item.to}
                to={item.to}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                onMouseDown={handleMouseDown}
                className={`side-item-btn relative group ${isActive ? "side-item-active" : ""}`}
              >
                <Icon className="w-5 h-5 flex-shrink-0 stroke-[2.2]" />

                {/* Glassmorphic Tooltip Popup */}
                <div className="absolute left-full ml-3.5 px-3 py-1.5 rounded-xl bg-slate-900/90 dark:bg-white/95 text-white dark:text-slate-900 text-xs font-bold opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 whitespace-nowrap shadow-xl z-50 backdrop-blur-md border border-slate-700/50 dark:border-slate-200/50">
                  {item.label}
                  <span className="absolute top-1/2 -translate-y-1/2 -left-1.5 w-2 h-2 rotate-45 bg-slate-900/90 dark:bg-white/95" />
                </div>
              </NavLink>
            );
          })}

          {/* Subtle Visual Divider Separator */}
          <div className="w-6 h-[1px] bg-slate-200/80 dark:bg-slate-700/80 my-2 rounded-full" />

          {/* Settings Navigation Item */}
          <NavLink
            to="/settings"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onMouseDown={handleMouseDown}
            className={`side-item-btn relative group ${location.pathname === "/settings" ? "side-item-active" : ""}`}
            title="Settings"
          >
            <Settings className="w-5 h-5 flex-shrink-0 stroke-[2.2]" />
            <div className="absolute left-full ml-3.5 px-3 py-1.5 rounded-xl bg-slate-900/90 dark:bg-white/95 text-white dark:text-slate-900 text-xs font-bold opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 whitespace-nowrap shadow-xl z-50 backdrop-blur-md border border-slate-700/50 dark:border-slate-200/50">
              Settings
              <span className="absolute top-1/2 -translate-y-1/2 -left-1.5 w-2 h-2 rotate-45 bg-slate-900/90 dark:bg-white/95" />
            </div>
          </NavLink>

          {/* Sign Out Action Button */}
          <button
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onMouseDown={handleMouseDown}
            onClick={() => setLogoutConfirmOpen(true)}
            className="side-item-btn text-rose-500 hover:text-rose-600 dark:text-rose-400 dark:hover:text-rose-300 relative group"
            title="Sign Out"
          >
            <LogOut className="w-5 h-5 flex-shrink-0 stroke-[2.2]" />
            <div className="absolute left-full ml-3.5 px-3 py-1.5 rounded-xl bg-rose-600 text-white text-xs font-bold opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 whitespace-nowrap shadow-xl z-50">
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
