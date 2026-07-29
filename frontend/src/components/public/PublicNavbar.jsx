import { useState, useEffect, useCallback } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Menu, X, Hexagon, LogIn } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Logo } from "../ui/Logo";

const NAV_SECTIONS = [
  { label: "Home", id: "hero" },
  { label: "About", id: "about" },
  { label: "Features", id: "features" },
  { label: "Contact", id: "contact" },
];

export function PublicNavbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("hero");
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const isHomePage = pathname === "/";

  // Scroll spy
  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 10);

      if (!isHomePage) return;
      const sections = NAV_SECTIONS.map((s) => document.getElementById(s.id)).filter(Boolean);
      let current = "hero";
      sections.forEach((el) => {
        if (window.scrollY >= el.offsetTop - 120) current = el.id;
      });
      setActiveSection(current);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, [isHomePage]);

  const handleNavClick = useCallback(
    (id) => {
      setMobileOpen(false);
      if (isHomePage) {
        const el = document.getElementById(id);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      } else {
        // Navigate to home and scroll after mount
        navigate(`/#${id}`);
      }
    },
    [isHomePage, navigate]
  );

  // Handle hash-based navigation on mount (for cross-page links)
  useEffect(() => {
    if (isHomePage && window.location.hash) {
      const id = window.location.hash.replace("#", "");
      setTimeout(() => {
        const el = document.getElementById(id);
        if (el) el.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
  }, [isHomePage]);

  const navbarClasses = `fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
    scrolled
      ? "bg-white/80 dark:bg-black/80 backdrop-blur-xl border-b border-white/20 dark:border-white/5 shadow-[0_1px_20px_rgba(0,0,0,0.08)]"
      : "bg-transparent border-b border-transparent"
  }`;

  return (
    <nav className={navbarClasses}>
      <div className="w-full pl-4 pr-4 sm:pl-6 sm:pr-6 lg:pl-8 lg:pr-8">
        <div className="flex items-center justify-between h-[80px]">

          {/* ── Logo Icon Only (Name PNG removed, added left spacing) ── */}
          <Link to="/" onClick={() => handleNavClick("hero")} className="flex items-center gap-2 group shrink-0 ml-1 sm:ml-2">
            <Logo
              variant="icon"
              alt="Hive Logo"
              className="h-11 sm:h-13 md:h-14 w-auto object-contain transition-transform duration-200 group-hover:scale-105 filter drop-shadow-sm"
            />
          </Link>

          {/* ── Desktop Nav Links ── */}
          <div className="hidden md:flex items-center bg-white/60 dark:bg-white/5 backdrop-blur-md border border-white/40 dark:border-white/10 rounded-full px-2 py-1.5 gap-1 shadow-sm">
            {NAV_SECTIONS.map(({ label, id }) => {
              const isActive = isHomePage && activeSection === id;
              return (
                <button
                  key={id}
                  onClick={() => handleNavClick(id)}
                  className={`relative px-4 py-1.5 text-sm font-medium rounded-full transition-all duration-200 ${
                    isActive
                      ? "text-indigo-600 dark:text-indigo-400"
                      : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="nav-pill"
                      className="absolute inset-0 rounded-full bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                  <span className="relative z-10">{label}</span>
                </button>
              );
            })}
          </div>

          {/* ── Enter Hive CTA + Mobile Toggle ── */}
          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="hidden md:inline-flex items-center gap-2 px-5 py-2.5 rounded-full
                bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-sm font-semibold
                hover:from-indigo-700 hover:to-violet-700 hover:shadow-lg hover:shadow-indigo-200/40
                hover:-translate-y-0.5 active:translate-y-0 active:shadow-none
                transition-all duration-200"
            >
              <LogIn className="w-4 h-4" />
              <span>Enter Hive</span>
            </Link>

            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden p-2.5 rounded-xl bg-white/60 dark:bg-white/5 backdrop-blur-sm border border-white/40 dark:border-white/10 text-gray-600 dark:text-gray-400 hover:bg-white hover:text-gray-900 transition-all duration-150"
              aria-label="Toggle menu"
            >
              <AnimatePresence mode="wait" initial={false}>
                {mobileOpen ? (
                  <motion.div key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.15 }}>
                    <X className="w-5 h-5" />
                  </motion.div>
                ) : (
                  <motion.div key="open" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.15 }}>
                    <Menu className="w-5 h-5" />
                  </motion.div>
                )}
              </AnimatePresence>
            </button>
          </div>
        </div>
      </div>

      {/* ── Mobile Menu ── */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="md:hidden overflow-hidden border-t border-gray-100/80 dark:border-white/5 bg-white/95 dark:bg-black/95 backdrop-blur-2xl"
          >
            <div className="px-4 py-4 space-y-1">
              {NAV_SECTIONS.map(({ label, id }, i) => (
                <motion.button
                  key={id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.06 }}
                  onClick={() => handleNavClick(id)}
                  className={`w-full text-left block px-4 py-3 rounded-xl text-sm font-medium transition-all duration-150 ${
                    isHomePage && activeSection === id
                      ? "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400"
                      : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white"
                  }`}
                >
                  {label}
                </motion.button>
              ))}
              <div className="pt-2">
                <Link
                  to="/login"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-xl
                    bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-sm font-semibold
                    hover:from-indigo-700 hover:to-violet-700 transition-all"
                >
                  <LogIn className="w-4 h-4" />
                  Enter Hive
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
