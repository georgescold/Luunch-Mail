import { getAuthContext } from "@/lib/auth";
import { db } from "@/lib/db";

function toCsv(rows: (string | number)[][]) {
  return rows
    .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
    .join("\n");
}

/** Export CSV des rapports — GET /api/export?type=overview|contacts (session requise). */
export async function GET(req: Request) {
  const ctx = await getAuthContext();
  if (!ctx) return new Response("Non authentifié", { status: 401 });
  const wid = ctx.workspace.id;
  const type = new URL(req.url).searchParams.get("type") ?? "overview";

  let csv = "";
  let filename = "export.csv";

  if (type === "contacts") {
    const contacts = await db.contact.findMany({ where: { workspaceId: wid }, take: 5000 });
    csv = toCsv([
      ["email", "prénom", "nom", "entreprise", "statut", "engagement", "clv_prévue", "risque_churn"],
      ...contacts.map((c) => [c.email, c.firstName ?? "", c.lastName ?? "", c.company ?? "", c.status, c.engagementScore, c.predictedClv ?? "", c.churnRisk ?? ""]),
    ]);
    filename = "contacts.csv";
  } else {
    const [sent, delivered, opened, clicked, bounced, complained] = await Promise.all([
      db.emailMessage.count({ where: { workspaceId: wid, sentAt: { not: null } } }),
      db.emailEvent.count({ where: { type: "delivered", message: { workspaceId: wid } } }),
      db.emailEvent.count({ where: { type: "opened", message: { workspaceId: wid } } }),
      db.emailEvent.count({ where: { type: "clicked", message: { workspaceId: wid } } }),
      db.emailEvent.count({ where: { type: "bounced", message: { workspaceId: wid } } }),
      db.emailEvent.count({ where: { type: "complained", message: { workspaceId: wid } } }),
    ]);
    csv = toCsv([
      ["métrique", "valeur"],
      ["e-mails envoyés", sent],
      ["délivrés", delivered],
      ["ouverts", opened],
      ["cliqués", clicked],
      ["bounces", bounced],
      ["plaintes", complained],
      ["taux de délivrabilité (%)", sent ? ((delivered / sent) * 100).toFixed(1) : 0],
      ["taux d'ouverture (%)", delivered ? ((opened / delivered) * 100).toFixed(1) : 0],
    ]);
    filename = "rapport-overview.csv";
  }

  return new Response("﻿" + csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${filename}"`,
    },
  });
}
