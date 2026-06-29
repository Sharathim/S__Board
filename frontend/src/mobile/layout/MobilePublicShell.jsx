import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";
import BottomSheet from "./BottomSheet";
import MobileLoginSheetContent from "../pages/public/MobileLoginSheetContent";

/**
 * Public/marketing mobile shell — no bottom tab bar.
 * Slim top bar with logo + "Login" button.
 */
export default function MobilePublicShell() {
  const [loginOpen, setLoginOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const NAV_ITEMS = [
    { label: "Home", to: "/" },
    { label: "About", to: "/about" },
    { label: "Features", to: "/features" },
    { label: "Contact", to: "/contact" },
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950">
      {/* Top Bar */}
      <header
        className="fixed top-0 left-0 right-0 z-[100] bg-white/90 dark:bg-slate-950/90 backdrop-blur-lg border-b border-gray-100 dark:border-slate-800 flex items-center justify-between px-4"
        style={{ height: "56px", paddingTop: "env(safe-area-inset-top, 0px)" }}
      >
        <div className="flex items-center gap-2">
          <img src="/logo-icon.png" alt="Hive" className="w-7 h-7 object-contain" />
          <span className="font-bold text-sm text-gray-900 dark:text-white tracking-tight">Hive</span>
        </div>

        <button
          onClick={() => setLoginOpen(true)}
          className="mobile-tappable px-4 py-2 rounded-xl bg-gradient-to-r from-primary-600 to-violet-600 text-white text-xs font-bold shadow-md hover:shadow-primary-500/30 transition-all"
        >
          Login
        </button>
      </header>

      {/* Horizontal nav pills */}
      <div
        className="fixed top-[56px] left-0 right-0 z-[99] bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-b border-gray-50 dark:border-slate-800/50"
        style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
      >
        <div className="flex items-center gap-1 px-4 py-2 overflow-x-auto mobile-hide-scrollbar">
          {NAV_ITEMS.map((item) => {
            const active = location.pathname === item.to;
            return (
              <button
                key={item.to}
                onClick={() => navigate(item.to)}
                className={`mobile-tappable px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                  active
                    ? "bg-primary-50 dark:bg-primary-950/40 text-primary-600 dark:text-primary-400 border border-primary-200/50 dark:border-primary-800/30"
                    : "text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-800/50"
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <main
        className="mobile-page-enter"
        style={{ paddingTop: "calc(56px + 44px + env(safe-area-inset-top, 0px))" }}
      >
        <Outlet />
      </main>

      {/* Login bottom sheet */}
      <BottomSheet open={loginOpen} onClose={() => setLoginOpen(false)} title="Sign In">
        <MobileLoginSheetContent onClose={() => setLoginOpen(false)} />
      </BottomSheet>
    </div>
  );
}
