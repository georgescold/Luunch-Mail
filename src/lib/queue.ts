import { db } from "./db";

/** Types de jobs gérés par le worker. */
export type JobType =
  | "send_email"
  | "simulate_events"
  | "deliver_webhook"
  | "process_sequences"
  | "run_warmup"
  | "verify_dns"
  | "run_placement_test"
  | "poll_imap"
  | "sync_cheapinboxes";

/** Met un job en file. */
export async function enqueue(
  type: JobType,
  payload: Record<string, unknown> = {},
  opts: { runAt?: Date; maxAttempts?: number } = {},
) {
  return db.job.create({
    data: {
      type,
      payload: JSON.stringify(payload),
      runAt: opts.runAt ?? new Date(),
      maxAttempts: opts.maxAttempts ?? 3,
    },
  });
}

/** Exécute les jobs arrivés à échéance. Appelé en boucle par le worker
 *  (src/instrumentation.ts) en dev. En prod : remplacer par BullMQ/Redis. */
export async function runDueJobs(limit = 25): Promise<number> {
  const now = new Date();
  const due = await db.job.findMany({
    where: { status: "pending", runAt: { lte: now } },
    orderBy: { runAt: "asc" },
    take: limit,
  });

  let processed = 0;
  for (const job of due) {
    // Claim atomique (évite le double traitement).
    const claimed = await db.job.updateMany({
      where: { id: job.id, status: "pending" },
      data: { status: "running", attempts: { increment: 1 } },
    });
    if (claimed.count === 0) continue;

    try {
      const result = await handle(job.type as JobType, JSON.parse(job.payload));
      await db.job.update({
        where: { id: job.id },
        data: { status: "done", result: result ? JSON.stringify(result) : null, lastError: null },
      });
      processed++;
    } catch (err) {
      const willRetry = job.attempts + 1 < job.maxAttempts;
      await db.job.update({
        where: { id: job.id },
        data: {
          status: willRetry ? "pending" : "failed",
          runAt: new Date(Date.now() + 15_000),
          lastError: err instanceof Error ? err.message : String(err),
        },
      });
    }
  }
  return processed;
}

async function handle(type: JobType, payload: any): Promise<unknown> {
  switch (type) {
    case "send_email":
      return (await import("./messaging")).performScheduledSend(payload.messageId);
    case "simulate_events":
      return (await import("./messaging")).simulateEvents(payload.messageId);
    case "deliver_webhook":
      return (await import("./webhooks")).deliverWebhook(payload.deliveryId);
    case "process_sequences":
      return (await import("./outreach")).processSequences();
    case "run_warmup":
      return (await import("./warmup")).runWarmupTick();
    case "verify_dns":
      return (await import("./dns")).verifyDomainRecords(payload.domainId);
    case "run_placement_test":
      return (await import("./deliverability")).completePlacementTest(payload.testId);
    case "poll_imap":
      return (await import("./imap")).pollAllMailboxes();
    case "sync_cheapinboxes":
      return (await import("./cheapinboxes")).syncAllCheapInboxes();
    default:
      throw new Error(`Type de job inconnu : ${type}`);
  }
}
