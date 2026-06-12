import { db } from "@/lib/core/db";
import { sendEmail, unsubscribeUrl } from "@/lib/email/messaging";
import { renderTemplate, contactContext } from "@/lib/email/spintax";
import { parseJson } from "@/lib/core/fmt";

/** Inscrit des contacts dans une campagne (séquence). */
export async function enrollContacts(campaignId: string, contactIds: string[]) {
  const now = new Date();
  for (const contactId of contactIds) {
    await db.enrollment.upsert({
      where: { campaignId_contactId: { campaignId, contactId } },
      create: { campaignId, contactId, status: "active", currentStep: 0, nextActionAt: now },
      update: {},
    });
  }
}

/** Démarre une campagne d'outreach. */
export async function startCampaign(campaignId: string) {
  await db.campaign.update({ where: { id: campaignId }, data: { status: "running" } });
  const { enqueue } = await import("@/lib/email/queue");
  await enqueue("process_sequences", {}, { runAt: new Date() });
}

/** Sélectionne une boîte d'envoi (rotation) sous sa limite quotidienne. */
async function pickMailbox(workspaceId: string, rotation: boolean) {
  const mailboxes = await db.mailbox.findMany({
    where: { workspaceId, status: { in: ["active", "warming"] } },
    orderBy: { sentToday: "asc" },
  });
  const available = mailboxes.filter((m) => m.sentToday < m.dailyLimit);
  const pool = available.length ? available : mailboxes;
  if (!pool.length) return null;
  return rotation ? pool[0] : pool[0]; // tri par sentToday asc = rotation équilibrée
}

/** Traite les inscriptions arrivées à échéance (envoi de l'étape courante). */
export async function processSequences() {
  const now = new Date();
  const due = await db.enrollment.findMany({
    where: { status: "active", nextActionAt: { lte: now } },
    include: { campaign: { include: { steps: { orderBy: { order: "asc" } } } }, contact: true },
    take: 50,
  });

  let processed = 0;
  for (const en of due) {
    if (en.campaign.status !== "running") continue;
    const steps = en.campaign.steps;
    const step = steps[en.currentStep];

    if (!step) {
      await db.enrollment.update({ where: { id: en.id }, data: { status: "completed" } });
      continue;
    }

    if (step.type === "wait") {
      const next = new Date(now.getTime() + (step.waitDays ?? 1) * 86400_000);
      await db.enrollment.update({
        where: { id: en.id },
        data: { currentStep: en.currentStep + 1, nextActionAt: next },
      });
      continue;
    }

    if (step.type === "condition") {
      // Détection de réponse : si répondu → on stoppe (déjà géré), sinon on continue.
      await db.enrollment.update({
        where: { id: en.id },
        data: { currentStep: en.currentStep + 1, nextActionAt: now },
      });
      continue;
    }

    // step.type === "email"
    const mailbox = await pickMailbox(en.campaign.workspaceId, en.campaign.mailboxRotation);
    // {{unsubscribe}} utilisable dans les templates ; sinon le pied de page
    // de désinscription est ajouté automatiquement à l'envoi (performSend).
    const ctx = {
      ...contactContext(en.contact),
      unsubscribe: unsubscribeUrl(en.campaign.workspaceId, en.contact.email),
    };
    const subject = renderTemplate(step.subject ?? en.campaign.subject ?? "Bonjour", ctx);
    const body = renderTemplate(step.body ?? "", ctx);

    await sendEmail({
      workspaceId: en.campaign.workspaceId,
      source: "outreach",
      from: mailbox?.email,
      fromName: mailbox?.displayName ?? undefined,
      to: en.contact.email,
      subject,
      html: `<div style="font-family:sans-serif;white-space:pre-wrap">${body}</div>`,
      text: body,
      campaignId: en.campaign.id,
      contactId: en.contact.id,
      mailboxId: mailbox?.id,
    });

    if (mailbox) {
      await db.mailbox.update({ where: { id: mailbox.id }, data: { sentToday: { increment: 1 } } });
    }

    // Avance à l'étape suivante.
    await db.enrollment.update({
      where: { id: en.id },
      data: { currentStep: en.currentStep + 1, nextActionAt: now, updatedAt: now },
    });

    // Détection de réponse simulée (~14%) → arrêt de séquence + thread dans l'inbox.
    if (Math.random() < 0.14) {
      await simulateReply(en.id);
    }
    processed++;
  }

  // Re-planifie un tick si des inscriptions restent actives.
  const remaining = await db.enrollment.count({ where: { status: "active", nextActionAt: { lte: new Date(now.getTime() + 86400_000) } } });
  if (remaining > 0) {
    const { enqueue } = await import("@/lib/email/queue");
    await enqueue("process_sequences", {}, { runAt: new Date(Date.now() + 8000) });
  }
  return { processed };
}

/** Crée une réponse simulée et l'achemine vers l'inbox unifiée. */
async function simulateReply(enrollmentId: string) {
  const en = await db.enrollment.findUnique({
    where: { id: enrollmentId },
    include: { contact: true, campaign: true, mailbox: true },
  });
  if (!en) return;

  const categories = ["interested", "interested", "not_interested", "ooo"] as const;
  const category = categories[Math.floor(Math.random() * categories.length)];
  const bodies: Record<string, string> = {
    interested: "Bonjour, oui ça m'intéresse — pouvez-vous m'en dire plus et proposer un créneau ?",
    not_interested: "Merci mais ce n'est pas une priorité pour nous actuellement.",
    ooo: "Je suis absent jusqu'à la semaine prochaine, je reviendrai vers vous à mon retour.",
  };

  await db.enrollment.update({ where: { id: en.id }, data: { status: "replied" } });

  const thread = await db.inboxThread.create({
    data: {
      workspaceId: en.campaign.workspaceId,
      contactId: en.contactId,
      mailboxId: en.mailboxId,
      campaignId: en.campaignId,
      subject: `Re: ${en.campaign.subject ?? en.campaign.name}`,
      category,
      status: "open",
      lastMessageAt: new Date(),
    },
  });
  await db.inboxMessage.create({
    data: {
      threadId: thread.id,
      direction: "inbound",
      fromEmail: en.contact.email,
      toEmail: en.mailbox?.email ?? "moi@luunchmail.local",
      body: bodies[category] ?? bodies.interested,
    },
  });
}
