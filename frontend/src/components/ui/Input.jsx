import clsx from "clsx";

export function Input({ label, error, icon: Icon, className, hint, ...props }) {
  return (
    <div className="space-y-1.5">
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
        </label>
      )}
      <div className="relative">
        {Icon && (
          <Icon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
        )}
        <input
          className={clsx(
            "block w-full rounded-lg border px-3.5 py-2.5 text-sm transition-all duration-150",
            "bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100",
            "placeholder-gray-400 dark:placeholder-gray-500",
            "hover:border-gray-400 dark:hover:border-gray-500",
            "focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500",
            Icon && "pl-9",
            error
              ? "border-red-300 dark:border-red-700 focus:ring-red-500/40 focus:border-red-500"
              : "border-gray-300 dark:border-gray-600",
            className
          )}
          {...props}
        />
      </div>
      {hint && !error && <p className="text-xs text-gray-400 dark:text-gray-500">{hint}</p>}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

/** Styled textarea matching the Input look — for plain `<textarea>` usages. */
export function Textarea({ label, error, className, rows = 4, ...props }) {
  return (
    <div className="space-y-1.5">
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
        </label>
      )}
      <textarea
        rows={rows}
        className={clsx(
          "block w-full rounded-lg border px-3.5 py-2.5 text-sm transition-all duration-150 resize-y",
          "bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100",
          "placeholder-gray-400 dark:placeholder-gray-500",
          "hover:border-gray-400 dark:hover:border-gray-500",
          "focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500",
          error
            ? "border-red-300 dark:border-red-700 focus:ring-red-500/40 focus:border-red-500"
            : "border-gray-300 dark:border-gray-600",
          className
        )}
        {...props}
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
