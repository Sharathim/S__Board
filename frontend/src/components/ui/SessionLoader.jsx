import { useEffect, useRef, useState } from "react";
import gsap from "gsap";

const phrases = [
  "Restoring session",
  "Connecting to database",
  "Securing credentials",
  "Almost there",
  "Retrieving HIVE files",
  "Preparing desk",
];

/**
 * SessionLoader
 *
 * Upgraded loading screen using the brand Portal layout (concentric hexagons and particles)
 * rather than folder transitions, providing a beautiful initial app loading startup experience.
 */
export function SessionLoader() {
  const [phrase, setPhrase] = useState(() => phrases[0]);

  // Refs for animation
  const containerRef = useRef(null);
  const hexagonRef = useRef(null);
  const textRef = useRef(null);
  const particlesRef = useRef(null);

  useEffect(() => {
    const phraseInterval = setInterval(() => {
      setPhrase(phrases[Math.floor(Math.random() * phrases.length)]);
    }, 2000);

    return () => clearInterval(phraseInterval);
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    const hexagon = hexagonRef.current;
    const text = textRef.current;
    const particlesWrap = particlesRef.current;

    if (!container || !hexagon || !text || !particlesWrap) return;

    // Timeline for startup entrance
    const tl = gsap.timeline();

    gsap.set(container, { opacity: 0 });
    gsap.set(hexagon, { scale: 0, opacity: 0 });
    gsap.set(text, { y: 20, opacity: 0 });

    tl.to(container, {
      opacity: 1,
      duration: 0.35,
      ease: "power2.out",
    });

    tl.to(hexagon, {
      scale: 1,
      opacity: 1,
      duration: 0.55,
      ease: "back.out(1.5)",
    }, "-=0.15");

    tl.to(text, {
      y: 0,
      opacity: 1,
      duration: 0.45,
      ease: "power2.out",
    }, "-=0.3");

    // Continuous floating particles loop
    const particles = particlesWrap.children;
    if (particles.length > 0) {
      Array.from(particles).forEach((part) => {
        const dx = (Math.random() - 0.5) * 260;
        const dy = (Math.random() - 0.5) * 260;
        const size = 6 + Math.random() * 12;
        const duration = 2 + Math.random() * 2;

        gsap.set(part, {
          x: 0,
          y: 0,
          width: size,
          height: size,
          opacity: 0,
        });

        const floatTimeline = gsap.timeline({ repeat: -1 });

        floatTimeline.to(part, {
          x: dx,
          y: dy,
          opacity: 0.35 + Math.random() * 0.55,
          duration: duration * 0.4,
          ease: "power1.out",
        })
          .to(part, {
            x: dx + (Math.random() - 0.5) * 50,
            y: dy + (Math.random() - 0.5) * 50,
            opacity: 0,
            duration: duration * 0.6,
            ease: "power1.in",
          });
      });
    }

    return () => {
      tl.kill();
      gsap.killTweensOf([container, hexagon, text]);
      if (particles.length > 0) {
        gsap.killTweensOf(particles);
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#FFFFFF] dark:bg-[#000000] overflow-hidden transition-colors duration-300"
      style={{ opacity: 0 }}
    >
      {/* Background Particles */}
      <div ref={particlesRef} className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(12)].map((_, i) => (
          <div key={i} className="portal-particle" />
        ))}
      </div>

      {/* Hexagon Spinner */}
      <div ref={hexagonRef} className="portal-hexagon-container">
        <div className="portal-hexagon-outer" />
        <div className="portal-hexagon-inner">
          <div className="portal-hexagon-content">
            <img
              src="/logo-icon.png"
              alt="Hive Logo"
              className="w-11 h-11 object-contain filter drop-shadow-[0_4px_10px_rgba(139,92,246,0.25)]"
            />
          </div>
        </div>
      </div>

      {/* Connection Text */}
      <div ref={textRef} className="flex flex-col items-center gap-2 text-center mt-7 relative z-10">
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Connecting to Hive
        </h1>
        <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 min-w-[200px]">
          {phrase}...
        </p>
      </div>
    </div>
  );
}
