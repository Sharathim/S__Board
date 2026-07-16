import clsx from "clsx";

export function Input({ label, error, icon: Icon, className, hint, ...props }) {
  return (
    <div className="space-y-1.5">
      {label && (
        <label className="block text-xs font-medium text-[#7E7E82] dark:text-gray-300">
          {label}
        </label>
      )}
      <div className="relative">
        {Icon && (
          <Icon className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#7E7E82] dark:text-gray-500" />
        )}
        <input
          className={clsx(
            "block w-full rounded-full border px-4 py-2.5 text-sm transition-all duration-150",
            "bg-[#F5F5F7] dark:bg-gray-800 text-[#171717] dark:text-gray-100",
            "placeholder-[#A0A0A5] dark:placeholder-gray-500",
            "hover:border-gray-300 dark:hover:border-gray-500",
            "focus:outline-none focus:ring-2 focus:ring-[#F05A2B]/30 focus:border-[#F05A2B] focus:bg-white",
            Icon && "pl-10",
            error
              ? "border-red-300 dark:border-red-700 focus:ring-red-500/40 focus:border-red-500"
              : "border-[#EBEBEB] dark:border-gray-700",
            className
          )}
          {...props}
        />
      </div>
      {hint && !error && <p className="text-xs text-[#7E7E82] dark:text-gray-500">{hint}</p>}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

/** Styled textarea matching the Input look — for plain `<textarea>` usages. */
export function Textarea({ label, error, className, rows = 4, ...props }) {
  return (
    <div className="space-y-1.5">
      {label && (
        <label className="block text-xs font-medium text-[#7E7E82] dark:text-gray-300">
          {label}
        </label>
      )}
      <textarea
        rows={rows}
        className={clsx(
          "block w-full rounded-[14px] border px-4 py-2.5 text-sm transition-all duration-150 resize-y",
          "bg-[#F5F5F7] dark:bg-gray-800 text-[#171717] dark:text-gray-100",
          "placeholder-[#A0A0A5] dark:placeholder-gray-500",
          "hover:border-gray-300 dark:hover:border-gray-500",
          "focus:outline-none focus:ring-2 focus:ring-[#F05A2B]/30 focus:border-[#F05A2B] focus:bg-white",
          error
            ? "border-red-300 dark:border-red-700 focus:ring-red-500/40 focus:border-red-500"
            : "border-[#EBEBEB] dark:border-gray-700",
          className
        )}
        {...props}
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
