import { NextResponse } from "next/server";
import { authenticateApiKey } from "@/lib/core/api-auth";
import { db } from "@/lib/core/db";
import { parseJson } from "@/lib/core/fmt";

/** GET /api/v1/campaigns — liste des campagnes avec stats (scope monitor:read).
 *  Filtres : ?type=outreach|broadcast  ?status=running|draft|paused|completed
 *  Pagination : ?limit= (≤200) ?offset= */
export async function GET(req: Request) {
  const auth = await authenticateApiKey(req, "monitor:read");
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") ?? undefined;
  const status = searchParams.get("status") ?? undefined;
  const limit = Math.min(Number(searchParams.get("limit") ?? 50) || 50, 200);
  const offset = Math.max(Number(searchParams.get("offset") ?? 0) || 0, 0);

  const where = { workspaceId: auth.workspaceId, ...(type ? { type } : {}), ...(status ? { status } : {}) };

  const [campaigns, total, interestedByCampaign] = await Promise.all([
    db.campaign.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      take: limit,
      skip: offset,
      include: { _count: { select: { steps: true, enrollments: true, threads: true } } },
    }),
    db.campaign.count({ where }),
    db.inboxThread.groupBy({
      by: ["campaignId"],
      where: { workspaceId: auth.workspaceId, category: "interested", campaignId: { not: null } },
      _count: { _all: true },
    }),
  ]);
  const interestedMap = new Map(interestedByCampaign.map((g) => [g.campaignId, g._count._all]));

  return NextResponse.json({
    campaigns: campaigns.map((c) => ({
      id: c.id,
      name: c.name,
      type: c.type,
      status: c.status,
      stats: parseJson<Record<string, number>>(c.stats, {}),
      interested: interestedMap.get(c.id) ?? 0,
      steps: c._count.steps,
      enrollments: c._count.enrollments,
      threads: c._count.threads,
      tracking: { opens: c.trackOpens, clicks: c.trackClicks, unsubscribe_footer: c.includeUnsubscribe },
      created_at: c.createdAt.toISOString(),
      updated_at: c.updatedAt.toISOString(),
    })),
    pagination: { total, limit, offset },
  });
}
