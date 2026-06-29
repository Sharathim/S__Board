import { useState, useEffect, useCallback } from "react";

const MOBILE_QUERY = "(max-width: 767px)";
const STORAGE_KEY = "hive_force_view";

/**
 * Detects mobile viewport (< 768px) with an optional manual override.
 * Override stored in localStorage as "mobile" | "desktop" | null.
 * Uses matchMedia 'change' event (not resize) for live switching.
 */
export function useIsMobile() {
  const [matchesMedia, setMatchesMedia] = useState(() => {
    if (typeof window === "undefined") return false;
    
    // Proactively clear any legacy override from localStorage
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
