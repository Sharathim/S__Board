import { useEffect, useRef, useState } from "react";
import gsap from "gsap";

const phrases = [
  "Restoring session",
  "Opening workspace",
  "Securing account",
  "Almost there",
  "Retrieving HIVE files",
  "Preparing desk",
];

/**
 * SessionLoader
 *
 * Upgraded loading screen that matches the premium 3D Folder design language.
 * The folder slides in, swings open, and a document rises up with a loading state,
 * floating gently while session authorization resolves.
 */
export function SessionLoader() {
  const [phrase, setPhrase] = useState(() => phrases[0]);

  // Folder piece refs
  const containerRef = useRef(null);
  const frontRef = useRef(null);
  const paperRef = useRef(null);

  useEffect(() => {
    const phraseInterval = setInterval(() => {
      setPhrase(phrases[Math.floor(Math.random() * phrases.length)]);
    }, 2000);

    return () => clearInterval(phraseInterval);
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    const front = frontRef.current;
    const paper = paperRef.current;

    if (!container || !front || !paper) return;

    // Timeline to enter folder, open, and start float
    const tl = gsap.timeline();

    // 1. Set initial states
    gsap.set(container, { scale: 0.8, y: 30, opacity: 0 });
    gsap.set(front, { rotationY: 0 });
    gsap.set(paper, { y: 0, opacity: 0, scale: 0.95 });

    // 2. Slide folder in
    tl.to(container, {
      scale: 1,
      y: 0,
      opacity: 1,
      duration: 0.5,
      ease: "power2.out",
    });

    // 3. Swing cover open
    tl.to(front, {
      rotationY: -110,
      duration: 0.6,
      ease: "power2.inOut",
    }, "-=0.15");

    // 4. Rise document paper
    tl.to(paper, {
      y: -35,
      opacity: 1,
      scale: 1.02,
      duration: 0.6,
      ease: "power2.out",
      onComplete: () => {
        // Subtle floating pulse loop for paper once open
        gsap.to(paper, {
          y: -40,
          duration: 1.5,
          repeat: -1,
          yoyo: true,
          ease: "power1.inOut",
        });
      },
    }, "-=0.45");

    return () => {
      tl.kill();
      gsap.killTweensOf([container, front, paper]);
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#fbfbff] dark:bg-[#020617] overflow-hidden transition-colors duration-300">
      
      {/* 3D Folder container */}
      <div ref={containerRef} className="folder-3d-wrap select-none">
        
        {/* Back Cover */}
        <div className="folder-back-cover">
          <div className="folder-tab">
            Hive
          </div>
        </div>

        {/* Inner Paper with Logo and Phrase Spinner */}
        <div ref={paperRef} className="folder-paper-sheet">
          <div className="flex flex-col items-center gap-3">
            <img src="/logo-icon.png" alt="Hive Logo" className="w-12 h-12 object-contain" />
            
            {/* Spinning load dot indicator */}
            <div className="flex gap-1.5 justify-center py-1">
              <span className="w-1.5 h-1.5 bg-[#8B5CF6] rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="w-1.5 h-1.5 bg-[#8B5CF6] rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="w-1.5 h-1.5 bg-[#8B5CF6] rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
          </div>

          <div className="text-center px-4">
            <p className="text-[12px] font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider">
              Preparing Cabinet
            </p>
            <p className="text-[10px] font-medium text-slate-400 dark:text-slate-500 mt-1.5 truncate min-w-[160px]">
              {phrase}...
            </p>
          </div>
        </div>

        {/* Front Cover */}
        <div ref={frontRef} className="folder-front-cover">
          <div className="folder-front-grid">
            <div className="folder-front-dot" />
            <div className="folder-front-dot" style={{ background: "#C084FC" }} />
            <div className="folder-front-dot" style={{ background: "#A78BFA" }} />
            <div className="folder-front-dot" />
          </div>
        </div>

      </div>
    </div>
  );
}
