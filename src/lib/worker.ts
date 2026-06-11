import { runDueJobs } from "./queue";

let started = false;

/** Démarre le worker in-process (dev). En prod : process worker dédié + BullMQ/Redis. */
export function startWorker() {
  if (started) return;
  // Ne pas démarrer pendant le build (sinon setInterval bloque le process).
  if (process.env.NEXT_PHASE === "phase-production-build") return;
  started = true;

  // Boucle principale : exécute les jobs dus toutes les ~3s.
  const tick = async () => {
    try {
      await runDueJobs(25);
    } catch (err) {
      console.error("[worker] erreur:", err);
    }
  };
  setInterval(() => void tick(), 3000);

  // Warmup périodique (entretien de la réputation). En démo : montée visible.
  const warmupTick = async () => {
    try {
      const { enqueue } = await import("./queue");
      await enqueue("run_warmup", {});
    } catch {
      /* ignore */
    }
  };
  setTimeout(() => void warmupTick(), 5000);
  setInterval(() => void warmupTick(), 120_000);

  // Relève IMAP des réponses (boîtes avec config réelle). Inoffensif en démo.
  const imapTick = async () => {
    try {
      const { enqueue } = await import("./queue");
      await enqueue("poll_imap", {});
    } catch {
      /* ignore */
    }
  };
  setTimeout(() => void imapTick(), 12_000);
  setInterval(() => void imapTick(), 90_000);

  // Synchronisation Cheap Inboxes (nouvelles boîtes provisionnées). Inoffensif sans clé.
  const ciTick = async () => {
    try {
      const { enqueue } = await import("./queue");
      await enqueue("sync_cheapinboxes", {});
    } catch {
      /* ignore */
    }
  };
  setTimeout(() => void ciTick(), 30_000);
  setInterval(() => void ciTick(), 600_000); // toutes les 10 min

  console.log("[worker] Luunch Mail worker démarré (jobs 3s · IMAP 90s · Cheap Inboxes 10min).");
}
