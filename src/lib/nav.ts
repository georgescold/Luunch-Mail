import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard, Server, Users, PenSquare, Send, Workflow,
  Code2, Inbox, ShieldCheck, BarChart3, Settings, MessageSquareMore, Rocket,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  description: string;
  group: "Pilotage" | "Cold outreach" | "Email marketing" | "Compte" | "Bientôt disponible";
  /** Fonctionnalité verrouillée : visible dans le menu mais inutilisable. */
  soon?: boolean;
};

/** Navigation recentrée sur les 2 pôles : Cold outreach & Email marketing.
 *  Les fonctionnalités hors périmètre sont listées en « Bientôt disponible ». */
export const NAV: NavItem[] = [
  { href: "/start", label: "Assistant de démarrage", icon: Rocket, description: "Configurer l'envoi en 4 étapes", group: "Pilotage" },
  { href: "/dashboard", label: "Tableau de bord", icon: LayoutDashboard, description: "Vue d'ensemble des deux pôles", group: "Pilotage" },
  { href: "/analytics", label: "Analytics", icon: BarChart3, description: "Rapports, engagement, exports", group: "Pilotage" },

  // ── Pôle 1 : prospection à froid de masse ──────────────────────────────
  { href: "/outreach", label: "Séquences", icon: Send, description: "Campagnes multi-étapes, A/B, rotation", group: "Cold outreach" },
  { href: "/infrastructure", label: "Infrastructure", icon: Server, description: "Domaines, boîtes d'envoi, DNS, IP", group: "Cold outreach" },
  { href: "/deliverability", label: "Délivrabilité", icon: ShieldCheck, description: "Warmup, placement, blacklists, vérif", group: "Cold outreach" },
  { href: "/inbox", label: "Master Inbox", icon: Inbox, description: "Réponses unifiées + agent IA", group: "Cold outreach" },

  // ── Pôle 2 : email marketing pour apps & SaaS ──────────────────────────
  { href: "/audiences", label: "Audiences", icon: Users, description: "Contacts, segments, formulaires", group: "Email marketing" },
  { href: "/automations", label: "Automations", icon: Workflow, description: "Flows déclenchés + broadcasts", group: "Email marketing" },
  { href: "/composer", label: "Composer", icon: PenSquare, description: "Templates, éditeur, IA", group: "Email marketing" },

  { href: "/settings", label: "Réglages", icon: Settings, description: "Workspace, quotas, conformité", group: "Compte" },

  // ── Verrouillé pour l'instant ──────────────────────────────────────────
  { href: "/transactional", label: "API transactionnelle", icon: Code2, description: "REST, SMTP, SDK, webhooks", group: "Bientôt disponible", soon: true },
  { href: "#", label: "Multicanal SMS / WhatsApp", icon: MessageSquareMore, description: "SMS, WhatsApp, RCS, push", group: "Bientôt disponible", soon: true },
];

export const NAV_GROUPS = ["Pilotage", "Cold outreach", "Email marketing", "Compte", "Bientôt disponible"] as const;
