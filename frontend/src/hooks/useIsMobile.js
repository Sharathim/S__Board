import { useState, useEffect } from "react";

// Mobile media query: portrait phones (< 768px), landscape phones (height <= 500px), or touch devices <= 1024px
const MOBILE_QUERY = "(max-width: 767px), (max-height: 500px) and (max-width: 1024px), (pointer: coarse) and (max-width: 1024px)";
const STORAGE_KEY = "hive_force_view";

/**
 * Detects mobile viewport (portrait or landscape phone) with live switching.
 */
export function useIsMobile() {
  const [matchesMedia, setMatchesMedia] = useState(() => {
    if (typeof window === "undefined") return false;
    
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {}

    return window.matchMedia(MOBILE_QUERY).matches;
  });

  useEffect(() => {
    const mql = window.matchMedia(MOBILE_QUERY);
    const handler = (e) => setMatchesMedia(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  return { isMobile: matchesMedia };
}

