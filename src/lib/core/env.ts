/** Accès centralisé et typé aux variables d'environnement. */
export const env = {
  databaseUrl: process.env.DATABASE_URL ?? "file:./dev.db",
  appSecret: process.env.APP_SECRET ?? "dev-secret-change-me",
  appUrl: process.env.APP_URL ?? "http://localhost:3000",

  emailProvider: (process.env.EMAIL_PROVIDER ?? "demo") as "demo" | "resend" | "smtp",
  resendApiKey: process.env.RESEND_API_KEY ?? "",
  defaultFromEmail: process.env.DEFAULT_FROM_EMAIL ?? "no-reply@luunchmail.local",

  smtp: {
    host: process.env.SMTP_HOST ?? "",
    port: Number(process.env.SMTP_PORT ?? 587),
    user: process.env.SMTP_USER ?? "",
    password: process.env.SMTP_PASSWORD ?? "",
    secure: process.env.SMTP_SECURE === "true",
  },

  google: {
    clientId: process.env.GOOGLE_CLIENT_ID ?? "",
    clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    get redirectUri() {
      return `${process.env.APP_URL ?? "http://localhost:3000"}/api/oauth/google/callback`;
    },
  },
  microsoft: {
    clientId: process.env.MICROSOFT_CLIENT_ID ?? "",
    clientSecret: process.env.MICROSOFT_CLIENT_SECRET ?? "",
  },

  cloudflareToken: process.env.CLOUDFLARE_API_TOKEN ?? "",

  // Domaine dédié au tracking (CNAME vers l'app) — améliore la délivrabilité
  // en isolant les liens trackés du domaine applicatif. Ex. : track.mondomaine.com
  trackingDomain: process.env.TRACKING_DOMAIN ?? "",

  anthropicApiKey: process.env.ANTHROPIC_API_KEY ?? "",
  openaiApiKey: process.env.OPENAI_API_KEY ?? "",
  anthropicModel: process.env.ANTHROPIC_MODEL ?? "claude-opus-4-8",
};

/** Indique si l'app tourne en mode démo (aucune clé d'envoi réelle). */
export function isDemoMode() {
  if (env.emailProvider === "resend") return !env.resendApiKey;
  if (env.emailProvider === "smtp") return !env.smtp.host;
  return true;
}

export function hasAiKey() {
  return Boolean(env.anthropicApiKey || env.openaiApiKey);
}

/** Vrai si l'OAuth Google (Gmail) est configuré (client ID + secret présents). */
export function googleConfigured() {
  return Boolean(env.google.clientId && env.google.clientSecret);
}
