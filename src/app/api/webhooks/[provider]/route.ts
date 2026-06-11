import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { recordEvent } from "@/lib/messaging";

/**
 * Réception des webhooks d'un provider réel (Resend…) — POST /api/webhooks/:provider
 * Met à jour le statut/les events de l'EmailMessage correspondant (match sur providerId)
 * et alimente l'inbox unifiée pour les e-mails entrants.
 *
 * Resend envoie : { type: "email.delivered", data: { email_id, ... } }.
 * En prod : vérifier la signature (svix) du provider.
 */
const TYPE_MAP: Record<string, string> = {
  "email.sent": "sent",
  "email.delivered": "delivered",
  "email.delivery_delayed": "queued",
  "email.opened": "opened",
  "email.clicked": "clicked",
  "email.bounced": "bounced",
  "email.complained": "complained",
};

export async function POST(req: Request, { params }: { params: Promise<{ provider: string }> }) {
  await params; // provider (resend, ses, postmark…) — réservé pour le routage de vérif de signature
  let payload: any;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }

  const type = TYPE_MAP[payload?.type];
  const providerId = payload?.data?.email_id ?? payload?.data?.id;
  if (!type || !providerId) {
    return NextResponse.json({ received: true, ignored: true }, { status: 200 });
  }

  const message = await db.emailMessage.findFirst({ where: { providerId } });
  if (!message) return NextResponse.json({ received: true, unmatched: true }, { status: 200 });

  await recordEvent(message.id, type, payload.data ?? {});
  return NextResponse.json({ received: true }, { status: 200 });
}
