import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword, generateApiKey, hashApiKey, signPayload } from "./crypto";

describe("mots de passe (scrypt)", () => {
  it("vérifie un hash valide et rejette un mauvais mot de passe", async () => {
    const hash = await hashPassword("demodemo");
    expect(await verifyPassword("demodemo", hash)).toBe(true);
    expect(await verifyPassword("mauvais", hash)).toBe(false);
  });
});

describe("clés API", () => {
  it("génère une clé dont le hash est reproductible", () => {
    const { full, prefix, hash } = generateApiKey();
    expect(full.startsWith("gm_live_")).toBe(true);
    expect(prefix).toHaveLength(16);
    expect(hashApiKey(full)).toBe(hash);
  });
});

describe("signature de webhook", () => {
  it("est déterministe pour un même secret", () => {
    expect(signPayload("payload", "secret")).toBe(signPayload("payload", "secret"));
    expect(signPayload("payload", "secret")).not.toBe(signPayload("payload", "autre"));
  });
});
