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
   * Instantly resets and prepares page content layout without animation delays.
   */
  const triggerUnfoldAnimation = useCallback((el) => {
    if (!el) return;
    gsap.killTweensOf(el);
    gsap.set(el, { opacity: 1, y: 0, scaleY: 1, rotationX: 0, filter: "none", clearProps: "all" });
  }, []);

  /**
   * navigateWithTransition (FOLDER Mode)
   * Instant page-to-page navigation.
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
   * Instant action execution without splash overlays or delays.
   */
  const triggerPortalTransition = useCallback((state, callback) => {
    if (callback) {
      callback();
    }
    setOverlayVisible(false);
  }, []);

  useEffect(() => {
    sessionStorage.removeItem("justLoggedIn");
    if (pageContentRef?.current) {
      triggerUnfoldAnimation(pageContentRef.current);
    }
  }, [pageContentRef, triggerUnfoldAnimation]);

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
