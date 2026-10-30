import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#070707",
          900: "#0c0c0d",
          850: "#111113",
          800: "#17171a",
          700: "#232327",
          600: "#33333a",
        },
        gold: {
          50: "#fbf7ee",
          100: "#f4ead2",
          200: "#e8d4a3",
          300: "#dbbb70",
          400: "#cfa64b",
          500: "#c1913a",
          600: "#a6752e",
          700: "#855927",
          800: "#6e4825",
          900: "#5e3d22",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "Georgia", "serif"],
      },
      boxShadow: {
        gold: "0 10px 40px -12px rgba(193,145,58,0.45)",
        card: "0 18px 50px -20px rgba(0,0,0,0.8)",
      },
      backgroundImage: {
        "gold-gradient": "linear-gradient(120deg, #e8d4a3 0%, #cfa64b 45%, #a6752e 100%)",
        "radial-gold": "radial-gradient(ellipse at top, rgba(193,145,58,0.16), transparent 60%)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(18px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.7s cubic-bezier(0.22,1,0.36,1) both",
        "fade-in": "fade-in 0.5s ease both",
        shimmer: "shimmer 2.2s linear infinite",
      },
    },
  },
  plugins: [],
};

export default config;
