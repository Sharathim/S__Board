import { useEffect, useRef } from "react";
import { Link, Navigate } from "react-router-dom";
import { ArrowLeft, Hexagon } from "lucide-react";
import { motion } from "framer-motion";
import { LoginCard } from "../../components/public/LoginCard";
import { useAuth } from "../../context/AuthContext";
import gsap from "gsap";

export default function LoginPage() {
  const { user, loading, onboardingData } = useAuth();
  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  // Redirect if already logged in
  if (!loading && user && !onboardingData) {
    return <Navigate to="/dashboard" replace />;
  }

  useEffect(() => {
    // GSAP entrance animation
    const tl = gsap.timeline();
    tl.fromTo(
      containerRef.current,
      { opacity: 0, scale: 0.96 },
      { opacity: 1, scale: 1, duration: 0.6, ease: "power3.out" }
    );

    // Animated canvas particles
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let animId;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const particles = Array.from({ length: 60 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 1.5 + 0.3,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      alpha: Math.random() * 0.5 + 0.1,
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

      // Connect nearby particles
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 100) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(99, 102, 241, ${0.08 * (1 - dist / 100)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }
      animId = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#060918] flex items-center justify-center">
      {/* Animated canvas background */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 pointer-events-none"
        aria-hidden="true"
      />

      {/* Ambient gradient glows */}
      <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-violet-600/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-indigo-900/20 rounded-full blur-[160px] pointer-events-none" />

      {/* Back to Home */}
      <div className="absolute top-6 left-6 z-20">
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-white/70 text-sm font-medium
            hover:bg-white/10 hover:text-white hover:border-white/20 transition-all duration-200 backdrop-blur-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Hive
        </Link>
      </div>

      {/* Header branding */}
      <div className="absolute top-6 right-6 z-20 flex items-center gap-2">
        <Hexagon className="w-5 h-5 text-indigo-400" strokeWidth={1.5} />
        <span className="text-white/40 text-xs font-medium tracking-widest uppercase">Hive</span>
      </div>

      {/* Main content */}
      <div ref={containerRef} className="relative z-10 w-full max-w-md mx-auto px-4">
        {/* Top label */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
            <span className="text-xs font-semibold text-indigo-400 tracking-wider uppercase">
              Secure Portal Access
            </span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Sign in to <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-violet-400">Hive</span>
          </h1>
          <p className="text-white/40 text-sm mt-1.5">
            Choose your role and sign in with Google
          </p>
        </motion.div>

        {/* Login card with motion wrapper */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.55, ease: [0.21, 0.47, 0.32, 0.98] }}
        >
          <div className="bg-white/[0.03] backdrop-blur-2xl rounded-3xl border border-white/10 p-1 shadow-2xl shadow-black/40">
            <div className="rounded-[22px] overflow-hidden">
              <LoginCard />
            </div>
          </div>
        </motion.div>

        {/* Footer note */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.65 }}
          className="text-center text-white/25 text-xs mt-6"
        >
          Hive — Department Project Management System
        </motion.p>
      </div>
    </div>
  );
}
