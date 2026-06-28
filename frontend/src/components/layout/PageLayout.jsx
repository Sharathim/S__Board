import { useEffect, useState, useRef } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { TopBar } from "./TopBar";
import { ToastContainer } from "../ui/Toast";
import { ErrorBoundary } from "../ui/ErrorBoundary";

export default function PageLayout() {
  const location = useLocation();
  const [displayLocation, setDisplayLocation] = useState(location);
  const [transitionStage, setTransitionStage] = useState("page-enter-active");
  const timeoutRef = useRef(null);

  useEffect(() => {
    if (location.pathname !== displayLocation.pathname) {
      // Start exit animation
      setTransitionStage("page-exit-active");

      // After exit completes, swap route and start enter
      timeoutRef.current = setTimeout(() => {
        setDisplayLocation(location);
        setTransitionStage("page-enter-active");
      }, 180); // matches CSS exit duration
    }
    return () => clearTimeout(timeoutRef.current);
  }, [location, displayLocation]);

  return (
    <div className="flex flex-col min-h-screen w-screen bg-[#f8f9fd] dark:bg-slate-950">
      {/* Floating Navbar */}
      <TopBar />

      {/* Main Content — width matched to navbar pill */}
      <main className="flex-1 overflow-y-auto pt-[88px]">
        <div className="page-content-container">
          <div className={transitionStage}>
            <ErrorBoundary>
              <Outlet />
            </ErrorBoundary>
          </div>
        </div>
      </main>

      <ToastContainer />
    </div>
  );
}
