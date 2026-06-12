import { describe, it, expect } from "vitest";
import {
  openToken, verifyOpenToken, clickSig, verifyClickSig, clickUrl, instrumentHtml,
} from "./tracking";

describe("tokens de tracking", () => {
  it("vérifie un jeton d'ouverture valide", () => {
    const t = openToken("msg_123");
    expect(verifyOpenToken(t)).toBe("msg_123");
  });

  it("rejette un jeton falsifié", () => {
    expect(verifyOpenToken("msg_123.fauxsig")).toBeNull();
    expect(verifyOpenToken("sanspoint")).toBeNull();
    // jeton valide d'un autre message réutilisé
    const other = openToken("msg_456").split(".")[1];
    expect(verifyOpenToken(`msg_123.${other}`)).toBeNull();
  });

  it("signe l'URL de destination (anti open-redirect)", () => {
    const sig = clickSig("msg_123", "https://exemple.fr/page");
    expect(verifyClickSig("msg_123", "https://exemple.fr/page", sig)).toBe(true);
    // URL substituée → signature invalide
    expect(verifyClickSig("msg_123", "https://phishing.evil/", sig)).toBe(false);
    // autre message → signature invalide
    expect(verifyClickSig("msg_456", "https://exemple.fr/page", sig)).toBe(false);
  });
});

describe("instrumentHtml", () => {
  const html = `<html><body>
    <a href="https://exemple.fr/offre">Voir l'offre</a>
    <a href="mailto:contact@exemple.fr">Écrire</a>
    <a href="http://localhost:3000/u/jeton-desinscription">Se désinscrire</a>
  </body></html>`;

  it("réécrit les liens http(s) seulement, jamais la désinscription ni mailto", () => {
    const out = instrumentHtml(html, "msg_1", { opens: false, clicks: true });
    expect(out).toContain("/api/t/c/");
    expect(out).toContain(encodeURIComponent("https://exemple.fr/offre").replace(/%3A/g, "%3A"));
    expect(out).toContain('href="mailto:contact@exemple.fr"');
    expect(out).toContain('href="http://localhost:3000/u/jeton-desinscription"');
  });

  it("ajoute le pixel avant </body> quand opens est actif", () => {
    const out = instrumentHtml(html, "msg_1", { opens: true, clicks: false });
    expect(out).toContain("/api/t/o/");
    expect(out.indexOf("/api/t/o/")).toBeLessThan(out.indexOf("</body>"));
    // aucun lien réécrit
    expect(out).not.toContain("/api/t/c/");
  });

  it("ajoute le pixel en fin de document s'il n'y a pas de </body>", () => {
    const out = instrumentHtml("<div>Bonjour</div>", "msg_1", { opens: true, clicks: false });
    expect(out.endsWith("/>")).toBe(true);
    expect(out).toContain("/api/t/o/");
  });

  it("l'URL réécrite contient une signature vérifiable", () => {
    const url = clickUrl("msg_1", "https://exemple.fr/offre");
    const parsed = new URL(url);
    const u = parsed.searchParams.get("u")!;
    const s = parsed.searchParams.get("s")!;
    expect(u).toBe("https://exemple.fr/offre");
    expect(verifyClickSig("msg_1", u, s)).toBe(true);
  });
});
