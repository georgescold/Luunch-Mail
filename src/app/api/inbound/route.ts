import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * Réception d'e-mails entrants (inbound parsing) — POST /api/inbound
 * Le provider (ou un relais IMAP) poste { from, to, subject, text, html }.
 * On crée un InboundEmail + on l'achemine vers l'inbox unifiée (thread).
 */
export async function POST(req: Request) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }

  const from = String(body.from ?? "").toLowerCase();
  const to = String(body.to ?? "").toLowerCase();
  const subject = String(body.subject ?? "(sans objet)");
  if (!from || !to) return NextResponse.json({ error: "from/to requis" }, { status: 400 });

  // Résout le workspace via la boîte destinataire.
  const mailbox = await db.mailbox.findFirst({ where: { email: to } });
  if (!mailbox) return NextResponse.json({ received: true, unmatched: true }, { status: 200 });
  const wid = mailbox.workspaceId;

  await db.inboundEmail.create({
    data: { workspaceId: wid, fromEmail: from, toEmail: to, subject, text: body.text ?? null, html: body.html ?? null, parsed: JSON.stringify(body) },
  });

  const contact = await db.contact.findUnique({ where: { workspaceId_email: { workspaceId: wid, email: from } } });

  // Regroupe dans un thread existant (même contact + boîte) sinon en crée un.
  let thread = await db.inboxThread.findFirst({
    where: { workspaceId: wid, mailboxId: mailbox.id, contactId: contact?.id ?? undefined, status: "open" },
    orderBy: { lastMessageAt: "desc" },
  });
  if (!thread) {
    thread = await db.inboxThread.create({
      data: { workspaceId: wid, contactId: contact?.id, mailboxId: mailbox.id, subject, category: "neutral", status: "open", lastMessageAt: new Date() },
    });
  } else {
    await db.inboxThread.update({ where: { id: thread.id }, data: { lastMessageAt: new Date() } });
  }

  await db.inboxMessage.create({
    data: { threadId: thread.id, direction: "inbound", fromEmail: from, toEmail: to, body: body.text ?? body.html ?? "" },
  });

  return NextResponse.json({ received: true, threadId: thread.id }, { status: 200 });
}
