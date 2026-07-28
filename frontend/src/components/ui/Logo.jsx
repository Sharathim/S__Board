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
export function Logo({ variant = "full", className, alt = "Hive", ...props }) {
  const themeContext = useThemeContext();
  const theme = themeContext?.theme || "light";

  let src = "/LightModewebsite-name-logo.png";

  if (variant === "icon") {
    src = theme === "dark" ? "/DarkModeLogo.png" : "/LightModeLogo.png";
  } else {
    src = theme === "dark" ? "/dark-mode-website-name-logo.png" : "/LightModewebsite-name-logo.png";
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className || (variant === "icon" ? "w-8 h-8 object-contain" : "h-10 w-auto object-contain")}
      {...props}
    />
  );
}

export default Logo;
