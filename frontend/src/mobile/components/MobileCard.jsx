/**
 * Full-width card primitive with thumb-friendly padding and dark mode support.
 */
export default function MobileCard({ children, className = "", onClick, noPadding = false }) {
  return (
    <div
      onClick={onClick}
      className={`w-full bg-white border border-gray-200/70 rounded-2xl shadow-sm ${
        noPadding ? "" : "p-3.5"
      } ${onClick ? "mobile-tappable cursor-pointer active:scale-[0.98]" : ""} ${className}`}
    >
      {children}
    </div>
  );
}
