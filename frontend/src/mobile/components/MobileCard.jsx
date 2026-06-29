/**
 * Full-width card primitive with thumb-friendly padding and dark mode support.
 */
export default function MobileCard({ children, className = "", onClick, noPadding = false }) {
  return (
    <div
      onClick={onClick}
      className={`w-full bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800/80 rounded-2xl shadow-sm ${
        noPadding ? "" : "p-4"
      } ${onClick ? "mobile-tappable cursor-pointer active:scale-[0.98]" : ""} ${className}`}
    >
      {children}
    </div>
  );
}
