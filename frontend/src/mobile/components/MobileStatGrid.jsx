/**
 * 2-column stat grid for mobile dashboard. Each child is a stat cell.
 */
export default function MobileStatGrid({ children, className = "" }) {
  return (
    <div className={`grid grid-cols-2 gap-3 ${className}`}>
      {children}
    </div>
  );
}

/**
 * Individual stat cell for MobileStatGrid.
 */
export function MobileStatCell({ icon: Icon, label, value, iconBg, iconColor, onClick }) {
  return (
    <div
      onClick={onClick}
      className={`bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800/80 rounded-2xl p-3.5 flex items-center gap-3 ${
        onClick ? "mobile-tappable cursor-pointer active:scale-[0.98]" : ""
      }`}
    >
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: iconBg || "#EDE9FE" }}
      >
        <Icon className="w-4.5 h-4.5" style={{ color: iconColor || "#8B5CF6" }} />
      </div>
      <div className="min-w-0">
        <span className="text-xl font-bold text-gray-900 dark:text-white tracking-tight block">{value}</span>
        <span className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">{label}</span>
      </div>
    </div>
  );
}
