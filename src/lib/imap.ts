import { db } from "./db";
import { readMailboxCreds } from "./mailbox-creds";
import { ingestReply } from "./inbox-ingest";

/** Relève unifiée : récupère les réponses des prospects dans toutes les boîtes
 *  configurées (Gmail API pour les boîtes Google, IMAP pour les boîtes SMTP),
 *  les achemine vers l'inbox unifiée et stoppe les séquences. */
export async function pollAllMailboxes() {
  const mailboxes = await db.mailbox.findMany({ where: { status: { in: ["active", "warming"] } } });
  let total = 0;
  for (const mb of mailboxes) {
    try {
      if (mb.provider === "gmail" && mb.oauthData) {
        // Boîte Google connectée en OAuth → relève via l'API Gmail.
        total += await (await import("./google")).pollGmailMailbox(mb.id);
        continue;
      }
      const creds = readMailboxCreds(mb.smtpConfig);
      if (!creds?.imap.host || !creds.user || !creds.password) continue; // pas d'IMAP réel
      total += await pollMailbox(mb.id);
    } catch (err) {
      console.error(`[poll] ${mb.email}:`, err instanceof Error ? err.message : err);
    }
  }
  return { processed: total };
}

/** Relève une boîte précise. */
export async function pollMailbox(mailboxId: string): Promise<number> {
  const mb = await db.mailbox.findUnique({ where: { id: mailboxId } });
  if (!mb) return 0;
  const creds = readMailboxCreds(mb.smtpConfig);
  if (!creds?.imap.host) return 0;

  const { ImapFlow } = await import("imapflow");
  const { simpleParser } = await import("mailparser");

  const client = new ImapFlow({
    host: creds.imap.host,
    port: creds.imap.port,
    secure: creds.imap.secure,
    auth: { user: creds.user, pass: creds.password },
    logger: false,
  });

  let count = 0;
  await client.connect();
  try {
    const lock = await client.getMailboxLock("INBOX");
    try {
      const since = new Date(Date.now() - 7 * 86400_000);
      // On ne traite que les messages non lus des 7 derniers jours.
      const uids = await client.search({ seen: false, since });
      if (!uids || uids.length === 0) return 0;

      for (const uid of uids.slice(0, 50)) {
        const msg = await client.fetchOne(String(uid), { source: true }, { uid: true });
        if (!msg || !msg.source) continue;
        const parsed = await simpleParser(msg.source);
        const fromEmail = parsed.from?.value?.[0]?.address?.toLowerCase() ?? "";
        const subject = parsed.subject ?? "(sans objet)";
        const body = (parsed.text ?? parsed.html ?? "").toString().slice(0, 8000);
        if (!fromEmail) continue;

        await ingestReply({ workspaceId: mb.workspaceId, mailboxId: mb.id, mailboxEmail: mb.email, fromEmail, subject, body });
        count++;
        // Marque comme lu pour ne pas retraiter.
        await client.messageFlagsAdd(String(uid), ["\\Seen"], { uid: true });
      }
    } finally {
      lock.release();
    }
  } finally {
    await client.logout().catch(() => {});
  }
  return count;
}
