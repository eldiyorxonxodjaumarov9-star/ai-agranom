import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: {
          DEFAULT: "rgb(var(--canvas) / <alpha-value>)",
          muted: "rgb(var(--canvas-muted) / <alpha-value>)",
          elevated: "rgb(var(--canvas-elevated) / <alpha-value>)",
        },
        ink: {
          DEFAULT: "rgb(var(--ink) / <alpha-value>)",
          muted: "rgb(var(--ink-muted) / <alpha-value>)",
          faint: "rgb(var(--ink-faint) / <alpha-value>)",
        },
        line: {
          DEFAULT: "rgb(var(--line) / <alpha-value>)",
          strong: "rgb(var(--line-strong) / <alpha-value>)",
        },
        brand: {
          DEFAULT: "rgb(var(--brand) / <alpha-value>)",
          soft: "rgb(var(--brand-soft) / <alpha-value>)",
          fg: "rgb(var(--brand-fg) / <alpha-value>)",
        },
        // keep legacy agro tokens for chat API components still referencing them
        agro: {
          50: "#f0fdf4",
          100: "#dcfce7",
          200: "#bbf7d0",
          300: "#86efac",
          400: "#4ade80",
          500: "#22c55e",
          600: "#16a34a",
          700: "#15803d",
          800: "#166534",
          900: "#14532d",
          950: "#052e16",
        },
      },
      fontFamily: {
        sans: ["var(--font-outfit)", "system-ui", "sans-serif"],
        display: ["var(--font-outfit)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        soft: "0 1px 2px rgb(0 0 0 / 0.04), 0 8px 24px rgb(0 0 0 / 0.04)",
        glass: "0 8px 32px rgb(0 0 0 / 0.08)",
        lift: "0 12px 40px rgb(0 0 0 / 0.1)",
      },
      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.25rem",
        "4xl": "1.75rem",
      },
      backgroundImage: {
        "mesh-light":
          "radial-gradient(ellipse 80% 50% at 50% -20%, rgb(27 122 78 / 0.12), transparent), radial-gradient(ellipse 60% 40% at 100% 0%, rgb(15 23 42 / 0.04), transparent)",
        "mesh-dark":
          "radial-gradient(ellipse 80% 50% at 50% -20%, rgb(45 184 104 / 0.15), transparent), radial-gradient(ellipse 50% 30% at 100% 0%, rgb(255 255 255 / 0.04), transparent)",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        bounceDot: {
          "0%, 80%, 100%": { transform: "scale(0.4)", opacity: "0.4" },
          "40%": { transform: "scale(1)", opacity: "1" },
        },
        pulseSoft: {
          "0%, 100%": { opacity: "0.5" },
          "50%": { opacity: "1" },
        },
      },
      animation: {
        "fade-in": "fadeIn 0.35s ease-out",
        "slide-up": "slideUp 0.4s ease-out",
        "bounce-dot": "bounceDot 1.2s infinite ease-in-out both",
        "pulse-soft": "pulseSoft 1.6s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
