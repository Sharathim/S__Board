import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Menu, X, LogIn } from "lucide-react";

const NAV_LINKS = [
  { label: "Home",     id: "home" },
  { label: "Features", id: "features" },
  { label: "About",    id: "about" },
  { label: "Contact",  id: "contact" },
];

export function PublicNavbar() {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState("home");
  const [mobileOpen, setMobileOpen] = useState(false);

  /* ── Scroll shadow + active section spy ── */
  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 20);
      const sections = NAV_LINKS.map((l) => document.getElementById(l.id));
      const scrollY = window.scrollY + 120;
      let current = "home";
      sections.forEach((section) => {
        if (!section) return;
        if (section.offsetTop <= scrollY) current = section.id;
      });
      setActiveSection(current);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    setMobileOpen(false);
  };

  return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? "bg-[#080B14]/90 backdrop-blur-xl border-b border-white/8 shadow-[0_4px_30px_rgba(0,0,0,0.4)]"
            : "bg-transparent"
        }`}
      >
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex items-center justify-between h-[70px]">

            {/* Logo */}
            <button
              onClick={() => scrollTo("home")}
              className="flex items-center gap-2.5 group shrink-0"
            >
              <img
                src="/website-name-logo.png"
                alt="Hive"
                className="h-[52px] w-auto object-contain group-hover:scale-[1.03] transition-transform duration-200"
              />
            </button>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-1">
              {NAV_LINKS.map(({ label, id }) => {
                const isActive = activeSection === id;
                return (
                  <button
                    key={id}
                    onClick={() => scrollTo(id)}
                    className={`relative px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      isActive
                        ? "text-white"
                        : "text-slate-400 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    {label}
                    {isActive && (
                      <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-4 h-0.5 rounded-full bg-gradient-to-r from-violet-400 to-blue-400" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Login CTA */}
            <div className="hidden md:flex items-center gap-3">
              <button
                onClick={() => navigate("/login")}
                id="public-login-btn"
                className="group relative flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm overflow-hidden transition-all duration-300 hover:scale-[1.04] active:scale-[0.97]"
              >
                {/* Gradient border via pseudo-element trick */}
                <span className="absolute inset-0 rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 opacity-100" />
                <span className="absolute inset-[1.5px] rounded-[10px] bg-[#080B14] group-hover:bg-[#0d1120] transition-colors duration-200" />
                <LogIn className="relative z-10 w-4 h-4 text-violet-400 group-hover:text-violet-300 group-hover:-rotate-6 transition-all duration-200" />
                <span className="relative z-10 bg-gradient-to-r from-violet-400 to-blue-400 bg-clip-text text-transparent font-bold">
                  Sign In
                </span>
              </button>
            </div>

            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileOpen((o) => !o)}
              className="md:hidden w-9 h-9 flex items-center justify-center rounded-lg border border-white/10 bg-white/5 text-slate-300 hover:text-white hover:bg-white/10 transition-all duration-200"
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Menu */}
      <div
        className={`fixed inset-0 z-40 md:hidden transition-all duration-300 ${
          mobileOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      >
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-[#080B14]/95 backdrop-blur-xl"
          onClick={() => setMobileOpen(false)}
        />

        {/* Menu panel */}
        <div className={`absolute top-[70px] left-0 right-0 bg-[#0d1120] border-b border-white/8 transition-all duration-300 ${
          mobileOpen ? "translate-y-0" : "-translate-y-4"
        }`}>
          <div className="px-6 py-4 space-y-1">
            {NAV_LINKS.map(({ label, id }) => (
              <button
                key={id}
                onClick={() => scrollTo(id)}
                className={`w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                  activeSection === id
                    ? "bg-white/8 text-white"
                    : "text-slate-400 hover:text-white hover:bg-white/5"
                }`}
              >
                {label}
              </button>
            ))}
            <div className="pt-2 pb-1">
              <button
                onClick={() => { navigate("/login"); setMobileOpen(false); }}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 text-white font-bold text-sm"
              >
                <LogIn className="w-4 h-4" />
                Sign In to Hive
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
