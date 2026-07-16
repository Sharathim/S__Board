import clsx from "clsx";

const variants = {
  primary: "bg-[#F05A2B] text-white hover:bg-[#E04A1B] hover:shadow-primary-glow focus:ring-[#F05A2B]",
  black: "bg-[#171717] text-white hover:bg-black focus:ring-[#171717]",
  secondary: "bg-[#F3F3F5] dark:bg-gray-800 text-[#171717] dark:text-gray-200 border border-transparent hover:bg-[#E8E8EC] dark:hover:bg-gray-700 focus:ring-gray-300",
  danger: "bg-red-600 text-white hover:bg-red-700 focus:ring-red-500",
  success: "bg-emerald-600 text-white hover:bg-emerald-700 focus:ring-emerald-500",
  ghost: "text-[#7E7E82] dark:text-gray-300 hover:bg-[#F3F3F5] dark:hover:bg-gray-700 hover:text-[#171717] dark:hover:text-gray-100",
};

const sizes = {
  sm: "px-3.5 py-1.5 text-xs font-medium",
  md: "px-5 py-2.5 text-sm font-medium",
  lg: "px-7 py-3.5 text-base font-medium",
};

export function Button({ children, variant = "primary", size = "md", className, loading, disabled, ...props }) {
  return (
    <button
      className={clsx(
        "inline-flex items-center justify-center font-medium rounded-full transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed",
        variants[variant],
        sizes[size],
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      )}
      {children}
    </button>
  );
}
