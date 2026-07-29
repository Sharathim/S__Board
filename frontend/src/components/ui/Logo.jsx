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
export function Logo({ variant = "full", className, alt = "Hive", style, ...props }) {
  const themeContext = useThemeContext();
  const theme = themeContext?.theme || "light";

  const iconSrc = theme === "dark" ? "/DarkModeLogo.png" : "/LightModeLogo.png";
  const textSrc = theme === "dark" ? "/dark-mode-website-name-logo.png" : "/LightModewebsite-name-logo.png";

  if (variant === "icon") {
    return (
      <img
        src={iconSrc}
        alt={alt}
        className={className || "w-8 h-8 object-contain"}
        style={style}
        {...props}
      />
    );
  }

  const blendStyle = theme === "light" ? { mixBlendMode: "multiply", ...style } : style;

  return (
    <div className={`flex items-center gap-2 ${className || "h-10"}`} style={style} {...props}>
      <img
        src={iconSrc}
        alt={`${alt} Icon`}
        className="h-8 w-auto object-contain shrink-0 filter drop-shadow-sm"
      />
      <img
        src={textSrc}
        alt={alt}
        className="h-7 w-auto object-contain shrink-0"
        style={blendStyle}
      />
    </div>
  );
}

export default Logo;
