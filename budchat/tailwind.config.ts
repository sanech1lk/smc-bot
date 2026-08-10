import type { Config } from "tailwindcss";

/** Wires a CSS variable up as a Tailwind colour that still supports /opacity. */
const withOpacity = (variable: string) => `rgb(var(${variable}) / <alpha-value>)`;

const config: Config = {
  darkMode: ["selector", '[data-theme="dark"]'],
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      screens: {
        // Narrow phones (iPhone SE and similar) fall below this.
        xs: "380px"
      },
      fontFamily: {
        sans: ["var(--font-sans)", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "sans-serif"]
      },
      colors: {
        bg: {
          DEFAULT: withOpacity("--bg"),
          soft: withOpacity("--bg-soft"),
          card: withOpacity("--bg-card"),
          elevated: withOpacity("--bg-elevated")
        },
        border: {
          DEFAULT: withOpacity("--border"),
          soft: withOpacity("--border-soft")
        },
        brand: {
          DEFAULT: withOpacity("--brand"),
          dark: withOpacity("--brand-dark"),
          light: withOpacity("--brand-light")
        },
        accent: {
          DEFAULT: withOpacity("--accent"),
          soft: withOpacity("--accent-soft")
        },
        status: {
          gray: withOpacity("--status-gray"),
          yellow: withOpacity("--status-yellow"),
          green: withOpacity("--status-green"),
          red: withOpacity("--status-red")
        },
        text: {
          primary: withOpacity("--text-primary"),
          secondary: withOpacity("--text-secondary"),
          muted: withOpacity("--text-muted")
        }
      },
      borderRadius: {
        lg: "0.625rem",
        xl: "0.875rem",
        "2xl": "1.25rem",
        "3xl": "1.75rem"
      },
      spacing: {
        tap: "3rem"
      },
      boxShadow: {
        card: "var(--shadow-card)",
        raised: "var(--shadow-raised)",
        overlay: "var(--shadow-overlay)"
      },
      letterSpacing: {
        tightish: "-0.011em"
      }
    }
  },
  plugins: []
};

export default config;
