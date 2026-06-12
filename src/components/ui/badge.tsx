import { cn } from "@/lib/core/cn";

export type BadgeTone = "neutral" | "primary" | "success" | "warning" | "error" | "info" | "purple";

const tones: Record<BadgeTone, string> = {
  neutral: "bg-fill-muted text-ink-faint",
  primary: "bg-primary-soft text-primary",
  success: "bg-success-soft text-success-fg",
  warning: "bg-warning-soft text-warning-fg",
  error: "bg-error-soft text-error",
  info: "bg-[#DBEAFE] text-secondary",
  purple: "bg-[#EDE9FE] text-[#6D28D9]",
};

/** Chip de statut (radius pill, 4px/12px padding, 12px weight 500) — DESIGN.md §Chips. */
export function Badge({ tone = "neutral", className, ...props }: React.HTMLAttributes<HTMLSpanElement> & { tone?: BadgeTone }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-sp-1 rounded-pill px-sp-3 py-sp-1 text-xs font-medium",
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}

/** Mappe les statuts métier → tonalité + libellé FR. */
const STATUS_MAP: Record<string, { tone: BadgeTone; label: string }> = {
  // génériques
  active: { tone: "success", label: "Actif" },
  verified: { tone: "success", label: "Vérifié" },
  live: { tone: "success", label: "En ligne" },
  done: { tone: "success", label: "Terminé" },
  completed: { tone: "success", label: "Terminé" },
  clean: { tone: "success", label: "Propre" },
  delivered: { tone: "success", label: "Délivré" },
  subscribed: { tone: "success", label: "Abonné" },
  running: { tone: "info", label: "En cours" },
  warming: { tone: "warning", label: "Chauffe" },
  verifying: { tone: "info", label: "Vérification" },
  scheduled: { tone: "info", label: "Planifié" },
  pending: { tone: "neutral", label: "En attente" },
  draft: { tone: "neutral", label: "Brouillon" },
  queued: { tone: "neutral", label: "En file" },
  sent: { tone: "info", label: "Envoyé" },
  opened: { tone: "primary", label: "Ouvert" },
  clicked: { tone: "primary", label: "Cliqué" },
  paused: { tone: "warning", label: "En pause" },
  snoozed: { tone: "warning", label: "Reporté" },
  replied: { tone: "success", label: "A répondu" },
  // négatifs
  error: { tone: "error", label: "Erreur" },
  failed: { tone: "error", label: "Échec" },
  bounced: { tone: "error", label: "Bounce" },
  complained: { tone: "error", label: "Plainte" },
  listed: { tone: "error", label: "Blacklisté" },
  disconnected: { tone: "error", label: "Déconnecté" },
  unsubscribed: { tone: "neutral", label: "Désinscrit" },
  archived: { tone: "neutral", label: "Archivé" },
  invalid: { tone: "error", label: "Invalide" },
  valid: { tone: "success", label: "Valide" },
  risky: { tone: "warning", label: "Risqué" },
  catch_all: { tone: "warning", label: "Catch-all" },
  // inbox
  interested: { tone: "success", label: "Intéressé" },
  not_interested: { tone: "neutral", label: "Pas intéressé" },
  ooo: { tone: "warning", label: "Absent" },
  neutral: { tone: "neutral", label: "Neutre" },
  open: { tone: "info", label: "Ouvert" },
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const m = STATUS_MAP[status] ?? { tone: "neutral" as BadgeTone, label: status };
  return <Badge tone={m.tone} className={className}>{m.label}</Badge>;
}
