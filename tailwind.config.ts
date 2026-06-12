import type { Config } from "tailwindcss";

/**
 * Design system Luunch Mail — application stricte de ./docs/DESIGN.md.
 * Direction « courrier éditorial » : papier chaud, encre sapin, vert sève
 * pour l'action, accent lune doré. Tous les couples texte/fond passent AA.
 */
const config: Config = {
  content: ["./src/**/*.{ts,tsx,js,jsx,mdx}"],
  theme: {
    extend: {
      colors: {
        // Action — vert sève profond (blanc sur primary : 6,4:1)
        primary: {
          DEFAULT: "#1E6B4A",
          hover: "#185539",
          soft: "#E4EFE6", // fonds sélectionnés, hover — texte : primary ou primary-fg
          fg: "#1A5C40", // texte vert sur fond clair
        },
        // Informatif — bleu encre
        secondary: { DEFAULT: "#2E66D0", fg: "#2456AE", soft: "#E8EEFA" },
        // Violet réservé aux nœuds « condition/action » des automations
        violet: { DEFAULT: "#7C5CBF", fg: "#5B3FA3", soft: "#EFEAF9" },
        success: { DEFAULT: "#1E6B4A", fg: "#1A5C40", soft: "#E4EFE6" },
        warning: { DEFAULT: "#B07C1B", fg: "#7E5A10", soft: "#F7EDD8" },
        error: { DEFAULT: "#BF4040", hover: "#A33434", fg: "#A23636", soft: "#F9ECEA" },
        info: { DEFAULT: "#2E66D0", fg: "#2456AE", soft: "#E8EEFA" },
        // Accent de marque — or lunaire (Luunch). Avec parcimonie : logo,
        // panneau sombre, petites mises en valeur. Jamais en texte sur clair.
        moon: "#E8B64C",
        // Surfaces sombres (auth, blocs de code) — texte clair OBLIGATOIRE
        pine: { DEFAULT: "#142019", raised: "#1B2A21" },
        paper: "#F7F6F2", // fond d'application (blanc cassé chaud)
        surface: "#FFFFFF",
        ink: {
          DEFAULT: "#1C2722", // texte principal (encre sapin)
          muted: "#46524C",
          faint: "#6A7570",
          disabled: "#9CA59F",
          inverse: "#F4F2EA", // texte sur pine
        },
        line: {
          DEFAULT: "#E6E3DA", // bordure carte / divider (chaud)
          strong: "#D3CFC2", // bordure input
          hover: "#A39E8F",
        },
        fill: {
          subtle: "#FAF9F5", // hover de ligne, input disabled
          muted: "#F0EEE6", // chips neutres, fonds
        },
      },
      fontFamily: {
        // chargées via next/font dans le layout (variables CSS)
        headline: ["var(--font-headline)", "system-ui", "sans-serif"],
        body: ["var(--font-body)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
        sans: ["var(--font-body)", "system-ui", "sans-serif"],
      },
      fontSize: {
        h1: ["34px", { lineHeight: "1.15", fontWeight: "700", letterSpacing: "-0.02em" }],
        h2: ["27px", { lineHeight: "1.2", fontWeight: "700", letterSpacing: "-0.015em" }],
        h3: ["21px", { lineHeight: "1.3", fontWeight: "600", letterSpacing: "-0.01em" }],
        h4: ["17px", { lineHeight: "1.35", fontWeight: "600" }],
        body: ["15px", { lineHeight: "1.6" }],
        sm: ["13.5px", { lineHeight: "1.5" }],
        xs: ["12px", { lineHeight: "1.4", fontWeight: "500" }],
        mono: ["13px", { lineHeight: "1.6" }],
      },
      spacing: {
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
        sm: "6px",
        md: "10px",
        lg: "16px",
        pill: "9999px",
        circle: "50%",
      },
      boxShadow: {
        // Ombres discrètes teintées encre — les cartes tiennent par leur
        // bordure, pas par l'ombre (pas d'effet « cartes flottantes »).
        sm: "0 1px 2px 0 rgba(28,39,34,0.05)",
        md: "0 2px 8px -2px rgba(28,39,34,0.08)",
        lg: "0 12px 24px -8px rgba(28,39,34,0.14)",
        xl: "0 20px 32px -12px rgba(28,39,34,0.18)",
        focus: "0 0 0 3px rgba(30,107,74,0.22)",
        "focus-error": "0 0 0 3px rgba(191,64,64,0.20)",
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
      },
      animation: {
        "fade-in": "fade-in 0.2s ease both",
        "slide-in": "slide-in 0.2s ease both",
        "pop-in": "pop-in 0.25s cubic-bezier(0.16, 1, 0.3, 1) both",
        rise: "rise 0.5s cubic-bezier(0.16, 1, 0.3, 1) both",
        shimmer: "shimmer 1.6s linear infinite",
      },
    },
  },
  plugins: [],
};

export default config;
