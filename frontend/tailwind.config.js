/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        primary: {
          50:  "#EEF2FF",
          100: "#E0E7FF",
          200: "#C7D2FE",
          300: "#A5B4FC",
          400: "#818CF8",
          500: "#6366F1",
          600: "#4F46E5",
          700: "#4338CA",
          800: "#3730A3",
          900: "#312E81",
        },
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
      },
      borderRadius: {
        sm:  "8px",
        md:  "12px",
        lg:  "16px",
        xl:  "20px",
      },
      boxShadow: {
        card:  "0 4px 12px rgba(15,23,42,0.06)",
        hover: "0 10px 25px rgba(79,70,229,0.12)",
        dark:  "0 8px 32px rgba(0,0,0,0.35)",

        /* Premium multi-layer card elevation — subtle but clearly floating */
        login: [
          "0 0 0 1px rgba(0,0,0,0.04)",
          "0 2px 4px rgba(0,0,0,0.04)",
          "0 8px 20px rgba(0,0,0,0.06)",
          "0 32px 64px rgba(0,0,0,0.10)",
        ].join(", "),

        /* Statistics panel — lighter separation from background */
        stat: [
          "0 0 0 1px rgba(0,0,0,0.03)",
          "0 2px 6px rgba(0,0,0,0.04)",
          "0 10px 28px rgba(0,0,0,0.07)",
        ].join(", "),

        /* Hover lift for interactive cards */
        "card-hover": [
          "0 0 0 1px rgba(0,0,0,0.04)",
          "0 4px 8px rgba(0,0,0,0.05)",
          "0 16px 32px rgba(0,0,0,0.10)",
        ].join(", "),

        /* Primary button glow on hover */
        "primary-glow": "0 4px 14px rgba(79,70,229,0.35)",
      },
      animation: {
        "fade-in":  "fadeIn 0.5s ease-out forwards",
        "slide-up": "slideUp 0.6s cubic-bezier(0.16,1,0.3,1) forwards",
      },
      keyframes: {
        fadeIn: {
          "0%":   { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%":   { opacity: "0", transform: "translateY(24px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
}
