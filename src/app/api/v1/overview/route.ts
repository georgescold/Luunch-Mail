import { NextResponse } from "next/server";
import { authenticateApiKey } from "@/lib/core/api-auth";
import { db } from "@/lib/core/db";

/** GET /api/v1/overview — vue d'ensemble du workspace (scope monitor:read).
 *  Tous les indicateurs clés des deux pôles + santé de l'infrastructure. */
export async function GET(req: Request) {
  const auth = await authenticateApiKey(req, "monitor:read");
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const wid = auth.workspaceId;

  const [
    sent, delivered, opened, clicked, bounced, complained,
    oSent, oDelivered, oBounced, replyThreads, interested, runningCampaigns,
    mSent, mDelivered, mOpened, mClicked, liveFlows,
    mailboxes, domains, contacts, suppressUnsub, suppressComplaint,
  ] = await Promise.all([
    db.emailMessage.count({ where: { workspaceId: wid, sentAt: { not: null } } }),
    db.emailEvent.count({ where: { type: "delivered", message: { workspaceId: wid } } }),
    db.emailEvent.count({ where: { type: "opened", message: { workspaceId: wid } } }),
    db.emailEvent.count({ where: { type: "clicked", message: { workspaceId: wid } } }),
    db.emailEvent.count({ where: { type: "bounced", message: { workspaceId: wid } } }),
    db.emailEvent.count({ where: { type: "complained", message: { workspaceId: wid } } }),

    db.emailMessage.count({ where: { workspaceId: wid, source: "outreach", sentAt: { not: null } } }),
    db.emailEvent.count({ where: { type: "delivered", message: { workspaceId: wid, source: "outreach" } } }),
    db.emailEvent.count({ where: { type: "bounced", message: { workspaceId: wid, source: "outreach" } } }),
    db.inboxThread.count({ where: { workspaceId: wid } }),
    db.inboxThread.count({ where: { workspaceId: wid, category: "interested" } }),
    db.campaign.count({ where: { workspaceId: wid, type: "outreach", status: "running" } }),

    db.emailMessage.count({ where: { workspaceId: wid, source: "broadcast", sentAt: { not: null } } }),
    db.emailEvent.count({ where: { type: "delivered", message: { workspaceId: wid, source: "broadcast" } } }),
    db.emailEvent.count({ where: { type: "opened", message: { workspaceId: wid, source: "broadcast" } } }),
    db.emailEvent.count({ where: { type: "clicked", message: { workspaceId: wid, source: "broadcast" } } }),
    db.flow.count({ where: { workspaceId: wid, status: "live" } }),

    db.mailbox.findMany({ where: { workspaceId: wid }, select: { status: true, reputationScore: true } }),
    db.domain.findMany({ where: { workspaceId: wid }, select: { status: true } }),
    db.contact.count({ where: { workspaceId: wid } }),
    db.suppressionEntry.count({ where: { workspaceId: wid, reason: "unsubscribe" } }),
    db.suppressionEntry.count({ where: { workspaceId: wid, reason: "complaint" } }),
  ]);

  const rate = (n: number, d: number) => (d ? Math.round((n / d) * 10000) / 100 : 0);

  return NextResponse.json({
    totals: { sent, delivered, opened, clicked, bounced, complained },
    outreach: {
      sent: oSent,
      delivered: oDelivered,
      bounced: oBounced,
      replies: replyThreads,
      interested,
      reply_rate_pct: rate(replyThreads, oDelivered),
      bounce_rate_pct: rate(oBounced, oSent),
      running_campaigns: runningCampaigns,
    },
    marketing: {
      sent: mSent,
      delivered: mDelivered,
      opened: mOpened,
      clicked: mClicked,
      open_rate_pct: rate(mOpened, mDelivered),
      click_rate_pct: rate(mClicked, mDelivered),
      live_flows: liveFlows,
    },
    infrastructure: {
      mailboxes: {
        total: mailboxes.length,
        active: mailboxes.filter((m) => m.status === "active").length,
        warming: mailboxes.filter((m) => m.status === "warming").length,
        paused: mailboxes.filter((m) => m.status === "paused").length,
        avg_reputation: mailboxes.length
          ? Math.round(mailboxes.reduce((s, m) => s + m.reputationScore, 0) / mailboxes.length)
          : null,
      },
      domains: {
        total: domains.length,
        verified: domains.filter((d) => d.status === "verified").length,
      },
    },
    audience: { contacts, unsubscribes: suppressUnsub, complaints: suppressComplaint },
    generated_at: new Date().toISOString(),
  });
}
