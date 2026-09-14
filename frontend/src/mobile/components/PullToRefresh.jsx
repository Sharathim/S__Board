import { useState, useRef, useCallback, useEffect } from "react";

/**
 * PullToRefresh — Instagram/Twitter-style pull-to-refresh for mobile.
 *
 * Wrap the scrollable content area. When the user pulls down at scroll-top,
 * a spinner appears and `onRefresh` is called. The spinner auto-dismisses
 * after the returned promise resolves.
 *
 * Usage:
 *   <PullToRefresh onRefresh={async () => { await refetchData(); }}>
 *     <div>...scrollable content...</div>
 *   </PullToRefresh>
 */

const THRESHOLD = 70;     // px pull distance to trigger refresh
const MAX_PULL   = 120;   // px maximum visual pull distance
const RESISTANCE = 0.45;  // drag resistance factor

export default function PullToRefresh({ onRefresh, children, disabled = false }) {
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [releasing, setReleasing] = useState(false);
  const touchStartY = useRef(0);
  const touchActive = useRef(false);
  const containerRef = useRef(null);

  const canPull = useCallback(() => {
    if (disabled || refreshing) return false;
    // Only pull when content is scrolled to the very top
    const el = containerRef.current?.parentElement;
    if (!el) return false;
    return el.scrollTop <= 0;
  }, [disabled, refreshing]);

  const handleTouchStart = useCallback((e) => {
    if (!canPull()) return;
    touchStartY.current = e.touches[0].clientY;
    touchActive.current = true;
  }, [canPull]);

  const handleTouchMove = useCallback((e) => {
    if (!touchActive.current || !canPull()) {
      // If user scrolled down during the gesture, cancel
      if (touchActive.current) {
        touchActive.current = false;
        setPullDistance(0);
      }
      return;
    }

    const deltaY = e.touches[0].clientY - touchStartY.current;
    if (deltaY < 0) {
      // Scrolling up — cancel pull
      setPullDistance(0);
      return;
    }

    // Apply resistance so it feels natural
    const resistedDelta = Math.min(deltaY * RESISTANCE, MAX_PULL);
    setPullDistance(resistedDelta);
  }, [canPull]);

  const handleTouchEnd = useCallback(async () => {
    if (!touchActive.current) return;
    touchActive.current = false;

    if (pullDistance >= THRESHOLD && onRefresh) {
      // Trigger refresh
      setReleasing(true);
      setPullDistance(THRESHOLD * 0.7); // Snap to spinner position
      setRefreshing(true);
      setReleasing(false);

      try {
        await onRefresh();
      } catch (err) {
        console.error("Pull-to-refresh error:", err);
      } finally {
        // Animate out
        setReleasing(true);
        setTimeout(() => {
          setRefreshing(false);
          setPullDistance(0);
          setReleasing(false);
        }, 300);
      }
    } else {
      // Didn't reach threshold — snap back
      setReleasing(true);
      setPullDistance(0);
      setTimeout(() => setReleasing(false), 300);
    }
  }, [pullDistance, onRefresh]);

  // Progress ratio for spinner animation (0..1)
  const progress = Math.min(pullDistance / THRESHOLD, 1);
  const triggered = pullDistance >= THRESHOLD;
  const showSpinner = pullDistance > 8 || refreshing;

  return (
    <div
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="relative"
    >
      {/* Spinner */}
      {showSpinner && (
        <div
          className="absolute left-0 right-0 flex items-center justify-center z-30 pointer-events-none"
          style={{
            top: 0,
            height: `${Math.max(pullDistance, refreshing ? THRESHOLD * 0.7 : 0)}px`,
            transition: releasing ? "height 0.3s cubic-bezier(0.2, 0, 0, 1)" : "none",
          }}
        >
          <div
            className={`flex items-center justify-center transition-all ${
              releasing ? "duration-300" : "duration-0"
            }`}
            style={{
              opacity: Math.min(progress * 1.5, 1),
              transform: `scale(${0.5 + progress * 0.5})`,
            }}
          >
            {refreshing ? (
              /* Spinning loader */
              <div className="w-8 h-8 rounded-full border-[2.5px] border-gray-200 border-t-[#F05A2B] animate-spin"/>
            ) : (
              /* Pull progress indicator */
              <div className="relative w-8 h-8">
                <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                  {/* Background circle */}
                  <circle
                    cx="18" cy="18" r="15"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    className="text-gray-200"
                  />
                  {/* Progress arc */}
                  <circle
                    cx="18" cy="18" r="15"
                    fill="none"
                    stroke="#F05A2B"
                    strokeWidth="2.5"
                    strokeDasharray={`${progress * 94.25} 94.25`}
                    strokeLinecap="round"
                    className="transition-all duration-100"
                  />
                </svg>
                {/* Arrow icon in center */}
                <div
                  className="absolute inset-0 flex items-center justify-center text-[#F05A2B]"
                  style={{
                    transform: `rotate(${triggered ? 180 : progress * 180}deg)`,
                    transition: "transform 0.2s ease",
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 2v8M2 6l4-4 4 4" />
                  </svg>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Content — shifted down by pull distance */}
      <div
        style={{
          transform: `translateY(${pullDistance}px)`,
          transition: releasing ? "transform 0.3s cubic-bezier(0.2, 0, 0, 1)" : "none",
        }}
      >
        {children}
      </div>
    </div>
  );
}
