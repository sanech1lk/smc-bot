import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: "#0f1115",
          soft: "#161922",
          card: "#1c202b",
          elevated: "#242938"
        },
        border: {
          DEFAULT: "#2a3040",
          soft: "#333a4d"
        },
        brand: {
          DEFAULT: "#ff7a1a",
          dark: "#e5680a",
          light: "#ffb573"
        },
        status: {
          gray: "#6b7280",
          yellow: "#eab308",
          green: "#22c55e",
          red: "#ef4444"
        },
        text: {
          primary: "#f3f4f6",
          secondary: "#9aa1b1",
          muted: "#6b7280"
        }
      },
      borderRadius: {
        xl: "1rem",
        "2xl": "1.5rem"
      },
      fontSize: {
        base: ["1.05rem", "1.5rem"],
        lg: ["1.2rem", "1.7rem"]
      },
      spacing: {
        tap: "3.25rem"
      },
      boxShadow: {
        card: "0 4px 18px rgba(0,0,0,0.35)"
      }
    }
  },
  plugins: []
};

export default config;
