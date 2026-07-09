import { createContext, useContext, useRef, useState, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import gsap from "gsap";

const TransitionContext = createContext(null);

/* ─── Route label map (fallback if no label passed) ──────────────────────── */
const ROUTE_LABELS = {
  "/dashboard": "Dashboard",
  "/projects": "Projects",
  "/faculty": "Faculty",
  "/classes": "Classes",
  "/forum": "Forum",
  "/updates": "Updates",
  "/settings": "Settings",
  "/notifications": "Notifications",
};

/**
 * TransitionProvider
 * 
 * Orchestrates a premium page-transition sequence using GSAP:
 *   1. Dim + blur + scale the current page  (150ms)
 *   2. Fade-in a branded overlay card       (300ms)
 *   3. Hold while route swaps               (~150ms)
 *   4. Fade-out the overlay card            (200ms)
 *   5. Stagger-animate the new page in      (400ms)
 *
 * Accepts a `pageContentRef` pointing at the scrollable <main> wrapper
 * so GSAP can directly manipulate it without layout shifts.
 */
export function TransitionProvider({ children, pageContentRef }) {
  const navigate = useNavigate();
  const location = useLocation();

  const [overlayVisible, setOverlayVisible] = useState(false);
  const [targetLabel, setTargetLabel] = useState("");
  const [TargetIcon, setTargetIcon] = useState(null);
  const isTransitioning = useRef(false);
  const overlayRef = useRef(null);
  const overlayCardRef = useRef(null);

  /**
   * navigateWithTransition
   * Call this instead of navigate() for animated page changes.
   * 
   * @param {string} path       - destination route
   * @param {string} label      - section display name
   * @param {React.Component} IconComponent - lucide icon component (optional)
   */
  const navigateWithTransition = useCallback(
    (path, label, IconComponent) => {
      // Skip if already transitioning or navigating to current page
      if (isTransitioning.current) return;
      if (location.pathname === path) return;

      isTransitioning.current = true;
      setTargetLabel(label || ROUTE_LABELS[path] || "");
      setTargetIcon(() => IconComponent || null);
      setOverlayVisible(true);

      const tl = gsap.timeline({
        onComplete: () => {
          isTransitioning.current = false;
        },
      });

      const pageEl = pageContentRef?.current;

      /* ── Step 1: Exit current page (150ms) ─────────────────────────── */
      if (pageEl) {
        tl.to(pageEl, {
          scale: 0.98,
          opacity: 0.85,
          filter: "blur(4px)",
          duration: 0.15,
          ease: "power2.inOut",
        });
      }

      /* ── Step 2: Fade in overlay card (300ms) ──────────────────────── */
      tl.call(() => {
        // Ensure overlay DOM is rendered before animating
        requestAnimationFrame(() => {
          const card = overlayCardRef.current;
          const overlay = overlayRef.current;
          if (card) {
            gsap.set(card, { scale: 0.92, opacity: 0, y: 10 });
            gsap.to(card, {
              scale: 1,
              opacity: 1,
              y: 0,
              duration: 0.3,
              ease: "power2.out",
            });
          }
          if (overlay) {
            gsap.set(overlay, { opacity: 0 });
            gsap.to(overlay, { opacity: 1, duration: 0.2, ease: "power2.out" });
          }
        });
      });

      /* ── Step 3: Hold for overlay to show + navigate ────────────────── */
      tl.to({}, { duration: 0.45 }); // hold

      tl.call(() => {
        navigate(path);
      });

      /* ── Step 4: Brief hold while new page mounts ──────────────────── */
      tl.to({}, { duration: 0.15 });

      /* ── Step 5: Fade out overlay (200ms) ──────────────────────────── */
      tl.call(() => {
        const card = overlayCardRef.current;
        const overlay = overlayRef.current;
        if (card) {
          gsap.to(card, {
            scale: 1.02,
            opacity: 0,
            y: -8,
            duration: 0.2,
            ease: "power2.in",
          });
        }
        if (overlay) {
          gsap.to(overlay, {
            opacity: 0,
            duration: 0.2,
            ease: "power2.in",
            onComplete: () => setOverlayVisible(false),
          });
        }
      });

      tl.to({}, { duration: 0.22 });

      /* ── Step 6: Animate new page in ───────────────────────────────── */
      tl.call(() => {
        if (pageEl) {
          gsap.set(pageEl, {
            scale: 1,
            opacity: 1,
            filter: "blur(0px)",
            clearProps: "filter",
          });

          // Priority 1: Elements explicitly marked with data-animate
          let animatables = pageEl.querySelectorAll("[data-animate]");

          // Priority 2: Direct children of the page's top-level wrapper div
          if (animatables.length === 0) {
            const pageWrapper = pageEl.querySelector(".page-content-container > *");
            if (pageWrapper && pageWrapper.children.length > 0) {
              animatables = pageWrapper.children;
            }
          }

          if (animatables.length > 0) {
            gsap.fromTo(
              animatables,
              { y: 20, opacity: 0 },
              {
                y: 0,
                opacity: 1,
                duration: 0.4,
                ease: "power2.out",
                stagger: 0.06,
                clearProps: "all",
              }
            );
          } else {
            // Final fallback: animate the whole page content
            gsap.fromTo(
              pageEl,
              { y: 12, opacity: 0 },
              {
                y: 0,
                opacity: 1,
                duration: 0.35,
                ease: "power2.out",
                clearProps: "all",
              }
            );
          }
        }
      });
    },
    [navigate, location.pathname, pageContentRef]
  );

  return (
    <TransitionContext.Provider
      value={{
        navigateWithTransition,
        overlayVisible,
        targetLabel,
        TargetIcon,
        overlayRef,
        overlayCardRef,
        isTransitioning: isTransitioning.current,
      }}
    >
      {children}
    </TransitionContext.Provider>
  );
}

export function usePageTransition() {
  const ctx = useContext(TransitionContext);
  if (!ctx) {
    throw new Error("usePageTransition must be used within a TransitionProvider");
  }
  return ctx;
}
