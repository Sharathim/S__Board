import clsx from "clsx";

export function Input({ label, error, icon: Icon, className, hint, ...props }) {
  return (
    <div className="space-y-1.5">
      {label && (
        <label className="block text-xs font-semibold text-[#7E7E82] dark:text-slate-300">
          {label}
        </label>
      )}
      <div className="relative">
        {Icon && (
          <Icon className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#7E7E82] dark:text-slate-400" />
        )}
        <input
          className={clsx(
            "block w-full rounded-full border px-4 py-2.5 text-sm transition-all duration-150",
            "bg-[#F5F5F7] dark:bg-[#202024] text-[#171717] dark:text-white",
            "placeholder-[#A0A0A5] dark:placeholder-slate-400",
            "hover:border-gray-300 dark:hover:border-zinc-600",
            "focus:outline-none focus:ring-2 focus:ring-[#F05A2B]/30 focus:border-[#F05A2B] focus:bg-white dark:focus:bg-[#27272A]",
            Icon && "pl-10",
            error
              ? "border-red-300 dark:border-rose-500/50 focus:ring-red-500/40 focus:border-red-500"
              : "border-gray-200/80 dark:border-[#3F3F46]",
            className
          )}
          {...props}
        />
      </div>
      {hint && !error && <p className="text-xs text-[#7E7E82] dark:text-slate-400">{hint}</p>}
      {error && <p className="text-xs text-red-500 dark:text-rose-400">{error}</p>}
    </div>
  );
}

/** Styled textarea matching the Input look — for plain `<textarea>` usages. */
export function Textarea({ label, error, className, rows = 4, ...props }) {
  return (
    <div className="space-y-1.5">
      {label && (
        <label className="block text-xs font-semibold text-[#7E7E82] dark:text-slate-300">
          {label}
        </label>
      )}
      <textarea
        rows={rows}
        className={clsx(
          "block w-full rounded-[14px] border px-4 py-2.5 text-sm transition-all duration-150 resize-y",
          "bg-[#F5F5F7] dark:bg-[#202024] text-[#171717] dark:text-white",
          "placeholder-[#A0A0A5] dark:placeholder-slate-400",
          "hover:border-gray-300 dark:hover:border-zinc-600",
          "focus:outline-none focus:ring-2 focus:ring-[#F05A2B]/30 focus:border-[#F05A2B] focus:bg-white dark:focus:bg-[#27272A]",
          error
            ? "border-red-300 dark:border-rose-500/50 focus:ring-red-500/40 focus:border-red-500"
            : "border-gray-200/80 dark:border-[#3F3F46]",
          className
        )}
        {...props}
      />
      {error && <p className="text-xs text-red-500 dark:text-rose-400">{error}</p>}
    </div>
  );
}

export default Input;
