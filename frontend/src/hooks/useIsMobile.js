import { useState, useEffect, useCallback } from "react";

const MOBILE_QUERY = "(max-width: 767px)";
const STORAGE_KEY = "hive_force_view";

/**
 * Detects mobile viewport (< 768px) with an optional manual override.
 * Override stored in localStorage as "mobile" | "desktop" | null.
 * Uses matchMedia 'change' event (not resize) for live switching.
 */
export function useIsMobile() {
  const [override, setOverrideState] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY);
    } catch {
      return null;
    }
  });

  const [matchesMedia, setMatchesMedia] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia(MOBILE_QUERY).matches;
  });

  useEffect(() => {
    const mql = window.matchMedia(MOBILE_QUERY);
    const handler = (e) => setMatchesMedia(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  const setForceView = useCallback((value) => {
    // value: "mobile" | "desktop" | null
    if (value) {
      localStorage.setItem(STORAGE_KEY, value);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
    setOverrideState(value);
  }, []);

  let isMobile;
  if (override === "mobile") {
    isMobile = true;
  } else if (override === "desktop") {
    isMobile = false;
  } else {
    isMobile = matchesMedia;
  }

  return { isMobile, setForceView, override };
}
