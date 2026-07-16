import { createContext, useContext, useEffect, useState } from "react";

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [theme] = useState("light");

  useEffect(() => {
    document.documentElement.classList.remove("dark");
    localStorage.setItem("dpms_theme", "light");
  }, []);

  const toggleTheme = () => {};

  return (
    <ThemeContext.Provider value={{ theme: "light", toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useThemeContext = () => useContext(ThemeContext);
