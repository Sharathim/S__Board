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
        "bg-white rounded-[22px] border border-gray-200/80 shadow-sm transition-all duration-200",
        padded && "p-5",
        hover && "hover:shadow-md hover:border-gray-300",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export default Card;
