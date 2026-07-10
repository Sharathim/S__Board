import { createContext, useContext, useRef, useState, useCallback, useEffect } from "react";
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
 * Orchestrates page transitions inside Hive:
 *   1. FOLDER Mode: Standard internal page route navigation transitions
 *      (collapsing cards, 3D folder cover opening, page unfolding).
 *   2. PORTAL Mode: Workspace entering/leaving splash transitions
 *      (concentric hexagons rotating, checkmark pop, dispersing particles)
 *      used during initial load, Gmail login, and signout.
 */
export function TransitionProvider({ children, pageContentRef }) {
  const navigate = useNavigate();
  const location = useLocation();

  // Core transition states
  const [overlayVisible, setOverlayVisible] = useState(false);
  const [transitionMode, setTransitionMode] = useState("FOLDER"); // 'FOLDER' or 'PORTAL'
  const [portalState, setPortalState] = useState("login"); // 'login' | 'logout' | 'loading'
  const [targetLabel, setTargetLabel] = useState("");
  const [TargetIcon, setTargetIcon] = useState(null);
  const isTransitioning = useRef(false);

  // Refs for folder pieces
  const overlayRef = useRef(null);
  const folderContainerRef = useRef(null);
  const folderFrontRef = useRef(null);
  const folderPaperRef = useRef(null);

  // Refs for portal pieces
  const portalHexagonRef = useRef(null);
  const portalTextRef = useRef(null);
  const portalCheckmarkRef = useRef(null);
  const portalParticlesRef = useRef(null);

  /**
   * triggerUnfoldAnimation
   * Instantly resets and prepares page content layout on internal navigations.
   */
  const triggerUnfoldAnimation = useCallback((el) => {
    if (!el) return;

    gsap.killTweensOf(el);
    const children = el.children;
    if (children) gsap.killTweensOf(children);

    gsap.set(el, {
      rotationX: 0,
      scaleY: 1,
      y: 0,
      opacity: 1,
      filter: "none",
      clearProps: "all",
    });

    // Header title
    const headerTitle = el.querySelector("h1, .page-header");
    if (headerTitle) {
      gsap.set(headerTitle, { y: 0, opacity: 1, clearProps: "all" });
    }

    // Cards / layout content blocks
    let cards = el.querySelectorAll("[data-animate]");
    if (cards.length === 0) {
      const container = el.querySelector(".page-content-container > *");
      if (container && container.children.length > 0) {
        cards = Array.from(container.children).filter(child => !child.querySelector("h1"));
      }
    }

    if (cards.length > 0) {
      gsap.set(cards, {
        y: 0,
        opacity: 1,
        scale: 1,
        clearProps: "all",
      });
    }

    // Search bar / input rows
    const searchFilter = el.querySelector(".search-filter, input[type='text'], .filter-bar");
    if (searchFilter) {
      gsap.set(searchFilter, { y: 0, opacity: 1, clearProps: "all" });
    }
  }, []);

  /**
   * navigateWithTransition (FOLDER Mode)
   * Internal page-to-page transitions - simplified to instant navigation.
   */
  const navigateWithTransition = useCallback(
    (path, label, IconComponent) => {
      if (location.pathname === path) return;
      navigate(path);
    },
    [navigate, location.pathname]
  );

  /**
   * triggerPortalTransition (PORTAL Mode)
   * Auth workspace transition screen (glowing concentric hexagons, floating particles, checkmark pop).
   *
   * @param {'login' | 'logout' | 'loading'} state - type of workspace event
   * @param {Function} callback - optional callback executed prior to fade out (e.g. auth actions)
   */
  const triggerPortalTransition = useCallback((state, callback) => {
    if (isTransitioning.current) return;
    isTransitioning.current = true;

    setTransitionMode("PORTAL");
    setPortalState(state);
    setOverlayVisible(true);

    const tl = gsap.timeline({
      onComplete: () => {
        isTransitioning.current = false;
      },
    });

    // 1. Overlay backdrop fades in
    tl.call(() => {
      requestAnimationFrame(() => {
        const overlay = overlayRef.current;
        const hexagon = portalHexagonRef.current;
        const text = portalTextRef.current;
        const checkmark = portalCheckmarkRef.current;
        const particlesWrap = portalParticlesRef.current;

        if (overlay) {
          gsap.set(overlay, { opacity: 0 });
          gsap.to(overlay, { opacity: 1, duration: 0.3, ease: "power2.out" });
        }

        // Center hexagon elastic scale-up
        if (hexagon) {
          gsap.set(hexagon, { scale: 0, opacity: 0 });
          gsap.to(hexagon, {
            scale: 1,
            opacity: 1,
            duration: 0.6,
            ease: "back.out(1.6)",
          });
        }

        // Text titles fade & slide up
        if (text) {
          gsap.set(text, { y: 25, opacity: 0 });
          gsap.to(text, {
            y: 0,
            opacity: 1,
            duration: 0.5,
            ease: "power2.out",
            delay: 0.15,
          });
        }

        // Checkmark pops up
        if (checkmark) {
          gsap.set(checkmark, { scale: 0, opacity: 0 });
          gsap.to(checkmark, {
            scale: 1,
            opacity: 1,
            duration: 0.55,
            ease: "back.out(2)",
            delay: 0.3,
          });
        }

        // Scatter & float ambient background particles outward from center
        if (particlesWrap) {
          const particles = particlesWrap.children;
          if (particles.length > 0) {
            gsap.killTweensOf(particles);
            Array.from(particles).forEach((part) => {
              const dx = (Math.random() - 0.5) * 240;
              const dy = (Math.random() - 0.5) * 240;
              const size = 6 + Math.random() * 16;
              const duration = 2 + Math.random() * 1.5;

              gsap.set(part, {
                x: 0,
                y: 0,
                width: size,
                height: size,
                opacity: 0,
              });

              gsap.to(part, {
                x: dx,
                y: dy,
                opacity: 0.45 + Math.random() * 0.45,
                duration: duration * 0.4,
                ease: "power1.out",
                onComplete: () => {
                  // Drift loop
                  gsap.to(part, {
                    x: dx + (Math.random() - 0.5) * 40,
                    y: dy + (Math.random() - 0.5) * 40,
                    opacity: 0,
                    duration: duration * 0.6,
                    ease: "power1.in",
                  });
                },
              });
            });
          }
        }
      });
    });

    // Hold screen state
    tl.to({}, { duration: 1.4 });

    // Execute callback (e.g. actual redirect/logout)
    if (callback) {
      tl.call(() => {
        callback();
      });
      tl.to({}, { duration: 0.2 });
    }

    // 2. Portal screens fades out
    tl.call(() => {
      const overlay = overlayRef.current;
      const hexagon = portalHexagonRef.current;

      if (hexagon) {
        gsap.to(hexagon, {
          scale: 0.9,
          opacity: 0,
          duration: 0.25,
          ease: "power2.in",
        });
      }

      if (overlay) {
        gsap.to(overlay, {
          opacity: 0,
          duration: 0.25,
          ease: "power2.in",
          onComplete: () => setOverlayVisible(false),
        });
      }
    });

    tl.to({}, { duration: 0.25 });

    // Play content unfold if workspace page mounted
    tl.call(() => {
      if (pageContentRef?.current) {
        triggerUnfoldAnimation(pageContentRef.current);
      }
    });
  }, [pageContentRef, triggerUnfoldAnimation]);

  // Unfold page content or play login welcome portal on initial mount
  useEffect(() => {
    const justLoggedIn = sessionStorage.getItem("justLoggedIn");
    if (justLoggedIn) {
      sessionStorage.removeItem("justLoggedIn");
      // Slight delay to ensure the overlay DOM mounts
      const timer = setTimeout(() => {
        triggerPortalTransition("login");
      }, 150);
      return () => clearTimeout(timer);
    } else if (pageContentRef?.current) {
      const timer = setTimeout(() => {
        triggerUnfoldAnimation(pageContentRef.current);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [pageContentRef, triggerUnfoldAnimation, triggerPortalTransition]);

  return (
    <TransitionContext.Provider
      value={{
        navigateWithTransition,
        triggerPortalTransition,
        triggerUnfoldAnimation,
        overlayVisible,
        transitionMode,
        portalState,
        targetLabel,
        TargetIcon,
        overlayRef,
        folderContainerRef,
        folderFrontRef,
        folderPaperRef,
        portalHexagonRef,
        portalTextRef,
        portalCheckmarkRef,
        portalParticlesRef,
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
