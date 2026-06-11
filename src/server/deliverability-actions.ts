"use server";

import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import {
  checkBlacklists,
  analyzeSpamContent,
  startPlacementTest,
  verifyEmail,
} from "@/lib/deliverability";
import { addSuppression } from "@/lib/messaging";

const ROUTE = "/deliverability";

/** Lance un test de placement (seed lists Gmail/Outlook/Yahoo). */
export async function runPlacementAction(formData: FormData) {
  const { workspace } = await requireAuth();
  const name =
    String(formData.get("name") ?? "").trim() ||
    `Test du ${new Date().toLocaleDateString("fr-FR")}`;
  await startPlacementTest(workspace.id, name);
  revalidatePath(ROUTE);
}

/**
 * Analyse de contenu (heuristique type SpamAssassin).
 * Renvoie directement le résultat au composant client appelant.
 */
export async function analyzeContentAction(subject: string, body: string) {
  await requireAuth();
  return analyzeSpamContent(subject ?? "", body ?? "");
}

/** Vérifie un domaine / une IP sur 400+ DNSBL (Spamhaus & co.). */
export async function checkBlacklistAction(formData: FormData) {
  const { workspace } = await requireAuth();
  const target = String(formData.get("target") ?? "").trim();
  if (!target) return;
  await checkBlacklists(workspace.id, target);
  revalidatePath(ROUTE);
}

/** Vérifie une adresse e-mail (syntaxe + MX, détection catch-all). */
export async function verifyEmailAction(formData: FormData) {
  const { workspace } = await requireAuth();
  const email = String(formData.get("email") ?? "").trim();
  if (!email) return;
  await verifyEmail(workspace.id, email);
  revalidatePath(ROUTE);
}

/** Ajoute manuellement une adresse à la liste de suppression. */
export async function addSuppressionEntryAction(formData: FormData) {
  const { workspace } = await requireAuth();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email) return;
  await addSuppression(workspace.id, email, "manual", "manuel");
  revalidatePath(ROUTE);
}

/** Retire une adresse de la liste de suppression (scopé workspace). */
export async function removeSuppressionEntryAction(formData: FormData) {
  const { workspace } = await requireAuth();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await db.suppressionEntry.deleteMany({ where: { id, workspaceId: workspace.id } });
  revalidatePath(ROUTE);
}
