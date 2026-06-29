import { ChevronRight } from "lucide-react";

/**
 * Tappable list row with leading icon/avatar, title + subtitle, trailing element.
 * Minimum height 48px for touch targets (Material guideline).
 */
export default function MobileListRow({
  icon: Icon,
  avatar,
  title,
  subtitle,
  trailing,
  onClick,
  danger = false,
  showChevron = true,
  className = "",
}) {
  const Comp = onClick ? "button" : "div";

  return (
    <Comp
      onClick={onClick}
      className={`mobile-tappable w-full flex items-center gap-3 px-3 py-3 min-h-[48px] rounded-xl transition-colors ${
        onClick ? "cursor-pointer" : ""
      } ${
        danger
          ? "text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20"
          : "hover:bg-gray-50 dark:hover:bg-slate-800/50"
      } ${className}`}
    >
      {/* Leading */}
      {Icon && (
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
          danger
            ? "bg-red-50 dark:bg-red-950/30 text-red-500"
            : "bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-gray-400"
        }`}>
          <Icon className="w-4.5 h-4.5" />
        </div>
      )}
      {avatar && (
        <div className="w-9 h-9 rounded-xl overflow-hidden shrink-0">
          {avatar}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 min-w-0 text-left">
        <p className={`text-sm font-semibold truncate ${
          danger ? "" : "text-gray-700 dark:text-gray-200"
        }`}>
          {title}
        </p>
        {subtitle && (
          <p className="text-xs text-gray-400 dark:text-gray-500 truncate mt-0.5">{subtitle}</p>
        )}
      </div>

      {/* Trailing */}
      {trailing && <div className="shrink-0">{trailing}</div>}
      {showChevron && onClick && !trailing && (
        <ChevronRight className="w-4 h-4 text-gray-300 dark:text-gray-600 shrink-0" />
      )}
    </Comp>
  );
}
