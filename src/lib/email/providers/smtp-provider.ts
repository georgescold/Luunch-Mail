import { env } from "@/lib/core/env";
import { randomToken } from "@/lib/core/crypto";
import type { EmailProvider, SendInput, SendResult } from "./types";

/** Envoi réel via relais SMTP générique (nodemailer). Sert aussi de base
 *  pour les boîtes d'envoi SMTP/IMAP connectées (cold outreach). */
export class SmtpProvider implements EmailProvider {
  readonly name = "smtp";
  readonly real = true;

  async send(input: SendInput): Promise<SendResult> {
    const nodemailer = await import("nodemailer");
    // Config par boîte (cold outreach) prioritaire ; sinon relais global du .env.
    const o = input.smtpOverride;
    const transport = nodemailer.createTransport(
      o
        ? { host: o.host, port: o.port, secure: o.secure, auth: { user: o.user, pass: o.password } }
        : {
            host: env.smtp.host,
            port: env.smtp.port,
            secure: env.smtp.secure,
            auth: env.smtp.user ? { user: env.smtp.user, pass: env.smtp.password } : undefined,
          },
    );
    const info = await transport.sendMail({
      from: input.fromName ? `${input.fromName} <${input.from}>` : input.from,
      to: input.to,
      subject: input.subject,
      html: input.html ?? undefined,
      text: input.text ?? undefined,
      replyTo: input.replyTo,
      headers: input.headers,
    });
    return { providerId: info.messageId ?? `smtp_${randomToken(8)}`, status: "sent" };
  }
}
