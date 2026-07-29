import { useThemeContext } from "../../context/ThemeContext";

/**
 * Reusable dynamic Logo component that automatically renders the exact appropriate PNG logo
 * asset based on the active light/dark theme state.
 *
 * Supported variants:
 * - "full" (default): Full website name + logo
 *   Light: /LightModewebsite-name-logo.png
 *   Dark:  /dark-mode-website-name-logo.png
 * - "icon": Icon-only logo
 *   Light: /LightModeLogo.png
 *   Dark:  /DarkModeLogo.png
 */
export function Logo({ variant = "icon", className, alt = "Hive", style, showText = false, textClassName, ...props }) {
  const themeContext = useThemeContext();
  const theme = themeContext?.theme || "light";

  const iconSrc = theme === "dark" ? "/DarkModeLogo.png" : "/LightModeLogo.png";

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
      <span className={textClassName || "font-black text-xl tracking-tight text-slate-900 dark:text-white"}>
        Hive
      </span>
    </div>
  );
}

export default Logo;
