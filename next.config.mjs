/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Évite que Next infère un mauvais "workspace root" (lockfile parent parasite).
  outputFileTracingRoot: import.meta.dirname,
  // Le worker de jobs (warmup, envois, webhooks) est démarré dans src/instrumentation.ts
  // au lancement du serveur. En prod, on remplace par BullMQ/Redis (cf. README).
  serverExternalPackages: ["@prisma/client", "nodemailer", "resend", "imapflow", "mailparser"],
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
