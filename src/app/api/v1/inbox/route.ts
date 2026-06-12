import { NextResponse } from "next/server";
import { authenticateApiKey } from "@/lib/core/api-auth";
import { db } from "@/lib/core/db";

/** GET /api/v1/inbox — conversations de l'inbox unifiée (scope monitor:read).
 *  Filtres : ?category=interested|not_interested|ooo|unsubscribe|bounce|neutral
 *            ?campaign=<id>  ?status=open|snoozed|archived (défaut open)
 *  Pagination : ?limit= (≤100) ?offset= */
export async function GET(req: Request) {
  const auth = await authenticateApiKey(req, "monitor:read");
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category") ?? undefined;
  const campaignId = searchParams.get("campaign") ?? undefined;
  const status = searchParams.get("status") ?? "open";
  const limit = Math.min(Number(searchParams.get("limit") ?? 50) || 50, 100);
  const offset = Math.max(Number(searchParams.get("offset") ?? 0) || 0, 0);

  const where = {
    workspaceId: auth.workspaceId,
    status,
    ...(category ? { category } : {}),
    ...(campaignId ? { campaignId } : {}),
  };

  const [threads, total, byCategory] = await Promise.all([
    db.inboxThread.findMany({
      where,
      orderBy: { lastMessageAt: "desc" },
      take: limit,
      skip: offset,
      include: {
        contact: { select: { email: true, firstName: true, lastName: true, company: true } },
        campaign: { select: { id: true, name: true, type: true } },
        mailbox: { select: { email: true } },
        _count: { select: { messages: true } },
      },
    }),
    db.inboxThread.count({ where }),
    db.inboxThread.groupBy({
      by: ["category"],
      where: { workspaceId: auth.workspaceId, status },
      _count: { _all: true },
    }),
  ]);

  return NextResponse.json({
    threads: threads.map((t) => ({
      id: t.id,
      subject: t.subject,
      category: t.category,
      status: t.status,
      contact: t.contact
        ? { email: t.contact.email, first_name: t.contact.firstName, last_name: t.contact.lastName, company: t.contact.company }
        : null,
      campaign: t.campaign ? { id: t.campaign.id, name: t.campaign.name, type: t.campaign.type } : null,
      mailbox: t.mailbox?.email ?? null,
      messages: t._count.messages,
      last_message_at: t.lastMessageAt.toISOString(),
    })),
    summary: Object.fromEntries(byCategory.map((g) => [g.category ?? "uncategorized", g._count._all])),
    pagination: { total, limit, offset },
  });
}
