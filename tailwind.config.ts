import type { Config } from "tailwindcss";

/**
 * Design system Gigamail — application stricte de ./DESIGN.md
 * (couleurs, typo Fredoka/Poppins/Roboto Mono, base 8px, radius, ombres).
 */
const config: Config = {
  content: ["./src/**/*.{ts,tsx,js,jsx,mdx}"],
  theme: {
    extend: {
      colors: {
        // Couleurs de marque (DESIGN.md « ChatBubble » §Colors)
        primary: {
          DEFAULT: "#22C55E", // vert — actions, accents
          hover: "#16A34A",
          soft: "#DCFCE7", // surface verte claire (hover, chips sélectionnés)
          fg: "#15803D", // vert foncé pour texte sur fond clair
        },
        secondary: { DEFAULT: "#3B82F6" }, // bleu — liens, infos
        tertiary: { DEFAULT: "#A855F7", soft: "#F3E8FF", fg: "#7E22CE" }, // violet — réactions, premium
        success: { DEFAULT: "#22C55E", fg: "#15803D", soft: "#BBF7D0" },
        warning: { DEFAULT: "#F59E0B", fg: "#B45309", soft: "#FEF3C7" },
        error: { DEFAULT: "#EF4444", hover: "#DC2626", soft: "#FEF2F2" },
        info: { DEFAULT: "#3B82F6" },
        // Échelle neutre utilisée par les composants normés
        surface: "#FFFFFF",
        ink: {
          DEFAULT: "#111827", // texte principal / tooltips
          muted: "#4B5563",
          faint: "#6B7280",
          disabled: "#9CA3AF",
        },
        line: {
          DEFAULT: "#E5E7EB", // bordure carte / divider
          strong: "#D1D5DB", // bordure input
          hover: "#9CA3AF",
        },
        fill: {
          subtle: "#F9FAFB", // hover de ligne, input disabled
          muted: "#F3F4F6", // chips neutres, fonds
        },
      },
      fontFamily: {
        // chargées via next/font dans le layout (variables CSS)
        headline: ["var(--font-fredoka)", "system-ui", "sans-serif"],
        body: ["var(--font-poppins)", "system-ui", "sans-serif"],
        mono: ["var(--font-roboto-mono)", "ui-monospace", "monospace"],
        sans: ["var(--font-poppins)", "system-ui", "sans-serif"],
      },
      fontSize: {
        // Échelle typographique DESIGN.md
        h1: ["36px", { lineHeight: "1.2", fontWeight: "700" }],
        h2: ["28px", { lineHeight: "1.25", fontWeight: "700" }],
        h3: ["22px", { lineHeight: "1.3", fontWeight: "600" }],
        h4: ["18px", { lineHeight: "1.35", fontWeight: "600" }],
        body: ["16px", { lineHeight: "1.6" }],
        sm: ["14px", { lineHeight: "1.5" }],
        xs: ["12px", { lineHeight: "1.4", fontWeight: "500" }],
        mono: ["14px", { lineHeight: "1.6" }],
      },
      spacing: {
        // Base 8px (DESIGN.md §Spacing) — tokens nommés
        "sp-1": "4px",
        "sp-2": "8px",
        "sp-3": "12px",
        "sp-4": "16px",
        "sp-5": "24px",
        "sp-6": "32px",
        "sp-7": "48px",
        "sp-8": "64px",
      },
      borderRadius: {
        sm: "8px",
        md: "14px",
        lg: "20px", // ChatBubble : grand radius friendly (20px)
        pill: "9999px",
        circle: "50%",
      },
      boxShadow: {
        sm: "0 1px 2px 0 rgba(0,0,0,0.06)",
        md: "0 4px 6px -1px rgba(0,0,0,0.10)",
        lg: "0 10px 15px -3px rgba(0,0,0,0.10)",
        xl: "0 20px 25px -5px rgba(0,0,0,0.10)",
        focus: "0 0 0 3px rgba(34,197,94,0.30)",
        "focus-error": "0 0 0 3px rgba(239,68,68,0.20)",
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(4px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "slide-in": {
          "0%": { opacity: "0", transform: "translateX(8px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        "pop-in": {
          "0%": { opacity: "0", transform: "translateY(12px) scale(0.97)" },
          "100%": { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        rise: {
          "0%": { transform: "scaleY(0)" },
          "100%": { transform: "scaleY(1)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-400px 0" },
          "100%": { backgroundPosition: "400px 0" },
        },
        "float-soft": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-6px)" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.2s ease both",
        "slide-in": "slide-in 0.2s ease both",
        "pop-in": "pop-in 0.25s cubic-bezier(0.16, 1, 0.3, 1) both",
        rise: "rise 0.5s cubic-bezier(0.16, 1, 0.3, 1) both",
        shimmer: "shimmer 1.6s linear infinite",
        "float-soft": "float-soft 5s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
