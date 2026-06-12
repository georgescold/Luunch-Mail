import { db } from "@/lib/core/db";
import { env } from "@/lib/core/env";
import { enqueue } from "@/lib/email/queue";
import { getEmailProvider } from "@/lib/email/providers";
import { signPayload } from "@/lib/core/crypto";

export type SendEmailParams = {
  workspaceId: string;
  source?: "transactional" | "broadcast" | "outreach" | "warmup";
  from?: string;
  fromName?: string;
  to: string;
  subject: string;
  html?: string;
  text?: string;
  replyTo?: string;
  campaignId?: string;
  contactId?: string;
  mailboxId?: string;
  scheduledAt?: Date | null;
  idempotencyKey?: string;
  test?: boolean;
};

/** Jeton de désinscription signé (1-clic, conformité §6). */
export function unsubscribeUrl(workspaceId: string, email: string) {
  const sig = signPayload(`${workspaceId}:${email}`, env.appSecret).slice(0, 32);
  const token = Buffer.from(`${workspaceId}:${email}:${sig}`).toString("base64url");
  return `${env.appUrl}/u/${token}`;
}

/** Vrai si l'adresse est dans la liste de suppression du workspace. */
export async function isSuppressed(workspaceId: string, email: string) {
  const hit = await db.suppressionEntry.findUnique({
    where: { workspaceId_email: { workspaceId, email: email.toLowerCase() } },
  });
  return Boolean(hit);
}

/** Point d'entrée unique d'envoi (transactionnel, broadcast, outreach, warmup).
 *  Applique : suppression, idempotence, planification, file d'attente, events. */
export async function sendEmail(params: SendEmailParams) {
  const {
    workspaceId,
    source = "transactional",
    to,
    subject,
    html,
    text,
    replyTo,
    campaignId,
    contactId,
    mailboxId,
    scheduledAt,
    idempotencyKey,
    test = false,
  } = params;

  const from = params.from || env.defaultFromEmail;

  // Idempotence : même clé → on renvoie le message existant.
  if (idempotencyKey) {
    const existing = await db.emailMessage.findFirst({ where: { workspaceId, idempotencyKey } });
    if (existing) return existing;
  }

  // Liste de suppression appliquée à CHAQUE envoi (sauf warmup/transactionnel critique).
  if (source !== "warmup" && (await isSuppressed(workspaceId, to))) {
    return db.emailMessage.create({
      data: {
        workspaceId, source, fromEmail: from, toEmail: to, subject,
        html, text, status: "failed", test,
        meta: JSON.stringify({ reason: "suppressed" }),
      },
    });
  }

  const message = await db.emailMessage.create({
    data: {
      workspaceId, source, fromEmail: from, toEmail: to, subject,
      html, text, mailboxId, campaignId, contactId,
      idempotencyKey, test, scheduledAt: scheduledAt ?? null,
      status: scheduledAt && scheduledAt > new Date() ? "queued" : "queued",
    },
  });
  await recordEvent(message.id, "queued");

  if (scheduledAt && scheduledAt > new Date()) {
    await enqueue("send_email", { messageId: message.id }, { runAt: scheduledAt });
    return message;
  }

  return performSend(message.id, { replyTo });
}

