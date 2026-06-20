import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: "#0a0a0a",
          soft: "#1d1d1f",
          muted: "#6e6e73",
          faint: "#86868b",
        },
        paper: {
          DEFAULT: "#ffffff",
          soft: "#fbfbfd",
          mist: "#f5f5f7",
          edge: "#e8e8ed",
        },
        accent: {
          DEFAULT: "#0a0a0a",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        serif: ["var(--font-serif)", "Georgia", "serif"],
      },
      fontSize: {
        // Modern typography scale tuned for large editorial headlines
        "display-2xl": ["clamp(3.5rem, 11vw, 11rem)", { lineHeight: "0.92", letterSpacing: "-0.04em", fontWeight: "600" }],
        "display-xl": ["clamp(2.75rem, 8vw, 7.5rem)", { lineHeight: "0.95", letterSpacing: "-0.035em", fontWeight: "600" }],
        "display-lg": ["clamp(2.25rem, 5.5vw, 5rem)", { lineHeight: "1.02", letterSpacing: "-0.03em", fontWeight: "600" }],
        "display-md": ["clamp(1.875rem, 4vw, 3.25rem)", { lineHeight: "1.06", letterSpacing: "-0.025em", fontWeight: "600" }],
        "display-sm": ["clamp(1.5rem, 2.5vw, 2.25rem)", { lineHeight: "1.12", letterSpacing: "-0.02em", fontWeight: "600" }],
        "body-xl": ["clamp(1.25rem, 2vw, 1.625rem)", { lineHeight: "1.45", letterSpacing: "-0.01em" }],
        "body-lg": ["1.125rem", { lineHeight: "1.55", letterSpacing: "-0.005em" }],
        eyebrow: ["0.8125rem", { lineHeight: "1.2", letterSpacing: "0.16em", fontWeight: "500" }],
      },
      spacing: {
        // Luxury spacing system
        section: "clamp(6rem, 14vh, 12rem)",
        gutter: "clamp(1.25rem, 5vw, 6rem)",
        "18": "4.5rem",
        "22": "5.5rem",
        "30": "7.5rem",
      },
      maxWidth: {
        shell: "1440px",
        prose: "44rem",
      },
      borderRadius: {
        "4xl": "2rem",
        "5xl": "2.75rem",
      },
      transitionTimingFunction: {
        luxe: "cubic-bezier(0.16, 1, 0.3, 1)",
        smooth: "cubic-bezier(0.65, 0, 0.35, 1)",
      },
      backdropBlur: {
        xs: "2px",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(24px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "200% 0" },
          "100%": { backgroundPosition: "-200% 0" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-12px)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.9s cubic-bezier(0.16, 1, 0.3, 1) both",
        shimmer: "shimmer 8s linear infinite",
        float: "float 7s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
