import clsx from "clsx";

/**
 * Compact stat tile: icon chip + value + label, with an optional secondary
 * note. Shared by Dashboard and Projects (and anywhere a metric row is shown).
 */
export function StatTile({ icon: Icon, value, label, accent, note, className }) {
  return (
    <div
      className={clsx(
        "h-full bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700",
        className
      )}
    >
      {Icon && (
        <div
          className={clsx(
            "w-9 h-9 rounded-lg flex items-center justify-center mb-2",
            accent || "text-gray-600 bg-gray-100 dark:text-gray-300 dark:bg-gray-700"
          )}
        >
          <Icon className="w-4.5 h-4.5" />
        </div>
      )}
      <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{value}</p>
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
        {note != null && (
          <span className="text-xs font-medium text-gray-400 dark:text-gray-500">{note}</span>
        )}
      </div>
    </div>
  );
}
