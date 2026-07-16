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
        "bg-white dark:bg-gray-800 rounded-[22px] border border-[#EBEBEB] dark:border-gray-700 shadow-finexy",
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
