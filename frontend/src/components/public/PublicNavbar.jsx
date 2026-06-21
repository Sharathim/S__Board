import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X } from "lucide-react";

const NAV_LINKS = [
  { label: "Home",     href: "/",        route: true  },
  { label: "About",    href: "/about",   route: true  },
  { label: "Features", href: "#features"              },
  { label: "Updates",  href: "#updates"               },
  { label: "Contact",  href: "#contact"               },
];

export function PublicNavbar() {
  const [scrolled,   setScrolled]   = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 bg-white/96 backdrop-blur-md border-b
        transition-all duration-300 ${
          scrolled
            ? "border-gray-200/80 shadow-[0_1px_12px_rgba(0,0,0,0.06)]"
            : "border-gray-100/80"
        }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-[72px]">

          {/* ── Logo ──
              Mobile: icon only  |  sm+: full horizontal logo with name  */}
          <Link to="/" className="flex items-center group shrink-0">
            {/* Icon-only on xs screens */}
            <img
              src="/logo-icon.png"
              alt="DPMS"
              className="h-12 w-12 object-contain sm:hidden transition-transform duration-200 group-hover:scale-105"
            />
            {/* Full logo with name on sm+ */}
            <img
              src="/logo-full.png"
              alt="DPMS — Department Project Management System"
              className="hidden sm:block h-16 w-auto min-w-[180px] object-contain object-left transition-transform duration-200 group-hover:scale-[1.02]"
            />
          </Link>

          {/* ── Desktop Nav Links ── */}
          <div className="hidden md:flex items-center gap-0.5">
            {NAV_LINKS.map(({ label, href, route }) => {
              const isActive = route ? pathname === href : false;
              const cls = `relative px-4 py-2 text-sm font-medium rounded-lg transition-all duration-150 ${
                isActive ? "text-primary-600" : "text-gray-500 hover:text-gray-900 hover:bg-gray-50/80"
              }`;
              return route ? (
                <Link key={label} to={href} className={cls}>
                  {label}
                  {isActive && <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-4 h-0.5 bg-primary-600 rounded-full" />}
                </Link>
              ) : (
                <a key={label} href={href} className={cls}>{label}</a>
              );
            })}
          </div>

          {/* ── HOD Login + Mobile Hamburger ── */}
          <div className="flex items-center gap-3">
            <a
              href="#login"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full
                border-2 border-primary-600 text-primary-600 text-sm font-semibold
                hover:bg-primary-600 hover:text-white hover:shadow-primary-glow hover:scale-[1.02]
                active:scale-[0.99]
                transition-all duration-200"
            >
              {/* Shield icon from the DPMS logo family */}
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              <span>HOD Login</span>
            </a>
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-all duration-150"
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* ── Mobile Menu ── */}
      {mobileOpen && (
        <div className="md:hidden border-t border-gray-100 bg-white/98 px-4 py-4 space-y-1 animate-fade-in shadow-md">
          {NAV_LINKS.map(({ label, href, route }) => {
            const isActive = route ? pathname === href : false;
            const cls = `block px-4 py-3 rounded-xl text-sm font-medium transition-all duration-150 ${
              isActive ? "bg-primary-50 text-primary-600" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
            }`;
            return route ? (
              <Link key={label} to={href} onClick={() => setMobileOpen(false)} className={cls}>{label}</Link>
            ) : (
              <a key={label} href={href} onClick={() => setMobileOpen(false)} className={cls}>{label}</a>
            );
          })}
        </div>
      )}
    </nav>
  );
}
