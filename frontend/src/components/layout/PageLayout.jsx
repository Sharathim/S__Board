import { Outlet } from "react-router-dom";
import { TopBar } from "./TopBar";
import { ToastContainer } from "../ui/Toast";
import { ErrorBoundary } from "../ui/ErrorBoundary";

export default function PageLayout() {
  return (
    <div className="flex flex-col min-h-screen w-screen relative overflow-hidden bg-[#fbfbfe] dark:bg-[#07060f] transition-colors duration-300">
      
      {/* ─── Premium Background Image Overlay (swaps automatically on theme toggle) ─── */}
      <div className="app-page-bg-container">
        <div className="app-page-bg light-bg" />
        <div className="app-page-bg dark-bg" />
      </div>

      {/* Floating Navbar */}
      <div className="relative z-50">
        <TopBar />
      </div>

      {/* Main Content — offset by navbar height + spacing */}
      <main className="flex-1 overflow-y-auto pt-[88px] relative z-10">
        <div className="page-content-container">
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </div>
      </main>

      <ToastContainer />
    </div>
  );
}
