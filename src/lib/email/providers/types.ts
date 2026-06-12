/** Abstraction « provider d'envoi » — branche Resend / SMTP / boîtes OAuth / démo
 *  de façon interchangeable (cf. brief §10 : découpler l'envoi). */

export interface SendInput {
  from: string;
  fromName?: string;
  to: string;
  subject: string;
  html?: string;
  text?: string;
  replyTo?: string;
  headers?: Record<string, string>;
  scheduledAt?: Date | null;
  /** Boîte d'envoi spécifique (cold outreach via Gmail/Outlook/SMTP connecté). */
  mailboxId?: string;
  /** Config SMTP spécifique à la boîte (prioritaire sur la config globale). */
  smtpOverride?: { host: string; port: number; secure: boolean; user: string; password: string };
}

export interface SendResult {
  providerId: string;
  status: "sent" | "queued";
  /** En mode démo, on simule les events après l'envoi. */
  simulate?: boolean;
}

export interface EmailProvider {
  readonly name: string;
  readonly real: boolean;
  send(input: SendInput): Promise<SendResult>;
}
