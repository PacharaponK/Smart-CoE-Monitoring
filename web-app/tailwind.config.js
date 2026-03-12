/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        clay: {
          bg: "#f0f0f5",
          card: "#ffffff",
          purple: "#8b5cf6",
          blue: "#3b82f6",
          teal: "#14b8a6",
          orange: "#f97316",
          pink: "#ec4899",
        },
      },
      boxShadow: {
        clay: "8px 8px 16px #d1d1d9, -8px -8px 16px #ffffff",
        "clay-inset": "inset 4px 4px 8px #d1d1d9, inset -4px -4px 8px #ffffff",
        "clay-sm": "4px 4px 8px #d1d1d9, -4px -4px 8px #ffffff",
        "clay-hover": "10px 10px 20px #d1d1d9, -10px -10px 20px #ffffff",
      },
      borderRadius: {
        clay: "20px",
      },
      animation: {
        "pulse-slow": "pulse 3s ease-in-out infinite",
        "fade-in": "fadeIn 0.5s ease-out",
        "slide-up": "slideUp 0.4s ease-out",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};
