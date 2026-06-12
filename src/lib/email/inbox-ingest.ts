import { db } from "@/lib/core/db";

/** Range une réponse entrante dans l'inbox unifiée + stoppe la séquence du contact.
 *  Partagé par la relève IMAP et la relève Gmail API. */
export async function ingestReply(params: {
  workspaceId: string;
  mailboxId: string;
  mailboxEmail: string;
  fromEmail: string;
  subject: string;
  body: string;
}) {
  const { workspaceId, mailboxId, mailboxEmail, fromEmail, subject, body } = params;

  const contact = await db.contact.findUnique({
    where: { workspaceId_email: { workspaceId, email: fromEmail } },
  });

  // Détection de réponse : stoppe toute séquence d'outreach active du contact.
  let campaignId: string | null = null;
  if (contact) {
    const enrollment = await db.enrollment.findFirst({
      where: { contactId: contact.id, status: "active", campaign: { workspaceId } },
    });
    if (enrollment) {
      await db.enrollment.update({ where: { id: enrollment.id }, data: { status: "replied" } });
      campaignId = enrollment.campaignId;
    }
  }

  // Regroupe dans un thread ouvert existant (même contact + boîte), sinon en crée un.
  let thread = await db.inboxThread.findFirst({
    where: { workspaceId, mailboxId, contactId: contact?.id ?? undefined, status: { not: "archived" } },
    orderBy: { lastMessageAt: "desc" },
  });
  if (!thread) {
    thread = await db.inboxThread.create({
      data: {
        workspaceId, mailboxId, contactId: contact?.id ?? null, campaignId,
        subject, category: "neutral", status: "open", lastMessageAt: new Date(),
      },
    });
  } else {
    await db.inboxThread.update({ where: { id: thread.id }, data: { lastMessageAt: new Date() } });
  }

  await db.inboxMessage.create({
    data: { threadId: thread.id, direction: "inbound", fromEmail, toEmail: mailboxEmail, body: body.slice(0, 8000) },
  });
}
