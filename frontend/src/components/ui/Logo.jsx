/**
 * Reusable Logo component that renders the app's PNG logo asset.
 *
 * Supported variants:
 * - "full" (default): Full website name + logo
 * - "icon": Icon-only logo -> /LightModeLogo.png
 */
export function Logo({ variant = "icon", className, alt = "Hive", style, showText = false, textClassName, ...props }) {
  const iconSrc = "/LightModeLogo.png";

  if (!showText) {
    return (
      <img
        src={iconSrc}
        alt={alt}
        className={className || "w-10 h-10 object-contain"}
        style={style}
        {...props}
      />
    );
  }

  return (
    <div className={`flex items-center gap-2.5 ${className || "h-10"}`} style={style} {...props}>
      <img
        src={iconSrc}
        alt={`${alt} Icon`}
        className="h-9 w-auto object-contain shrink-0 filter drop-shadow-sm"
      />
      <span className={textClassName || "font-black text-xl tracking-tight text-slate-900"}>
        Hive
      </span>
    </div>
  );
}

export default Logo;
