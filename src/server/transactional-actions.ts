"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/core/auth";
import { db } from "@/lib/core/db";
import { generateApiKey, randomToken } from "@/lib/core/crypto";
import { sendEmail } from "@/lib/email/messaging";

/** Scopes disponibles pour une clé API. */
const VALID_SCOPES = ["emails:send", "contacts:write", "webhooks:read", "monitor:read"];

/** Événements webhook abonnables. */
const VALID_EVENTS = ["delivered", "opened", "clicked", "bounced", "complained"];

export type CreateKeyState = { ok?: boolean; error?: string; secret?: string; prefix?: string };

/**
 * Crée une clé API. Le secret complet n'est RÉVÉLÉ QU'UNE FOIS (retourné dans
 * l'état) — seul le hash est persisté. On stocke prefix + hash + scopes (JSON).
 */
export async function createApiKeyAction(_prev: CreateKeyState, formData: FormData): Promise<CreateKeyState> {
  const { workspace } = await requireAuth();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Donnez un nom à la clé (ex. « Production », « Zapier »)." };

  const scopes = VALID_SCOPES.filter((s) => formData.get(`scope:${s}`) === "on");
  if (scopes.length === 0) return { error: "Sélectionnez au moins une permission." };

  const { full, prefix, hash } = generateApiKey();
  await db.apiKey.create({
    data: { workspaceId: workspace.id, name, prefix, hash, scopes: JSON.stringify(scopes) },
  });

  revalidatePath("/transactional");
  // Le secret complet repart vers le client pour affichage unique.
  return { ok: true, secret: full, prefix };
}

/** Révoque une clé (soft : revokedAt) — elle reste visible dans l'historique. */
export async function revokeApiKeyAction(formData: FormData) {
  const { workspace } = await requireAuth();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  // Scopé au workspace : on ne révoque que ses propres clés.
  await db.apiKey.updateMany({
    where: { id, workspaceId: workspace.id, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  revalidatePath("/transactional");
}

/** Crée un endpoint webhook signé (secret whsec_…). */
export async function createWebhookAction(formData: FormData) {
  const { workspace } = await requireAuth();
  const url = String(formData.get("url") ?? "").trim();
  if (!url || !/^https?:\/\//i.test(url)) return;

  const events = VALID_EVENTS.filter((e) => formData.get(`event:${e}`) === "on");
  const secret = `whsec_${randomToken(24)}`;

  await db.webhookEndpoint.create({
    data: {
      workspaceId: workspace.id,
      url,
      events: JSON.stringify(events.length ? events : VALID_EVENTS),
      secret,
      status: "active",
    },
  });
  revalidatePath("/transactional");
}

/** Active/désactive un endpoint webhook. */
export async function toggleWebhookAction(formData: FormData) {
  const { workspace } = await requireAuth();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const ep = await db.webhookEndpoint.findFirst({ where: { id, workspaceId: workspace.id } });
  if (!ep) return;
  await db.webhookEndpoint.update({
    where: { id: ep.id },
    data: { status: ep.status === "active" ? "disabled" : "active" },
  });
  revalidatePath("/transactional");
}

/** Supprime un endpoint webhook. */
export async function deleteWebhookAction(formData: FormData) {
  const { workspace } = await requireAuth();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await db.webhookEndpoint.deleteMany({ where: { id, workspaceId: workspace.id } });
  revalidatePath("/transactional");
}

export type TestSendState = { ok?: boolean; error?: string; messageId?: string };

/**
 * Envoie un e-mail de test via le point d'entrée unifié `sendEmail` en MODE TEST
 * (test:true) → aucun vrai e-mail, mais events simulés (delivered/opened/…).
 */
export async function sendTestEmailAction(_prev: TestSendState, formData: FormData): Promise<TestSendState> {
  const { workspace } = await requireAuth();
  const to = String(formData.get("to") ?? "").trim().toLowerCase();
  const subject = String(formData.get("subject") ?? "").trim() || "E-mail de test Luunch Mail";
  if (!to || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to)) {
    return { error: "Entrez une adresse e-mail destinataire valide." };
  }

  const html = `<!doctype html><html><body style="font-family:system-ui,sans-serif;color:#111827">
    <h1>Bonjour 👋</h1>
    <p>Ceci est un e-mail de <strong>test</strong> envoyé depuis l'API transactionnelle Luunch Mail.</p>
    <p>Sujet : ${subject}</p>
    <p style="color:#6B7280;font-size:13px">Mode test — aucun e-mail réel n'a été délivré ; les événements sont simulés.</p>
  </body></html>`;

  const message = await sendEmail({
    workspaceId: workspace.id,
    source: "transactional",
    to,
    subject,
    html,
    text: "Ceci est un e-mail de test envoyé depuis l'API transactionnelle Luunch Mail.",
    test: true,
  });

  revalidatePath("/transactional");
  return { ok: true, messageId: message?.id };
}
