import clsx from "clsx";

const sizes = {
  sm: "w-8 h-8 text-xs",
  md: "w-10 h-10 text-sm",
  lg: "w-12 h-12 text-base",
  xl: "w-16 h-16 text-lg",
};

export function Avatar({ src, name, size = "md", className }) {
  const initials = name
    ? name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
    : "?";

  if (src) {
    return (
      <img
        src={src}
        alt={name || "Avatar"}
        className={clsx("rounded-full object-cover border border-gray-200", sizes[size], className)}
      />
    );
  }

  return (
    <div
      className={clsx(
        "rounded-full bg-[#FFEEE9] text-[#F05A2B] border border-[#FFDBD2] flex items-center justify-center font-bold tracking-tight shrink-0",
        sizes[size],
        className
      )}
    >
      {initials}
    </div>
  );
}

export default Avatar;
