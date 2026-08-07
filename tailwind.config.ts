import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      colors: {
        primary: "#0d9488",
        teal: {
          50: "#f0fdfa", 100: "#ccfbf1", 200: "#99f6e4",
          300: "#5eead4", 400: "#2dd4bf", 500: "#14b8a6",
          600: "#0d9488", 700: "#0f766e", 800: "#115e59",
          900: "#134e4a",
        },
        surface: {
          base: "var(--surface-base)",
          elevated: "var(--surface-elevated)",
          inset: "var(--surface-inset)",
          hover: "var(--surface-hover)",
        },
        ink: {
          primary: "var(--ink-primary)",
          secondary: "var(--ink-secondary)",
          muted: "var(--ink-muted)",
        },
        brand: {
          400: "var(--brand-400)",
          500: "var(--brand-500)",
          600: "var(--brand-600)",
          700: "var(--brand-700)",
        },
        edge: {
          subtle: "var(--border-subtle)",
          default: "var(--border-default)",
          strong: "var(--border-strong)",
        },
      },
    },
  },
  plugins: [],
};
export default config;
