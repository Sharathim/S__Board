import { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import { motion, useInView, useScroll, useTransform, AnimatePresence } from "framer-motion";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  ClipboardList, Users, BarChart2, Bell, Shield, GraduationCap,
  ArrowRight, LogIn, ChevronDown, CheckCircle2, Zap, Target, Eye,
  Code2, Cpu, FlaskConical, Globe2, Mail, Phone, Clock,
  MessageSquare, HelpCircle, ChevronDown as ChevDown, Send,
  Play, Plus, FileText, Moon, Sun, Sparkles, Check, Info,
  Lock, AlertCircle, User, Star, TrendingUp, Database
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";

gsap.registerPlugin(ScrollTrigger);

// ─── Hero animated counter ───────────────────────────────────────────────────
function AnimatedCounter({ to, suffix = "", duration = 2 }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });

  useEffect(() => {
    if (!inView || !ref.current) return;
    const el = ref.current;
    gsap.fromTo(
      el,
      { textContent: 0 },
      {
        textContent: to,
        duration,
        ease: "power2.out",
        snap: { textContent: 1 },
        onUpdate() {
          el.textContent = Math.round(parseFloat(el.textContent)) + suffix;
        },
      }
    );
  }, [inView, to, suffix, duration]);

  return <span ref={ref}>0{suffix}</span>;
}

