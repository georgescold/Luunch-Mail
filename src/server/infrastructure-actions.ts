"use server";

import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { createDomainWithDns, verifyDomainRecords } from "@/lib/dns";
import { serializeMailboxCreds, readMailboxCreds } from "@/lib/mailbox-creds";

const ROUTE = "/infrastructure";

/** Connecte un nouveau domaine d'envoi : génère SPF/DKIM/DMARC/MX/tracking automatiquement. */
export async function addDomainAction(formData: FormData) {
  const { workspace } = await requireAuth();
  const name = String(formData.get("name") ?? "")
    .toLowerCase()
    .trim()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "");
  if (!name || !name.includes(".")) return;

  const region = String(formData.get("region") ?? "eu");
  const provider = String(formData.get("provider") ?? "manual") === "cloudflare" ? "cloudflare" : "manual";

  // Évite les doublons dans le workspace.
  const existing = await db.domain.findFirst({ where: { workspaceId: workspace.id, name } });
  if (existing) return;

  await createDomainWithDns(workspace.id, name, { provider, region });
  revalidatePath(ROUTE);
}

/** Relance la vérification DNS d'un domaine (TXT/MX/CNAME). */
export async function verifyDomainAction(formData: FormData) {
  const { workspace } = await requireAuth();
  const domainId = String(formData.get("domainId") ?? "");
  if (!domainId) return;

  // Scope : le domaine doit appartenir au workspace courant.
  const domain = await db.domain.findFirst({ where: { id: domainId, workspaceId: workspace.id } });
  if (!domain) return;

  await verifyDomainRecords(domainId);
  revalidatePath(ROUTE);
}

/** Connecte une nouvelle boîte d'envoi (Google / Microsoft / SMTP). En démo : statut "warming". */
export async function addMailboxAction(formData: FormData) {
  const { workspace } = await requireAuth();
  const email = String(formData.get("email") ?? "").toLowerCase().trim();
  if (!email || !email.includes("@")) return;

  const rawProvider = String(formData.get("provider") ?? "gmail");
  const provider = ["gmail", "outlook", "smtp", "airmail"].includes(rawProvider) ? rawProvider : "gmail";
  const displayName = String(formData.get("displayName") ?? "").trim() || null;

  // Anti-doublon (contrainte @@unique([workspaceId, email])).
  const existing = await db.mailbox.findFirst({ where: { workspaceId: workspace.id, email } });
  if (existing) return;

  // Rattache la boîte au domaine du workspace si le domaine de l'e-mail correspond.
  const emailDomain = email.split("@")[1];
  const matchedDomain = emailDomain
    ? await db.domain.findFirst({ where: { workspaceId: workspace.id, name: emailDomain } })
    : null;

  // Identifiants SMTP + IMAP (provider smtp) — mot de passe chiffré au stockage.
  let smtpConfig: string | null = null;
  let connected = false;
  if (provider === "smtp") {
    const smtpHost = String(formData.get("smtpHost") ?? "").trim();
    const password = String(formData.get("password") ?? "");
    const user = String(formData.get("smtpUser") ?? "").trim() || email;
    if (smtpHost && password) {
      const imapHost = String(formData.get("imapHost") ?? "").trim() || smtpHost.replace(/^smtp\./, "imap.");
      smtpConfig = serializeMailboxCreds({
        user,
        password,
        smtpHost,
        smtpPort: Number(formData.get("smtpPort") ?? 587) || 587,
        smtpSecure: String(formData.get("smtpSecure") ?? "") === "on" || Number(formData.get("smtpPort")) === 465,
        imapHost,
        imapPort: Number(formData.get("imapPort") ?? 993) || 993,
        imapSecure: true,
      });
      connected = true;
    }
  }

  await db.mailbox.create({
    data: {
      workspaceId: workspace.id,
      domainId: matchedDomain?.id ?? null,
      email,
      displayName,
      provider,
      // Une boîte SMTP réelle connectée démarre en chauffe ; OAuth démo aussi.
      status: connected || provider !== "smtp" ? "warming" : "disconnected",
      warmupEnabled: true,
      warmupStage: 0,
      smtpConfig,
    },
  });
  revalidatePath(ROUTE);
}

