/**
 * Drapeaux de fonctionnalités — le produit est recentré sur 2 pôles :
 *   1. Cold outreach de masse (séquences, infrastructure, délivrabilité, inbox)
 *   2. Email marketing pour apps/SaaS (audiences, automations, composer)
 * Tout le reste est verrouillé « Bientôt disponible » : visible mais inutilisable.
 * Pour réactiver une fonctionnalité, passez son drapeau à true.
 */
export const FEATURES = {
  /** API transactionnelle (REST/SMTP/SDK/webhooks développeurs). */
  transactionalApi: false,
  /** White-label agence (domaine custom, branding par client). */
  whiteLabel: false,
  /** Canaux SMS / WhatsApp / RCS / push dans les flows. */
  multichannel: false,
} as const;

export type FeatureKey = keyof typeof FEATURES;

export function isFeatureEnabled(key: FeatureKey): boolean {
  return FEATURES[key];
}
