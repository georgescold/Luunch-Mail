import { NextResponse } from "next/server";
import { authenticateApiKey } from "@/lib/core/api-auth";
import { db } from "@/lib/core/db";

/** GET /api/v1/mailboxes — boîtes d'envoi : statut, quota, warmup, réputation
 *  (scope monitor:read). Filtre : ?status=active|warming|paused|disconnected */
export async function GET(req: Request) {
  const auth = await authenticateApiKey(req, "monitor:read");
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") ?? undefined;

  const mailboxes = await db.mailbox.findMany({
    where: { workspaceId: auth.workspaceId, ...(status ? { status } : {}) },
    orderBy: { email: "asc" },
    include: { domain: { select: { name: true, status: true } } },
  });

  return NextResponse.json({
    mailboxes: mailboxes.map((m) => ({
      id: m.id,
      email: m.email,
      display_name: m.displayName,
      provider: m.provider,
      status: m.status,
      domain: m.domain ? { name: m.domain.name, status: m.domain.status } : null,
      sent_today: m.sentToday,
      daily_limit: m.dailyLimit,
      quota_used_pct: m.dailyLimit ? Math.round((m.sentToday / m.dailyLimit) * 100) : 0,
      reputation_score: m.reputationScore,
      warmup: { enabled: m.warmupEnabled, stage: m.warmupStage },
      created_at: m.createdAt.toISOString(),
    })),
    count: mailboxes.length,
  });
}
