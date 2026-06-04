import type { Config } from "tailwindcss";

// Brand tokens: white-dominant + blue, withwhite.id-inspired minimalism.
// Sharp corners (4-6px max), 1px hairlines, no shadows in core UI.
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#FFFFFF",
        surface: "#FAFAFA",
        border: {
          DEFAULT: "#E5E7EB",
          emphasis: "#CBD5E1",
          strong: "#94A3B8"
        },
        text: {
          DEFAULT: "#0A0A0A",
          body: "#1F2937",
          muted: "#6B7280"
        },
        brand: {
          DEFAULT: "#1D4ED8",
          hover: "#1E40AF",
          subtle: "#EFF6FF"
        },
        success: "#16A34A",
        warning: "#D97706",
        danger: "#DC2626"
      },
      borderRadius: {
        none: "0",
        sm: "2px",
        DEFAULT: "4px",
        md: "6px",
        lg: "8px"
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"]
      },
      fontSize: {
        display: ["clamp(2.5rem, 5vw, 4.5rem)", { lineHeight: "1.05", letterSpacing: "-0.02em", fontWeight: "700" }],
        h1: ["2.5rem", { lineHeight: "1.1", letterSpacing: "-0.02em", fontWeight: "700" }],
        h2: ["1.875rem", { lineHeight: "1.2", letterSpacing: "-0.015em", fontWeight: "600" }],
        h3: ["1.5rem", { lineHeight: "1.3", letterSpacing: "-0.01em", fontWeight: "600" }]
      },
      boxShadow: {
        // Reserved for overlays only — core UI uses borders, not shadows.
        overlay: "0 8px 24px rgba(15, 23, 42, 0.08)"
      },
      ringColor: {
        DEFAULT: "rgba(29, 78, 216, 0.35)"
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" }
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" }
        },
        "scale-in": {
          "0%": { opacity: "0", transform: "scale(0.97)" },
          "100%": { opacity: "1", transform: "scale(1)" }
        }
      },
      animation: {
        "fade-up": "fade-up 0.45s cubic-bezier(0.22, 1, 0.36, 1) both",
        "fade-in": "fade-in 0.4s ease-out both",
        "scale-in": "scale-in 0.2s cubic-bezier(0.22, 1, 0.36, 1) both"
      }
    }
  },
  plugins: []
};

export default config;
