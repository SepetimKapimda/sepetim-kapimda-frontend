import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        primary: {
          50: "#fff4ed",
          100: "#ffe4d3",
          200: "#ffc4a3",
          300: "#ff9d6b",
          400: "#ff7a3d",
          500: "#FF5000",
          600: "#e64500",
          700: "#bf3900",
          800: "#992e00",
          900: "#7a2500",
          DEFAULT: "#FF5000",
        },
        secondary: {
          50: "#fffef0",
          100: "#fffbcc",
          200: "#fff799",
          300: "#ffef5c",
          400: "#ffe329",
          500: "#FFD600",
          600: "#e0bd00",
          700: "#b89b00",
          800: "#8f7800",
          900: "#6b5a00",
          DEFAULT: "#FFD600",
        },
        charcoal: "#111827",
        muted: "#6B7280",
        offwhite: "#F9FAFB",
      },
      fontFamily: {
        heading: ["var(--font-poppins)", "sans-serif"],
        sans: ["var(--font-inter)", "sans-serif"],
      },
      boxShadow: {
        soft: "0 1px 2px 0 rgba(17, 24, 39, 0.04), 0 2px 8px 0 rgba(17, 24, 39, 0.06)",
        card: "0 1px 3px 0 rgba(17, 24, 39, 0.05), 0 4px 12px -2px rgba(17, 24, 39, 0.08)",
        popover: "0 8px 24px -4px rgba(17, 24, 39, 0.12), 0 2px 6px -1px rgba(17, 24, 39, 0.06)",
      },
      keyframes: {
        marquee: {
          "0%": { transform: "translateX(0%)" },
          "100%": { transform: "translateX(-50%)" },
        },
      },
      animation: {
        marquee: "marquee 22s linear infinite",
      },
    },
  },
  plugins: [],
};
export default config;
