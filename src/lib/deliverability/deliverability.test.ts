import { describe, it, expect } from "vitest";
import { analyzeSpamContent } from "@/lib/deliverability/deliverability";

describe("analyzeSpamContent", () => {
  it("pénalise un contenu spammy", () => {
    const res = analyzeSpamContent("GAGNEZ DE L'ARGENT GRATUIT !!!", "Cliquez ici pour de l'argent gratuit 100% !!!");
    expect(res.score).toBeGreaterThan(0);
    expect(res.recommendations.length).toBeGreaterThan(0);
  });
  it("valorise un contenu propre avec désinscription", () => {
    const clean = analyzeSpamContent(
      "Votre récapitulatif mensuel",
      "Bonjour, voici les nouveautés de ce mois. Se désinscrire à tout moment.",
    );
    const spam = analyzeSpamContent("GRATUIT URGENT !!!", "argent gratuit cliquez ici !!!");
    expect(clean.score).toBeLessThan(spam.score);
  });
});
