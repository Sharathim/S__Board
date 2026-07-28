import clsx from "clsx";

/**
 * Standard surface card with consistent border / radius / dark-mode elevation depth.
 * Pass `padded` (default true) for inner padding, or `false` for tables that
 * manage their own padding.
 */
export function Card({ children, className, padded = true, hover = false, ...props }) {
  return (
    <div
      className={clsx(
        "bg-white dark:bg-[#131C2E] rounded-[22px] border border-gray-200/80 dark:border-white/10 shadow-finexy dark:shadow-[0_8px_30px_rgba(0,0,0,0.35)] transition-all duration-200",
        padded && "p-5",
        hover && "hover:shadow-card-hover hover:border-gray-300 dark:hover:bg-[#1E2A42] dark:hover:border-white/20",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export default Card;