// ─── Scroll reveal wrapper ────────────────────────────────────────────────────
function Reveal({ children, delay = 0, direction = "up", className = "", ...props }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const variants = {
    hidden: {
      opacity: 0,
      y: direction === "up" ? 40 : direction === "down" ? -40 : 0,
      x: direction === "left" ? 40 : direction === "right" ? -40 : 0,
    },
    visible: { opacity: 1, y: 0, x: 0 },
  };
  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={inView ? "visible" : "hidden"}
      variants={variants}
      transition={{ duration: 0.65, delay, ease: [0.21, 0.47, 0.32, 0.98] }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}

// ─── Section label ────────────────────────────────────────────────────────────
function SectionLabel({ children }) {
  return (
    <span className="inline-block text-xs font-bold text-indigo-600 tracking-widest uppercase mb-3">
      {children}
    </span>
  );
}

// ─── Alert Warning Icon (inline SVG) ─────────────────────────────────────────
function AlertWarningIcon(props) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

// ─── Google Icon ──────────────────────────────────────────────────────────────
function GoogleIcon() {
  return (
    <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

// ─── FAQ Item ────────────────────────────────────────────────────────────────
function FaqItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`border rounded-xl transition-all duration-200 overflow-hidden ${open ? "border-indigo-200 bg-indigo-50/30" : "border-slate-200 bg-white"}`}>
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left">
        <span className={`text-sm font-semibold leading-snug transition-colors ${open ? "text-indigo-700" : "text-slate-800"}`}>{q}</span>
        <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevDown className="w-4 h-4 shrink-0 text-slate-400" />
        </motion.div>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-4 text-sm text-slate-500 leading-relaxed border-t border-indigo-100/60 pt-3">{a}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN HOME PAGE
// ═══════════════════════════════════════════════════════════════════════════════
export default function HomePage() {
  const heroRef = useRef(null);
  const canvasRef = useRef(null);
  const headlineRef = useRef(null);
  const badgeRef = useRef(null);
  const ctaRef = useRef(null);
  const scrollRef = useRef(null);
  const [selectedArchNode, setSelectedArchNode] = useState("frontend");

  // ─── Hero Canvas Particles ───────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let animId;

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const particles = Array.from({ length: 80 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 1.8 + 0.4,
      vx: (Math.random() - 0.5) * 0.25,
      vy: (Math.random() - 0.5) * 0.25,
      alpha: Math.random() * 0.4 + 0.05,
    }));

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(129, 140, 248, ${p.alpha})`;
        ctx.fill();
      });
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 120) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(99,102,241,${0.06 * (1 - dist / 120)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }
      animId = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(animId); ro.disconnect(); };
  }, []);

  // ─── GSAP Hero Entrance ──────────────────────────────────────────────────
  useEffect(() => {
    const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
    tl.fromTo(badgeRef.current, { opacity: 0, y: -20 }, { opacity: 1, y: 0, duration: 0.7 })
      .fromTo(headlineRef.current?.children,
        { opacity: 0, y: 50 },
        { opacity: 1, y: 0, duration: 0.85, stagger: 0.12 },
        "-=0.4"
      )
      .fromTo(ctaRef.current, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.6 }, "-=0.3")
      .fromTo(scrollRef.current, { opacity: 0 }, { opacity: 1, duration: 0.5 }, "-=0.1");

    // Floating scroll indicator
    gsap.to(scrollRef.current, {
      y: 8,
      repeat: -1,
      yoyo: true,
      duration: 1.2,
      ease: "sine.inOut",
      delay: 1,
    });
  }, []);

  // ─── Interactive Features States ─────────────────────────────────────────
  const [activeSimTab, setActiveSimTab] = useState("projects");
  const [simTheme, setSimTheme] = useState("light");
  const [inviteToggle, setInviteToggle] = useState(true);
  const [likesCount, setLikesCount] = useState({ update: 42, forum1: 18, forum2: 24 });
  const [hasLiked, setHasLiked] = useState({ update: false, forum1: false, forum2: false });
  const [chatMessages, setChatMessages] = useState([
    { id: 1, sender: "Dr. Sarah Jenkins", role: "Faculty", content: "Hi team, please share the database schema for review by this afternoon.", time: "10:15 AM", avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150" },
    { id: 2, sender: "Arjun Mehta", role: "Student", content: "Working on it, Dr. Sarah. We finished the ER diagram and are mapping PostgreSQL tables now.", time: "10:28 AM", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150" },
    { id: 3, sender: "Neha Rao", role: "Forum Coordinator", content: "Great progress! I've scheduled our internal milestone demo for Friday. HOD has been notified.", time: "10:35 AM", avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150" },
  ]);
  const [typedMessage, setTypedMessage] = useState("");
  const chatEndRef = useRef(null);
  const [activeRole, setActiveRole] = useState("hod");
  const [studentsCount, setStudentsCount] = useState(350);
  const [projectsCount, setProjectsCount] = useState(65);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const handleSendMessage = useCallback((text = "") => {
    const msgText = text || typedMessage;
    if (!msgText.trim()) return;
    const newMsg = {
      id: Date.now(), sender: "You (Simulated Student)", role: "Student",
      content: msgText, time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      avatar: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150",
    };
    setChatMessages((prev) => [...prev, newMsg]);
    if (!text) setTypedMessage("");
    if (msgText.toLowerCase().includes("schema") || msgText.toLowerCase().includes("upload") || msgText.toLowerCase().includes("done")) {
      setTimeout(() => {
        setChatMessages((prev) => [...prev, {
          id: Date.now() + 1, sender: "Dr. Sarah Jenkins", role: "Faculty",
          content: "Received! Clean layout. Let's make sure the primary keys are indexed for efficiency.",
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150",
        }]);
      }, 1500);
    }
  }, [typedMessage]);

  const handleLike = (id) => {
    setHasLiked((prev) => {
      const updatedLike = !prev[id];
      setLikesCount((likes) => ({ ...likes, [id]: updatedLike ? likes[id] + 1 : likes[id] - 1 }));
      return { ...prev, [id]: updatedLike };
    });
  };

  // ─── Contact form state ──────────────────────────────────────────────────
  const [cName, setCName] = useState("");
  const [cEmail, setCEmail] = useState("");
  const [cRole, setCRole] = useState("student");
  const [cSubject, setCSubject] = useState("");
  const [cMessage, setCMessage] = useState("");
  const [cSubmitting, setCSubmitting] = useState(false);
  const [cSubmitted, setCSubmitted] = useState(false);
  const [cError, setCError] = useState("");

  const handleContactSubmit = (e) => {
    e.preventDefault();
    if (!cName.trim() || !cEmail.trim() || !cSubject.trim() || !cMessage.trim()) {
      setCError("Please fill in all required fields.");
      return;
    }
    setCError("");
    setCSubmitting(true);
    setTimeout(() => { setCSubmitting(false); setCSubmitted(true); }, 1600);
  };

  // ─── Scroll to section helper ─────────────────────────────────────────────
  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="bg-white dark:bg-black text-slate-900 dark:text-white transition-colors duration-300 overflow-x-hidden">

      {/* ════════════════════════════════════════════════════════════════════
          1. HERO SECTION
      ════════════════════════════════════════════════════════════════════ */}
      <section
        id="hero"
        ref={heroRef}
        className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden pt-[72px]"
      >
        {/* Particle canvas */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full pointer-events-none"
          aria-hidden="true"
        />

        {/* Ambient glows */}
        <div className="absolute top-1/4 left-1/4 w-[700px] h-[700px] bg-indigo-200/20 dark:bg-indigo-900/20 rounded-full blur-[140px] pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-violet-200/15 dark:bg-violet-900/15 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute top-0 inset-x-0 h-[500px] bg-gradient-to-b from-indigo-50/30 dark:from-indigo-950/20 to-transparent pointer-events-none" />

        {/* Main hero content */}
        <div className="relative z-10 w-full max-w-5xl mx-auto px-4 sm:px-6 text-center">

          {/* Badge */}
          <div ref={badgeRef} style={{ opacity: 0 }}>
            <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-white/80 dark:bg-white/5 backdrop-blur-sm border border-indigo-100 dark:border-indigo-500/20 shadow-sm mb-8">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <span className="text-sm font-semibold text-indigo-700 dark:text-indigo-300 tracking-wide">
                🐝 Hive — Your Academic Command Centre
              </span>
            </div>
          </div>

          {/* Headline */}
          <div ref={headlineRef} className="space-y-2 mb-8">
            <h1
              className="text-5xl sm:text-6xl xl:text-[76px] font-extrabold text-slate-900 dark:text-white leading-[1.04] tracking-[-0.03em]"
              style={{ opacity: 0 }}
            >
              The Intelligent Hub
            </h1>
            <h1
              className="text-5xl sm:text-6xl xl:text-[76px] font-extrabold leading-[1.04] tracking-[-0.03em]"
              style={{ opacity: 0 }}
            >
              for{" "}
              <span className="bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-500 bg-clip-text text-transparent">
                Academic Excellence
              </span>
            </h1>
            <p
              className="text-lg sm:text-xl text-slate-500 dark:text-slate-400 leading-relaxed max-w-2xl mx-auto mt-4 font-normal"
              style={{ opacity: 0 }}
            >
              Hive unifies HODs, Faculty, and Students in one powerful platform —
              manage projects, track progress, coordinate classes, and collaborate in real time.
            </p>
          </div>

          {/* CTA Buttons */}
          <div ref={ctaRef} style={{ opacity: 0 }} className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <Link
              to="/login"
              className="group inline-flex items-center gap-3 px-8 py-4 rounded-2xl
                bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-bold text-base
                shadow-2xl shadow-indigo-300/40 dark:shadow-indigo-900/40
                hover:from-indigo-700 hover:to-violet-700 hover:shadow-indigo-400/50
                hover:-translate-y-1 active:translate-y-0
                transition-all duration-300"
            >
              <LogIn className="w-5 h-5 transition-transform group-hover:rotate-12 duration-300" />
              Enter Hive
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1 duration-300" />
            </Link>
            <button
              onClick={() => scrollTo("features")}
              className="inline-flex items-center gap-2.5 px-7 py-4 rounded-2xl
                bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-white font-semibold text-base
                hover:bg-slate-50 dark:hover:bg-white/10 hover:-translate-y-0.5
                transition-all duration-200 shadow-sm"
            >
              <Play className="w-4 h-4 fill-current text-indigo-600" />
              See It Live
            </button>
          </div>

          {/* Stat counters */}
          <Reveal delay={0.3}>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-3xl mx-auto">
              {[
                { value: 500, suffix: "+", label: "Students Enrolled" },
                { value: 30, suffix: "+", label: "Expert Faculty" },
                { value: 200, suffix: "+", label: "Projects Tracked" },
                { value: 99, suffix: "%", label: "Uptime" },
              ].map(({ value, suffix, label }) => (
                <div
                  key={label}
                  className="bg-white/70 dark:bg-white/5 backdrop-blur-sm border border-white/60 dark:border-white/10 rounded-2xl p-4 text-center shadow-sm"
                >
                  <div className="text-3xl font-extrabold text-indigo-600 tracking-tight leading-none">
                    <AnimatedCounter to={value} suffix={suffix} />
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 font-medium">{label}</div>
                </div>
              ))}
            </div>
          </Reveal>
        </div>

        {/* Scroll indicator */}
        <div ref={scrollRef} style={{ opacity: 0 }} className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
          <span className="text-xs text-slate-400 dark:text-slate-500 font-medium tracking-widest uppercase">Scroll</span>
          <button
            onClick={() => scrollTo("about")}
            className="w-8 h-12 rounded-full border-2 border-slate-300 dark:border-slate-600 flex items-start justify-center pt-2 hover:border-indigo-400 transition-colors"
          >
            <div className="w-1.5 h-2.5 rounded-full bg-indigo-500 animate-bounce" />
          </button>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════
          2. ABOUT SECTION
      ════════════════════════════════════════════════════════════════════ */}
      <section id="about" className="relative py-28 px-4 sm:px-6 lg:px-8 overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 bg-gradient-to-b from-slate-50/80 dark:from-slate-950/50 to-white dark:to-black pointer-events-none" />
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-50/50 dark:bg-indigo-900/10 rounded-full blur-[100px] pointer-events-none" />

        <div className="relative max-w-7xl mx-auto">
          {/* Header */}
          <Reveal className="text-center mb-16">
            <SectionLabel>About Hive</SectionLabel>
            <h2 className="text-4xl sm:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-4">
              One Platform.<br />
              <span className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
                Infinite Possibilities.
              </span>
            </h2>
            <p className="text-lg text-slate-500 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed">
              Hive (DPMS) is the central nervous system of your department — bridging administration,
              faculty, and students through seamless project management and real-time collaboration.
            </p>
          </Reveal>

          {/* Role cards */}
          <div className="grid md:grid-cols-3 gap-6 mb-20">
            {[
              {
                icon: Shield,
                role: "HOD / Admin",
                color: "from-indigo-500 to-indigo-700",
                bg: "bg-indigo-50 dark:bg-indigo-950/40",
                border: "border-indigo-100 dark:border-indigo-800/40",
                iconColor: "text-indigo-600",
                desc: "Full administrative control. Manage classes, approve faculty, oversee all projects, and view real-time department analytics.",
                features: ["Department-wide oversight", "Faculty approval & management", "Analytics dashboard", "Forum moderation"],
              },
              {
                icon: Users,
                role: "Faculty Mentor",
                color: "from-violet-500 to-violet-700",
                bg: "bg-violet-50 dark:bg-violet-950/40",
                border: "border-violet-100 dark:border-violet-800/40",
                iconColor: "text-violet-600",
                desc: "Guide student teams, manage class portals, coordinate project milestones, and share resources in one seamless workspace.",
                features: ["Class & project management", "Student team coordination", "File sharing & feedback", "Progress monitoring"],
              },
              {
                icon: GraduationCap,
                role: "Student Team",
                color: "from-emerald-500 to-emerald-700",
                bg: "bg-emerald-50 dark:bg-emerald-950/40",
                border: "border-emerald-100 dark:border-emerald-800/40",
                iconColor: "text-emerald-600",
                desc: "Submit progress updates, collaborate with teammates, access project resources, and receive real-time notifications.",
                features: ["Progress log submissions", "Team collaboration chat", "File & PDF uploads", "Push notifications"],
              },
            ].map(({ icon: Icon, role, color, bg, border, iconColor, desc, features }, i) => (
              <Reveal key={role} delay={i * 0.12}>
                <motion.div
                  whileHover={{ y: -6, scale: 1.01 }}
                  transition={{ type: "spring", stiffness: 300 }}
                  className={`${bg} border ${border} rounded-2xl p-7 h-full flex flex-col`}
                >
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center mb-5 shadow-lg`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">{role}</h3>
                  <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed mb-5 flex-1">{desc}</p>
                  <ul className="space-y-2">
                    {features.map((f) => (
                      <li key={f} className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                        <Check className={`w-3.5 h-3.5 ${iconColor} shrink-0`} />
                        {f}
                      </li>
                    ))}
                  </ul>
                </motion.div>
              </Reveal>
            ))}
          </div>

          {/* Mission & Vision */}
          <div className="grid md:grid-cols-2 gap-6 mb-20">
            {[
              {
                icon: Target,
                title: "Our Mission",
                accent: "text-indigo-600",
                bg: "bg-indigo-50 dark:bg-indigo-950/30",
                desc: "To provide a transformative educational experience that equips students with deep technical knowledge, critical thinking skills, and ethical values needed to excel in the ever-evolving technology landscape.",
                items: ["Foster academic excellence and research culture", "Bridge theory with real-world industry practice", "Develop future-ready technology professionals"],
              },
              {
                icon: Eye,
                title: "Our Vision",
                accent: "text-violet-600",
                bg: "bg-violet-50 dark:bg-violet-950/30",
                desc: "To be a globally recognized centre of excellence in computer science education and research, producing graduates who lead technological innovation and make meaningful contributions to society.",
                items: ["Globally recognized research & education hub", "Produce industry-leading technology innovators", "Drive positive social impact through technology"],
              },
            ].map(({ icon: Icon, title, accent, bg, desc, items }, i) => (
              <Reveal key={title} delay={i * 0.15} direction={i === 0 ? "right" : "left"}>
                <div className={`${bg} rounded-2xl border border-slate-100 dark:border-white/5 p-8`}>
                  <div className="w-12 h-12 rounded-xl bg-white dark:bg-white/5 flex items-center justify-center mb-5 shadow-sm">
                    <Icon className={`w-6 h-6 ${accent}`} />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">{title}</h3>
                  <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed mb-5">{desc}</p>
                  <ul className="space-y-2.5">
                    {items.map((item) => (
                      <li key={item} className="flex items-start gap-2.5 text-sm text-slate-600 dark:text-slate-300">
                        <CheckCircle2 className={`w-4 h-4 ${accent} mt-0.5 shrink-0`} />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </Reveal>
            ))}
          </div>

          {/* Stats row */}
          <Reveal>
            <div className="bg-gradient-to-r from-indigo-600 to-violet-700 rounded-3xl p-8 sm:p-12">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 text-center text-white">
                {[
                  { value: 500, suffix: "+", label: "Students Enrolled" },
                  { value: 30, suffix: "+", label: "Expert Faculty" },
                  { value: 200, suffix: "+", label: "Projects Completed" },
                  { value: 15, suffix: "+", label: "Years Excellence" },
                ].map(({ value, suffix, label }) => (
                  <div key={label}>
                    <div className="text-4xl font-extrabold tracking-tight">
                      <AnimatedCounter to={value} suffix={suffix} />
                    </div>
                    <div className="text-indigo-200 text-sm mt-1">{label}</div>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════
          3. FEATURES / INTERACTIVE SANDBOX
      ════════════════════════════════════════════════════════════════════ */}
      <section id="features" className="relative py-28 px-4 sm:px-6 lg:px-8 overflow-hidden">
        {/* Ambient background */}
        <div className="absolute top-0 inset-x-0 h-[600px] bg-gradient-to-b from-indigo-50/60 dark:from-indigo-950/30 via-transparent to-transparent pointer-events-none" />
        <div className="absolute top-40 left-1/4 w-[350px] h-[350px] bg-indigo-200/30 dark:bg-indigo-900/20 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute top-80 right-1/4 w-[400px] h-[400px] bg-violet-200/20 dark:bg-violet-900/15 rounded-full blur-[120px] pointer-events-none" />

        <div className="relative max-w-7xl mx-auto">
          {/* Header */}
          <Reveal className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-100 dark:border-indigo-700/30 shadow-sm mb-6">
              <Sparkles className="w-4 h-4 text-indigo-600 animate-pulse" />
              <span className="text-xs font-semibold text-indigo-700 dark:text-indigo-300 tracking-wider uppercase">Interactive Experience</span>
            </div>
            <h2 className="text-4xl sm:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-4">
              Everything you need to orchestrate{" "}
              <span className="bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-500 bg-clip-text text-transparent">
                Academic Projects
              </span>
            </h2>
            <p className="text-lg text-slate-500 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed">
              A premium, real-time portal bridging students, faculty coordinators, and HODs.
              Monitor timelines, centralize feedback, and scale academic research securely.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-8">
              <a href="#sandbox"
                className="inline-flex items-center gap-2.5 px-6 py-3.5 rounded-xl bg-indigo-600 text-white font-semibold shadow-lg shadow-indigo-200 dark:shadow-indigo-900/40 hover:bg-indigo-700 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200">
                <Play className="w-4 h-4 fill-white" />
                Try Interactive Sandbox
              </a>
              <a href="#roi"
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-white font-semibold hover:bg-slate-50 dark:hover:bg-white/10 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200">
                Calculate Time Saved
              </a>
            </div>
          </Reveal>

          {/* Feature cards grid */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-20">
            {[
              { icon: ClipboardList, title: "Project Tracking", desc: "Real-time milestone and progress monitoring across all department projects.", color: "text-indigo-600", bg: "bg-indigo-50 dark:bg-indigo-900/20" },
              { icon: Users, title: "Collaboration Hub", desc: "Seamless communication between HODs, faculty, and student teams.", color: "text-violet-600", bg: "bg-violet-50 dark:bg-violet-900/20" },
              { icon: BarChart2, title: "Smart Analytics", desc: "Data-driven insights on project health, completion rates, and activity.", color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-900/20" },
              { icon: Bell, title: "Instant Notifications", desc: "Firebase-powered push alerts for updates, deadlines, and announcements.", color: "text-amber-500", bg: "bg-amber-50 dark:bg-amber-900/20" },
            ].map(({ icon: Icon, title, desc, color, bg }, i) => (
              <Reveal key={title} delay={i * 0.08}>
                <motion.div
                  whileHover={{ y: -4 }}
                  className="group bg-white dark:bg-white/[0.03] rounded-2xl border border-slate-100 dark:border-white/5 shadow-sm p-6 hover:shadow-md transition-all duration-300"
                >
                  <div className={`w-12 h-12 ${bg} rounded-xl flex items-center justify-center mb-4 group-hover:scale-105 transition-transform duration-200`}>
                    <Icon className={`w-5 h-5 ${color}`} />
                  </div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2">{title}</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{desc}</p>
                </motion.div>
              </Reveal>
            ))}
          </div>

          {/* ── INTERACTIVE SANDBOX ── */}
          <Reveal id="sandbox" className="scroll-mt-20 mb-8">
            <div className="text-center mb-10">
              <h3 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">System Sandbox Simulator</h3>
              <p className="text-slate-500 dark:text-slate-400 mt-2 max-w-lg mx-auto">
                Interact with this simulated mockup of the Hive dashboard to explore our key modules in real-time.
              </p>
            </div>
          </Reveal>

          <Reveal>
            <div className="bg-white dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col lg:flex-row min-h-[580px] max-w-6xl mx-auto">
              {/* Mock Side Navbar */}
              <div className="w-full lg:w-64 bg-slate-900 text-slate-300 flex flex-col border-r border-slate-800">
                <div className="p-5 border-b border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-white shadow-md text-sm">H</div>
                    <div>
                      <span className="font-bold text-white text-sm tracking-wide block">Hive Portal</span>
                      <span className="text-[10px] text-slate-400 block -mt-1 font-medium">Department Workspace</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500 block" />
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400 block" />
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 block" />
                  </div>
                </div>

                <div className="p-3 space-y-1.5 flex-1">
                  <div className="text-[10px] uppercase font-bold tracking-wider text-slate-500 px-3 py-2">Core Modules</div>
                  {[
                    { key: "projects", icon: ClipboardList, label: "Projects Hub" },
                    { key: "classes", icon: Users, label: "Classes & Access", badge: "8" },
                    { key: "monitor", icon: MessageSquare, label: "Progress Monitor", live: true },
                    { key: "forum", icon: Globe2, label: "Forum Board" },
                  ].map(({ key, icon: Icon, label, badge, live }) => (
                    <button
                      key={key}
                      onClick={() => setActiveSimTab(key)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-xs font-semibold transition-all duration-150 ${
                        activeSimTab === key
                          ? "bg-slate-800 text-white shadow-inner border-l-4 border-indigo-500"
                          : "hover:bg-slate-800/50 hover:text-slate-100"
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${activeSimTab === key ? "text-indigo-400" : "text-slate-400"}`} />
                      <span>{label}</span>
                      {badge && <span className="ml-auto bg-indigo-900/60 text-indigo-300 text-[9px] px-1.5 py-0.5 rounded-full font-bold">{badge}</span>}
                      {live && <span className="ml-auto w-2 h-2 rounded-full bg-emerald-500 animate-ping" />}
                      {!badge && !live && activeSimTab === key && <span className="ml-auto w-2 h-2 rounded-full bg-indigo-500" />}
                    </button>
                  ))}

                  <div className="text-[10px] uppercase font-bold tracking-wider text-slate-500 px-3 pt-6 pb-2">Simulated Controls</div>
                  <div className="px-3 py-2 space-y-3">
                    <div className="flex items-center justify-between text-xs text-slate-400 bg-slate-800/40 p-2 rounded-lg border border-slate-800">
                      <span>Theme Preview:</span>
                      <button
                        onClick={() => setSimTheme((t) => (t === "light" ? "dark" : "light"))}
                        className="p-1.5 rounded-md bg-slate-800 text-white hover:bg-slate-700 transition-colors border border-slate-700"
                      >
                        {simTheme === "light" ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                    <div className="text-[11px] text-slate-400 leading-normal bg-indigo-950/40 border border-indigo-900/40 p-3 rounded-lg">
                      <div className="flex gap-1.5 mb-1 font-semibold text-indigo-400">
                        <Info className="w-3.5 h-3.5 shrink-0" /><span>Try Toggling!</span>
                      </div>
                      Clicking buttons, toggles, or typing messages alters the live mockup.
                    </div>
                  </div>
                </div>

                <div className="p-4 border-t border-slate-800 bg-slate-950 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-amber-400 to-rose-500 text-white flex items-center justify-center font-bold text-xs uppercase shadow-md">HOD</div>
                  <div>
                    <span className="font-bold text-white text-xs block">Dr. A. K. Shastri</span>
                    <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 block animate-pulse" />HOD Account
                    </span>
                  </div>
                </div>
              </div>

              {/* Workspace Content */}
              <div className={`flex-1 flex flex-col min-h-[500px] transition-colors duration-300 ${simTheme === "light" ? "bg-slate-50 text-slate-800" : "bg-slate-950 text-slate-200"}`}>
                <div className={`px-6 py-4 flex items-center justify-between border-b ${simTheme === "light" ? "bg-white border-slate-200" : "bg-slate-900 border-slate-800"}`}>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${simTheme === "light" ? "bg-indigo-50 text-indigo-600" : "bg-indigo-900/60 text-indigo-300"}`}>Live Preview</span>
                    <span className="text-slate-400 text-xs">/</span>
                    <span className="text-xs font-semibold capitalize text-slate-500">{activeSimTab}</span>
                  </div>
                  <div className="relative max-w-xs hidden sm:block">
                    <input type="text" placeholder="Search project, students..." disabled
                      className={`w-48 text-[11px] py-1.5 pl-3 pr-8 rounded-lg border focus:outline-none cursor-not-allowed ${simTheme === "light" ? "bg-slate-100/50 border-slate-200 text-slate-400" : "bg-slate-800 border-slate-700 text-slate-500"}`}
                    />
                  </div>
                </div>

                <div className="flex-1 p-6 relative">
                  <AnimatePresence mode="wait">
                    {activeSimTab === "projects" && (
                      <motion.div key="projects" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.2 }} className="space-y-5">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          {[
                            { label: "Total Projects", val: "28", icon: ClipboardList, color: "text-indigo-500", bg: "bg-indigo-500/10" },
                            { label: "In Progress", val: "19", icon: Cpu, color: "text-amber-500", bg: "bg-amber-500/10" },
                            { label: "Completed", val: "9", icon: CheckCircle2, color: "text-emerald-500", bg: "bg-emerald-500/10" },
                            { label: "Low Activity", val: "3", icon: AlertWarningIcon, color: "text-rose-500", bg: "bg-rose-500/10" },
                          ].map((stat, idx) => {
                            const StatIcon = stat.icon;
                            return (
                              <div key={idx} className={`p-3 rounded-xl border ${simTheme === "light" ? "bg-white border-slate-200/80 shadow-sm" : "bg-slate-900 border-slate-800/80"}`}>
                                <div className="flex items-center justify-between">
                                  <span className="text-[10px] text-slate-400 font-medium">{stat.label}</span>
                                  <span className={`p-1 rounded-md ${stat.bg} ${stat.color}`}><StatIcon className="w-3.5 h-3.5" /></span>
                                </div>
                                <div className="text-xl font-bold mt-1.5">{stat.val}</div>
                              </div>
                            );
                          })}
                        </div>
                        <div className={`rounded-xl border overflow-hidden ${simTheme === "light" ? "bg-white border-slate-200 shadow-sm" : "bg-slate-900 border-slate-800"}`}>
                          <div className={`p-4 border-b flex items-center justify-between ${simTheme === "light" ? "bg-slate-50 border-slate-200" : "bg-slate-900/60 border-slate-800"}`}>
                            <h4 className="text-xs font-bold uppercase tracking-wider">Active Department Projects</h4>
                            <button className="text-[10px] px-2.5 py-1 rounded bg-indigo-600 text-white font-semibold hover:bg-indigo-700 flex items-center gap-1 shadow-sm">
                              <Plus className="w-3 h-3" /> Create Project
                            </button>
                          </div>
                          <div className="overflow-x-auto text-xs">
                            <table className="w-full text-left">
                              <thead>
                                <tr className={`border-b ${simTheme === "light" ? "border-slate-100 bg-slate-50/50 text-slate-400" : "border-slate-800 bg-slate-900/40 text-slate-500"}`}>
                                  <th className="p-3 font-semibold">Title & Desc</th>
                                  <th className="p-3 font-semibold">Lead Faculty</th>
                                  <th className="p-3 font-semibold">Team</th>
                                  <th className="p-3 font-semibold">Status</th>
                                  <th className="p-3 font-semibold text-right">Action</th>
                                </tr>
                              </thead>
                              <tbody>
                                {[
                                  { title: "Autonomous Quadcopter", desc: "ArduPilot integration for obstacle detection", faculty: "Dr. Sarah Jenkins", team: 4, status: "In Progress", pill: "bg-indigo-500/10 text-indigo-500 border-indigo-500/20" },
                                  { title: "Smart Crop Irrigation", desc: "IoT sensor grid tracking soil moisture", faculty: "Prof. Rajesh Kumar", team: 3, status: "Low Activity", pill: "bg-orange-500/10 text-orange-500 border-orange-500/20" },
                                  { title: "Campus Attendance Hub", desc: "Facial recognition using thermal cameras", faculty: "Dr. Sarah Jenkins", team: 5, status: "Completed", pill: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" },
                                ].map((proj, index) => (
                                  <tr key={index} className={`hover:bg-indigo-500/5 transition-colors ${simTheme === "light" ? "text-slate-700" : "text-slate-300"}`}>
                                    <td className="p-3 max-w-[180px]">
                                      <div className="font-semibold truncate">{proj.title}</div>
                                      <div className="text-[10px] text-slate-400 truncate">{proj.desc}</div>
                                    </td>
                                    <td className="p-3 font-medium">{proj.faculty}</td>
                                    <td className="p-3"><div className="flex items-center gap-1"><Users className="w-3.5 h-3.5 text-slate-400" /><span>{proj.team}</span></div></td>
                                    <td className="p-3"><span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${proj.pill}`}>{proj.status}</span></td>
                                    <td className="p-3 text-right"><button onClick={() => setActiveSimTab("monitor")} className="text-[10px] text-indigo-600 font-bold hover:underline">View Monitor</button></td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {activeSimTab === "classes" && (
                      <motion.div key="classes" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.2 }} className="space-y-6">
                        <div className={`p-4 rounded-xl border flex items-start gap-3.5 ${simTheme === "light" ? "bg-indigo-50/50 border-indigo-100" : "bg-indigo-950/20 border-indigo-900/40"}`}>
                          <Shield className="w-5 h-5 text-indigo-600 mt-0.5 shrink-0" />
                          <div className="text-xs">
                            <h4 className="font-bold text-slate-900 dark:text-white mb-1">Interactive Sandbox Controls</h4>
                            <p className="text-slate-500 dark:text-slate-400">Each class card has its own invite toggle. Click the toggle below to enable/disable student signups instantly!</p>
                          </div>
                        </div>
                        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                          <div className={`p-5 rounded-xl border flex flex-col justify-between transition-all ${simTheme === "light" ? "bg-white border-slate-200 shadow-sm" : "bg-slate-900 border-slate-800"}`}>
                            <div>
                              <div className="flex items-center justify-between mb-3">
                                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Class Profile</span>
                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${inviteToggle ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" : "bg-slate-500/10 text-slate-500 border border-slate-500/20"}`}>
                                  {inviteToggle ? "Invite Active" : "Invite Disabled"}
                                </span>
                              </div>
                              <h3 className="text-lg font-bold">UG — 3A</h3>
                              <p className="text-[11px] text-slate-400 mt-1">Class Incharge: Dr. Sarah Jenkins</p>
                              <div className="grid grid-cols-2 gap-3 mt-4">
                                {[["Students", "58"], ["Forum Members", "4"]].map(([k, v]) => (
                                  <div key={k} className={`p-2 rounded-lg border text-center ${simTheme === "light" ? "bg-slate-50 border-slate-100" : "bg-slate-800/40 border-slate-800"}`}>
                                    <div className="text-[10px] text-slate-400">{k}</div>
                                    <div className="text-sm font-bold">{v}</div>
                                  </div>
                                ))}
                              </div>
                            </div>
                            <div className={`mt-5 pt-4 border-t flex items-center justify-between ${simTheme === "light" ? "border-slate-100" : "border-slate-800"}`}>
                              <span className="text-[10px] font-semibold text-slate-400">Student Invite Link:</span>
                              <button onClick={() => setInviteToggle(!inviteToggle)} className={`w-11 h-6 rounded-full transition-all duration-200 relative p-0.5 ${inviteToggle ? "bg-indigo-600" : "bg-slate-400"}`}>
                                <span className={`w-5 h-5 rounded-full bg-white block shadow-md transform transition-all duration-200 ${inviteToggle ? "translate-x-5" : "translate-x-0"}`} />
                              </button>
                            </div>
                          </div>
                          {[{ name: "UG — 3B", incharge: "Prof. Rajesh Kumar", students: 56, forum: 3 }, { name: "UG — 2A", incharge: "Dr. M. S. Pillai", students: 60, forum: "N/A" }].map((cls, idx) => (
                            <div key={idx} className={`p-5 rounded-xl border opacity-75 ${simTheme === "light" ? "bg-white border-slate-200" : "bg-slate-900 border-slate-800"}`}>
                              <div className="flex items-center justify-between mb-3">
                                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Class Profile</span>
                                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-slate-500/10 text-slate-500 border border-slate-500/20">Invites Disabled</span>
                              </div>
                              <h3 className="text-lg font-bold">{cls.name}</h3>
                              <p className="text-[11px] text-slate-400 mt-1">Class Incharge: {cls.incharge}</p>
                              <div className="grid grid-cols-2 gap-3 mt-4">
                                {[["Students", cls.students], ["Forum Members", cls.forum]].map(([k, v]) => (
                                  <div key={k} className={`p-2 rounded-lg border text-center ${simTheme === "light" ? "bg-slate-50 border-slate-100" : "bg-slate-800/40 border-slate-800"}`}>
                                    <div className="text-[10px] text-slate-400">{k}</div>
                                    <div className="text-sm font-bold">{v}</div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}

                    {activeSimTab === "monitor" && (
                      <motion.div key="monitor" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.2 }}
                        className="flex flex-col h-[400px] border rounded-xl overflow-hidden shadow-inner bg-slate-100 dark:bg-slate-900/60 border-slate-200/80 dark:border-slate-800">
                        <div className={`px-4 py-2.5 border-b flex items-center justify-between ${simTheme === "light" ? "bg-white border-slate-200" : "bg-slate-900 border-slate-800"}`}>
                          <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 block animate-pulse" />
                            <span className="text-xs font-bold">Progress Chat: Autonomous Quadcopter</span>
                          </div>
                          <span className="text-[10px] text-slate-400 font-semibold">4 Members Online</span>
                        </div>
                        <div className="flex-1 p-4 overflow-y-auto space-y-3 min-h-0">
                          {chatMessages.map((msg) => (
                            <div key={msg.id} className="flex items-start gap-2.5">
                              <img src={msg.avatar} alt={msg.sender} className="w-8 h-8 rounded-full object-cover shrink-0 mt-0.5 border border-slate-200 dark:border-slate-800" />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-baseline gap-1.5">
                                  <span className="font-bold text-xs text-slate-900 dark:text-white">{msg.sender}</span>
                                  <span className="text-[9px] text-indigo-500 font-semibold bg-indigo-500/5 px-1 rounded">{msg.role}</span>
                                  <span className="text-[8px] text-slate-400 font-medium">{msg.time}</span>
                                </div>
                                <div className={`mt-1 p-2 rounded-lg text-xs leading-relaxed max-w-[85%] border shadow-sm ${msg.sender.startsWith("You") ? "bg-indigo-600 text-white border-indigo-700" : simTheme === "light" ? "bg-white text-slate-700 border-slate-200/80" : "bg-slate-800 text-slate-300 border-slate-700/80"}`}>
                                  {msg.content}
                                </div>
                              </div>
                            </div>
                          ))}
                          <div ref={chatEndRef} />
                        </div>
                        <div className={`px-4 py-2 border-t flex flex-wrap gap-1.5 ${simTheme === "light" ? "bg-white border-slate-200" : "bg-slate-900 border-slate-800"}`}>
                          <span className="text-[9px] text-slate-400 font-bold uppercase self-center mr-1">Quick replies:</span>
                          {["Hi Dr. Sarah, upload database schema draft.", "Milestone 2 completed. Core hardware tested.", "Requesting access grant for junior students."].map((text, idx) => (
                            <button key={idx} onClick={() => handleSendMessage(text)}
                              className={`text-[9px] px-2 py-1 rounded-md border font-medium transition-colors ${simTheme === "light" ? "bg-slate-50 hover:bg-indigo-50 hover:border-indigo-200 text-slate-600" : "bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700"}`}>
                              {text}
                            </button>
                          ))}
                        </div>
                        <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }}
                          className={`p-3 border-t flex gap-2 ${simTheme === "light" ? "bg-slate-50 border-slate-200" : "bg-slate-900 border-slate-800"}`}>
                          <input type="text" value={typedMessage} onChange={(e) => setTypedMessage(e.target.value)} placeholder="Type simulated message..."
                            className={`flex-1 text-xs px-3 py-2 rounded-lg border focus:outline-none focus:ring-1 focus:ring-indigo-500 ${simTheme === "light" ? "bg-white border-slate-200 text-slate-700" : "bg-slate-850 border-slate-750 text-slate-200"}`} />
                          <button type="submit" className="px-3 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 flex items-center justify-center transition-colors shadow-sm">
                            <Send className="w-3.5 h-3.5" />
                          </button>
                        </form>
                      </motion.div>
                    )}

                    {activeSimTab === "forum" && (
                      <motion.div key="forum" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.2 }} className="space-y-4">
                        {[
                          { id: "forum1", author: "Rahul Varma (UG-3A Student)", title: "Optimized Database Indexing Guidelines for Semester Projects", content: "Hey teams! If you're designing application APIs, remember to index your ForeignKey fields like `student_id` or `class_id`. It drops query latency from O(N) to O(log N) as DB records scale.", tag: "Research & Development", hasDoc: true },
                          { id: "forum2", author: "Dr. Sarah Jenkins (Faculty Advisor)", title: "Call for Research Project Nominations: IEEE AI/ML Expo", content: "The IEEE chapter has announced nominations for regional student projects. Submissions are open for autonomous hardware and agricultural IoT models.", tag: "Notification", hasDoc: false },
                        ].map((post, idx) => (
                          <div key={idx} className={`p-4 rounded-xl border ${simTheme === "light" ? "bg-white border-slate-200 shadow-sm" : "bg-slate-900 border-slate-800"}`}>
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <span className={`w-2 h-2 rounded-full ${idx === 0 ? "bg-indigo-500" : "bg-amber-500"}`} />
                                <span className="text-[10px] text-slate-400 font-bold tracking-wide">{post.author}</span>
                              </div>
                              <span className={`text-[9px] font-semibold px-2 py-0.5 rounded-full ${simTheme === "light" ? "bg-slate-100 text-slate-600" : "bg-slate-800 text-slate-400"}`}>{post.tag}</span>
                            </div>
                            <h4 className="text-sm font-bold mb-1.5">{post.title}</h4>
                            <p className="text-xs text-slate-500 leading-relaxed mb-3.5">{post.content}</p>
                            {post.hasDoc && (
                              <div className={`p-2.5 rounded-lg border flex items-center justify-between mb-3.5 max-w-sm ${simTheme === "light" ? "bg-slate-50 border-slate-100" : "bg-slate-800/40 border-slate-800"}`}>
                                <div className="flex items-center gap-2">
                                  <FileText className="w-4 h-4 text-rose-500" />
                                  <div>
                                    <div className="text-[11px] font-bold">indexing_guide_v2.pdf</div>
                                    <div className="text-[9px] text-slate-400">1.2 MB — Cloudinary Secure Storage</div>
                                  </div>
                                </div>
                                <span className="text-[9px] font-semibold text-indigo-600 dark:text-indigo-400 cursor-not-allowed">Download</span>
                              </div>
                            )}
                            <div className="flex items-center gap-4">
                              <button onClick={() => handleLike(post.id)}
                                className={`flex items-center gap-1 text-[11px] font-bold py-1 px-2.5 rounded-full transition-colors ${hasLiked[post.id] ? "bg-rose-500/10 text-rose-500" : simTheme === "light" ? "bg-slate-100 hover:bg-slate-200 text-slate-500" : "bg-slate-800 hover:bg-slate-700 text-slate-400"}`}>
                                <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                                </svg>
                                <span>{likesCount[post.id]} Likes</span>
                              </button>
                            </div>
                          </div>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>
          </Reveal>

          {/* ── Role-Based Workflows ── */}
          <div className="mt-24">
            <Reveal className="text-center mb-12">
              <SectionLabel>Personalized Experience</SectionLabel>
              <h3 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Customized Workflows for Every Role</h3>
              <p className="text-slate-500 dark:text-slate-400 mt-2 max-w-md mx-auto">Hive adapts to who you are, serving the specific features and tools you need.</p>
              <div className="flex items-center justify-center p-1 bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl max-w-md mx-auto mt-8">
                {[{ key: "hod", label: "HOD / Admin", icon: Shield }, { key: "faculty", label: "Faculty Mentor", icon: Users }, { key: "student", label: "Student Team", icon: GraduationCap }].map((role) => {
                  const RoleIcon = role.icon;
                  return (
                    <button key={role.key} onClick={() => setActiveRole(role.key)}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg text-xs font-bold transition-all duration-200 ${activeRole === role.key ? "bg-white dark:bg-slate-700 text-indigo-600 shadow-md" : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"}`}>
                      <RoleIcon className="w-3.5 h-3.5" /><span>{role.label}</span>
                    </button>
                  );
                })}
              </div>
            </Reveal>

            <Reveal>
              <div className="max-w-5xl mx-auto bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden p-6 sm:p-10 flex flex-col md:flex-row items-center gap-10">
                <div className="flex-1 space-y-6">
                  <AnimatePresence mode="wait">
                    {activeRole === "hod" && (
                      <motion.div key="hod" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} transition={{ duration: 0.25 }} className="space-y-4">
                        <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-100 dark:border-indigo-700/30 flex items-center justify-center">
                          <Shield className="w-6 h-6 text-indigo-600" />
                        </div>
                        <h3 className="text-2xl font-bold text-slate-900 dark:text-white">Total Department Orchestration</h3>
                        <p className="text-slate-500 dark:text-slate-400 leading-relaxed text-sm">As the Head of Department, you retain administrative authority over the workspace structure. Generate project allocations, coordinate guides, and view overall analytics in real-time.</p>
                        <ul className="space-y-3.5 text-xs text-slate-600 dark:text-slate-300">
                          {["Global toggle to enable/disable faculty signups instantly.", "Allocate project structures and assign student groups with cross-role exclusivity checking.", "Approve and restrict visibility on forum posts to keep communications professional.", "Review auto-flagged 'Low Activity' projects that have stalled for over 3 days."].map((item, idx) => (
                            <li key={idx} className="flex items-start gap-2.5"><Check className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" /><span>{item}</span></li>
                          ))}
                        </ul>
                      </motion.div>
                    )}
                    {activeRole === "faculty" && (
                      <motion.div key="faculty" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} transition={{ duration: 0.25 }} className="space-y-4">
                        <div className="w-12 h-12 rounded-xl bg-violet-50 dark:bg-violet-900/30 border border-violet-100 dark:border-violet-700/30 flex items-center justify-center">
                          <Users className="w-6 h-6 text-violet-600" />
                        </div>
                        <h3 className="text-2xl font-bold text-slate-900 dark:text-white">Mentor & Guide Classroom Portals</h3>
                        <p className="text-slate-500 dark:text-slate-400 leading-relaxed text-sm">Keep your student teams aligned. Faculty members manage their designated classes and coordinate specific projects, reducing overhead updates and centralizing reports.</p>
                        <ul className="space-y-3.5 text-xs text-slate-600 dark:text-slate-300">
                          {["Toggle invite link permission per-class if assigned as Class Incharge.", "Grant direct class list review access to other faculty members instantly.", "Contribute reviews and download technical logs/materials directly from project timelines.", "Appointed Update Coordinators can post official public feed notifications."].map((item, idx) => (
                            <li key={idx} className="flex items-start gap-2.5"><Check className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" /><span>{item}</span></li>
                          ))}
                        </ul>
                      </motion.div>
                    )}
                    {activeRole === "student" && (
                      <motion.div key="student" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} transition={{ duration: 0.25 }} className="space-y-4">
                        <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-900/30 border border-amber-100 dark:border-amber-700/30 flex items-center justify-center">
                          <GraduationCap className="w-6 h-6 text-amber-600" />
                        </div>
                        <h3 className="text-2xl font-bold text-slate-900 dark:text-white">Seamless Student Teamwork Hub</h3>
                        <p className="text-slate-500 dark:text-slate-400 leading-relaxed text-sm">No more lost emails, WhatsApp groups, or misplaced documentation. Students use secure Google Sign-In linked directly to their class and register details.</p>
                        <ul className="space-y-3.5 text-xs text-slate-600 dark:text-slate-300">
                          {["Locked class onboarding ensures zero errors on signup data entry.", "Post progress logs, PDF schemas, zip codes, and files safely in the Progress Monitor chat.", "Receive real-time push alerts via Firebase on updates and team announcements.", "Qualified 3rd-year students can act as Forum Members, writing technical articles."].map((item, idx) => (
                            <li key={idx} className="flex items-start gap-2.5"><Check className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" /><span>{item}</span></li>
                          ))}
                        </ul>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                <div className="w-full md:w-72 shrink-0">
                  <div className="bg-slate-900 rounded-xl p-5 text-slate-200 text-xs space-y-3">
                    <div className="flex items-center justify-between mb-4">
                      <span className="font-bold text-white text-sm">{activeRole === "hod" ? "HOD Dashboard" : activeRole === "faculty" ? "Faculty Portal" : "Student Workspace"}</span>
                      <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20">LIVE</span>
                    </div>
                    {activeRole === "hod" && [["Faculty Members", "12 Active"], ["Classes Managed", "8 Classes"], ["Project Approvals", "3 Pending"], ["Platform Uptime", "99.9%"]].map(([k, v]) => (
                      <div key={k} className="flex items-center justify-between bg-slate-800/40 p-2.5 rounded border border-slate-800">
                        <span>{k}:</span><span className="font-bold text-indigo-400">{v}</span>
                      </div>
                    ))}
                    {activeRole === "faculty" && [["My Classes", "UG-3A, UG-3B"], ["Active Projects", "6 Projects"], ["Students Under Me", "114 Students"], ["Notifications Sent", "28 This Week"]].map(([k, v]) => (
                      <div key={k} className="flex items-center justify-between bg-slate-800/40 p-2.5 rounded border border-slate-800">
                        <span>{k}:</span><span className="font-bold text-violet-400">{v}</span>
                      </div>
                    ))}
                    {activeRole === "student" && [["My Class", "UG — 3A"], ["Active Project", "Autonomous Quadcopter"], ["Team Size", "4 Students"], ["Last Update", "2 hours ago"]].map(([k, v]) => (
                      <div key={k} className="flex items-center justify-between bg-slate-800/40 p-2.5 rounded border border-slate-800">
                        <span>{k}:</span><span className="font-bold text-amber-400">{v}</span>
                      </div>
                    ))}
                    <div className="pt-3 border-t border-slate-800 text-[10px] text-slate-500 leading-normal text-center">
                      Live database records sync permissions instantly.
                    </div>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>

          {/* ── ROI Calculator ── */}
          <div id="roi" className="scroll-mt-20 mt-24">
            <Reveal className="text-center mb-12">
              <SectionLabel>Calculator</SectionLabel>
              <h3 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Calculate Your Department's ROI</h3>
              <p className="text-slate-500 dark:text-slate-400 mt-2 max-w-lg mx-auto">
                Adjust the sliders below to estimate the productivity hours gained using the Hive portal.
              </p>
            </Reveal>
            <Reveal>
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden max-w-5xl mx-auto grid md:grid-cols-12 gap-0">
                <div className="md:col-span-7 p-6 sm:p-10 space-y-8">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                    <BarChart2 className="w-5 h-5 text-indigo-600" />Adjust Metrics
                  </h3>
                  {[
                    { label: "Active Students", min: 50, max: 1000, step: 10, value: studentsCount, onChange: (v) => setStudentsCount(v), suffix: " students" },
                    { label: "Active Projects", min: 5, max: 200, step: 5, value: projectsCount, onChange: (v) => setProjectsCount(v), suffix: " projects" },
                  ].map(({ label, min, max, step, value, onChange, suffix }) => (
                    <div key={label} className="space-y-3">
                      <div className="flex justify-between items-baseline">
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{label}</label>
                        <span className="text-lg font-extrabold text-indigo-600">{value}{suffix}</span>
                      </div>
                      <input type="range" min={min} max={max} step={step} value={value}
                        onChange={(e) => onChange(parseInt(e.target.value))}
                        className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-600 focus:outline-none" />
                      <div className="flex justify-between text-[10px] text-slate-400 font-semibold">
                        <span>{min}{suffix}</span><span>{max}{suffix}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="md:col-span-5 bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-900 text-white p-6 sm:p-10 flex flex-col justify-between">
                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-widest text-indigo-400 mb-6">Weekly Time & Sync Savings</h3>
                    <div className="space-y-6">
                      {[
                        { label: "Estimated Coordination Hours Saved", value: `~${(projectsCount * 2.5).toFixed(0)}`, unit: "hrs/week", color: "text-white" },
                        { label: "Redundant Message Threads Stopped", value: `~${(studentsCount * 11.5).toFixed(0)}`, unit: "threads", color: "text-white" },
                        { label: "Status Latency Reduction", value: "100% Instant", unit: "via Progress Monitor", color: "text-emerald-400" },
                      ].map(({ label, value, unit, color }) => (
                        <div key={label}>
                          <div className="text-slate-400 text-xs font-medium">{label}</div>
                          <div className={`text-3xl font-extrabold tracking-tight ${color} mt-1`}>
                            {value} <span className="text-sm font-normal text-slate-300">{unit}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="mt-8 pt-6 border-t border-indigo-800 text-[10px] text-slate-400 leading-normal">
                    Based on empirical department workflows shifting from scattered channels to unified Hive databases.
                  </div>
                </div>
              </div>
            </Reveal>
          </div>

          {/* ── Tech Stack / Architecture Blueprint ── */}
          <div className="mt-28">
            <Reveal className="text-center mb-14">
              <SectionLabel>Architecture</SectionLabel>
              <h3 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">System Visual Blueprint</h3>
              <p className="text-slate-500 dark:text-slate-400 mt-2 max-w-lg mx-auto">
                Hive is built on high-throughput backend APIs, normalized databases, and real-time gateways. Tap any node below to inspect specifications.
              </p>
            </Reveal>

            {/* Inline stylesheet for flowing dash lines */}
            <style>{`
              @keyframes blueprintFlow {
                to {
                  stroke-dashoffset: -20;
                }
              }
              .blueprint-flow-path {
                stroke-dasharray: 5, 5;
                animation: blueprintFlow 1.8s linear infinite;
              }
              .blueprint-grid-pattern {
                background-image: radial-gradient(rgba(99, 102, 241, 0.15) 1px, transparent 1px);
                background-size: 20px 20px;
              }
              .dark .blueprint-grid-pattern {
                background-image: radial-gradient(rgba(129, 140, 248, 0.08) 1px, transparent 1px);
              }
            `}</style>

            {/* Interactive Blueprint Stack Wrapper */}
            <Reveal className="grid lg:grid-cols-12 gap-8 items-stretch max-w-6xl mx-auto">
              
              {/* LEFT: Visually Striking Topology Blueprint */}
              <div className="lg:col-span-7 bg-slate-50/50 dark:bg-slate-950/40 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 relative flex flex-col justify-between h-[480px] overflow-hidden blueprint-grid-pattern shadow-inner">
                {/* SVG Connections overlay (Only rendered for desktop/medium sizes where layout matches coordinates) */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none stroke-indigo-500/20 dark:stroke-indigo-500/10 fill-none" strokeWidth="2">
                  {/* Client to Gateway */}
                  <path d="M 120 220 Q 200 120 300 120" className={selectedArchNode === "frontend" || selectedArchNode === "gateway" ? "stroke-indigo-500/60 blueprint-flow-path" : ""} />
                  {/* Client to API */}
                  <path d="M 120 220 Q 200 320 300 320" className={selectedArchNode === "frontend" || selectedArchNode === "api" ? "stroke-indigo-500/60 blueprint-flow-path" : ""} />
                  {/* API to Database */}
                  <path d="M 300 320 Q 400 240 480 120" className={selectedArchNode === "api" || selectedArchNode === "database" ? "stroke-indigo-500/60 blueprint-flow-path" : ""} />
                  {/* API to Media */}
                  <path d="M 300 320 Q 400 280 480 220" className={selectedArchNode === "api" || selectedArchNode === "media" ? "stroke-indigo-500/60 blueprint-flow-path" : ""} />
                  {/* API to Hosting */}
                  <path d="M 300 320 Q 400 325 480 320" className={selectedArchNode === "api" || selectedArchNode === "hosting" ? "stroke-indigo-500/60 blueprint-flow-path" : ""} />
                </svg>

                {/* Header of blueprint */}
                <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-slate-800 pb-3 relative z-10">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 block animate-pulse" />
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Architectural Flow Map</span>
                  </div>
                  <span className="text-[9px] text-slate-400 font-mono">GRID: 20px / Scale: 1:1</span>
                </div>

                {/* Nodes Position Grid */}
                <div className="relative w-full h-[320px] flex items-center justify-between px-4">
                  
                  {/* Client Tier (Left) */}
                  <div className="absolute left-4 top-[140px] z-10">
                    <button
                      onClick={() => setSelectedArchNode("frontend")}
                      className={`w-[120px] p-3.5 rounded-2xl border text-center transition-all duration-300 backdrop-blur-sm ${
                        selectedArchNode === "frontend"
                          ? "bg-white dark:bg-slate-800 border-indigo-500 shadow-xl shadow-indigo-100 dark:shadow-none ring-4 ring-indigo-500/10 scale-105"
                          : "bg-white/80 dark:bg-slate-900/80 border-slate-200 dark:border-slate-800 hover:border-indigo-300"
                      }`}
                    >
                      <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center mx-auto mb-2">
                        <Code2 className="w-4.5 h-4.5 text-indigo-600 dark:text-indigo-400" />
                      </div>
                      <div className="text-[10px] font-bold dark:text-white">Client Interface</div>
                      <div className="text-[8px] text-slate-400 font-mono mt-0.5">React / Vite</div>
                    </button>
                  </div>

                  {/* Middle Tier (Gateway & API) */}
                  <div className="absolute left-[240px] top-[40px] z-10">
                    <button
                      onClick={() => setSelectedArchNode("gateway")}
                      className={`w-[120px] p-3.5 rounded-2xl border text-center transition-all duration-300 backdrop-blur-sm ${
                        selectedArchNode === "gateway"
                          ? "bg-white dark:bg-slate-800 border-indigo-500 shadow-xl shadow-indigo-100 dark:shadow-none ring-4 ring-indigo-500/10 scale-105"
                          : "bg-white/80 dark:bg-slate-900/80 border-slate-200 dark:border-slate-800 hover:border-indigo-300"
                      }`}
                    >
                      <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center mx-auto mb-2">
                        <Bell className="w-4.5 h-4.5 text-indigo-600 dark:text-indigo-400" />
                      </div>
                      <div className="text-[10px] font-bold dark:text-white">Firebase Gateway</div>
                      <div className="text-[8px] text-slate-400 font-mono mt-0.5">Firestore / FCM</div>
                    </button>
                  </div>

                  <div className="absolute left-[240px] top-[240px] z-10">
                    <button
                      onClick={() => setSelectedArchNode("api")}
                      className={`w-[120px] p-3.5 rounded-2xl border text-center transition-all duration-300 backdrop-blur-sm ${
                        selectedArchNode === "api"
                          ? "bg-white dark:bg-slate-800 border-indigo-500 shadow-xl shadow-indigo-100 dark:shadow-none ring-4 ring-indigo-500/10 scale-105"
                          : "bg-white/80 dark:bg-slate-900/80 border-slate-200 dark:border-slate-800 hover:border-indigo-300"
                      }`}
                    >
                      <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center mx-auto mb-2">
                        <Cpu className="w-4.5 h-4.5 text-indigo-600 dark:text-indigo-400" />
                      </div>
                      <div className="text-[10px] font-bold dark:text-white">REST API Engine</div>
                      <div className="text-[8px] text-slate-400 font-mono mt-0.5">Flask Python</div>
                    </button>
                  </div>

                  {/* Right Tier (DB, Cloud Media, AWS Fargate) */}
                  <div className="absolute right-4 top-[40px] z-10">
                    <button
                      onClick={() => setSelectedArchNode("database")}
                      className={`w-[120px] p-3.5 rounded-2xl border text-center transition-all duration-300 backdrop-blur-sm ${
                        selectedArchNode === "database"
                          ? "bg-white dark:bg-slate-800 border-indigo-500 shadow-xl shadow-indigo-100 dark:shadow-none ring-4 ring-indigo-500/10 scale-105"
                          : "bg-white/80 dark:bg-slate-900/80 border-slate-200 dark:border-slate-800 hover:border-indigo-300"
                      }`}
                    >
                      <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center mx-auto mb-2">
                        <Database className="w-4.5 h-4.5 text-indigo-600 dark:text-indigo-400" />
                      </div>
                      <div className="text-[10px] font-bold dark:text-white">PostgreSQL DB</div>
                      <div className="text-[8px] text-slate-400 font-mono mt-0.5">Postgres 16</div>
                    </button>
                  </div>

                  <div className="absolute right-4 top-[140px] z-10">
                    <button
                      onClick={() => setSelectedArchNode("media")}
                      className={`w-[120px] p-3.5 rounded-2xl border text-center transition-all duration-300 backdrop-blur-sm ${
                        selectedArchNode === "media"
                          ? "bg-white dark:bg-slate-800 border-indigo-500 shadow-xl shadow-indigo-100 dark:shadow-none ring-4 ring-indigo-500/10 scale-105"
                          : "bg-white/80 dark:bg-slate-900/80 border-slate-200 dark:border-slate-800 hover:border-indigo-300"
                      }`}
                    >
                      <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center mx-auto mb-2">
                        <FileText className="w-4.5 h-4.5 text-indigo-600 dark:text-indigo-400" />
                      </div>
                      <div className="text-[10px] font-bold dark:text-white">Asset CDN</div>
                      <div className="text-[8px] text-slate-400 font-mono mt-0.5">Cloudinary API</div>
                    </button>
                  </div>

                  <div className="absolute right-4 top-[240px] z-10">
                    <button
                      onClick={() => setSelectedArchNode("hosting")}
                      className={`w-[120px] p-3.5 rounded-2xl border text-center transition-all duration-300 backdrop-blur-sm ${
                        selectedArchNode === "hosting"
                          ? "bg-white dark:bg-slate-800 border-indigo-500 shadow-xl shadow-indigo-100 dark:shadow-none ring-4 ring-indigo-500/10 scale-105"
                          : "bg-white/80 dark:bg-slate-900/80 border-slate-200 dark:border-slate-800 hover:border-indigo-300"
                      }`}
                    >
                      <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center mx-auto mb-2">
                        <Shield className="w-4.5 h-4.5 text-indigo-600 dark:text-indigo-400" />
                      </div>
                      <div className="text-[10px] font-bold dark:text-white">AWS Fargate</div>
                      <div className="text-[8px] text-slate-400 font-mono mt-0.5">Docker Cluster</div>
                    </button>
                  </div>

                </div>

                {/* Footer of blueprint */}
                <div className="flex items-center justify-between text-[9px] text-slate-400 border-t border-slate-200/60 dark:border-slate-800 pt-3 relative z-10">
                  <span>DEPLOY STATE: PRODUCTION READY</span>
                  <span className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    ACID COMPLIANT DATA FLOWS
                  </span>
                </div>
              </div>

              {/* RIGHT: Detailed Tier Specifications Inspector */}
              <div className="lg:col-span-5 flex flex-col">
                {(() => {
                  const data = {
                    frontend: {
                      title: "React & Tailwind Client",
                      tech: "Vite + PostCSS",
                      icon: Code2,
                      latency: "< 50ms TTI",
                      compliance: "W3C Standards",
                      desc: "Frosted glassmorphism client application utilizing unified theme tokens, layout animation states, and lightning-fast Vite module parsing.",
                      specs: [
                        "Vite-optimized asset chunk splitting.",
                        "Direct CSS Variable theme styling.",
                        "Smooth Framer Motion view triggers.",
                        "Responsive design viewport matrices."
                      ]
                    },
                    gateway: {
                      title: "Firebase Gateway",
                      tech: "Firebase FCM & Firestore",
                      icon: Bell,
                      latency: "< 200ms dispatch",
                      compliance: "GDPR Compliant",
                      desc: "Provides instant notifications and live updates bypassing custom WebSocket sockets to minimize backend server loads.",
                      specs: [
                        "FCM token registration maps.",
                        "Instant listener streams.",
                        "Zero-overhead notification dispatch.",
                        "Client background service handlers."
                      ]
                    },
                    api: {
                      title: "Flask REST API Engine",
                      tech: "Python Flask & SQLAlchemy",
                      icon: Cpu,
                      latency: "~80ms responses",
                      compliance: "REST Standard",
                      desc: "High-performance Python handler utilizing database ORM abstractions and secure HTTP-only cookies with JWT validation rules.",
                      specs: [
                        "SQLAlchemy data normalization layers.",
                        "Cookie-backed JWT middleware checks.",
                        "Routes benchmarked for heavy load.",
                        "Database migration history schemas."
                      ]
                    },
                    database: {
                      title: "PostgreSQL Database",
                      tech: "Postgres 16 (Amazon RDS)",
                      icon: Database,
                      latency: "< 10ms execution",
                      compliance: "ACID Compliant",
                      desc: "Relational mapping database optimized with primary keys, composite indices, and foreign constraints protecting user workspace directories.",
                      specs: [
                        "Highly indexed search lookups.",
                        "Transaction consistency rules.",
                        "Multi-AZ deployment snapshot backups.",
                        "Foreign key data integrity."
                      ]
                    },
                    media: {
                      title: "Cloudinary CDN Storage",
                      tech: "Cloudinary Secure API",
                      icon: FileText,
                      latency: "< 120ms retrieval",
                      compliance: "Signed Access",
                      desc: "Encrypted Cloudinary CDN service managing project reports, schema files, attachments, and profile images.",
                      specs: [
                        "On-the-fly image optimizations.",
                        "PDF retrieval compression.",
                        "Signed upload security profiles.",
                        "Global edge server route caching."
                      ]
                    },
                    hosting: {
                      title: "AWS Fargate Hosting",
                      tech: "ECS Container Cluster",
                      icon: Shield,
                      latency: "99.99% Target SLA",
                      compliance: "ISO Certified Host",
                      desc: "Docker container deployments scaling instantly via Application Load Balancers (ALB) across multiple VPC subnets.",
                      specs: [
                        "Rolling deployments with zero downtime.",
                        "AWS Load Balancer auto-scaling.",
                        "Private subnet internet security gates.",
                        "Integrated CloudWatch logs."
                      ]
                    }
                  }[selectedArchNode];

                  const Icon = data.icon;

                  return (
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl rounded-3xl p-6 flex flex-col justify-between h-full">
                      <div className="space-y-5">
                        {/* Header metadata */}
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-mono bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 px-2.5 py-1 rounded-md font-bold uppercase tracking-wider">
                            {data.tech}
                          </span>
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Specs Inspector</span>
                        </div>

                        {/* Title tier */}
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center shrink-0">
                            <Icon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                          </div>
                          <div>
                            <h4 className="text-lg font-bold text-slate-900 dark:text-white leading-tight">{data.title}</h4>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="text-[10px] font-semibold text-emerald-500 uppercase">{data.latency}</span>
                              <span className="text-slate-300 text-[10px]">•</span>
                              <span className="text-[10px] text-slate-400 font-mono">{data.compliance}</span>
                            </div>
                          </div>
                        </div>

                        {/* Description */}
                        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed bg-slate-50 dark:bg-slate-950/30 p-3 rounded-xl border border-slate-100 dark:border-slate-850">
                          {data.desc}
                        </p>

                        {/* Specs checklist */}
                        <div className="space-y-2.5 pt-1.5">
                          <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Core Capabilities</div>
                          {data.specs.map((spec, i) => (
                            <div key={i} className="flex items-start gap-2.5 text-xs text-slate-650 dark:text-slate-300 leading-relaxed">
                              <CheckCircle2 className="w-4 h-4 text-indigo-500 mt-0.5 shrink-0" />
                              <span>{spec}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Mock metadata system spec display */}
                      <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
                        <div className="bg-slate-900 rounded-xl p-3 text-[10px] font-mono text-indigo-300/80 space-y-1 overflow-x-auto select-none">
                          <div><span className="text-indigo-400">spec</span>: &#123;</div>
                          <div className="pl-4">node_id: <span className="text-amber-400">"{selectedArchNode}"</span>,</div>
                          <div className="pl-4">tier: <span className="text-amber-400">"{data.title.split(' ')[0]}"</span>,</div>
                          <div className="pl-4">sync: <span className="text-emerald-400">true</span>,</div>
                          <div className="pl-4">uptime: <span className="text-amber-400">"99.9%"</span></div>
                          <div>&#125;</div>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </Reveal>
          </div>

        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════
          4. CONTACT SECTION
      ════════════════════════════════════════════════════════════════════ */}
      <section id="contact" className="relative py-28 px-4 sm:px-6 lg:px-8 bg-slate-50 dark:bg-slate-950/50 border-t border-slate-100 dark:border-slate-800/50 overflow-hidden">
        <div className="absolute top-0 inset-x-0 h-[400px] bg-gradient-to-b from-indigo-50/40 dark:from-indigo-950/20 to-transparent pointer-events-none" />
        <div className="absolute top-16 right-0 w-[350px] h-[350px] bg-indigo-100/30 dark:bg-indigo-900/10 rounded-full blur-[120px] pointer-events-none" />

        <div className="relative max-w-7xl mx-auto">
          <Reveal className="text-center mb-12">
            <SectionLabel>Inquiries & Support</SectionLabel>
            <h2 className="text-4xl sm:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-4">
              Connect with{" "}
              <span className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
                Our Department
              </span>
            </h2>
            <p className="text-lg text-slate-500 dark:text-slate-400 max-w-lg mx-auto leading-relaxed">
              Have questions about projects, faculty invites, or portal access? We're here to help.
            </p>
          </Reveal>

          {/* Contact cards */}
          <Reveal className="mb-12">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { icon: Mail, label: "Email Us", value: "hod.cs@sharathi-board.edu.in", sub: "support.dpms@sharathi-board.edu.in", color: "text-indigo-600", bg: "bg-indigo-50 dark:bg-indigo-900/20", border: "border-indigo-100 dark:border-indigo-800/30", href: "mailto:hod.cs@sharathi-board.edu.in" },
                { icon: Phone, label: "Call Us", value: "+91 80 2554 9820", sub: "HOD Desk • Mon – Fri", color: "text-violet-600", bg: "bg-violet-50 dark:bg-violet-900/20", border: "border-violet-100 dark:border-violet-800/30", href: "tel:+918025549820" },
                { icon: Clock, label: "Office Hours", value: "9:30 AM – 4:30 PM", sub: "HOD slot: Tue & Thu 2–4 PM", color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-900/20", border: "border-amber-100 dark:border-amber-800/30", href: null },
                { icon: MessageSquare, label: "Response Time", value: "Within 24–48 hrs", sub: "All submitted inquiries", color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-900/20", border: "border-emerald-100 dark:border-emerald-800/30", href: null },
              ].map(({ icon: CIcon, label, value, sub, color, bg, border, href }, i) => {
                const content = (
                  <motion.div whileHover={{ y: -3 }} className={`group rounded-2xl border ${border} ${bg} p-5 flex items-start gap-4 transition-all duration-200 hover:shadow-md cursor-default`}>
                    <div className={`w-10 h-10 rounded-xl bg-white dark:bg-white/5 border ${border} flex items-center justify-center shrink-0 shadow-sm`}>
                      <CIcon className={`w-5 h-5 ${color}`} />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">{label}</div>
                      <div className={`text-sm font-bold ${color} leading-tight truncate`}>{value}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5 leading-snug">{sub}</div>
                    </div>
                  </motion.div>
                );
                return href ? <a key={label} href={href} className="block no-underline"><Reveal delay={i * 0.07}>{content}</Reveal></a> : <div key={label}><Reveal delay={i * 0.07}>{content}</Reveal></div>;
              })}
            </div>
          </Reveal>

          {/* Form + FAQ */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start max-w-6xl mx-auto">
            {/* Contact Form */}
            <Reveal className="lg:col-span-7" direction="right">
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
                <div className="bg-gradient-to-r from-indigo-600 to-violet-600 px-7 py-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-white font-bold text-lg">Send an Inquiry</h3>
                      <p className="text-indigo-200 text-xs mt-0.5">Our team typically responds within 24–48 hours</p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center">
                      <Shield className="w-5 h-5 text-white" />
                    </div>
                  </div>
                </div>
                <div className="p-7">
                  {cSubmitted ? (
                    <div className="py-10 text-center space-y-4">
                      <div className="relative mx-auto w-20 h-20">
                        <div className="absolute inset-0 rounded-full bg-emerald-100 animate-ping opacity-40" />
                        <div className="relative w-20 h-20 rounded-full bg-emerald-50 border-2 border-emerald-200 flex items-center justify-center">
                          <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                        </div>
                      </div>
                      <h4 className="text-xl font-bold text-slate-900 dark:text-white">Message Sent!</h4>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 max-w-sm mx-auto">
                        Thank you, <span className="font-semibold text-slate-700 dark:text-slate-200">{cName}</span>! We'll get back to you at <span className="font-semibold text-indigo-600">{cEmail}</span> within 24–48 hours.
                      </p>
                      <button onClick={() => { setCSubmitted(false); setCName(""); setCEmail(""); setCSubject(""); setCMessage(""); setCRole("student"); }}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors shadow-sm">
                        <Send className="w-3.5 h-3.5" />Send Another
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={handleContactSubmit} className="space-y-5 text-xs">
                      {cError && (
                        <div className="flex items-start gap-2.5 p-3.5 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 text-rose-600 rounded-xl">
                          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                          <span className="font-semibold text-sm">{cError}</span>
                        </div>
                      )}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {[
                          { label: "Full Name", type: "text", value: cName, onChange: setCName, placeholder: "e.g. Arjun Sharma", required: true },
                          { label: "Email Address", type: "email", value: cEmail, onChange: setCEmail, placeholder: "you@gmail.com", required: true },
                        ].map(({ label, type, value, onChange, placeholder, required }) => (
                          <div key={label} className="space-y-1.5">
                            <label className="block font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[10px]">{label} {required && <span className="text-rose-500">*</span>}</label>
                            <input type={type} required={required} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
                              className="w-full py-3 px-4 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-slate-50/60 dark:bg-slate-800/60 dark:text-white placeholder-slate-300 transition-all" />
                          </div>
                        ))}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="block font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[10px]">Your Role</label>
                          <select value={cRole} onChange={(e) => setCRole(e.target.value)}
                            className="w-full py-3 px-4 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-slate-50/60 dark:bg-slate-800/60 dark:text-white cursor-pointer transition-all appearance-none">
                            <option value="student">UG / PG Student</option>
                            <option value="faculty">Faculty / Researcher</option>
                            <option value="parent">Parent / Guardian</option>
                            <option value="other">General Visitor</option>
                          </select>
                        </div>
                        <div className="space-y-1.5">
                          <label className="block font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[10px]">Subject <span className="text-rose-500">*</span></label>
                          <input type="text" required value={cSubject} onChange={(e) => setCSubject(e.target.value)} placeholder="e.g. Project Registration Query"
                            className="w-full py-3 px-4 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-slate-50/60 dark:bg-slate-800/60 dark:text-white placeholder-slate-300 transition-all" />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <div className="flex justify-between items-center">
                          <label className="block font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[10px]">Message <span className="text-rose-500">*</span></label>
                          <span className={`text-[10px] font-semibold ${cMessage.length > 450 ? "text-rose-500" : "text-slate-400"}`}>{cMessage.length}/500</span>
                        </div>
                        <textarea required maxLength={500} rows={5} value={cMessage} onChange={(e) => setCMessage(e.target.value)} placeholder="Describe your query in detail..."
                          className="w-full py-3 px-4 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-slate-50/60 dark:bg-slate-800/60 dark:text-white placeholder-slate-300 resize-none leading-relaxed transition-all" />
                      </div>
                      <button type="submit" disabled={cSubmitting}
                        className="w-full inline-flex items-center justify-center gap-2.5 py-3.5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-bold rounded-xl text-sm hover:from-indigo-700 hover:to-violet-700 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-indigo-200 active:translate-y-0 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0">
                        {cSubmitting ? (
                          <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /><span>Sending…</span></>
                        ) : (
                          <><Send className="w-4 h-4" /><span>Send Message</span></>
                        )}
                      </button>
                    </form>
                  )}
                </div>
              </div>
            </Reveal>

            {/* FAQ */}
            <Reveal className="lg:col-span-5" direction="left">
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-md overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-100 dark:border-indigo-700/30 flex items-center justify-center">
                    <HelpCircle className="w-4 h-4 text-indigo-600" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">Frequently Asked Questions</h3>
                    <p className="text-[10px] text-slate-400">Quick answers to common queries</p>
                  </div>
                </div>
                <div className="p-4 space-y-2">
                  {[
                    { q: "How do I register as a student on Hive?", a: "After your HOD approves your institution email, sign in using your Google account via the Student login on the Login page. Registration is automatic on first login." },
                    { q: "Can faculty members add their own projects?", a: "Yes. Once onboarded by the HOD, faculty coordinators can create, manage, and assign projects to student batches from their dashboard." },
                    { q: "How do I report a technical issue?", a: "Use the contact form on this page with the subject 'Technical Issue'. Alternatively, email support.dpms@sharathi-board.edu.in directly for urgent matters." },
                    { q: "Is there a mobile app for Hive?", a: "Hive is fully responsive and works on all devices via the browser. A dedicated mobile app is planned for a future release." },
                    { q: "What happens after I submit the contact form?", a: "Your inquiry is logged and forwarded to the department admin desk. You'll receive an email acknowledgement within 1–2 working days." },
                  ].map((faq) => <FaqItem key={faq.q} {...faq} />)}
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════
          5. FINAL CTA BANNER
      ════════════════════════════════════════════════════════════════════ */}
      <section className="py-28 px-4 sm:px-6 lg:px-8">
        <Reveal className="max-w-4xl mx-auto">
          <div className="relative bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-800 rounded-3xl overflow-hidden shadow-2xl p-10 sm:p-16 text-center">
            {/* Glow orbs */}
            <div className="absolute top-0 right-0 w-80 h-80 bg-white/5 rounded-full blur-3xl pointer-events-none -translate-y-1/2 translate-x-1/3" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-violet-400/10 rounded-full blur-3xl pointer-events-none translate-y-1/2 -translate-x-1/4" />

            <div className="relative">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/20 mb-6">
                <Zap className="w-4 h-4 text-amber-300" />
                <span className="text-sm font-medium text-white/90">Powered by Hive</span>
              </div>
              <h2 className="text-4xl sm:text-5xl font-extrabold text-white mb-4 tracking-tight leading-tight">
                Ready to manage projects smarter?
              </h2>
              <p className="text-white/70 text-lg leading-relaxed mb-10 max-w-lg mx-auto">
                Hive unifies students, faculty, and administration — track milestones, post updates, and collaborate in real time, all in one platform.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link to="/login"
                  className="inline-flex items-center gap-2.5 px-8 py-4 rounded-2xl bg-white text-indigo-700 font-bold text-base hover:bg-gray-50 hover:-translate-y-0.5 hover:shadow-xl active:translate-y-0 transition-all duration-200">
                  <LogIn className="w-5 h-5" />
                  Enter Hive Now
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <button
                  onClick={() => scrollTo("features")}
                  className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-white/10 border border-white/20 text-white font-semibold text-base hover:bg-white/20 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 backdrop-blur-sm">
                  Explore Features
                </button>
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ════════════════════════════════════════════════════════════════════
          6. FOOTER
      ════════════════════════════════════════════════════════════════════ */}
      <footer className="border-t border-slate-100 dark:border-slate-800 py-10 px-4 sm:px-6 lg:px-8 bg-white dark:bg-slate-950">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img src="/website-name-logo.png" alt="Hive" className="h-10 w-auto object-contain" />
          </div>
          <div className="flex items-center gap-6 text-sm text-slate-400">
            {[{ label: "About", id: "about" }, { label: "Features", id: "features" }, { label: "Contact", id: "contact" }].map(({ label, id }) => (
              <button key={id} onClick={() => scrollTo(id)} className="hover:text-indigo-600 transition-colors">{label}</button>
            ))}
            <Link to="/login" className="hover:text-indigo-600 transition-colors">Login</Link>
          </div>
          <p className="text-sm text-slate-400">
            © {new Date().getFullYear()} Hive — DPMS. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
