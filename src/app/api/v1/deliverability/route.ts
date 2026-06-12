import { NextResponse } from "next/server";
import { authenticateApiKey } from "@/lib/core/api-auth";
import { db } from "@/lib/core/db";

/** GET /api/v1/deliverability — santé d'envoi (scope monitor:read) :
 *  blacklists, dernier test de placement, suppression, taux critiques. */
export async function GET(req: Request) {
  const auth = await authenticateApiKey(req, "monitor:read");
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const wid = auth.workspaceId;

  const [blacklists, lastPlacement, suppression, sent, bounced, complained] = await Promise.all([
    db.blacklistCheck.findMany({ where: { workspaceId: wid }, orderBy: { createdAt: "desc" }, take: 100 }),
    db.placementTest.findFirst({ where: { workspaceId: wid }, orderBy: { createdAt: "desc" } }),
    db.suppressionEntry.groupBy({ by: ["reason"], where: { workspaceId: wid }, _count: { _all: true } }),
    db.emailMessage.count({ where: { workspaceId: wid, sentAt: { not: null } } }),
    db.emailEvent.count({ where: { type: "bounced", message: { workspaceId: wid } } }),
    db.emailEvent.count({ where: { type: "complained", message: { workspaceId: wid } } }),
  ]);

  const rate = (n: number, d: number) => (d ? Math.round((n / d) * 10000) / 100 : 0);
  const listed = blacklists.filter((b) => b.status === "listed");

  return NextResponse.json({
    rates: {
      bounce_pct: rate(bounced, sent),
      complaint_pct: rate(complained, sent),
      // Seuils Google/Yahoo : bounce < 2 %, plainte < 0,3 %
      bounce_ok: rate(bounced, sent) < 2,
      complaint_ok: rate(complained, sent) < 0.3,
    },
    blacklists: {
      checked: blacklists.length,
      listed: listed.length,
      listed_on: listed.map((b) => {
        let lists: string[] = [];
        try { lists = JSON.parse(b.listedOn); } catch { /* ignore */ }
        return { target: b.target, lists, checked_at: b.createdAt.toISOString() };
      }),
    },
    last_placement_test: lastPlacement
      ? {
          name: lastPlacement.name,
          status: lastPlacement.status,
          inbox_pct: lastPlacement.inboxPct,
          promotions_pct: lastPlacement.promotionsPct,
          spam_pct: lastPlacement.spamPct,
          created_at: lastPlacement.createdAt.toISOString(),
        }
      : null,
    suppression: Object.fromEntries(suppression.map((g) => [g.reason, g._count._all])),
    generated_at: new Date().toISOString(),
  });
}
