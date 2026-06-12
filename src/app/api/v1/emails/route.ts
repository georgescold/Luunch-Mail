import { NextResponse } from "next/server";
import { z } from "zod";
import { authenticateApiKey } from "@/lib/core/api-auth";
import { sendEmail } from "@/lib/email/messaging";
import { env } from "@/lib/core/env";
import { isFeatureEnabled } from "@/lib/core/features";

/**
 * API transactionnelle — POST /api/v1/emails
 * Auth : Authorization: Bearer <clé API> (scope emails:send).
 * Idempotence : en-tête `Idempotency-Key`.
 * Batch : envoyez un tableau d'objets. Mode test : `"test": true`.
 */
const emailSchema = z.object({
  from: z.string().optional(),
  fromName: z.string().optional(),
  to: z.string().email(),
  subject: z.string().min(1),
  html: z.string().optional(),
  text: z.string().optional(),
  replyTo: z.string().email().optional(),
  scheduledAt: z.string().datetime().optional(),
  test: z.boolean().optional(),
});

export async function POST(req: Request) {
  if (!isFeatureEnabled("transactionalApi")) {
    return NextResponse.json(
      { error: "L'API transactionnelle est bientôt disponible. Le produit est pour l'instant recentré sur le cold outreach et l'email marketing." },
      { status: 403 },
    );
  }
  const auth = await authenticateApiKey(req, "emails:send");
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide." }, { status: 400 });
  }

  const idempotencyKey = req.headers.get("idempotency-key") ?? undefined;
  const items = Array.isArray(body) ? body : [body];
  if (items.length > 100) return NextResponse.json({ error: "Batch limité à 100 e-mails." }, { status: 400 });

  const results = [];
  for (const [i, item] of items.entries()) {
    const parsed = emailSchema.safeParse(item);
    if (!parsed.success) {
      results.push({ error: parsed.error.issues[0]?.message ?? "Champs invalides", index: i });
      continue;
    }
    const d = parsed.data;
    try {
      const msg = await sendEmail({
        workspaceId: auth.workspaceId,
        source: "transactional",
        from: d.from ?? env.defaultFromEmail,
        fromName: d.fromName,
        to: d.to,
        subject: d.subject,
        html: d.html,
        text: d.text,
        replyTo: d.replyTo,
        scheduledAt: d.scheduledAt ? new Date(d.scheduledAt) : null,
        idempotencyKey: idempotencyKey ? (items.length > 1 ? `${idempotencyKey}:${i}` : idempotencyKey) : undefined,
        test: d.test ?? false,
      });
      if (!msg) results.push({ error: "Échec d'envoi", index: i });
      else results.push({ id: msg.id, status: msg.status });
    } catch (err) {
      results.push({ error: err instanceof Error ? err.message : "Échec d'envoi", index: i });
    }
  }

  const single = !Array.isArray(body);
  return NextResponse.json(single ? results[0] : { data: results }, { status: 202 });
}

export async function GET() {
  return NextResponse.json({
    name: "Luunch Mail Transactional API",
    version: "v1",
    status: isFeatureEnabled("transactionalApi") ? "active" : "coming_soon",
    endpoints: { send: "POST /api/v1/emails" },
    auth: "Authorization: Bearer <clé API>",
  });
}
