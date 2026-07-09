import { Outlet } from "react-router-dom";
import { TopBar } from "./TopBar";
import { DesktopSidebar } from "./Sidebar";
import { ToastContainer } from "../ui/Toast";
import { ErrorBoundary } from "../ui/ErrorBoundary";

import { useEffect, useState } from "react";

export default function PageLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try {
      return localStorage.getItem("sidebar_collapsed") === "true";
    } catch {
      return false;
    }
  });

  // Listen for sidebar collapse changes via custom event
  useEffect(() => {
    const handleCollapseChange = (e) => {
      setSidebarCollapsed(e.detail.collapsed);
    };
    window.addEventListener("sidebar-collapse-change", handleCollapseChange);
    return () => {
      window.removeEventListener("sidebar-collapse-change", handleCollapseChange);
    };
  }, []);

  useEffect(() => {
    const currentViews = parseInt(localStorage.getItem("dpms_total_views") || "1420", 10);
    localStorage.setItem("dpms_total_views", (currentViews + 1).toString());
  }, []);

  const sidebarWidth = sidebarCollapsed ? 72 : 260;

  return (
    <div className="flex min-h-screen w-screen relative overflow-hidden bg-[#fbfbff] dark:bg-[#020617] transition-colors duration-300">

      {/* Desktop Sidebar (hidden on mobile via CSS) */}
      <div className="hidden md:flex flex-shrink-0 relative z-40">
        <DesktopSidebar />
      </div>

      {/* Dynamic margin style for desktop sidebar offset */}
      <style>{`
        @media (min-width: 768px) {
          .layout-main-col {
            margin-left: ${sidebarWidth}px;
            transition: margin-left 0.3s cubic-bezier(0.25, 1, 0.5, 1);
          }
        }
      `}</style>

      {/* Main content area */}
      <div className="flex flex-col flex-1 min-w-0 layout-main-col">
        {/* TopBar: slim utility bar on desktop, floating pill on mobile */}
        <div className="relative z-50">
          <TopBar />
        </div>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto pt-[80px] md:pt-0 relative z-10">
          <div className="page-content-container">
            <ErrorBoundary>
              <Outlet />
            </ErrorBoundary>
          </div>
        </main>
      </div>

      <ToastContainer />
    </div>
  );
}
