import { env, isDemoMode } from "../env";
import { DemoProvider } from "./demo-provider";
import { ResendProvider } from "./resend-provider";
import { SmtpProvider } from "./smtp-provider";
import type { EmailProvider } from "./types";

export type { EmailProvider, SendInput, SendResult } from "./types";

/** Fabrique le provider d'envoi selon la config. Retombe en mode démo si la
 *  clé/config réelle est absente → l'app reste testable sans secret. */
export function getEmailProvider(): EmailProvider {
  if (isDemoMode()) return new DemoProvider();
  if (env.emailProvider === "resend") return new ResendProvider();
  if (env.emailProvider === "smtp") return new SmtpProvider();
  return new DemoProvider();
}
