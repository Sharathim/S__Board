import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { Home, Info, Zap, Mail } from "lucide-react";
import BottomSheet from "./BottomSheet";
import MobileLoginSheetContent from "../pages/public/MobileLoginSheetContent";
import { Logo } from "../../components/ui/Logo";

/**
 * Public/marketing mobile shell.
 * Features a slim top bar with logo + redesigned glassmorphic "Login" button,
 * and a bottom navigation bar containing Home, About, Features, and Contact.
 */
export default function MobilePublicShell() {
  const [loginOpen, setLoginOpen] = useState(false);
  const location = useLocation();
  const mainRef = useRef(null);

  // Auto scroll to top when route/location changes
  useEffect(() => {
    if (mainRef.current) {
      mainRef.current.scrollTop = 0;
    }
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [location.pathname]);

  return (
    <div className="h-[100dvh] min-h-screen w-full flex flex-col overflow-hidden bg-[#F3F3F5] dark:bg-[#0B0F17] transition-colors duration-300 relative">
      {/* Top Bar */}
      <header
        className="relative w-full shrink-0 z-30 bg-[#F3F3F5] dark:bg-[#0B0F17] border-b border-gray-200/60 dark:border-white/10 flex items-center justify-between px-4 select-none"
        style={{ height: "56px", paddingTop: "env(safe-area-inset-top, 0px)" }}
      >
        <div className="flex items-center gap-2 ml-1 sm:ml-2">
          <Logo variant="icon" alt="Hive" className="w-9 h-9 object-contain" />
          <span className="font-bold text-base text-gray-900 dark:text-slate-100 tracking-tight">Hive</span>
        </div>

        {/* Premium Glassmorphic Login Button */}
        <button
          onClick={() => setLoginOpen(true)}
          className="mobile-tappable min-h-[36px] px-4 py-1.5 rounded-full font-bold text-xs transition-all
            bg-[#FFEEE9] hover:bg-[#FFDBD2] border border-[#FFDBD2] text-[#F05A2B] hover:shadow-sm
            dark:bg-[#F05A2B]/15 dark:hover:bg-[#F05A2B]/25 dark:border-[#F05A2B]/30 dark:text-[#FF8365]"
        >
          Login
        </button>
      </header>

      {/* Content — inner scrollable single page */}
      <main
        ref={mainRef}
        className="flex-1 overflow-y-auto w-full mobile-hide-scrollbar overscroll-y-contain pb-6"
      >
        <div className="w-full">
          <Outlet />
        </div>
      </main>

      {/* Login bottom sheet */}
      <BottomSheet open={loginOpen} onClose={() => setLoginOpen(false)} title="Sign In">
        <MobileLoginSheetContent onClose={() => setLoginOpen(false)} />
      </BottomSheet>
    </div>
  );
}
