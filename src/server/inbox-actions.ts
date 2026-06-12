"use server";

import { requireAuth } from "@/lib/core/auth";
import { db } from "@/lib/core/db";
import { revalidatePath } from "next/cache";
import { aiReplyDraft } from "@/lib/integrations/ai";

/** Catégories métier reconnues pour le tri de l'inbox (Unibox). */
const CATEGORIES = new Set([
  "interested",
  "not_interested",
  "ooo",
  "unsubscribe",
  "bounce",
  "neutral",
]);

/**
 * Génère un brouillon de réponse IA pour un thread (AI Reply Agent).
 * S'appuie sur le dernier message entrant (inbound) du prospect.
 * Renvoie le texte du brouillon — il est ensuite affiché dans le reply-panel,
 * éditable par l'humain (mode Human-in-the-loop).
 */
export async function generateReplyAction(threadId: string): Promise<string> {
  const { workspace } = await requireAuth();

  const thread = await db.inboxThread.findFirst({
    where: { id: threadId, workspaceId: workspace.id },
    include: {
      messages: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!thread) {
    return "Conversation introuvable.";
  }

  const lastInbound = thread.messages.find((m) => m.direction === "inbound");
  if (!lastInbound) {
    return "Aucun message du prospect à traiter pour l'instant.";
  }

  // Consigne adaptée à la catégorie détectée (ton de l'agent).
  let guidance: string | undefined;
  if (thread.category === "interested") {
    guidance = "Le prospect est intéressé : remercie, propose un créneau d'appel de 15 minutes.";
  } else if (thread.category === "ooo") {
    guidance = "Le prospect est absent (réponse automatique) : message court, propose de recontacter à son retour.";
  } else if (thread.category === "not_interested") {
    guidance = "Le prospect n'est pas intéressé : reste courtois, laisse une porte ouverte sans insister.";
  }

  const draft = await aiReplyDraft(thread.subject, lastInbound.body, guidance);

  // Trace du brouillon généré (sans l'envoyer) pour l'historique de l'agent.
  await db.inboxMessage.create({
    data: {
      threadId: thread.id,
      direction: "outbound",
      fromEmail: lastInbound.toEmail,
      toEmail: lastInbound.fromEmail,
      body: draft,
      aiDraft: true,
      sentByAgent: false,
    },
  });

  revalidatePath("/inbox");
  return draft;
}

/**
 * Envoie une réponse dans le thread : crée un InboxMessage outbound (sentByAgent),
 * marque les brouillons IA comme traités et met à jour lastMessageAt.
 */
export async function sendReplyAction(threadId: string, body: string) {
  const { workspace } = await requireAuth();

  const text = String(body ?? "").trim();
  if (!text) return;

  const thread = await db.inboxThread.findFirst({
    where: { id: threadId, workspaceId: workspace.id },
    include: { messages: { orderBy: { createdAt: "desc" } } },
  });
  if (!thread) return;

  const lastInbound = thread.messages.find((m) => m.direction === "inbound");
  const lastAny = thread.messages[0];

  // Détermine l'expéditeur/destinataire : on répond depuis notre côté vers le prospect.
  const fromEmail = lastInbound?.toEmail ?? lastAny?.fromEmail ?? workspace.slug;
  const toEmail = lastInbound?.fromEmail ?? lastAny?.toEmail ?? "";

  // On retire les brouillons IA non envoyés (ils sont remplacés par la réponse finale).
  await db.inboxMessage.deleteMany({
    where: { threadId: thread.id, aiDraft: true, sentByAgent: false },
  });

  await db.inboxMessage.create({
    data: {
      threadId: thread.id,
      direction: "outbound",
      fromEmail,
      toEmail,
      body: text,
      aiDraft: false,
      sentByAgent: true,
    },
  });

  await db.inboxThread.update({
    where: { id: thread.id },
    data: { lastMessageAt: new Date() },
  });

  revalidatePath("/inbox");
}

/** Change la catégorie d'un thread (étiquetage IA / manuel). */
export async function setCategoryAction(threadId: string, category: string) {
  const { workspace } = await requireAuth();

  const value = CATEGORIES.has(category) ? category : "neutral";

  const updated = await db.inboxThread.updateMany({
    where: { id: threadId, workspaceId: workspace.id },
    data: { category: value },
  });
  if (!updated.count) return;

  // Si désinscription, on synchronise le statut du contact (conformité).
  if (value === "unsubscribe") {
    const thread = await db.inboxThread.findUnique({ where: { id: threadId } });
    if (thread?.contactId) {
      await db.contact.update({
        where: { id: thread.contactId },
        data: { status: "unsubscribed" },
      });
    }
  }

  revalidatePath("/inbox");
}

/** Archive un thread (le retire de la file « à traiter »). */
export async function archiveThreadAction(threadId: string) {
  const { workspace } = await requireAuth();

  await db.inboxThread.updateMany({
    where: { id: threadId, workspaceId: workspace.id },
    data: { status: "archived" },
  });

  revalidatePath("/inbox");
}
