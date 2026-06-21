import clsx from "clsx";

export function Input({ label, error, className, ...props }) {
  return (
    <div className="space-y-1">
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
        </label>
      )}
      <input
        className={clsx(
          "block w-full rounded-lg border px-3 py-2 text-sm transition-colors",
          "bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100",
          "placeholder-gray-400 dark:placeholder-gray-500",
          "focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent",
          error
            ? "border-red-300 focus:ring-red-500"
            : "border-gray-300 dark:border-gray-600",
          className
        )}
        {...props}
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
