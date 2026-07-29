import { useEffect, useRef, useCallback } from "react";
import { Outlet, useLocation } from "react-router-dom";
import MobileTopBar from "./MobileTopBar";
import BottomTabBar from "./BottomTabBar";
import { ToastContainer } from "../../components/ui/Toast";
import { ErrorBoundary } from "../../components/ui/ErrorBoundary";
import { TransitionProvider } from "../../context/TransitionContext";
import PageTransitionOverlay from "../../components/transitions/PageTransitionOverlay";
import PullToRefresh from "../components/PullToRefresh";
import { useQueryClient } from "@tanstack/react-query";

/**
 * Authenticated mobile shell: top app bar + scrollable content + bottom tab bar.
 */
export default function MobileShell() {
  const pageContentRef = useRef(null);
  const queryClient = useQueryClient();
  const location = useLocation();

  useEffect(() => {
    if (pageContentRef.current) {
      pageContentRef.current.scrollTop = 0;
    }
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [location.pathname]);

  useEffect(() => {
    const currentViews = parseInt(localStorage.getItem("dpms_total_views") || "1420", 10);
    localStorage.setItem("dpms_total_views", (currentViews + 1).toString());
  }, []);

  const handleRefresh = useCallback(async () => {
    // Invalidate all active queries — each page's useQuery hooks will refetch
    await queryClient.invalidateQueries();
    // Small delay to let spinners show
    await new Promise((r) => setTimeout(r, 400));
  }, [queryClient]);

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
            <PullToRefresh onRefresh={handleRefresh}>
              <ErrorBoundary>
                <Outlet />
              </ErrorBoundary>
            </PullToRefresh>
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
