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
  const navigate = useNavigate();

  const [visible, setVisible] = useState(true);
  const lastScrollY = useRef(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      if (currentScrollY < 10) {
        setVisible(true);
      } else if (currentScrollY > lastScrollY.current) {
        setVisible(false);
      } else {
        setVisible(true);
      }

      lastScrollY.current = currentScrollY;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const NAV_ITEMS = [
    { label: "Home", to: "/", icon: Home },
    { label: "About", to: "/about", icon: Info },
    { label: "Features", to: "/features", icon: Zap },
    { label: "Contact", to: "/contact", icon: Mail },
  ];

  return (
    <div className="h-[100dvh] min-h-screen w-full flex flex-col overflow-hidden bg-[#F3F3F5] dark:bg-[#0B0F17] transition-colors duration-300 relative">
      {/* Top Bar */}
      <header
        className="relative w-full shrink-0 z-30 bg-[#F3F3F5] dark:bg-[#0B0F17] border-b border-gray-200/60 dark:border-white/10 flex items-center justify-between px-4 select-none"
        style={{ height: "56px", paddingTop: "env(safe-area-inset-top, 0px)" }}
      >
        <div className="flex items-center gap-2">
          <Logo variant="icon" alt="Hive" className="w-8 h-8 object-contain" />
          <span className="font-bold text-base text-gray-900 dark:text-slate-100 tracking-tight">Hive</span>
        </div>

        {/* Redesigned Premium Glassmorphic Login Button */}
        <button
          onClick={() => setLoginOpen(true)}
          className="mobile-tappable min-h-[36px] px-4 py-1.5 rounded-full font-bold text-xs transition-all
            bg-[#FFEEE9] hover:bg-[#FFDBD2] border border-[#FFDBD2] text-[#F05A2B] hover:shadow-sm
            dark:bg-[#F05A2B]/15 dark:hover:bg-[#F05A2B]/25 dark:border-[#F05A2B]/30 dark:text-[#FF8365]"
        >
          Login
        </button>
      </header>

      {/* Content — inner scrollable */}
      <main
        className="flex-1 overflow-y-auto w-full mobile-page-enter mobile-hide-scrollbar overscroll-y-contain pb-[calc(60px+env(safe-area-inset-bottom,0px))]"
      >
        <div className="w-full">
          <Outlet />
        </div>
      </main>

      {/* Public Bottom Navigation Bar */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-40 bg-white/90 dark:bg-[#131C2E]/90 backdrop-blur-md border-t border-gray-200/60 dark:border-white/10 flex items-center justify-around px-2 select-none"
        style={{
          height: `calc(60px + env(safe-area-inset-bottom, 0px))`,
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
        }}
      >
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = location.pathname === item.to;
          return (
            <button
              key={item.to}
              onClick={() => navigate(item.to)}
              className={`mobile-tappable flex flex-col items-center justify-center gap-0.5 py-1 px-3 min-h-[44px] min-w-[44px] rounded-xl transition-all relative ${
                active ? "mobile-tab-active" : ""
              }`}
            >
              <Icon
                className={`w-5 h-5 transition-colors ${
                  active
                    ? "text-[#F05A2B] dark:text-[#FF8365]"
                    : "text-gray-400 dark:text-slate-400"
                }`}
              />
              <span
                className={`text-[10px] font-semibold tracking-tight transition-colors ${
                  active
                    ? "text-[#F05A2B] dark:text-[#FF8365]"
                    : "text-gray-400 dark:text-slate-400"
                }`}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>

      {/* Login bottom sheet */}
      <BottomSheet open={loginOpen} onClose={() => setLoginOpen(false)} title="Sign In">
        <MobileLoginSheetContent onClose={() => setLoginOpen(false)} />
      </BottomSheet>
    </div>
  );
}
