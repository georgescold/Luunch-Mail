"use server";

import { requireAuth } from "@/lib/core/auth";
import { db } from "@/lib/core/db";

/**
 * Construit un aperçu agrégé des performances (mêmes chiffres que la page Analytics).
 * Retourne un objet sérialisable — utile pour un éventuel export côté API ou un
 * rafraîchissement déclenché par l'UI. Lecture seule, scopé au workspace courant.
 */
export async function getAnalyticsOverview() {
  const { workspace } = await requireAuth();
  const wid = workspace.id;
  const since = new Date(Date.now() - 14 * 86400_000);

  const [sent, delivered, opened, clicked, bounced, complained, unsubscribed] = await Promise.all([
    db.emailMessage.count({ where: { workspaceId: wid, sentAt: { not: null } } }),
    db.emailEvent.count({ where: { type: "delivered", message: { workspaceId: wid } } }),
    db.emailEvent.count({ where: { type: "opened", message: { workspaceId: wid } } }),
    db.emailEvent.count({ where: { type: "clicked", message: { workspaceId: wid } } }),
    db.emailEvent.count({ where: { type: "bounced", message: { workspaceId: wid } } }),
    db.emailEvent.count({ where: { type: "complained", message: { workspaceId: wid } } }),
    db.suppressionEntry.count({ where: { workspaceId: wid, reason: "unsubscribe" } }),
  ]);

  const replies = await db.inboxThread.count({ where: { workspaceId: wid } });

  return {
    generatedAt: new Date().toISOString(),
    window: { from: since.toISOString(), to: new Date().toISOString() },
    metrics: { sent, delivered, opened, clicked, bounced, complained, unsubscribed, replies },
  };
}
