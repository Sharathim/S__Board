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
      <div className="h-[100dvh] min-h-screen w-full flex flex-col overflow-hidden bg-[#FFFFFF] dark:bg-[#000000] transition-colors duration-300 relative">
        <MobileTopBar />

        {/* Page content — inner scrollable */}
        <main
          ref={pageContentRef}
          className="flex-1 overflow-y-auto w-full mobile-page-enter page-content-animated relative z-10 mobile-hide-scrollbar overscroll-y-contain pb-[calc(60px+env(safe-area-inset-bottom,0px))]"
        >
          <div className="px-4 py-3 page-content-container">
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
