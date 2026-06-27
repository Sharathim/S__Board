import { useState } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { ToastContainer } from "../ui/Toast";
import { ErrorBoundary } from "../ui/ErrorBoundary";

export default function PageLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    return localStorage.getItem("sidebarCollapsed") === "true";
  });

  const handleToggleCollapse = () => {
    setSidebarCollapsed(prev => {
      const next = !prev;
      localStorage.setItem("sidebarCollapsed", String(next));
      return next;
    });
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#f8f9fd] dark:bg-slate-950">
      <div className="h-[72px] w-full sticky top-0 z-50 flex-shrink-0">
        <TopBar 
          onMenuClick={() => setSidebarOpen(true)}
          isCollapsed={sidebarCollapsed}
          onToggleCollapse={handleToggleCollapse}
        />
      </div>
      <div className="flex flex-1 overflow-hidden min-w-0">
        <Sidebar
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          isCollapsed={sidebarCollapsed}
          onToggleCollapse={handleToggleCollapse}
        />
        <main className="flex-1 overflow-y-auto bg-[#f8f9fd] dark:bg-slate-950">
          <div className="p-8 w-full max-w-[1400px] mx-auto">
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
