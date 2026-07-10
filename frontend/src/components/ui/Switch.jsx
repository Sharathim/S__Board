import clsx from "clsx";

/**
 * A highly realistic, interactive, and premium iOS-style Toggle Switch.
 * Features:
 * - 3D knob shadow and glossy gradient.
 * - Inset track shadow.
 * - Active gradient state.
 * - Smooth transition with subtle spring stretch simulation on active state.
 */
export function Switch({ checked, onChange, disabled, loading, size = "md", className, ...props }) {
  const isBusy = disabled || loading;

  const trackSizes = {
    sm: "w-10 h-5.5",
    md: "w-12 h-6.5",
    lg: "w-14 h-8",
  };

  const knobSizes = {
    sm: "w-4.5 h-4.5",
    md: "w-5.5 h-5.5",
    lg: "w-7 h-7",
  };

  const translateClasses = {
    sm: checked ? "translate-x-4.5" : "translate-x-0.5",
    md: checked ? "translate-x-5.5" : "translate-x-0.5",
    lg: checked ? "translate-x-6" : "translate-x-0.5",
  };

  return (
    <button
      type="button"
      onClick={onChange}
      disabled={isBusy}
      className={clsx(
        "relative rounded-full transition-all duration-350 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500/50 flex items-center cursor-pointer select-none",
        trackSizes[size],
        checked
          ? "bg-gradient-to-r from-emerald-500 to-teal-500 shadow-[inset_0_2px_4px_rgba(0,0,0,0.15)]"
          : "bg-gray-250 dark:bg-gray-700 shadow-[inset_0_2px_4px_rgba(0,0,0,0.1)]",
        isBusy && "opacity-60 cursor-not-allowed",
        className
      )}
      {...props}
    >
      {/* Knob */}
      <span
        className={clsx(
          "absolute top-0.5 bg-gradient-to-b from-white to-gray-50 rounded-full transition-all duration-350 ease-[cubic-bezier(0.34,1.56,0.64,1)] flex items-center justify-center shadow-[0_2px_4px_rgba(0,0,0,0.2),_0_1px_2px_rgba(0,0,0,0.15)] border border-gray-100 dark:border-gray-200",
          knobSizes[size],
          translateClasses[size],
          // Subtle stretch effect on hover/active
          "group-hover:scale-x-110"
        )}
      >
        {loading && (
          <svg className="animate-spin h-3 w-3 text-emerald-600 dark:text-emerald-500" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        )}
      </span>
    </button>
  );
}
