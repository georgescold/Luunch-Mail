import { randomToken } from "@/lib/core/crypto";
import type { EmailProvider, SendInput, SendResult } from "./types";

/** Provider démo : n'envoie aucun e-mail réel, renvoie un id factice et
 *  demande la simulation d'events (delivered/open/click/bounce) en aval. */
export class DemoProvider implements EmailProvider {
  readonly name = "demo";
  readonly real = false;

  async send(_input: SendInput): Promise<SendResult> {
    return { providerId: `demo_${randomToken(8)}`, status: "sent", simulate: true };
  }
}
