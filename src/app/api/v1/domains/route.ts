import { NextResponse } from "next/server";
import { authenticateApiKey } from "@/lib/core/api-auth";
import { db } from "@/lib/core/db";

/** GET /api/v1/domains — domaines d'envoi et état DNS (scope monitor:read). */
export async function GET(req: Request) {
  const auth = await authenticateApiKey(req, "monitor:read");
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const domains = await db.domain.findMany({
    where: { workspaceId: auth.workspaceId },
    orderBy: { name: "asc" },
    include: {
      dnsRecords: { select: { type: true, host: true, status: true } },
      _count: { select: { mailboxes: true } },
    },
  });

  return NextResponse.json({
    domains: domains.map((d) => ({
      id: d.id,
      name: d.name,
      status: d.status,
      provider: d.provider,
      region: d.region,
      mailboxes: d._count.mailboxes,
      verified_at: d.verifiedAt?.toISOString() ?? null,
      dns_records: d.dnsRecords.map((r) => ({ type: r.type, host: r.host, status: r.status })),
      created_at: d.createdAt.toISOString(),
    })),
    count: domains.length,
  });
}
