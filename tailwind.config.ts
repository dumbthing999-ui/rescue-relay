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
