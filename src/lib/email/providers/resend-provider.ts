import { Resend, type CreateEmailOptions } from "resend";
import { env } from "@/lib/core/env";
import type { EmailProvider, SendInput, SendResult } from "./types";

/** Envoi réel via l'API Resend (transactionnel & broadcasts). */
export class ResendProvider implements EmailProvider {
  readonly name = "resend";
  readonly real = true;
  private client: Resend;

  constructor() {
    this.client = new Resend(env.resendApiKey);
  }

  async send(input: SendInput): Promise<SendResult> {
    const from = input.fromName ? `${input.fromName} <${input.from}>` : input.from;
    const payload = {
      from,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text ?? (input.html ? undefined : input.subject),
      replyTo: input.replyTo,
      headers: input.headers,
      scheduledAt: input.scheduledAt ? input.scheduledAt.toISOString() : undefined,
    } as CreateEmailOptions;
    const { data, error } = await this.client.emails.send(payload);
    if (error) throw new Error(`Resend: ${error.message}`);
    return { providerId: data?.id ?? "unknown", status: "sent" };
  }
}
