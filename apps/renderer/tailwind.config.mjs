/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/**/*.{astro,html,ts,tsx}",
    "../../packages/templates/**/*.{astro,ts,tsx}"
  ],
  theme: {
    extend: {
      // Per-tenant design tokens are injected via CSS variables on <html>.
      // Templates reference var(--brand) etc. so they restyle when tokens change.
      colors: {
        brand: "var(--brand, #1D4ED8)",
        "brand-hover": "var(--brand-hover, #1E40AF)",
        "brand-fg": "var(--brand-fg, #FFFFFF)",
        ink: "var(--ink, #0A0A0A)",
        muted: "var(--muted, #6B7280)",
        surface: "var(--surface, #FAFAFA)",
        line: "var(--line, #E5E7EB)"
      },
      fontFamily: {
        sans: ["var(--font-sans, Inter)", "ui-sans-serif", "system-ui", "sans-serif"]
      }
    }
  }
};
