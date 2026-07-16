import { Outlet } from "react-router-dom";
import { TopBar } from "./TopBar";
import { Sidebar } from "./Sidebar";
import { ToastContainer } from "../ui/Toast";
import { ErrorBoundary } from "../ui/ErrorBoundary";
import { TransitionProvider } from "../../context/TransitionContext";
import PageTransitionOverlay from "../transitions/PageTransitionOverlay";

import { useEffect, useRef } from "react";

export default function PageLayout() {
  const pageContentRef = useRef(null);

  useEffect(() => {
    const currentViews = parseInt(localStorage.getItem("dpms_total_views") || "1420", 10);
    localStorage.setItem("dpms_total_views", (currentViews + 1).toString());
  }, []);

  return (
    <TransitionProvider pageContentRef={pageContentRef}>
      <div className="h-screen w-screen flex flex-col overflow-hidden bg-[var(--background)] transition-colors duration-300 relative">

        {/* Top Floating Navbar */}
        <TopBar />

        {/* Vertical Floating Left Navigation Capsules */}
        <Sidebar />

        {/* Main Content Area */}
        <main
          ref={pageContentRef}
          className="flex-1 overflow-y-auto relative z-10 page-content-animated pt-20 pb-4 px-4 lg:pl-[74px] lg:pr-4"
        >
          <div className="page-content-container max-w-none w-full">
            <ErrorBoundary>
              <Outlet />
            </ErrorBoundary>
          </div>
        </main>

        {/* Page Transition Overlay */}
        <PageTransitionOverlay />

        <ToastContainer />
      </div>
    </TransitionProvider>
  );
}
