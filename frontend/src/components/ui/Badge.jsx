import clsx from "clsx";

const variants = {
  default: "bg-gray-100 text-gray-700 border border-gray-200 dark:bg-slate-800/80 dark:text-slate-200 dark:border-white/10",
  primary: "bg-[#FFEEE9] text-[#F05A2B] border border-[#FFDBD2] dark:bg-[#F05A2B]/15 dark:text-[#FF8365] dark:border-[#F05A2B]/30",
  success: "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30",
  warning: "bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30",
  danger: "bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-500/15 dark:text-rose-300 dark:border-rose-500/30",
  info: "bg-sky-50 text-sky-700 border border-sky-200 dark:bg-sky-500/15 dark:text-sky-300 dark:border-sky-500/30",
};

export function Badge({ children, variant = "default", className }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium transition-colors",
        variants[variant] || variants.default,
        className
      )}
    >
      {children}
    </span>
  );
}

export default Badge;
