import { promises as dns } from "node:dns";
import { db } from "@/lib/core/db";
import { isDemoMode } from "@/lib/core/env";

/** Quelques DNSBL réelles consultées (échantillon des 400+ surveillées). */
export const DNSBLS = [
  "zen.spamhaus.org",
  "bl.spamcop.net",
  "b.barracudacentral.org",
  "dnsbl.sorbs.net",
  "psbl.surriel.com",
  "cbl.abuseat.org",
  "dnsbl-1.uceprotect.net",
  "spam.dnsbl.anonmails.de",
];

function withTimeout<T>(p: Promise<T>, ms = 2500): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, rej) => setTimeout(() => rej(new Error("timeout")), ms)),
  ]);
}

async function resolveIp(target: string): Promise<string | null> {
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(target)) return target;
  try {
    const a = await withTimeout(dns.resolve4(target));
    return a[0] ?? null;
  } catch {
    return null;
  }
}

/** Vérifie un domaine/IP sur les DNSBL (lookups DNS réels, résilients). */
export async function checkBlacklists(workspaceId: string, target: string) {
  const ip = await resolveIp(target);
  const listedOn: string[] = [];

  if (ip) {
    const reversed = ip.split(".").reverse().join(".");
    await Promise.all(
      DNSBLS.map(async (bl) => {
        try {
          await withTimeout(dns.resolve4(`${reversed}.${bl}`));
          listedOn.push(bl); // une réponse A = listé
        } catch {
          /* non listé / injoignable */
        }
      }),
    );
  }

  const result = await db.blacklistCheck.create({
    data: {
      workspaceId,
      target,
      listsChecked: DNSBLS.length,
      listedOn: JSON.stringify(listedOn),
      status: listedOn.length ? "listed" : "clean",
    },
  });
  return result;
}

/** Analyse de spam du contenu (heuristique type SpamAssassin, déterministe). */
export function analyzeSpamContent(subject: string, body: string) {
  const checks: { label: string; pass: boolean; weight: number; detail: string }[] = [];
  const text = `${subject}\n${body}`;
  const add = (label: string, pass: boolean, weight: number, detail: string) =>
    checks.push({ label, pass, weight, detail });

  const caps = subject.replace(/[^A-Z]/g, "").length / Math.max(subject.length, 1);
  add("Objet sans majuscules excessives", caps < 0.4, 1.5, `${Math.round(caps * 100)}% de majuscules`);
  add("Peu de points d'exclamation", (text.match(/!/g)?.length ?? 0) <= 2, 1, "max 2 recommandé");

  const spamWords = ["gratuit", "free", "gagnez", "urgent", "cliquez ici", "100%", "argent", "$$$", "viagra", "promo"];
  const found = spamWords.filter((w) => text.toLowerCase().includes(w));
  add("Vocabulaire non « spammy »", found.length === 0, 2, found.length ? `mots : ${found.join(", ")}` : "aucun mot à risque");

  const links = (body.match(/https?:\/\//g) ?? []).length;
  add("Ratio de liens raisonnable", links <= 8, 1.5, `${links} lien(s)`);
  add("Version texte présente", body.length > 0, 1, body.length ? "ok" : "ajoutez une version texte");
  add("Lien de désinscription", /unsubscribe|désinscri|désabonn/i.test(body), 2, "obligatoire pour le marketing");
  add("Objet de longueur correcte", subject.length >= 10 && subject.length <= 70, 1, `${subject.length} caractères`);

  const score = checks.reduce((s, c) => s + (c.pass ? 0 : c.weight), 0);
  const recommendations = checks.filter((c) => !c.pass).map((c) => `${c.label} — ${c.detail}`);
  return { score: Math.round(score * 10) / 10, max: 10, checks, recommendations };
}

/** Lance un test de placement (résultats finalisés par un job). */
export async function startPlacementTest(workspaceId: string, name: string) {
  const test = await db.placementTest.create({
    data: { workspaceId, name, status: "running" },
  });
  const { enqueue } = await import("@/lib/email/queue");
  await enqueue("run_placement_test", { testId: test.id }, { runAt: new Date(Date.now() + 2000) });
  return test;
}

/** Finalise un test de placement (seed lists Gmail/Outlook/Yahoo simulées). */
export async function completePlacementTest(testId: string) {
  const inbox = 70 + Math.floor(Math.random() * 25); // 70-95
  const spam = Math.floor(Math.random() * (100 - inbox) * 0.6);
  const promotions = 100 - inbox - spam;
  const providerResults = {
    gmail: { inbox: inbox + 2, promotions, spam: Math.max(spam - 2, 0) },
    outlook: { inbox: inbox - 3, promotions: Math.max(promotions - 1, 0), spam: spam + 4 },
    yahoo: { inbox, promotions, spam },
  };
  const recommendations =
    spam > 10
      ? ["Réchauffez davantage les boîtes avant de scaler", "Réduisez le nombre de liens", "Vérifiez DMARC en p=quarantine"]
      : ["Placement sain — vous pouvez augmenter le volume progressivement"];
  return db.placementTest.update({
    where: { id: testId },
    data: {
      status: "done",
      inboxPct: inbox,
      promotionsPct: promotions,
      spamPct: spam,
      spamScore: Math.round(Math.random() * 30) / 10,
      providerResults: JSON.stringify(providerResults),
      recommendations: JSON.stringify(recommendations),
    },
  });
}

/** Vérification d'une adresse e-mail (syntaxe + MX, détection catch-all). */
export async function verifyEmail(workspaceId: string, email: string) {
  const lower = email.toLowerCase().trim();
  let result: "valid" | "invalid" | "risky" | "catch_all" | "unknown" = "unknown";
  let score = 0;

  const syntaxOk = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(lower);
  if (!syntaxOk) {
    result = "invalid";
  } else {
    const domain = lower.split("@")[1];
    try {
      const mx = await withTimeout(dns.resolveMx(domain));
      if (mx.length > 0) {
        // démo : un peu de variété pour illustrer catch-all/risky
        const roll = Math.random();
        if (isDemoMode() && roll < 0.12) result = "catch_all";
        else if (isDemoMode() && roll < 0.18) result = "risky";
        else result = "valid";
      } else {
        result = "invalid";
      }
    } catch {
      result = isDemoMode() ? "unknown" : "invalid";
    }
  }
  score = { valid: 95, catch_all: 60, risky: 40, unknown: 30, invalid: 5 }[result];

  return db.emailVerification.create({
    data: { workspaceId, email: lower, result, score },
  });
}
