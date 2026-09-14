import clsx from "clsx";

const variants = {
  default: "bg-gray-100 text-gray-700 border border-gray-200",
  primary: "bg-[#FFEEE9] text-[#F05A2B] border border-[#FFDBD2]",
  success: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  warning: "bg-amber-50 text-amber-700 border border-amber-200",
  danger: "bg-rose-50 text-rose-700 border border-rose-200",
  info: "bg-sky-50 text-sky-700 border border-sky-200",
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