/** Effectue l'envoi réel d'un message déjà créé. */
export async function performSend(messageId: string, opts: { replyTo?: string } = {}) {
  const message = await db.emailMessage.findUnique({ where: { id: messageId } });
  if (!message || message.status === "sent" || message.status === "delivered") return message;

  // Détermine le canal d'envoi RÉEL de la boîte (même si le provider global est en démo) :
  //   1. Gmail connecté en OAuth → API Gmail
  //   2. Identifiants SMTP réels  → SMTP de la boîte
  //   3. sinon                    → provider global (Resend / SMTP global / démo)
  let smtpOverride:
    | { host: string; port: number; secure: boolean; user: string; password: string }
    | undefined = undefined;
  let gmailMailboxId: string | null = null;
  let fromName: string | undefined = undefined;

  if (message.mailboxId && !message.test) {
    const mb = await db.mailbox.findUnique({ where: { id: message.mailboxId } });
    fromName = mb?.displayName ?? undefined;
    const { isGmailConnected } = await import("@/lib/integrations/google");
    if (mb && isGmailConnected(mb.provider, mb.oauthData)) {
      gmailMailboxId = mb.id;
    } else {
      const { readMailboxCreds } = await import("./mailbox-creds");
      const creds = readMailboxCreds(mb?.smtpConfig);
      if (creds?.smtp.host && creds.user && creds.password) {
        smtpOverride = { ...creds.smtp, user: creds.user, password: creds.password };
      }
    }
  }

  const realSend = Boolean(gmailMailboxId || smtpOverride);

  // Entêtes de conformité (désinscription 1-clic).
  const headers: Record<string, string> = {};
  if (message.source !== "transactional" && message.contactId) {
    const url = unsubscribeUrl(message.workspaceId, message.toEmail);
    headers["List-Unsubscribe"] = `<${url}>`;
    headers["List-Unsubscribe-Post"] = "List-Unsubscribe=One-Click";
  }

  try {
    let result: { providerId: string; status: "sent" | "queued"; simulate?: boolean };
    if (message.test) {
      result = { providerId: `test_${message.id}`, status: "sent", simulate: true };
    } else if (gmailMailboxId) {
      const { sendViaGmail } = await import("@/lib/integrations/google");
      const id = await sendViaGmail(gmailMailboxId, {
        from: message.fromEmail, fromName, to: message.toEmail, subject: message.subject,
        html: message.html ?? undefined, text: message.text ?? undefined, headers,
      });
      result = { providerId: id, status: "sent" };
    } else {
      const provider = smtpOverride
        ? new (await import("./providers/smtp-provider")).SmtpProvider()
        : getEmailProvider();
      result = await provider.send({
        from: message.fromEmail, fromName, to: message.toEmail, subject: message.subject,
        html: message.html ?? undefined, text: message.text ?? undefined,
        replyTo: opts.replyTo, headers, mailboxId: message.mailboxId ?? undefined, smtpOverride,
      });
    }

    await db.emailMessage.update({
      where: { id: message.id },
      data: { status: "sent", sentAt: new Date(), providerId: result.providerId },
    });
    await recordEvent(message.id, "sent");
    await incrementUsage(message.workspaceId, "emails_sent");

    if (result.simulate) {
      // Mode démo / test : on simule les events après un court délai.
      await enqueue("simulate_events", { messageId: message.id }, { runAt: new Date(Date.now() + 1500) });
    } else if (realSend) {
      // Envoi réel accepté par Google/SMTP → considéré délivré (handoff).
      // Les ouvertures/clics réels nécessitent un pixel de tracking (à venir).
      await recordEvent(message.id, "delivered");
    }
    return await db.emailMessage.findUnique({ where: { id: message.id } });
  } catch (err) {
    await db.emailMessage.update({
      where: { id: message.id },
      data: { status: "failed", meta: JSON.stringify({ error: String(err) }) },
    });
    await recordEvent(message.id, "bounced", { reason: "send_failed", error: String(err) });
    throw err;
  }
}

export async function performScheduledSend(messageId: string) {
  return performSend(messageId);
}

/** Enregistre un event, met à jour le statut, les stats de campagne et déclenche les webhooks. */
export async function recordEvent(
  messageId: string,
  type: string,
  data?: Record<string, unknown>,
) {
  await db.emailEvent.create({
    data: { messageId, type, data: data ? JSON.stringify(data) : null },
  });

  // Statut courant = dernier event significatif.
  const statusable = ["sent", "delivered", "opened", "clicked", "bounced", "complained", "failed"];
  if (statusable.includes(type)) {
    await db.emailMessage.update({ where: { id: messageId }, data: { status: type } });
  }

  const message = await db.emailMessage.findUnique({ where: { id: messageId } });
  if (!message) return;

  // Mise à jour des stats de campagne (open/click/reply/bounce...).
  if (message.campaignId) await bumpCampaignStat(message.campaignId, type);

  // Plainte / bounce dur → suppression automatique (conformité §6).
  if (type === "complained" || (type === "bounced" && data?.reason !== "send_failed")) {
    await addSuppression(message.workspaceId, message.toEmail, type === "complained" ? "complaint" : "bounce");
  }

  // Déclenchement des webhooks abonnés.
  await fireWebhooks(message.workspaceId, type, {
    type: `email.${type}`,
    created_at: new Date().toISOString(),
    data: {
      email_id: message.id,
      provider_id: message.providerId,
      to: message.toEmail,
      from: message.fromEmail,
      subject: message.subject,
      ...(data ?? {}),
    },
  });
}

