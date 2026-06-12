import { generateKeyPairSync } from "node:crypto";
import { promises as dns } from "node:dns";
import { db } from "@/lib/core/db";
import { env, isDemoMode } from "@/lib/core/env";

/** Génère une vraie paire de clés RSA et l'enregistrement DKIM associé. */
function generateDkim(selector: string) {
  const { publicKey } = generateKeyPairSync("rsa", {
    modulusLength: 1024,
    publicKeyEncoding: { type: "spki", format: "der" },
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
  });
  const p = Buffer.from(publicKey).toString("base64");
  return { selector, value: `v=DKIM1; k=rsa; p=${p}` };
}

/** Crée un domaine + les enregistrements DNS à poser (SPF/DKIM/DMARC/MX/tracking). */
export async function createDomainWithDns(
  workspaceId: string,
  name: string,
  opts: { provider?: "manual" | "cloudflare"; region?: string } = {},
) {
  const selector = "gm1";
  const dkim = generateDkim(selector);
  const trackingCname = `track.${name}`;

  const domain = await db.domain.create({
    data: {
      workspaceId,
      name,
      provider: opts.provider ?? "manual",
      region: opts.region ?? "eu",
      dkimSelector: selector,
      dkimPublicKey: dkim.value,
      trackingCname,
      status: "pending",
    },
  });

  const records: {
    type: string; host: string; value: string; priority?: number; purpose: string;
  }[] = [
    { type: "MX", host: "@", value: "mx.luunchmail.io", priority: 10, purpose: "mx" },
    { type: "TXT", host: "@", value: "v=spf1 include:_spf.luunchmail.io ~all", purpose: "spf" },
    { type: "TXT", host: `${selector}._domainkey`, value: dkim.value, purpose: "dkim" },
    {
      type: "TXT",
      host: "_dmarc",
      value: "v=DMARC1; p=quarantine; rua=mailto:dmarc@luunchmail.io; pct=100; adkim=s; aspf=s",
      purpose: "dmarc",
    },
    { type: "CNAME", host: "track", value: "tracking.luunchmail.io", purpose: "tracking" },
    {
      type: "TXT",
      host: "default._bimi",
      value: "v=BIMI1; l=https://cdn.luunchmail.io/logo.svg;",
      purpose: "bimi",
    },
  ];

  await db.dnsRecord.createMany({
    data: records.map((r) => ({ ...r, domainId: domain.id })),
  });

  // Avec un token Cloudflare réel, on poserait les records via l'API ici.
  // (cf. README) — en l'absence, l'utilisateur copie les enregistrements.

  // Lance une vérification asynchrone.
  const { enqueue } = await import("@/lib/email/queue");
  await enqueue("verify_dns", { domainId: domain.id }, { runAt: new Date(Date.now() + 1500) });

  return domain;
}

/** Vérifie l'état réel des enregistrements DNS (TXT/MX/CNAME). */
export async function verifyDomainRecords(domainId: string) {
  const domain = await db.domain.findUnique({ where: { id: domainId }, include: { dnsRecords: true } });
  if (!domain) return;

  await db.domain.update({ where: { id: domainId }, data: { status: "verifying" } });

  let allVerified = true;
  for (const rec of domain.dnsRecords) {
    let ok = false;
    const fqdn = rec.host === "@" ? domain.name : `${rec.host}.${domain.name}`;
    try {
      if (rec.type === "TXT") {
        const txt = await dns.resolveTxt(fqdn);
        const flat = txt.map((t) => t.join(""));
        ok = flat.some((v) => v.includes(rec.value.split(";")[0]));
      } else if (rec.type === "MX") {
        const mx = await dns.resolveMx(domain.name);
        ok = mx.some((m) => m.exchange.includes(rec.value));
      } else if (rec.type === "CNAME") {
        const cname = await dns.resolveCname(fqdn);
        ok = cname.some((c) => c.includes(rec.value));
      }
    } catch {
      ok = false;
    }
    // Mode démo : domaines fictifs → on simule la propagation réussie
    // (sauf BIMI, optionnel, laissé en attente pour l'illustration).
    if (!ok && isDemoMode() && rec.purpose !== "bimi") ok = true;

    if (!ok && rec.purpose !== "bimi") allVerified = false;
    await db.dnsRecord.update({
      where: { id: rec.id },
      data: { status: ok ? "verified" : "pending", lastCheckedAt: new Date() },
    });
  }

  await db.domain.update({
    where: { id: domainId },
    data: { status: allVerified ? "verified" : "error", verifiedAt: allVerified ? new Date() : null },
  });
  return { verified: allVerified };
}
