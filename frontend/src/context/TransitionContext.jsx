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
 * Orchestrates a premium folder-opening transition sequence using GSAP:
 *   1. Exit: Current page elements gently collapse (scale down + y translate)
 *            and page title slides upward and out.
 *   2. Folder In: 3D Folder container slides in centered.
 *   3. Folder Open: Front cover swings left Y -110deg, paper page rises.
 *   4. Route Swap: Navigates to target route.
 *   5. Folder Out: Folder container scales up & dissolves.
 *   6. Enter: New page unfolds (3D rotateX + scaleY)
 *   7. Stagger: Cards, statistics, tables stagger into place.
 *   8. Done: Search bar/filters slide down last.
 */
export function TransitionProvider({ children, pageContentRef }) {
  const navigate = useNavigate();
  const location = useLocation();

  const [overlayVisible, setOverlayVisible] = useState(false);
  const [targetLabel, setTargetLabel] = useState("");
  const [TargetIcon, setTargetIcon] = useState(null);
  const isTransitioning = useRef(false);

  // Refs for 3D folder pieces
  const overlayRef = useRef(null);
  const folderContainerRef = useRef(null);
  const folderFrontRef = useRef(null);
  const folderPaperRef = useRef(null);

  /**
   * triggerUnfoldAnimation
   * Unfolds the active page content wrapper and staggers its inner items.
   * Useful on route transitions AND on first mount (post-login/page load).
   */
  const triggerUnfoldAnimation = useCallback((el) => {
    if (!el) return;

    // Reset layout attributes
    gsap.killTweensOf(el);
    const children = el.children;
    if (children) gsap.killTweensOf(children);

    // Initial folder state for the page content container
    gsap.set(el, {
      transformOrigin: "center top",
      rotationX: -12,
      scaleY: 0.94,
      y: -20,
      opacity: 0,
      filter: "blur(4px)",
    });

    // Unfold Page timeline
    const tl = gsap.timeline();

    tl.to(el, {
      rotationX: 0,
      scaleY: 1,
      y: 0,
      opacity: 1,
      filter: "blur(0px)",
      duration: 0.5,
      ease: "power3.out",
      clearProps: "transform,filter",
    });

    // Animate Header Title
    const headerTitle = el.querySelector("h1, .page-header");
    if (headerTitle) {
      tl.fromTo(
        headerTitle,
        { y: 30, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.35, ease: "power2.out" },
        "-=0.3"
      );
    }

    // Stagger Cards / elements
    let cards = el.querySelectorAll("[data-animate]");
    if (cards.length === 0) {
      const container = el.querySelector(".page-content-container > *");
      if (container && container.children.length > 0) {
        // Exclude the header block if we already animated it
        cards = Array.from(container.children).filter(child => !child.querySelector("h1"));
      }
    }

    if (cards.length > 0) {
      tl.fromTo(
        cards,
        { y: 25, opacity: 0, scale: 0.97 },
        {
          y: 0,
          opacity: 1,
          scale: 1,
          duration: 0.45,
          ease: "power2.out",
          stagger: 0.05,
          clearProps: "transform",
        },
        "-=0.25"
      );
    }

    // Search bar/Filters slide & fade in
    const searchFilter = el.querySelector(".search-filter, input[type='text'], .filter-bar");
    if (searchFilter) {
      tl.fromTo(
        searchFilter,
        { y: -15, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.35, ease: "power2.out" },
        "-=0.2"
      );
    }
  }, []);

  /**
   * navigateWithTransition
   * Transitions from current view to new route.
   */
  const navigateWithTransition = useCallback(
    (path, label, IconComponent) => {
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

      /* ── Step 1: Exit Current Page (Gently collapse elements & Title slides up) ── */
      if (pageEl) {
        // Gently collapse cards/content items
        const contentChildren = pageEl.querySelectorAll(".page-content-container > * > *:not(h1)");
        if (contentChildren.length > 0) {
          tl.to(contentChildren, {
            scale: 0.95,
            y: 15,
            opacity: 0,
            duration: 0.22,
            ease: "power2.inOut",
            stagger: 0.02,
          });
        }

        // Slide title/header upward
        const pageHeader = pageEl.querySelector("h1, .page-header");
        if (pageHeader) {
          tl.to(
            pageHeader,
            { y: -30, opacity: 0, duration: 0.18, ease: "power2.in" },
            "-=0.2"
          );
        }

        // Fade main layout wrap
        tl.to(pageEl, { opacity: 0, duration: 0.2 }, "-=0.1");
      }

      /* ── Step 2: Overlay slides into view (Closed Folder) ── */
      tl.call(() => {
        requestAnimationFrame(() => {
          const overlay = overlayRef.current;
          const container = folderContainerRef.current;
          const front = folderFrontRef.current;
          const paper = folderPaperRef.current;

          if (overlay) {
            gsap.set(overlay, { opacity: 0 });
            gsap.to(overlay, { opacity: 1, duration: 0.25, ease: "power2.out" });
          }

          if (container) {
            gsap.set(container, { scale: 0.82, y: 30, opacity: 0 });
            gsap.to(container, {
              scale: 1,
              y: 0,
              opacity: 1,
              duration: 0.35,
              ease: "power2.out",
            });
          }

          if (front) {
            gsap.set(front, { rotationY: 0 });
          }

          if (paper) {
            gsap.set(paper, { y: 0, opacity: 0, scale: 0.95 });
          }
        });
      });

      // Wait for folder to land
      tl.to({}, { duration: 0.35 });

      /* ── Step 3: Open Folder & Let Document rise ── */
      tl.call(() => {
        const front = folderFrontRef.current;
        const paper = folderPaperRef.current;

        if (front) {
          gsap.to(front, {
            rotationY: -110,
            duration: 0.45,
            ease: "power2.inOut",
          });
        }

        if (paper) {
          gsap.to(paper, {
            y: -35,
            opacity: 1,
            scale: 1.02,
            duration: 0.5,
            ease: "power2.out",
          });
        }
      });

      // Hold loading screen
      tl.to({}, { duration: 0.65 });

      /* ── Step 4: Swap Route ── */
      tl.call(() => {
        navigate(path);
      });

      // Brief hold while components mount
      tl.to({}, { duration: 0.1 });

      /* ── Step 5: Folder container scales up and dissolves ── */
      tl.call(() => {
        const container = folderContainerRef.current;
        const overlay = overlayRef.current;

        if (container) {
          gsap.to(container, {
            scale: 1.15,
            y: -20,
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

      /* ── Step 6: Unfold new page & stagger inner elements ── */
      tl.call(() => {
        triggerUnfoldAnimation(pageContentRef?.current);
      });
    },
    [navigate, location.pathname, pageContentRef, triggerUnfoldAnimation]
  );

  // Play folder unfolding animation when the component mounts (e.g. initial loads, post-login transitions)
  useEffect(() => {
    if (pageContentRef?.current) {
      // Small timeout to allow page layout child layout to fully paint
      const timer = setTimeout(() => {
        triggerUnfoldAnimation(pageContentRef.current);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [pageContentRef, triggerUnfoldAnimation]);

  return (
    <TransitionContext.Provider
      value={{
        navigateWithTransition,
        triggerUnfoldAnimation,
        overlayVisible,
        targetLabel,
        TargetIcon,
        overlayRef,
        folderContainerRef,
        folderFrontRef,
        folderPaperRef,
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
