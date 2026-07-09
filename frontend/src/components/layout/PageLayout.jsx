import { useState, useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { SidePanel } from "./SidePanel";
import { FloatingActions } from "./FloatingActions";
import { PageTransition } from "./PageTransition";
import { ToastContainer } from "../ui/Toast";
import { ErrorBoundary } from "../ui/ErrorBoundary";

export default function PageLayout() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const currentViews = parseInt(localStorage.getItem("dpms_total_views") || "1420", 10);
    localStorage.setItem("dpms_total_views", (currentViews + 1).toString());
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  // Load collapsed state from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("dpms_sidebar_collapsed");
    if (saved === "true") setIsCollapsed(true);
  }, []);

  const handleToggleCollapse = () => {
    setIsCollapsed(prev => {
      const next = !prev;
      localStorage.setItem("dpms_sidebar_collapsed", String(next));
      return next;
    });
  };

  return (
    <div className="app-layout">
      {/* Left Side Panel */}
      <SidePanel
        isCollapsed={isCollapsed}
        onToggleCollapse={handleToggleCollapse}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />

      {/* Main Content Area */}
      <div className="app-main">
        {/* Floating Actions (search, theme, notifications, profile) */}
        <FloatingActions onMobileMenuToggle={() => setMobileOpen(prev => !prev)} />

        {/* Page Content with transitions */}
        <main className="app-content">
          <div className="page-content-container">
            <ErrorBoundary>
              <PageTransition>
                <Outlet />
              </PageTransition>
            </ErrorBoundary>
          </div>
        </main>
      </div>

      <ToastContainer />
    </div>
  );
}
