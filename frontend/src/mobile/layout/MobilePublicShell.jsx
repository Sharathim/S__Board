import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { Home, Info, Zap, Mail } from "lucide-react";
import BottomSheet from "./BottomSheet";
import MobileLoginSheetContent from "../pages/public/MobileLoginSheetContent";

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

      // If close to top (scrollY < 10), always show
      if (currentScrollY < 10) {
        setVisible(true);
      } else if (currentScrollY > lastScrollY.current) {
        // Scrolling down
        setVisible(false);
      } else {
        // Scrolling up
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
    <div className="min-h-screen bg-[#FFFFFF] dark:bg-[#000000] transition-colors duration-300">
      {/* Top Bar */}
      <header
        className="fixed top-0 left-0 right-0 z-[100] bg-[#FFFFFF]/95 dark:bg-[#000000]/95 backdrop-blur-lg border-b border-gray-100 dark:border-slate-800 flex items-center justify-between px-4"
        style={{ height: "56px", paddingTop: "env(safe-area-inset-top, 0px)" }}
      >
        <div className="flex items-center gap-2">
          <img src="/logo-icon.png" alt="Hive" className="w-9 h-9 object-contain" />
          <span className="font-bold text-sm text-gray-900 dark:text-white tracking-tight">Hive</span>
        </div>

        {/* Redesigned Premium Glassmorphic Login Button */}
        <button
          onClick={() => setLoginOpen(true)}
          className="mobile-tappable px-4 py-1.5 rounded-full font-bold text-xs transition-all
            bg-violet-50/80 hover:bg-violet-100/80 border border-violet-200 text-violet-700 hover:shadow-sm
            dark:bg-slate-900/60 dark:hover:bg-violet-500/10 dark:border-violet-500/30 dark:hover:border-violet-500/50 dark:text-violet-400 dark:shadow-none"
        >
          Login
        </button>
      </header>

      {/* Content — cleared to accommodate both fixed header and footer */}
      <main
        className="mobile-page-enter"
        style={{
          paddingTop: "calc(56px + env(safe-area-inset-top, 0px))",
          paddingBottom: "calc(60px + env(safe-area-inset-bottom, 0px))",
          minHeight: "100vh",
        }}
      >
        <div className="px-4 py-4">
          <Outlet />
        </div>
      </main>

      {/* Public Bottom Navigation Bar */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-[100] mobile-glass border-t flex items-center justify-around px-2 transition-transform duration-300 ease-in-out"
        style={{
          height: `calc(60px + env(safe-area-inset-bottom, 0px))`,
          borderRadius: "20px 20px 0 0",
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
          transform: visible ? "translateY(0)" : "translateY(100%)",
        }}
      >
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = location.pathname === item.to;
          return (
            <button
              key={item.to}
              onClick={() => navigate(item.to)}
              className={`mobile-tappable flex flex-col items-center justify-center gap-0.5 py-1 px-3 rounded-xl transition-all relative ${active ? "mobile-tab-active" : ""
                }`}
            >
              <Icon
                className={`w-5 h-5 transition-colors ${active
                    ? "text-primary-600 dark:text-primary-400"
                    : "text-gray-400 dark:text-gray-500"
                  }`}
              />
              <span
                className={`text-[10px] font-semibold transition-colors ${active
                    ? "text-primary-600 dark:text-primary-400"
                    : "text-gray-400 dark:text-gray-500"
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
