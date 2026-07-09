import { useRef, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";

/**
 * Wraps children with a smooth fade+slide animation on route changes.
 * Uses CSS keyframe animations triggered by key changes.
 */
export function PageTransition({ children }) {
  const location = useLocation();
  const [displayLocation, setDisplayLocation] = useState(location);
  const [transitionStage, setTransitionStage] = useState("page-enter-active");

  useEffect(() => {
    if (location.pathname !== displayLocation.pathname) {
      setTransitionStage("page-exit-active");
    }
  }, [location, displayLocation]);

  const handleAnimationEnd = () => {
    if (transitionStage === "page-exit-active") {
      setTransitionStage("page-enter-active");
      setDisplayLocation(location);
    }
  };

  return (
    <div
      className={`page-transition-wrapper ${transitionStage}`}
      onAnimationEnd={handleAnimationEnd}
    >
      {children}
    </div>
  );
}
