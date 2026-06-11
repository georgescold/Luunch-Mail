import { db } from "./db";

/** Un « tick » de warmup = une journée simulée de chauffe (slow ramp J1=2, J2=4…).
 *  Caps quotidiens, montée progressive, score de réputation, garde-fous. */
export async function runWarmupTick() {
  const mailboxes = await db.mailbox.findMany({
    where: { warmupEnabled: true, status: { in: ["warming", "active"] } },
  });

  for (const mb of mailboxes) {
    if (mb.warmupStage >= 30) continue; // ramp terminé, warmup d'entretien

    const stage = mb.warmupStage + 1;
    const target = Math.min(stage * 2, mb.dailyLimit); // slow ramp plafonné
    const opened = Math.round(target * (0.82 + Math.random() * 0.12));
    const replied = Math.round(target * (0.18 + Math.random() * 0.12));
    const savedFromSpam = Math.round(target * (0.03 + Math.random() * 0.04));

    // Garde-fou : réputation qui monte progressivement, auto-pause si trop basse.
    const rep = Math.min(100, mb.reputationScore + (savedFromSpam > target * 0.1 ? 0 : 1));
    const status = rep < 70 ? "paused" : stage >= 14 ? "active" : "warming";

    await db.warmupActivity.create({
      data: { mailboxId: mb.id, sent: target, opened, replied, savedFromSpam, reputationScore: rep },
    });
    await db.mailbox.update({
      where: { id: mb.id },
      data: { warmupStage: stage, reputationScore: rep, status },
    });
  }
  return { processed: mailboxes.length };
}
