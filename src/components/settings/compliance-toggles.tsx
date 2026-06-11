"use client";

import { useState } from "react";
import { Switch } from "@/components/ui";

/**
 * Petit interrupteur d'affichage (état client) pour illustrer une
 * option de conformité activée par défaut. Purement informatif :
 * il ne déclenche pas de mutation, il rend l'état visible (DESIGN.md).
 */
export function ComplianceToggle({
  label,
  description,
  defaultOn = true,
}: {
  label: string;
  description?: string;
  defaultOn?: boolean;
}) {
  const [on, setOn] = useState(defaultOn);
  return (
    <div className="flex items-start justify-between gap-sp-4 rounded-sm border border-line bg-fill-subtle px-sp-4 py-sp-3">
      <div className="min-w-0">
        <p className="text-sm font-medium text-ink">{label}</p>
        {description && <p className="mt-sp-1 text-xs text-ink-faint">{description}</p>}
      </div>
      <Switch
        checked={on}
        onChange={() => setOn((v) => !v)}
        aria-label={label}
        className="mt-sp-1 shrink-0"
      />
    </div>
  );
}
