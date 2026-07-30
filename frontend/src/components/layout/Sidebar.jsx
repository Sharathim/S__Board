import { useState, useEffect, useRef } from "react";
import { NavLink, useLocation } from "react-router-dom";
import gsap from "gsap";
import {
  LayoutDashboard, FolderKanban, GraduationCap, BookOpen, Megaphone, Settings, LogOut, FileText, CalendarDays, CalendarClock
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { ConfirmDialog } from "../ui/ConfirmDialog";

const mainNavItems = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/projects", label: "Projects Registry", icon: FolderKanban },
  { to: "/faculty", label: "Faculty Directory", icon: GraduationCap },
  { to: "/classes", label: "Classrooms", icon: BookOpen },
  { to: "/timetable", label: "Timetable", icon: CalendarDays, hodOnly: true },
  { to: "/leave", label: "Leave & Permission", icon: CalendarClock, studentHidden: true },
  { to: "/updates", label: "Announcements", icon: Megaphone },
  { to: "/notes", label: "Notes & Docs", icon: FileText },
];


export function Sidebar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);

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

  const brandDest = user?.role === "HOD" ? "/dashboard" : user?.role === "FACULTY" ? "/faculty" : "/classes";

  return (
    <>
      {/* ── Single Unified Left Navigation Pill Panel (Vertically Centered & Non-Scrollable) ── */}
      <aside className="fixed left-3 top-1/2 -translate-y-1/2 z-40 hidden lg:flex flex-col select-none transition-all duration-300">
        <div className="premium-side-panel py-3 px-1.5 flex flex-col items-center gap-1.5 max-h-[96vh] overflow-hidden">
          
          {/* 1. Website Logo Badge at Top */}
          <NavLink
            to={brandDest}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onMouseDown={handleMouseDown}
            className="w-11 h-11 rounded-full bg-white dark:bg-slate-800 shadow-md border border-slate-100 dark:border-slate-700/80 flex items-center justify-center flex-shrink-0 transition-transform mb-2 mt-0.5 cursor-pointer relative group"
            title="Hive"
          >
            <Logo variant="icon" alt="Hive Logo" className="w-6 h-6 object-contain" />
            
            {/* Tooltip */}
            <div className="absolute left-full ml-3.5 px-3.5 py-1.5 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-xs font-black opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 whitespace-nowrap shadow-2xl z-[100] border border-slate-800 dark:border-slate-200">
              Hive
              <span className="absolute top-1/2 -translate-y-1/2 -left-1 w-2 h-2 rotate-45 bg-slate-900 dark:bg-white" />
            </div>
          </NavLink>

          {/* 2. Main Navigation Links */}
          {mainNavItems
            .filter((item) => {
              if (item.to === "/dashboard" && user?.role !== "HOD") return false;
              if (item.hodOnly && user?.role !== "HOD") return false;
              if (item.studentHidden && user?.role === "STUDENT") return false;
              return true;
            })
            .map((item) => {
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

                  {/* High Contrast Crystal Clear Tooltip */}
                  <div className="absolute left-full ml-3.5 px-3.5 py-1.5 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-xs font-black opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 whitespace-nowrap shadow-2xl z-[100] border border-slate-800 dark:border-slate-200">
                    {item.label}
                    <span className="absolute top-1/2 -translate-y-1/2 -left-1 w-2 h-2 rotate-45 bg-slate-900 dark:bg-white" />
                  </div>
                </NavLink>
              );
            })}

          {/* 3. Subtle Horizontal Divider */}
          <div className="w-6 h-[1px] bg-slate-200/80 dark:bg-slate-700/80 my-1 rounded-full flex-shrink-0" />

          {/* 4. Settings Navigation Item */}
          <NavLink
            to="/settings"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onMouseDown={handleMouseDown}
            className={`side-item-btn relative group ${location.pathname === "/settings" ? "side-item-active" : ""}`}
            title="Settings"
          >
            <Settings className="w-5 h-5 flex-shrink-0 stroke-[2.2]" />
            <div className="absolute left-full ml-3.5 px-3.5 py-1.5 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-xs font-black opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 whitespace-nowrap shadow-2xl z-[100] border border-slate-800 dark:border-slate-200">
              Settings
              <span className="absolute top-1/2 -translate-y-1/2 -left-1 w-2 h-2 rotate-45 bg-slate-900 dark:bg-white" />
            </div>
          </NavLink>

          {/* 5. Sign Out Action Button */}
          <button
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onMouseDown={handleMouseDown}
            onClick={() => setLogoutConfirmOpen(true)}
            className="side-item-btn text-rose-500 hover:text-rose-600 dark:text-rose-400 dark:hover:text-rose-300 relative group"
            title="Sign Out"
          >
            <LogOut className="w-5 h-5 flex-shrink-0 stroke-[2.2]" />
            <div className="absolute left-full ml-3.5 px-3.5 py-1.5 rounded-xl bg-rose-600 text-white text-xs font-black opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 whitespace-nowrap shadow-2xl z-[100]">
              Sign Out
              <span className="absolute top-1/2 -translate-y-1/2 -left-1 w-2 h-2 rotate-45 bg-rose-600" />
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
