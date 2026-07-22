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
        "bg-white dark:bg-slate-900 rounded-[22px] border border-gray-200/80 dark:border-slate-800/80 shadow-finexy",
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
