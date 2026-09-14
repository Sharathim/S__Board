import clsx from "clsx";

/**
 * Compact stat tile: icon chip + value + label, with an optional secondary
 * note. Shared by Dashboard and Projects (and anywhere a metric row is shown).
 */
export function StatTile({ icon: Icon, value, label, accent, note, className, onClick, ...props }) {
  const isClickable = !!onClick;
  return (
    <div
      onClick={onClick}
      className={clsx(
        "h-full bg-white rounded-2xl p-4.5 border border-gray-200/80 shadow-sm transition-all duration-200",
        isClickable && "cursor-pointer hover:shadow-md hover:scale-[1.02] hover:border-[#F05A2B]/40 active:scale-[0.98]",
        className
      )}
      {...props}
    >
      {Icon && (
        <div
          className={clsx(
            "w-9 h-9 rounded-xl flex items-center justify-center mb-2.5 transition-colors",
            accent || "text-[#F05A2B] bg-[#FFEEE9]"
          )}
        >
          <Icon className="w-4.5 h-4.5" />
        </div>
      )}
      <p className="text-2xl font-bold tracking-tight text-gray-900 mb-0.5">{value}</p>
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-gray-500">{label}</p>
        {note != null && (
          <span className="text-xs font-semibold text-gray-400">{note}</span>
        )}
      </div>
    </div>
  );
}

export default StatTile;
