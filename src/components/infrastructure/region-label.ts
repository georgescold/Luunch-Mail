/** Libellés FR des régions d'envoi (partagé par les composants infra). */
export const REGIONS: Record<string, string> = {
  eu: "Europe",
  us: "Amérique du Nord",
  sa: "Amérique du Sud",
  asia: "Asie",
};

export function regionLabel(code: string) {
  return REGIONS[code] ?? code.toUpperCase();
}

/** Libellés FR des fournisseurs de boîtes. */
export const PROVIDERS: Record<string, string> = {
  gmail: "Google Workspace",
  outlook: "Microsoft 365",
  smtp: "SMTP / IMAP",
  airmail: "AirMail",
};

export function providerLabel(code: string) {
  return PROVIDERS[code] ?? code;
}
