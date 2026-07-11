import { Outlet } from "react-router-dom";
import { TopBar } from "./TopBar";
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
      <div className="flex flex-col min-h-screen w-screen relative overflow-hidden bg-[#FAFAFA] dark:bg-[#001229] transition-colors duration-300">

        {/* Floating Navbar */}
        <div className="relative z-50">
          <TopBar />
        </div>

        {/* Main Content — offset by navbar height + spacing */}
        <main
          ref={pageContentRef}
          className="flex-1 overflow-y-auto pt-[88px] relative z-10 page-content-animated"
        >
          <div className="page-content-container">
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
