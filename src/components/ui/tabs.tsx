"use client";

import { useState } from "react";
import { cn } from "@/lib/core/cn";

export type TabItem = { id: string; label: string; content: React.ReactNode };

/** Onglets simples (état client). */
export function Tabs({ items, defaultTab, className }: { items: TabItem[]; defaultTab?: string; className?: string }) {
  const [active, setActive] = useState(defaultTab ?? items[0]?.id);
  return (
    <div className={className}>
      <div className="flex gap-sp-1 border-b border-line">
        {items.map((t) => (
          <button
            key={t.id}
            onClick={() => setActive(t.id)}
            className={cn(
              "relative px-sp-4 py-sp-3 text-sm font-medium transition-colors",
              active === t.id ? "text-primary" : "text-ink-faint hover:text-ink",
            )}
          >
            {t.label}
            {active === t.id && <span className="absolute inset-x-sp-2 -bottom-px h-[3px] origin-left animate-fade-in rounded-pill bg-primary" />}
          </button>
        ))}
      </div>
      <div key={active} className="animate-fade-in pt-sp-5">{items.find((t) => t.id === active)?.content}</div>
    </div>
  );
}
