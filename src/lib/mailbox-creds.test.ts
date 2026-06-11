import { describe, it, expect } from "vitest";
import { serializeMailboxCreds, readMailboxCreds, hasRealSmtp } from "./mailbox-creds";
import { encryptSecret, decryptSecret } from "./crypto";

describe("chiffrement des secrets (AES-256-GCM)", () => {
  it("chiffre puis déchiffre fidèlement", () => {
    const enc = encryptSecret("mon-mot-de-passe-smtp");
    expect(enc).not.toContain("mon-mot-de-passe-smtp"); // jamais en clair
    expect(decryptSecret(enc)).toBe("mon-mot-de-passe-smtp");
  });
  it("renvoie une chaîne vide sur payload invalide", () => {
    expect(decryptSecret("nimporte-quoi")).toBe("");
    expect(decryptSecret(null)).toBe("");
  });
});

describe("identifiants de boîte d'envoi", () => {
  const input = {
    user: "marie@maboite.fr",
    password: "s3cr3t",
    smtpHost: "smtp.maboite.fr",
    smtpPort: 587,
    smtpSecure: false,
    imapHost: "imap.maboite.fr",
    imapPort: 993,
    imapSecure: true,
  };

  it("sérialise sans exposer le mot de passe en clair", () => {
    const blob = serializeMailboxCreds(input);
    expect(blob).not.toContain("s3cr3t");
  });

  it("relit fidèlement les identifiants (mot de passe déchiffré)", () => {
    const creds = readMailboxCreds(serializeMailboxCreds(input));
    expect(creds).not.toBeNull();
    expect(creds!.user).toBe("marie@maboite.fr");
    expect(creds!.password).toBe("s3cr3t");
    expect(creds!.smtp.host).toBe("smtp.maboite.fr");
    expect(creds!.imap.port).toBe(993);
  });

  it("hasRealSmtp détecte une config exploitable", () => {
    expect(hasRealSmtp(serializeMailboxCreds(input))).toBe(true);
    expect(hasRealSmtp(null)).toBe(false);
    expect(hasRealSmtp('{"foo":"bar"}')).toBe(false);
  });
});
