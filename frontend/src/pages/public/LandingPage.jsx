import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  Layers, Zap, Users, BarChart3, Bell, Shield,
  ArrowRight, ChevronDown, Mail, MapPin, Phone,
  Github, Twitter, Linkedin, CheckCircle2, Star,
  BookOpen, MessageSquare, FolderKanban, Megaphone
} from "lucide-react";

gsap.registerPlugin(ScrollTrigger);

/* ── Utility ── */
function useCountUp(target, duration = 2000, start = false) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!start) return;
    let startTime = null;
    const step = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(eased * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [start, target, duration]);
  return count;
}

/* ── Data ── */
const FEATURES = [
  {
    icon: FolderKanban,
    title: "Project Management",
    desc: "Organize, track, and deliver projects with real-time progress dashboards and smart status tracking.",
    gradient: "from-violet-500 to-purple-600",
    glow: "shadow-violet-500/20",
    tag: "Core",
  },
  {
    icon: Users,
    title: "Team Collaboration",
    desc: "Seamlessly connect faculty, students, and coordinators in one unified workspace built for teamwork.",
    gradient: "from-blue-500 to-cyan-600",
    glow: "shadow-blue-500/20",
    tag: "Popular",
  },
  {
    icon: BarChart3,
    title: "Smart Analytics",
    desc: "Data-driven insights with visual reports. Understand performance trends at a glance.",
    gradient: "from-emerald-500 to-teal-600",
    glow: "shadow-emerald-500/20",
    tag: "Insights",
  },
  {
    icon: Bell,
    title: "Instant Updates",
    desc: "Real-time push notifications keep everyone in sync — never miss a deadline or announcement.",
    gradient: "from-orange-500 to-amber-600",
    glow: "shadow-orange-500/20",
    tag: "Live",
  },
  {
    icon: BookOpen,
    title: "Knowledge Hub",
    desc: "Centralised notes, documents, and class resources — organized, searchable, always accessible.",
    gradient: "from-rose-500 to-pink-600",
    glow: "shadow-rose-500/20",
    tag: "Organize",
  },
  {
    icon: MessageSquare,
    title: "Discussion Forum",
    desc: "An exclusive forum for meaningful academic discussions, idea sharing, and peer collaboration.",
    gradient: "from-indigo-500 to-violet-600",
    glow: "shadow-indigo-500/20",
    tag: "Community",
  },
];

const STEPS = [
  {
    step: "01",
    title: "Sign In Securely",
    desc: "Access Hive through Google OAuth — no passwords, no friction. Your role is verified automatically.",
    icon: Shield,
  },
  {
    step: "02",
    title: "Explore Your Space",
    desc: "Your personalized dashboard surfaces projects, updates, and team activity relevant to you.",
    icon: Layers,
  },
  {
    step: "03",
    title: "Collaborate & Thrive",
    desc: "Create projects, post updates, engage in discussions, and track everything in real-time.",
    icon: Zap,
  },
];

const STATS = [
  { value: 500, suffix: "+", label: "Active Users" },
  { value: 120, suffix: "+", label: "Projects Tracked" },
  { value: 98,  suffix: "%", label: "Uptime" },
  { value: 40,  suffix: "+", label: "Features" },
];

/* ── Floating Orb ── */
function FloatingOrb({ className }) {
  return (
    <div
      className={`absolute rounded-full blur-3xl pointer-events-none opacity-60 ${className}`}
      aria-hidden="true"
    />
  );
}

/* ── Stat Counter Card ── */
function StatCard({ value, suffix, label, trigger }) {
  const count = useCountUp(value, 1800, trigger);
  return (
    <div className="text-center">
      <div className="text-4xl md:text-5xl font-black text-white tracking-tight">
        {count}{suffix}
      </div>
      <div className="text-sm text-slate-400 mt-1 font-medium">{label}</div>
    </div>
  );
}

