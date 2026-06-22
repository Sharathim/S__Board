import clsx from "clsx";

/**
 * Standard surface card with consistent border / radius / dark-mode chrome.
 * Pass `padded` (default true) for inner padding, or `false` for tables that
 * manage their own padding.
 */
export function Card({ children, className, padded = true, hover = false, ...props }) {
  return (
    <div
      className={clsx(
        "bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700",
        padded && "p-5",
        hover && "transition-all duration-200 hover:shadow-card-hover",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
