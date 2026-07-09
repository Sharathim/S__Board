import { usePageTransition } from "../../context/TransitionContext";

/**
 * PageTransitionOverlay
 *
 * A premium branded transition card that appears centered on screen
 * during page navigation. Shows the Hive logo, destination section
 * icon & name, and subtle decorative orbital dots.
 *
 * Fully controlled by TransitionContext via GSAP — this component
 * only provides the DOM structure and styling.
 */
export default function PageTransitionOverlay() {
  const { overlayVisible, targetLabel, TargetIcon, overlayRef, overlayCardRef } =
    usePageTransition();

  if (!overlayVisible) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={{ opacity: 0 }}
    >
      {/* Subtle dim backdrop */}
      <div className="absolute inset-0 bg-black/[0.08] dark:bg-black/[0.18]" />

      {/* Transition Card */}
      <div
        ref={overlayCardRef}
        className="relative z-10 flex flex-col items-center justify-center gap-5 px-12 py-10 rounded-3xl transition-card"
        style={{ opacity: 0 }}
      >
        {/* Logo with orbital dots */}
        <div className="relative flex items-center justify-center w-24 h-24">
          {/* Orbital Dots */}
          {[...Array(6)].map((_, i) => (
            <span
              key={i}
              className="orbit-dot"
              style={{
                "--orbit-delay": `${i * -0.55}s`,
                "--orbit-size": `${3 + (i % 3)}px`,
                "--orbit-opacity": `${0.25 + (i % 3) * 0.15}`,
              }}
            />
          ))}

          {/* Hive Logo */}
          <img
            src="/logo-icon.png"
            alt="Hive"
            className="w-14 h-14 object-contain relative z-10 drop-shadow-md"
          />
        </div>

        {/* Section Icon */}
        {TargetIcon && (
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center -mt-2"
            style={{
              background: "rgba(139, 92, 246, 0.1)",
              color: "#8B5CF6",
            }}
          >
            <TargetIcon className="w-5 h-5" />
          </div>
        )}

        {/* Loading Text */}
        <div className="flex flex-col items-center gap-1.5">
          <p className="text-base font-bold tracking-tight text-gray-900 dark:text-white">
            Loading {targetLabel}
          </p>
          <p className="text-xs font-medium text-gray-400 dark:text-gray-500">
            Preparing your workspace...
          </p>
        </div>
      </div>
    </div>
  );
}
