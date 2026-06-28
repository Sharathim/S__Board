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
    <div className="flex flex-col min-h-screen w-screen relative overflow-hidden bg-[#fbfbfe] dark:bg-slate-950 transition-colors duration-300">
      
      {/* ─── Premium Background Layer (mimicking shared image layout) ─── */}
      <div className="app-premium-bg">
        {/* Subtle grid background overlay */}
        <div className="app-bg-grid" />

        {/* Top-Left: Purple Fluid Blob & Dot Grid */}
        <div className="absolute -top-[10%] -left-[10%] w-[50%] h-[50%] bg-blob bg-blob-purple opacity-40 dark:opacity-20" />
        <div className="absolute top-12 left-12 bg-dot-grid opacity-50 hidden lg:block" />

        {/* Top-Right: Peach/Pink Glow & Decorative Outline */}
        <div className="absolute -top-[10%] -right-[5%] w-[45%] h-[45%] bg-blob bg-blob-pink opacity-45 dark:opacity-20" />
        <div className="absolute top-8 right-32 bg-dot-grid opacity-50 hidden lg:block" />
        <svg className="absolute top-10 -right-16 w-64 h-64 opacity-[0.15] dark:opacity-10 stroke-violet-500 dark:stroke-violet-400 fill-none hidden lg:block" viewBox="0 0 100 100">
          <rect x="10" y="10" width="80" height="80" rx="18" strokeWidth="1" />
          <circle cx="50" cy="50" r="32" strokeWidth="0.75" strokeDasharray="3 3" />
        </svg>

        {/* Bottom-Left: Lavender Wavy Area */}
        <div className="absolute -bottom-[15%] -left-[10%] w-[45%] h-[45%] bg-blob bg-blob-purple opacity-35 dark:opacity-15" />
        <div className="absolute bottom-24 left-8 bg-dot-grid opacity-50 hidden lg:block" />
        <svg className="absolute -bottom-16 -left-16 w-[35vw] h-[35vh] opacity-[0.15] dark:opacity-10 stroke-indigo-400 dark:stroke-indigo-500 fill-none" viewBox="0 0 100 100" preserveAspectRatio="none">
          <path d="M0,80 Q25,50 50,70 T100,50 L100,100 L0,100 Z" fill="rgba(167, 139, 250, 0.03)" strokeWidth="0.75" />
        </svg>

        {/* Bottom-Right: Blue Fluid Blob & Concentric Waves */}
        <div className="absolute -bottom-[10%] -right-[10%] w-[55%] h-[55%] bg-blob bg-blob-blue opacity-50 dark:opacity-25" />
        <svg className="absolute bottom-0 right-0 w-[45vw] h-[35vh] opacity-35 dark:opacity-15 stroke-indigo-500 dark:stroke-indigo-400 fill-none" viewBox="0 0 200 100" preserveAspectRatio="none">
          <path d="M20,100 C60,90 100,60 200,90" strokeWidth="1" />
          <path d="M40,100 C80,88 120,55 200,80" strokeWidth="1" />
          <path d="M60,100 C100,86 140,50 200,70" strokeWidth="1" />
          <path d="M80,100 C120,84 160,45 200,60" strokeWidth="1" />
          <path d="M100,100 C140,82 180,40 200,50" strokeWidth="1" />
        </svg>
        <div className="absolute bottom-48 right-16 bg-dot-grid opacity-50 hidden lg:block" />

        {/* Decorative Floating Circles */}
        <div className="absolute bottom-20 left-1/3 w-6 h-6 rounded-full border border-violet-400/30 dark:border-violet-500/20 flex items-center justify-center hidden lg:flex">
          <div className="w-2.5 h-2.5 rounded-full bg-violet-400/20 dark:bg-violet-500/10" />
        </div>
        <div className="absolute top-1/3 left-12 w-16 h-16 rounded-full bg-gradient-to-br from-violet-300/10 to-indigo-300/5 blur-sm hidden lg:block" />
      </div>

      {/* Floating Navbar */}
      <div className="relative z-50">
        <TopBar />
      </div>

      {/* Main Content — offset by navbar height + spacing */}
      <main className="flex-1 overflow-y-auto pt-[88px] relative z-10">
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
