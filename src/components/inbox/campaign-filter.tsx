"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Send } from "lucide-react";

/** Filtre de l'inbox par campagne (préserve les autres filtres de l'URL). */
export function CampaignFilter({
  campaigns,
  active,
}: {
  campaigns: { id: string; name: string; type: string }[];
  active?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function onChange(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set("campaign", value);
    else params.delete("campaign");
    params.delete("thread"); // le thread ouvert n'appartient peut-être plus au filtre
    const qs = params.toString();
    router.push(qs ? `/inbox?${qs}` : "/inbox");
  }

  return (
    <label className="flex items-center gap-sp-2 text-sm text-ink-muted">
      <Send size={14} className="shrink-0 text-ink-faint" />
      <select
        value={active ?? ""}
        onChange={(e) => onChange(e.target.value)}
        className="w-full max-w-[260px] cursor-pointer rounded-sm border border-line-strong bg-surface px-sp-3 py-sp-2 text-sm text-ink transition-colors hover:border-line-hover focus:border-primary focus:outline-none focus:shadow-focus"
        aria-label="Filtrer par campagne"
      >
        <option value="">Toutes les campagnes</option>
        {campaigns.map((c) => (
          <option key={c.id} value={c.id}>
            {c.type === "broadcast" ? "[Broadcast] " : ""}{c.name}
          </option>
        ))}
      </select>
    </label>
  );
}
