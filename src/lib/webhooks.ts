import { db } from "./db";
import { signPayload } from "./crypto";

/** Livre un webhook signé (entête `luunch-signature`). */
export async function deliverWebhook(deliveryId: string) {
  const delivery = await db.webhookDelivery.findUnique({
    where: { id: deliveryId },
    include: { endpoint: true },
  });
  if (!delivery || delivery.endpoint.status !== "active") return;

  const signature = signPayload(delivery.payload, delivery.endpoint.secret);
  try {
    const res = await fetch(delivery.endpoint.url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "luunch-signature": signature,
        "luunch-event": delivery.eventType,
      },
      body: delivery.payload,
      signal: AbortSignal.timeout(10_000),
    });
    await db.webhookDelivery.update({
      where: { id: delivery.id },
      data: { responseStatus: res.status, success: res.ok, attempts: { increment: 1 } },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
  } catch (err) {
    await db.webhookDelivery.update({
      where: { id: delivery.id },
      data: { success: false, attempts: { increment: 1 } },
    });
    throw err;
  }
}
