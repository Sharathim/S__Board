import { Outlet } from "react-router-dom";
import MobileTopBar from "./MobileTopBar";
import BottomTabBar from "./BottomTabBar";
import { ToastContainer } from "../../components/ui/Toast";
import { ErrorBoundary } from "../../components/ui/ErrorBoundary";
import { TransitionProvider } from "../../context/TransitionContext";
import PageTransitionOverlay from "../../components/transitions/PageTransitionOverlay";
import { useEffect, useRef } from "react";

/**
 * Authenticated mobile shell: top app bar + scrollable content + bottom tab bar.
 */
export default function MobileShell() {
  const pageContentRef = useRef(null);

  useEffect(() => {
    const currentViews = parseInt(localStorage.getItem("dpms_total_views") || "1420", 10);
    localStorage.setItem("dpms_total_views", (currentViews + 1).toString());
  }, []);

  return (
    <TransitionProvider pageContentRef={pageContentRef}>
      <div className="min-h-screen bg-[#fbfbff] dark:bg-[#001229] transition-colors duration-300 relative overflow-hidden">
        <MobileTopBar />

        {/* Page content — padded to clear fixed bars */}
        <main
          ref={pageContentRef}
          className="mobile-page-enter page-content-animated relative z-10"
          style={{
            paddingTop: "calc(56px + env(safe-area-inset-top, 0px))",
            paddingBottom: "calc(60px + env(safe-area-inset-bottom, 0px))",
            minHeight: "100vh",
          }}
        >
          <div className="px-4 py-4 page-content-container">
            <ErrorBoundary>
              <Outlet />
            </ErrorBoundary>
          </div>
        </main>

        <BottomTabBar />

        {/* Page Transition Overlay */}
        <PageTransitionOverlay />

        <ToastContainer />
      </div>
    </TransitionProvider>
  );
}
