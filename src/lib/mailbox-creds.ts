import { encryptSecret, decryptSecret } from "./crypto";

/**
 * Identifiants d'une boîte d'envoi, stockés (chiffrés) dans Mailbox.smtpConfig.
 * Un même mot de passe sert généralement au SMTP et à l'IMAP (cas des
 * fournisseurs outreach : Mailreef, AeroSend, Zapmail…).
 */
export type MailboxCredsInput = {
  user: string;
  password: string;
  smtpHost: string;
  smtpPort: number;
  smtpSecure: boolean;
  imapHost: string;
  imapPort: number;
  imapSecure: boolean;
};

type StoredCreds = {
  user: string;
  passwordEnc: string;
  smtp: { host: string; port: number; secure: boolean };
  imap: { host: string; port: number; secure: boolean };
};

export type MailboxCreds = {
  user: string;
  password: string;
  smtp: { host: string; port: number; secure: boolean };
  imap: { host: string; port: number; secure: boolean };
};

/** Sérialise + chiffre les identifiants pour stockage en base. */
export function serializeMailboxCreds(input: MailboxCredsInput): string {
  const stored: StoredCreds = {
    user: input.user,
    passwordEnc: encryptSecret(input.password),
    smtp: { host: input.smtpHost, port: input.smtpPort, secure: input.smtpSecure },
    imap: { host: input.imapHost, port: input.imapPort, secure: input.imapSecure },
  };
  return JSON.stringify(stored);
}

/** Lit + déchiffre les identifiants d'une boîte. Renvoie null si non configurés. */
export function readMailboxCreds(smtpConfig: string | null | undefined): MailboxCreds | null {
  if (!smtpConfig) return null;
  try {
    const s = JSON.parse(smtpConfig) as StoredCreds;
    if (!s.smtp?.host && !s.imap?.host) return null;
    return {
      user: s.user,
      password: decryptSecret(s.passwordEnc),
      smtp: s.smtp ?? { host: "", port: 587, secure: false },
      imap: s.imap ?? { host: "", port: 993, secure: true },
    };
  } catch {
    return null;
  }
}

/** Vrai si la boîte a une config SMTP réelle exploitable pour l'envoi. */
export function hasRealSmtp(smtpConfig: string | null | undefined): boolean {
  const c = readMailboxCreds(smtpConfig);
  return Boolean(c?.smtp.host && c.user && c.password);
}
