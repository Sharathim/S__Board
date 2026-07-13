import { useEffect, useRef } from "react";
import { Link, Navigate } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Shield, Users, GraduationCap, Sparkles, Activity, Lock, Cpu, Globe2, FileText, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import { LoginCard } from "../../components/public/LoginCard";
import { useAuth } from "../../context/AuthContext";
import gsap from "gsap";

export default function LoginPage() {
  const { user, loading, onboardingData } = useAuth();
  const canvasRef = useRef(null);
  const leftPanelRef = useRef(null);
  const rightPanelRef = useRef(null);

  // NOTE: All hooks must run before any early return (Rules of Hooks)
  useEffect(() => {
    // GSAP entrance animations for split panels
    const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
    
    tl.fromTo(
      leftPanelRef.current,
      { opacity: 0, x: -30 },
      { opacity: 1, x: 0, duration: 0.8 }
    );
    tl.fromTo(
      rightPanelRef.current,
      { opacity: 0, x: 30 },
      { opacity: 1, x: 0, duration: 0.8 },
      "-=0.6"
    );

    // Animated canvas particles supporting light/dark theme
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

    const particles = Array.from({ length: 45 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 1.5 + 0.5,
      vx: (Math.random() - 0.5) * 0.2,
      vy: (Math.random() - 0.5) * 0.2,
      alpha: Math.random() * 0.3 + 0.1,
    }));

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Draw connection lines first
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 120) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(99, 102, 241, ${0.05 * (1 - dist / 120)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }

      // Draw particles
      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;
        
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(99, 102, 241, ${p.alpha})`;
        ctx.fill();
      });

      animId = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(animId);
      ro.disconnect();
    };
  }, []);

  // Redirect based on session and onboarding requirements (placed after hooks per Rules of Hooks)
  if (!loading) {
    if (onboardingData) {
      if (onboardingData.invite_type === "faculty") return <Navigate to="/onboard/faculty" replace />;
      if (onboardingData.invite_type === "student") return <Navigate to="/onboard/student" replace />;
    }
    if (user) {
      const dest = user.role === "HOD" ? "/dashboard" : user.role === "FACULTY" ? "/faculty" : "/classes";
      return <Navigate to={dest} replace />;
    }
  }

  return (
    <div className="relative min-h-screen bg-gradient-to-tr from-slate-50 via-indigo-50/20 to-violet-50/30 dark:from-slate-950 dark:via-indigo-950/10 dark:to-slate-900 flex flex-col justify-between overflow-x-hidden font-sans transition-colors duration-300">
      
      {/* Dynamic Background Canvas */}
      <div className="absolute inset-0 w-full h-full pointer-events-none opacity-60">
        <canvas ref={canvasRef} className="w-full h-full" />
      </div>

      {/* Floating Ambient Glows */}
      <div className="absolute top-10 right-10 w-[450px] h-[450px] bg-indigo-200/20 dark:bg-indigo-900/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-[400px] h-[400px] bg-violet-200/20 dark:bg-violet-900/10 rounded-full blur-[90px] pointer-events-none" />

      {/* Top Bar Navigation */}
      <header className="relative z-20 w-full max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/70 dark:bg-white/5 border border-slate-200/60 dark:border-white/10 text-slate-700 dark:text-slate-300 text-sm font-semibold
            hover:bg-white hover:text-indigo-600 hover:border-indigo-200 shadow-sm transition-all duration-200 backdrop-blur-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>

        {/* Short info badge */}
        <div className="hidden sm:flex items-center gap-2 text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
          <Activity className="w-4 h-4 text-emerald-500 animate-pulse" />
          <span>System Status: Online</span>
        </div>
      </header>

      {/* Main Split Grid */}
      <main className="relative z-10 w-full max-w-7xl mx-auto px-6 flex-1 grid lg:grid-cols-12 gap-10 items-center py-6">
        
        {/* LEFT PANEL: Platform Pitch & Features */}
        <div ref={leftPanelRef} className="lg:col-span-7 space-y-8 text-left">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-100 dark:border-indigo-800/30 shadow-sm">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span className="text-[10px] font-bold text-indigo-700 dark:text-indigo-300 tracking-wider uppercase">
                Secure Academic Gateway
              </span>
            </div>
            <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight">
              Manage projects, collaborate,<br />
              and drive{" "}
              <span className="bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-500 bg-clip-text text-transparent">
                excellence
              </span>{" "}
              in real-time.
            </h1>
            <p className="text-base text-slate-500 dark:text-slate-400 max-w-xl leading-relaxed">
              Hive integrates Head of Departments, faculty coordinators, and student groups into a single relational ecosystem. Setup allocations, post updates, and track milestones seamlessly.
            </p>
          </div>

          {/* Workflow Cards */}
          <div className="grid sm:grid-cols-3 gap-4 max-w-2xl">
            {[
              {
                icon: Shield,
                title: "HOD Dashboard",
                desc: "Authorize accounts and evaluate overall activity.",
                color: "text-purple-600 bg-purple-50 dark:bg-purple-950/20"
              },
              {
                icon: Users,
                title: "Faculty Portal",
                desc: "Assign projects, direct groups, and provide feedback.",
                color: "text-blue-600 bg-blue-50 dark:bg-blue-950/20"
              },
              {
                icon: GraduationCap,
                title: "Student Hub",
                desc: "Coordinate tasks, upload deliverables, and chat.",
                color: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20"
              }
            ].map(({ icon: Icon, title, desc, color }, i) => (
              <div key={title} className="p-4 rounded-2xl bg-white/70 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/5 shadow-sm space-y-2.5">
                <div className={`w-9 h-9 rounded-xl ${color} flex items-center justify-center`}>
                  <Icon className="w-4.5 h-4.5" />
                </div>
                <div className="text-xs font-bold text-slate-800 dark:text-slate-200">{title}</div>
                <div className="text-[11px] text-slate-400 dark:text-slate-400 leading-snug">{desc}</div>
              </div>
            ))}
          </div>

          {/* Verification lists */}
          <div className="space-y-3.5 max-w-lg pt-2">
            {[
              "Single Sign-On (SSO) securely verified via Google Workspace API.",
              "Automatic account routing matching pre-approved registration lists.",
              "Real-time database sync for instant classroom and project updates."
            ].map((text, idx) => (
              <div key={idx} className="flex items-center gap-3 text-xs text-slate-600 dark:text-slate-300">
                <CheckCircle2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                <span>{text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT PANEL: Form Container */}
        <div ref={rightPanelRef} className="lg:col-span-5 flex items-center justify-center lg:justify-end">
          <div className="w-full max-w-[420px] bg-white dark:bg-slate-900 rounded-[28px] border border-slate-200/80 dark:border-slate-800 p-2.5 shadow-2xl shadow-indigo-100/50 dark:shadow-black/50">
            <div className="bg-slate-50 dark:bg-slate-950/30 rounded-[20px] overflow-hidden p-0.5 border border-slate-100/50 dark:border-slate-800/40">
              {/* Inject the clean tab-based LoginCard */}
              <LoginCard />
            </div>
          </div>
        </div>

      </main>

      {/* Footer Branding */}
      <footer className="relative z-20 w-full max-w-7xl mx-auto px-6 py-6 border-t border-slate-200/40 dark:border-white/5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400 dark:text-slate-500">
        <p>&copy; {new Date().getFullYear()} Hive — Department Project Management System. All rights reserved.</p>
        <div className="flex items-center gap-2">
          <Lock className="w-3.5 h-3.5" />
          <span>AES-256 Encrypted Sessions</span>
        </div>
      </footer>

    </div>
  );
}
