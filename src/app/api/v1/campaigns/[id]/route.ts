import { NextResponse } from "next/server";
import { authenticateApiKey } from "@/lib/core/api-auth";
import { db } from "@/lib/core/db";
import { parseJson } from "@/lib/core/fmt";

/** GET /api/v1/campaigns/:id — détail d'une campagne (scope monitor:read) :
 *  stats, séquence d'étapes, répartition des inscrits, réponses positives. */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authenticateApiKey(req, "monitor:read");
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { id } = await params;

  const campaign = await db.campaign.findFirst({
    where: { id, workspaceId: auth.workspaceId },
    include: { steps: { orderBy: { order: "asc" } } },
  });
  if (!campaign) return NextResponse.json({ error: "Campagne introuvable." }, { status: 404 });

  const [enrollmentsByStatus, interested, openThreads] = await Promise.all([
    db.enrollment.groupBy({ by: ["status"], where: { campaignId: id }, _count: { _all: true } }),
    db.inboxThread.count({ where: { campaignId: id, category: "interested" } }),
    db.inboxThread.count({ where: { campaignId: id, status: "open" } }),
  ]);

  return NextResponse.json({
    id: campaign.id,
    name: campaign.name,
    type: campaign.type,
    status: campaign.status,
    subject: campaign.subject,
    stats: parseJson<Record<string, number>>(campaign.stats, {}),
    interested,
    open_threads: openThreads,
    enrollments: Object.fromEntries(enrollmentsByStatus.map((g) => [g.status, g._count._all])),
    settings: {
      mailbox_rotation: campaign.mailboxRotation,
      esp_matching: campaign.espMatching,
      ab_testing: campaign.abTesting,
      track_opens: campaign.trackOpens,
      track_clicks: campaign.trackClicks,
      unsubscribe_footer: campaign.includeUnsubscribe,
      send_window: parseJson<Record<string, unknown> | null>(campaign.sendWindow, null),
    },
    sequence: campaign.steps.map((s) => ({
      order: s.order,
      type: s.type,
      subject: s.subject,
      wait_days: s.waitDays,
      condition: parseJson<Record<string, unknown> | null>(s.condition, null),
    })),
    created_at: campaign.createdAt.toISOString(),
    updated_at: campaign.updatedAt.toISOString(),
  });
}