/** Simulation d'events réaliste en mode démo. */
export async function simulateEvents(messageId: string) {
  const message = await db.emailMessage.findUnique({ where: { id: messageId } });
  if (!message || message.status === "bounced" || message.status === "failed") return;

  const r = Math.random();
  if (r < 0.02) {
    await recordEvent(messageId, "bounced", { reason: "mailbox_not_found" });
    return;
  }
  await recordEvent(messageId, "delivered");

  // ~45% d'ouverture, dont ~25% de clic, ~0.2% de plainte.
  if (Math.random() < 0.45) {
    await recordEvent(messageId, "opened", { user_agent: "Gmail" });
    if (Math.random() < 0.25) {
      await recordEvent(messageId, "clicked", { url: `${env.appUrl}/demo-link` });
    }
  }
  if (Math.random() < 0.002) await recordEvent(messageId, "complained");
}

async function bumpCampaignStat(campaignId: string, type: string) {
  const map: Record<string, string> = {
    sent: "sent", delivered: "delivered", opened: "opened",
    clicked: "clicked", bounced: "bounced", complained: "complained",
  };
  const key = map[type];
  if (!key) return;
  const campaign = await db.campaign.findUnique({ where: { id: campaignId } });
  if (!campaign) return;
  const stats = JSON.parse(campaign.stats || "{}");
  stats[key] = (stats[key] ?? 0) + 1;
  await db.campaign.update({ where: { id: campaignId }, data: { stats: JSON.stringify(stats) } });
}

export async function addSuppression(
  workspaceId: string,
  email: string,
  reason: "unsubscribe" | "bounce" | "complaint" | "manual",
  source?: string,
) {
  await db.suppressionEntry.upsert({
    where: { workspaceId_email: { workspaceId, email: email.toLowerCase() } },
    create: { workspaceId, email: email.toLowerCase(), reason, source },
    update: { reason },
  });
  // Le contact passe en désinscrit/bounced.
  await db.contact.updateMany({
    where: { workspaceId, email: email.toLowerCase() },
    data: { status: reason === "bounce" ? "bounced" : "unsubscribed" },
  });
}

async function fireWebhooks(workspaceId: string, eventType: string, payload: unknown) {
  const endpoints = await db.webhookEndpoint.findMany({
    where: { workspaceId, status: "active" },
  });
  for (const ep of endpoints) {
    const events: string[] = JSON.parse(ep.events || "[]");
    if (!events.includes(eventType)) continue;
    const delivery = await db.webhookDelivery.create({
      data: { endpointId: ep.id, eventType, payload: JSON.stringify(payload) },
    });
    await enqueue("deliver_webhook", { deliveryId: delivery.id });
  }
}

export async function incrementUsage(workspaceId: string, metric: string, by = 1) {
  const period = new Date().toISOString().slice(0, 7); // YYYY-MM
  await db.usageCounter.upsert({
    where: { workspaceId_period_metric: { workspaceId, period, metric } },
    create: { workspaceId, period, metric, used: by, quota: defaultQuota(metric) },
    update: { used: { increment: by } },
  });
}

function defaultQuota(metric: string) {
  switch (metric) {
    case "emails_sent": return 150_000;
    case "contacts": return 100_000;
    case "ai_credits": return 500;
    case "verifications": return 10_000;
    default: return 0;
  }
}
