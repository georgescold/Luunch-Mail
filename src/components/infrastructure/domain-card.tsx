"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, RefreshCw, Globe, Copy, Check } from "lucide-react";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { Button, buttonClasses } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { regionLabel } from "./region-label";
import { verifyDomainAction } from "@/server/infrastructure-actions";

export type DnsRecordView = {
  id: string;
  type: string;
  host: string;
  value: string;
  priority: number | null;
  purpose: string;
  status: string;
};

export type DomainView = {
  id: string;
  name: string;
  status: string;
  provider: string;
  region: string;
  verifiedCount: number;
  totalCount: number;
  records: DnsRecordView[];
};

const PURPOSE_LABEL: Record<string, string> = {
  spf: "SPF",
  dkim: "DKIM",
  dmarc: "DMARC",
  mx: "MX",
  tracking: "Tracking",
  bimi: "BIMI",
};

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard?.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="shrink-0 rounded-sm p-sp-1 text-ink-faint transition-colors hover:bg-fill-subtle hover:text-ink"
      title="Copier la valeur"
    >
      {copied ? <Check size={14} className="text-success-fg" /> : <Copy size={14} />}
    </button>
  );
}

export function DomainCard({ domain }: { domain: DomainView }) {
  const [open, setOpen] = useState(domain.status !== "verified");
  const tone = domain.totalCount && domain.verifiedCount >= domain.totalCount ? "success" : domain.verifiedCount ? "warning" : "primary";

  return (
    <Card className="p-0">
      <div className="flex flex-col gap-sp-4 p-sp-5 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex min-w-0 items-center gap-sp-3 text-left"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary-soft text-primary">
            <Globe size={18} />
          </span>
          <span className="min-w-0">
            <span className="flex items-center gap-sp-2">
              <span className="truncate font-headline text-h4 font-semibold text-ink">{domain.name}</span>
              {open ? <ChevronDown size={16} className="text-ink-faint" /> : <ChevronRight size={16} className="text-ink-faint" />}
            </span>
            <span className="mt-sp-1 flex items-center gap-sp-2 text-xs text-ink-faint">
              {regionLabel(domain.region)} · {domain.verifiedCount}/{domain.totalCount} enregistrements vérifiés
            </span>
          </span>
        </button>

        <div className="flex shrink-0 items-center gap-sp-3">
          <div className="hidden w-32 sm:block">
            <Progress value={domain.verifiedCount} max={domain.totalCount || 1} tone={tone} showLabel />
          </div>
          <StatusBadge status={domain.status} />
          <form action={verifyDomainAction}>
            <input type="hidden" name="domainId" value={domain.id} />
            <Button type="submit" variant="secondary" size="sm">
              <RefreshCw size={14} /> Vérifier le DNS
            </Button>
          </form>
        </div>
      </div>

      {open && (
        <div className="border-t border-line bg-fill-subtle px-sp-5 py-sp-4">
          <p className="mb-sp-3 text-xs text-ink-faint">
            Ajoutez ces enregistrements chez votre registrar. SPF, DKIM et DMARC sont générés automatiquement par Luunch Mail —
            une fois propagés, cliquez sur « Vérifier le DNS ».
          </p>
          <div className="overflow-x-auto rounded-md border border-line bg-surface">
            <table className="w-full border-collapse text-sm">
              <thead className="border-b border-line bg-fill-subtle">
                <tr>
                  <th className="px-sp-3 py-sp-2 text-left text-xs font-semibold uppercase tracking-wide text-ink-faint">Rôle</th>
                  <th className="px-sp-3 py-sp-2 text-left text-xs font-semibold uppercase tracking-wide text-ink-faint">Type</th>
                  <th className="px-sp-3 py-sp-2 text-left text-xs font-semibold uppercase tracking-wide text-ink-faint">Hôte</th>
                  <th className="px-sp-3 py-sp-2 text-left text-xs font-semibold uppercase tracking-wide text-ink-faint">Valeur</th>
                  <th className="px-sp-3 py-sp-2 text-left text-xs font-semibold uppercase tracking-wide text-ink-faint">État</th>
                </tr>
              </thead>
              <tbody>
                {domain.records.map((r) => (
                  <tr key={r.id} className="border-b border-fill-muted last:border-0">
                    <td className="px-sp-3 py-sp-2">
                      <span className="font-medium text-ink">{PURPOSE_LABEL[r.purpose] ?? r.purpose}</span>
                    </td>
                    <td className="px-sp-3 py-sp-2 font-mono text-xs text-ink-muted">{r.type}</td>
                    <td className="px-sp-3 py-sp-2 font-mono text-xs text-ink-muted">{r.host}</td>
                    <td className="px-sp-3 py-sp-2">
                      <div className="flex items-center gap-sp-1">
                        <code className="block max-w-[260px] truncate font-mono text-xs text-ink" title={r.value}>
                          {r.priority != null ? `${r.priority} ` : ""}
                          {r.value}
                        </code>
                        <CopyButton value={r.value} />
                      </div>
                    </td>
                    <td className="px-sp-3 py-sp-2">
                      <StatusBadge status={r.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Card>
  );
}

/** Bouton/lien stylé pour l'état vide des domaines (réutilise buttonClasses). */
export function domainButtonClasses() {
  return buttonClasses({ size: "sm" });
}
