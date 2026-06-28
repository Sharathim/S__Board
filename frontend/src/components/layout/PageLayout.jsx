import { Outlet } from "react-router-dom";
import { TopBar } from "./TopBar";
import { ToastContainer } from "../ui/Toast";
import { ErrorBoundary } from "../ui/ErrorBoundary";

export default function PageLayout() {
  return (
    <div className="flex flex-col min-h-screen w-screen bg-[#f8f9fd] dark:bg-slate-950">
      {/* Floating Navbar */}
      <TopBar />

      {/* Main Content — offset by navbar height + spacing */}
      <main className="flex-1 overflow-y-auto pt-[88px]">
        <div className="px-4 sm:px-6 lg:px-8 w-full max-w-[1600px] mx-auto pb-8">
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </div>
      </main>

      <ToastContainer />
    </div>
  );
}