/* ── Feature Card ── */
function FeatureCard({ icon: Icon, title, desc, gradient, glow, tag, index }) {
  const cardRef = useRef(null);

  const handleMouseMove = (e) => {
    const rect = cardRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * 12;
    const y = ((e.clientY - rect.top) / rect.height - 0.5) * -12;
    gsap.to(cardRef.current, { rotateX: y, rotateY: x, duration: 0.3, ease: "power2.out" });
  };

  const handleMouseLeave = () => {
    gsap.to(cardRef.current, { rotateX: 0, rotateY: 0, duration: 0.5, ease: "elastic.out(1,0.6)" });
  };

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="feature-card group relative rounded-2xl border border-white/8 bg-white/4 backdrop-blur-sm p-6 cursor-default"
      style={{ transformStyle: "preserve-3d", animationDelay: `${index * 80}ms` }}
    >
      {/* Glow on hover */}
      <div className={`absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br ${gradient} blur-2xl -z-10 ${glow}`} />

      {/* Tag */}
      <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full bg-gradient-to-r ${gradient} text-white mb-4 uppercase tracking-widest`}>
        {tag}
      </span>

      {/* Icon */}
      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
        <Icon className="w-6 h-6 text-white" />
      </div>

      <h3 className="text-lg font-bold text-white mb-2 group-hover:text-white transition-colors">{title}</h3>
      <p className="text-sm text-slate-400 leading-relaxed group-hover:text-slate-300 transition-colors">{desc}</p>
    </div>
  );
}

/* ── Main Component ── */
export default function LandingPage() {
  const navigate = useNavigate();
  const heroRef = useRef(null);
  const heroTitleRef = useRef(null);
  const heroBadgeRef = useRef(null);
  const heroSubRef = useRef(null);
  const heroCtaRef = useRef(null);
  const statsRef = useRef(null);
  const featuresRef = useRef(null);
  const stepsRef = useRef(null);
  const aboutRef = useRef(null);
  const contactRef = useRef(null);
  const [statsVisible, setStatsVisible] = useState(false);

  /* ── GSAP Animations ── */
  useEffect(() => {
    const ctx = gsap.context(() => {
      // Hero entrance
      const heroTl = gsap.timeline({ defaults: { ease: "power3.out" } });
      heroTl
        .from(heroBadgeRef.current, { opacity: 0, y: 20, duration: 0.6 })
        .from(heroTitleRef.current.querySelectorAll(".hero-line"), {
          opacity: 0, y: 60, stagger: 0.15, duration: 0.8,
        }, "-=0.3")
        .from(heroSubRef.current, { opacity: 0, y: 20, duration: 0.6 }, "-=0.4")
        .from(heroCtaRef.current.children, { opacity: 0, y: 20, stagger: 0.1, duration: 0.5 }, "-=0.3");

      // Stats section reveal
      ScrollTrigger.create({
        trigger: statsRef.current,
        start: "top 80%",
        onEnter: () => setStatsVisible(true),
      });

      // Features reveal
      gsap.from(".feature-card", {
        opacity: 0, y: 40, stagger: 0.1, duration: 0.7, ease: "power3.out",
        scrollTrigger: { trigger: featuresRef.current, start: "top 75%" },
      });

      // Steps reveal
      gsap.from(".step-item", {
        opacity: 0, x: -40, stagger: 0.2, duration: 0.7, ease: "power3.out",
        scrollTrigger: { trigger: stepsRef.current, start: "top 75%" },
      });

      // About reveal
      gsap.from(".about-content", {
        opacity: 0, y: 30, stagger: 0.15, duration: 0.7, ease: "power3.out",
        scrollTrigger: { trigger: aboutRef.current, start: "top 75%" },
      });

      // Contact reveal
      gsap.from(".contact-content", {
        opacity: 0, y: 30, stagger: 0.12, duration: 0.6, ease: "power3.out",
        scrollTrigger: { trigger: contactRef.current, start: "top 75%" },
      });
    });

    return () => ctx.revert();
  }, []);

  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-[#080B14] overflow-x-hidden">

      {/* ══════════════════════ HERO ══════════════════════ */}
      <section
        id="home"
        ref={heroRef}
        className="relative min-h-screen flex flex-col items-center justify-center pt-20 pb-16 overflow-hidden"
      >
        {/* Ambient orbs */}
        <FloatingOrb className="w-[600px] h-[600px] bg-violet-600/25 -top-32 -left-32 animate-[float_8s_ease-in-out_infinite]" />
        <FloatingOrb className="w-[500px] h-[500px] bg-blue-600/20 -bottom-20 -right-20 animate-[float_10s_ease-in-out_2s_infinite]" />
        <FloatingOrb className="w-[300px] h-[300px] bg-emerald-600/15 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-[float_12s_ease-in-out_4s_infinite]" />

        {/* Grid overlay */}
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSA2MCAwIEwgMCAwIDAgNjAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjAzKSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-100" aria-hidden="true" />

        <div className="relative z-10 max-w-6xl mx-auto px-6 text-center">
          {/* Badge */}
          <div ref={heroBadgeRef} className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-white/6 border border-white/12 backdrop-blur-sm mb-8">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
            <span className="text-sm font-medium text-slate-300 tracking-wide">Now in Active Use · Trusted by Institutions</span>
          </div>

          {/* Headline */}
          <div ref={heroTitleRef} className="mb-6">
            <div className="hero-line text-5xl sm:text-6xl md:text-7xl xl:text-[80px] font-black text-white leading-[1.05] tracking-[-0.03em]">
              The Platform That
            </div>
            <div className="hero-line text-5xl sm:text-6xl md:text-7xl xl:text-[80px] font-black leading-[1.05] tracking-[-0.03em] mt-1">
              <span className="bg-gradient-to-r from-violet-400 via-blue-400 to-emerald-400 bg-clip-text text-transparent">
                Connects Everything.
              </span>
            </div>
          </div>

          {/* Sub */}
          <p ref={heroSubRef} className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed mb-10">
            Hive is the all-in-one platform for managing projects, fostering collaboration,
            sharing knowledge, and keeping every stakeholder in perfect sync.
          </p>

          {/* CTA */}
          <div ref={heroCtaRef} className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => navigate("/login")}
              className="group relative inline-flex items-center gap-3 px-8 py-4 rounded-2xl bg-gradient-to-r from-violet-600 to-blue-600 text-white font-bold text-base shadow-2xl shadow-violet-500/30 hover:shadow-violet-500/50 hover:scale-[1.04] active:scale-[0.98] transition-all duration-300 overflow-hidden"
            >
              <span className="absolute inset-0 bg-gradient-to-r from-violet-500 to-blue-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <span className="relative">Get Started Free</span>
              <ArrowRight className="relative w-5 h-5 group-hover:translate-x-1 transition-transform duration-200" />
            </button>

            <button
              onClick={() => scrollTo("features")}
              className="inline-flex items-center gap-2 px-6 py-4 rounded-2xl text-slate-300 font-semibold text-base border border-white/10 hover:border-white/20 hover:text-white hover:bg-white/5 transition-all duration-300"
            >
              See Features
              <ChevronDown className="w-4 h-4 animate-bounce" />
            </button>
          </div>

          {/* Scroll hint */}
          <div className="mt-16 flex flex-col items-center gap-2 text-slate-500 text-xs font-medium animate-[fadeInUp_1s_1.5s_both]">
            <span>Scroll to explore</span>
            <ChevronDown className="w-4 h-4 animate-bounce" />
          </div>
        </div>
      </section>

      {/* ══════════════════════ STATS ══════════════════════ */}
      <section ref={statsRef} className="py-16 border-y border-white/6 bg-white/2 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
            {STATS.map((s) => (
              <StatCard key={s.label} {...s} trigger={statsVisible} />
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════ FEATURES ══════════════════════ */}
      <section id="features" ref={featuresRef} className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          {/* Section header */}
          <div className="text-center mb-16">
            <span className="inline-block text-xs font-bold uppercase tracking-[0.2em] text-violet-400 mb-4">
              Everything You Need
            </span>
            <h2 className="text-4xl md:text-5xl font-black text-white tracking-tight mb-4">
              Built for Modern Teams
            </h2>
            <p className="text-slate-400 text-lg max-w-xl mx-auto">
              Every tool you need to manage, collaborate, and grow — integrated seamlessly into one platform.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((f, i) => (
              <FeatureCard key={f.title} {...f} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════ HOW IT WORKS ══════════════════════ */}
      <section id="about" ref={stepsRef} className="py-24 px-6 bg-gradient-to-b from-transparent to-white/2">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <span className="inline-block text-xs font-bold uppercase tracking-[0.2em] text-blue-400 mb-4">
              How It Works
            </span>
            <h2 className="text-4xl md:text-5xl font-black text-white tracking-tight mb-4">
              Simple. Powerful. Instant.
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {STEPS.map(({ step, title, desc, icon: Icon }, i) => (
              <div key={step} className="step-item relative">
                {/* Connector line */}
                {i < STEPS.length - 1 && (
                  <div className="hidden md:block absolute top-8 left-full w-full h-px bg-gradient-to-r from-white/20 to-transparent z-0" />
                )}

                <div className="relative z-10 p-6 rounded-2xl bg-white/4 border border-white/8 hover:border-white/16 hover:bg-white/6 transition-all duration-300 group">
                  <div className="flex items-center gap-3 mb-5">
                    <span className="text-5xl font-black text-white/10 leading-none select-none">{step}</span>
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
                  <p className="text-sm text-slate-400 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════ ABOUT ══════════════════════ */}
      <section ref={aboutRef} className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">

            {/* Left */}
            <div className="about-content space-y-6">
              <span className="inline-block text-xs font-bold uppercase tracking-[0.2em] text-emerald-400">
                About Hive
              </span>
              <h2 className="text-4xl md:text-5xl font-black text-white tracking-tight leading-[1.1]">
                One Platform,<br />
                <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
                  Infinite Possibilities.
                </span>
              </h2>
              <p className="text-slate-400 text-lg leading-relaxed">
                Hive was built to solve the coordination chaos that teams face daily.
                We believe that when collaboration is frictionless, great things happen.
              </p>
              <p className="text-slate-400 leading-relaxed">
                From project inception to completion, from announcements to discussions,
                Hive keeps your entire team aligned — in real-time, every time.
              </p>

              <div className="grid grid-cols-2 gap-4 pt-4">
                {[
                  "Role-based access control",
                  "Real-time notifications",
                  "Google OAuth security",
                  "Mobile-first design",
                  "Organized file sharing",
                  "Community forum",
                ].map((item) => (
                  <div key={item} className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span className="text-sm text-slate-300">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right — Visual card stack */}
            <div className="about-content relative">
              <div className="absolute inset-0 bg-gradient-to-br from-violet-600/20 to-blue-600/20 rounded-3xl blur-3xl" />
              <div className="relative space-y-4">
                {[
                  { icon: Star, label: "Premium Experience", sub: "Designed for excellence", color: "text-amber-400" },
                  { icon: Shield, label: "Enterprise Security", sub: "OAuth + Role verification", color: "text-violet-400" },
                  { icon: Zap, label: "Lightning Fast", sub: "Optimized performance", color: "text-blue-400" },
                ].map(({ icon: Icon, label, sub, color }) => (
                  <div
                    key={label}
                    className="flex items-center gap-4 p-5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm hover:bg-white/8 hover:border-white/16 transition-all duration-300 group"
                  >
                    <div className="w-12 h-12 rounded-xl bg-white/8 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300">
                      <Icon className={`w-6 h-6 ${color}`} />
                    </div>
                    <div>
                      <div className="font-semibold text-white">{label}</div>
                      <div className="text-sm text-slate-400 mt-0.5">{sub}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════ CTA BANNER ══════════════════════ */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="relative rounded-3xl overflow-hidden p-12 bg-gradient-to-br from-violet-600/30 to-blue-600/30 border border-white/12 backdrop-blur-sm">
            <FloatingOrb className="w-64 h-64 bg-violet-500/30 -top-12 -left-12" />
            <FloatingOrb className="w-48 h-48 bg-blue-500/30 -bottom-8 -right-8" />
            <div className="relative z-10">
              <h2 className="text-4xl md:text-5xl font-black text-white mb-4 tracking-tight">
                Ready to Get Started?
              </h2>
              <p className="text-slate-300 text-lg mb-8 max-w-lg mx-auto">
                Join Hive today and experience the future of institutional collaboration.
              </p>
              <button
                onClick={() => navigate("/login")}
                className="group inline-flex items-center gap-3 px-8 py-4 rounded-2xl bg-white text-slate-900 font-bold text-base hover:bg-slate-100 hover:scale-[1.04] active:scale-[0.98] transition-all duration-300 shadow-2xl"
              >
                Sign In to Hive
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-200" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════ CONTACT ══════════════════════ */}
      <section id="contact" ref={contactRef} className="py-24 px-6 border-t border-white/6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <span className="inline-block text-xs font-bold uppercase tracking-[0.2em] text-rose-400 mb-4">
              Get In Touch
            </span>
            <h2 className="text-4xl md:text-5xl font-black text-white tracking-tight mb-4">
              We'd Love to Hear From You
            </h2>
            <p className="text-slate-400 text-lg max-w-xl mx-auto">
              Questions, feedback, or partnership inquiries — reach out and we'll get back to you promptly.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-12">
            {/* Contact Info */}
            <div className="contact-content space-y-6">
              {[
                { icon: Mail, label: "Email Us", value: "admin@dpms.edu", href: "mailto:admin@dpms.edu" },
                { icon: Phone, label: "Call Us", value: "+91 99999 00000", href: "tel:+919999900000" },
                { icon: MapPin, label: "Find Us", value: "Department of Computer Science", href: "#" },
              ].map(({ icon: Icon, label, value, href }) => (
                <a
                  key={label}
                  href={href}
                  className="flex items-center gap-4 p-5 rounded-2xl bg-white/4 border border-white/8 hover:border-white/16 hover:bg-white/6 transition-all duration-300 group"
                >
                  <div className="w-12 h-12 rounded-xl bg-rose-500/15 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300">
                    <Icon className="w-5 h-5 text-rose-400" />
                  </div>
                  <div>
                    <div className="text-xs text-slate-500 font-medium mb-0.5">{label}</div>
                    <div className="text-white font-semibold">{value}</div>
                  </div>
                </a>
              ))}
            </div>

            {/* Contact Form */}
            <div className="contact-content">
              <form
                className="space-y-4"
                onSubmit={(e) => { e.preventDefault(); }}
              >
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">Name</label>
                    <input
                      type="text"
                      placeholder="Your name"
                      className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-600 focus:outline-none focus:border-violet-500/50 focus:bg-white/8 transition-all duration-200 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">Email</label>
                    <input
                      type="email"
                      placeholder="your@email.com"
                      className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-600 focus:outline-none focus:border-violet-500/50 focus:bg-white/8 transition-all duration-200 text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">Message</label>
                  <textarea
                    rows={5}
                    placeholder="Tell us how we can help..."
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-600 focus:outline-none focus:border-violet-500/50 focus:bg-white/8 transition-all duration-200 text-sm resize-none"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 text-white font-bold hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 shadow-lg shadow-violet-500/20"
                >
                  Send Message
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════ FOOTER ══════════════════════ */}
      <footer className="py-10 px-6 border-t border-white/6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img src="/logo-icon.png?v=2" alt="Hive" className="h-8 w-8 object-contain" />
            <span className="text-white font-black text-lg tracking-tight">Hive</span>
          </div>
          <p className="text-slate-500 text-sm text-center">
            © {new Date().getFullYear()} Hive. All rights reserved. Built with passion for education.
          </p>
          <div className="flex items-center gap-3">
            {[Github, Twitter, Linkedin].map((Icon, i) => (
              <a
                key={i}
                href="#"
                className="w-9 h-9 rounded-xl bg-white/5 border border-white/8 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 hover:border-white/16 transition-all duration-200"
              >
                <Icon className="w-4 h-4" />
              </a>
            ))}
          </div>
        </div>
      </footer>

      {/* Global styles for this page */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) scale(1); }
          50% { transform: translateY(-20px) scale(1.02); }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