/** Teste la connexion SMTP d'une boîte (vérifie host/port/identifiants). */
export async function testMailboxAction(
  _prev: { ok?: boolean; error?: string } | undefined,
  formData: FormData,
): Promise<{ ok?: boolean; error?: string }> {
  const { workspace } = await requireAuth();
  const mailboxId = String(formData.get("mailboxId") ?? "");
  const mb = await db.mailbox.findFirst({ where: { id: mailboxId, workspaceId: workspace.id } });
  if (!mb) return { error: "Boîte introuvable." };

  const creds = readMailboxCreds(mb.smtpConfig);
  if (!creds?.smtp.host) return { error: "Aucune configuration SMTP enregistrée." };

  try {
    const nodemailer = await import("nodemailer");
    const transport = nodemailer.createTransport({
      host: creds.smtp.host,
      port: creds.smtp.port,
      secure: creds.smtp.secure,
      auth: { user: creds.user, pass: creds.password },
      connectionTimeout: 10_000,
    });
    await transport.verify();
    return { ok: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Échec de connexion." };
  }
}

/** Envoie un e-mail de test réel depuis une boîte (vers une adresse de votre choix). */
export async function sendTestEmailAction(
  _prev: { ok?: boolean; error?: string } | undefined,
  formData: FormData,
): Promise<{ ok?: boolean; error?: string }> {
  const { workspace } = await requireAuth();
  const mailboxId = String(formData.get("mailboxId") ?? "");
  const to = String(formData.get("to") ?? "").toLowerCase().trim();
  if (!to.includes("@")) return { error: "Adresse de destination invalide." };

  const mb = await db.mailbox.findFirst({ where: { id: mailboxId, workspaceId: workspace.id } });
  if (!mb) return { error: "Boîte introuvable." };

  const { sendEmail } = await import("@/lib/messaging");
  try {
    await sendEmail({
      workspaceId: workspace.id,
      source: "outreach",
      from: mb.email,
      fromName: mb.displayName ?? undefined,
      to,
      subject: "Test Luunch Mail ✅ — votre boîte fonctionne",
      html: `<div style="font-family:sans-serif"><h2>C'est branché 🎉</h2><p>Cet e-mail a été envoyé depuis <strong>${mb.email}</strong> via Luunch Mail.</p><p>Votre boîte d'envoi est correctement configurée.</p></div>`,
      text: `C'est branché. E-mail envoyé depuis ${mb.email} via Luunch Mail.`,
      mailboxId: mb.id,
    });
    revalidatePath(ROUTE);
    return { ok: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Échec d'envoi." };
  }
}

/** Met une boîte en pause ou la réactive. */
export async function toggleMailboxAction(formData: FormData) {
  const { workspace } = await requireAuth();
  const mailboxId = String(formData.get("mailboxId") ?? "");
  if (!mailboxId) return;

  const mailbox = await db.mailbox.findFirst({ where: { id: mailboxId, workspaceId: workspace.id } });
  if (!mailbox) return;

  // En pause -> on réactive. Sinon (active/warming/disconnected) -> en pause.
  const nextStatus = mailbox.status === "paused" ? (mailbox.warmupEnabled ? "warming" : "active") : "paused";
  await db.mailbox.update({ where: { id: mailbox.id }, data: { status: nextStatus } });
  revalidatePath(ROUTE);
}

/** Active ou désactive la chauffe (warmup) d'une boîte. */
export async function toggleWarmupAction(formData: FormData) {
  const { workspace } = await requireAuth();
  const mailboxId = String(formData.get("mailboxId") ?? "");
  if (!mailboxId) return;

  const mailbox = await db.mailbox.findFirst({ where: { id: mailboxId, workspaceId: workspace.id } });
  if (!mailbox) return;

  const enable = !mailbox.warmupEnabled;
  // Si on coupe le warmup d'une boîte en chauffe, elle passe active. Si on l'active sur une boîte active, elle repasse en chauffe.
  let status = mailbox.status;
  if (enable && status === "active") status = "warming";
  if (!enable && status === "warming") status = "active";

  await db.mailbox.update({
    where: { id: mailbox.id },
    data: { warmupEnabled: enable, status },
  });
  revalidatePath(ROUTE);
}

/** Ajoute un pool d'IP (partagé ou dédié). */
export async function addIpPoolAction(formData: FormData) {
  const { workspace } = await requireAuth();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;

  const rawType = String(formData.get("type") ?? "shared");
  const type = rawType === "dedicated" ? "dedicated" : "shared";
  const region = String(formData.get("region") ?? "eu");
  const ipAddress = String(formData.get("ipAddress") ?? "").trim() || null;
  const autoWarmup = formData.get("autoWarmup") != null;

  await db.ipPool.create({
    data: {
      workspaceId: workspace.id,
      name,
      type,
      region,
      ipAddress,
      // Une IP dédiée neuve démarre en chauffe ; un pool partagé est actif immédiatement.
      status: type === "dedicated" ? "warming" : "active",
      autoWarmup,
    },
  });
  revalidatePath(ROUTE);
}

/** Importe les boîtes depuis Cheap Inboxes via leur clé API, et la mémorise (chiffrée). */
export async function importCheapInboxesAction(
  _prev: { ok?: boolean; imported?: number; skipped?: number; errors?: string[]; error?: string } | undefined,
  formData: FormData,
): Promise<{ ok?: boolean; imported?: number; skipped?: number; errors?: string[]; error?: string }> {
  const { workspace } = await requireAuth();
  let apiKey = String(formData.get("apiKey") ?? "").trim();

  const { validateKey, importMailboxes, storeKey, getStoredKey } = await import("@/lib/cheapinboxes");

  // Clé vide → réutilise la clé déjà mémorisée (re-synchronisation).
  if (!apiKey) {
    const ws = await db.workspace.findUnique({ where: { id: workspace.id } });
    apiKey = ws ? getStoredKey(ws.integrations) ?? "" : "";
    if (!apiKey) return { error: "Saisissez votre clé API Cheap Inboxes (ci_live_…)." };
  }

  try {
    await validateKey(apiKey); // lève une erreur si la clé est invalide
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Clé API invalide." };
  }

  try {
    const result = await importMailboxes(workspace.id, apiKey);
    await storeKey(workspace.id, apiKey);
    revalidatePath(ROUTE);
    revalidatePath("/start");
    return { ok: true, imported: result.imported, skipped: result.skipped, errors: result.errors };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Échec de l'import." };
  }
}

/** Active ou désactive l'auto-warmup d'un pool d'IP. */
export async function toggleIpAutoWarmupAction(formData: FormData) {
  const { workspace } = await requireAuth();
  const poolId = String(formData.get("poolId") ?? "");
  if (!poolId) return;

  const pool = await db.ipPool.findFirst({ where: { id: poolId, workspaceId: workspace.id } });
  if (!pool) return;

  await db.ipPool.update({ where: { id: pool.id }, data: { autoWarmup: !pool.autoWarmup } });
  revalidatePath(ROUTE);
}
