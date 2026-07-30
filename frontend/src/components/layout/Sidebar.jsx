import { useState, useEffect, useRef } from "react";
import { NavLink, useLocation } from "react-router-dom";
import gsap from "gsap";
import {
  LayoutDashboard, FolderKanban, GraduationCap, BookOpen, Megaphone, Settings, LogOut, FileText, CalendarDays, CalendarClock, Briefcase
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { ConfirmDialog } from "../ui/ConfirmDialog";
import { Logo } from "../ui/Logo";

const mainNavItems = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/projects", label: "Projects Registry", icon: FolderKanban },
  { to: "/faculty", label: "Faculty Directory", icon: GraduationCap },
  { to: "/classes", label: "Classrooms", icon: BookOpen },
  { to: "/placement", label: "Placement AI", icon: Briefcase },
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

  const studentClass = user?.student_profile?.class_name;
  const brandDest = user?.role === "HOD" ? "/dashboard" : user?.role === "FACULTY" ? "/faculty" : studentClass ? `/classes/${studentClass}` : "/classes";

  return (
    <>
      {/* ── Single Full-Height Vertical Navigation Pill Panel (Top-to-Bottom) ── */}
      <aside className="fixed left-3.5 top-3.5 bottom-3.5 z-[100] hidden lg:flex flex-col select-none transition-all duration-300">
        <div className="premium-side-panel h-full py-4 px-2 flex flex-col items-center justify-between">
          
          {/* 1. TOP: Website Logo Badge */}
          <div className="flex flex-col items-center shrink-0">
            <NavLink
              to={brandDest}
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
              onMouseDown={handleMouseDown}
              className="neomorphic-logo-btn relative group"
              title="Hive"
            >
              <Logo variant="icon" alt="Hive Logo" className="w-8 h-8 object-contain" />
              
              {/* Tooltip */}
              <div className="absolute left-full ml-4 px-3.5 py-1.5 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-xs font-bold opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 whitespace-nowrap shadow-2xl z-[100] border border-slate-800 dark:border-slate-200">
                Hive
                <span className="absolute top-1/2 -translate-y-1/2 -left-1 w-2 h-2 rotate-45 bg-slate-900 dark:bg-white" />
              </div>
            </NavLink>
          </div>

          {/* 2. MIDDLE: Main Navigation Links with space above & below */}
          <div className="flex flex-col items-center gap-2.5 my-auto shrink-0 py-2">
            {mainNavItems
              .filter((item) => {
                if (item.to === "/dashboard" && user?.role !== "HOD") return false;
                if (item.hodOnly && user?.role !== "HOD") return false;
                if (item.studentHidden && user?.role === "STUDENT") return false;
                return true;
              })
              .map((item) => {
                const Icon = item.icon;
                const targetTo = (item.to === "/classes" && user?.role === "STUDENT" && studentClass) ? `/classes/${studentClass}` : item.to;
                const isActive = location.pathname === item.to || (item.to === "/classes" && location.pathname.startsWith("/classes"));

                return (
                  <NavLink
                    key={item.to}
                    to={targetTo}
                    onMouseEnter={handleMouseEnter}
                    onMouseLeave={handleMouseLeave}
                    onMouseDown={handleMouseDown}
                    className={`side-item-btn relative group ${isActive ? "side-item-active" : ""}`}
                  >
                    <div className="side-item-inner flex items-center justify-center w-full h-full">
                      <Icon className="w-5 h-5 flex-shrink-0 stroke-[2.2]" />
                    </div>

                    {/* High Contrast Crystal Clear Tooltip */}
                    <div className="absolute left-full ml-4 px-3.5 py-1.5 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-xs font-bold opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 whitespace-nowrap shadow-2xl z-[100] border border-slate-800 dark:border-slate-200">
                      {item.label}
                      <span className="absolute top-1/2 -translate-y-1/2 -left-1 w-2 h-2 rotate-45 bg-slate-900 dark:bg-white" />
                    </div>
                  </NavLink>
                );
              })}
          </div>

          {/* 3. BOTTOM: Settings & Sign Out links */}
          <div className="flex flex-col items-center gap-2.5 shrink-0">
            <div className="neomorphic-divider" />

            {/* Settings Navigation Item */}
            <NavLink
              to="/settings"
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
              onMouseDown={handleMouseDown}
              className={`side-item-btn relative group ${location.pathname === "/settings" ? "side-item-active" : ""}`}
              title="Settings"
            >
              <div className="side-item-inner flex items-center justify-center w-full h-full">
                <Settings className="w-5 h-5 flex-shrink-0 stroke-[2.2]" />
              </div>
              <div className="absolute left-full ml-4 px-3.5 py-1.5 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-xs font-bold opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 whitespace-nowrap shadow-2xl z-[100] border border-slate-800 dark:border-slate-200">
                Settings
                <span className="absolute top-1/2 -translate-y-1/2 -left-1 w-2 h-2 rotate-45 bg-slate-900 dark:bg-white" />
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
              <div className="side-item-inner flex items-center justify-center w-full h-full">
                <LogOut className="w-5 h-5 flex-shrink-0 stroke-[2.2]" />
              </div>
              <div className="absolute left-full ml-4 px-3.5 py-1.5 rounded-xl bg-rose-600 text-white text-xs font-bold opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 whitespace-nowrap shadow-2xl z-[100]">
                Sign Out
                <span className="absolute top-1/2 -translate-y-1/2 -left-1 w-2 h-2 rotate-45 bg-rose-600" />
              </div>
            </button>
          </div>

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
