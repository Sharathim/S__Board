/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        primary: {
          50:  "#F5F3FF",
          100: "#EDE9FE",
          200: "#DDD6FE",
          300: "#C4B5FD",
          400: "#A78BFA",
          500: "#8B5CF6",
          600: "#7C3AED",
          700: "#6D28D9",
          800: "#5B21B6",
          900: "#4C1D95",
        },
        indigo: {
          50:  "#F5F3FF",
          100: "#EDE9FE",
          200: "#DDD6FE",
          300: "#C4B5FD",
          400: "#A78BFA",
          500: "#8B5CF6",
          600: "#7C3AED",
          700: "#6D28D9",
          800: "#5B21B6",
          900: "#4C1D95",
        },
      },
      fontFamily: {
        sans: ["Manrope", "Inter", "system-ui", "-apple-system", "sans-serif"],
        mono: ["JetBrains Mono", "Roboto Mono", "monospace"],
      },
      borderRadius: {
        sm:  "6px",
        md:  "10px",
        lg:  "12px",
        xl:  "16px",
        "2xl": "20px",
      },
      boxShadow: {
        card: "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)",
        md:   "0 4px 6px rgba(0,0,0,0.07), 0 2px 4px rgba(0,0,0,0.05)",
        lg:   "0 10px 15px rgba(0,0,0,0.08), 0 4px 6px rgba(0,0,0,0.05)",
        "card-hover": "0 4px 12px rgba(0,0,0,0.10), 0 2px 6px rgba(0,0,0,0.06)",
        "primary-glow": "0 4px 14px rgba(139, 92, 246, 0.30)",
      },
      animation: {
        "fade-in":  "fadeIn 0.4s ease-out forwards",
        "slide-up": "slideUp 0.5s cubic-bezier(0.16,1,0.3,1) forwards",
        "spin-slow": "spin 3s linear infinite",
      },
      keyframes: {
        fadeIn: {
          "0%":   { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%":   { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
}

