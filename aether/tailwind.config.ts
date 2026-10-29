import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class", '[data-theme="dark"]'],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        app: "var(--bg-app)",
        surface: {
          DEFAULT: "var(--surface)",
          elevated: "var(--surface-elevated)"
        },
        sidebar: {
          DEFAULT: "var(--sidebar)",
          active: "var(--sidebar-active)"
        },
        accent: {
          DEFAULT: "var(--accent)",
          hover: "var(--accent-hover)",
          button: "var(--accent-button)",
          "button-hover": "var(--accent-button-hover)",
          subtle: "var(--accent-subtle)"
        },
        ink: {
          DEFAULT: "var(--text)",
          muted: "var(--text-muted)",
          inverse: "var(--text-inverse)"
        },
        outline: {
          DEFAULT: "var(--border)",
          strong: "var(--border-strong)"
        }
      },
      borderRadius: {
        card: "16px",
        input: "12px",
        chip: "9999px",
        button: "12px"
      },
      fontFamily: {
        heading: ["var(--font-fraunces)", "Georgia", "serif"],
        body: ["var(--font-inter)", "-apple-system", "sans-serif"],
        mono: ["var(--font-jetbrains-mono)", "monospace"]
      },
      transitionDuration: {
        150: "150ms",
        200: "200ms",
        250: "250ms"
      }
    },
  },
  plugins: [],
};

export default config;
