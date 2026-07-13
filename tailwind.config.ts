import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        // color-mix + <alpha-value> makes opacity modifiers (bg-brand-primary/5,
        // ring-brand-primary/20, …) work with CSS-variable colors — plain
        // var() values silently ignore the modifier and fall back to
        // Tailwind's default (blue) for rings.
        brand: {
          primary:
            "color-mix(in srgb, var(--color-brand-primary) calc(<alpha-value> * 100%), transparent)",
          secondary:
            "color-mix(in srgb, var(--color-brand-secondary) calc(<alpha-value> * 100%), transparent)",
          accent:
            "color-mix(in srgb, var(--color-brand-accent) calc(<alpha-value> * 100%), transparent)",
          muted:
            "color-mix(in srgb, var(--color-brand-muted) calc(<alpha-value> * 100%), transparent)",
        },
        ink: {
          900: "var(--color-ink-900)",
          800: "var(--color-ink-800)",
          700: "var(--color-ink-700)",
          600: "var(--color-ink-600)",
          400: "var(--color-ink-400)",
          300: "var(--color-ink-300)",
          200: "var(--color-ink-200)",
          100: "var(--color-ink-100)",
          50:  "var(--color-ink-50)",
        },
        success: {
          600: "var(--color-success-600)",
          500: "var(--color-success-500)",
          400: "var(--color-success-400)",
          300: "var(--color-success-300)",
          200: "var(--color-success-200)",
          100: "var(--color-success-100)",
          50:  "var(--color-success-50)",
        },
        error: {
          700: "var(--color-error-700)",
          600: "var(--color-error-600)",
          100: "var(--color-error-100)",
        },
        warning: {
          600: "var(--color-warning-600)",
          300: "var(--color-warning-300)",
          100: "var(--color-warning-100)",
          50:  "var(--color-warning-50)",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "slide-in-left": {
          from: { transform: "translateX(-100%)" },
          to: { transform: "translateX(0)" },
        },
        "slide-in-right": {
          from: { transform: "translateX(100%)" },
          to: { transform: "translateX(0)" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "pop-in": {
          from: { opacity: "0", transform: "translateY(6px) scale(0.95)" },
          to: { opacity: "1", transform: "translateY(0) scale(1)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "slide-in-left": "slide-in-left 0.3s ease-out",
        "slide-in-right": "slide-in-right 0.3s ease-out",
        "fade-in": "fade-in 0.2s ease-out",
        "pop-in": "pop-in 0.3s cubic-bezier(.2,.7,.2,1)",
      },
    },
  },
  plugins: [],
};

export default config;
