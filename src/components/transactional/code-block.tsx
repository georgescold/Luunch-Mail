"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

/** Bloc de code avec bouton « Copier » (Docs & SDK). */
export function CodeBlock({ code, label }: { code: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="overflow-hidden rounded-md border border-line bg-ink">
      <div className="flex items-center justify-between border-b border-white/10 px-sp-4 py-sp-2">
        <span className="text-xs font-medium text-white/60">{label ?? "Code"}</span>
        <button
          type="button"
          onClick={() => {
            navigator.clipboard?.writeText(code);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }}
          className="inline-flex items-center gap-sp-1 rounded-sm px-sp-2 py-sp-1 text-xs font-medium text-white/70 transition-colors hover:bg-white/10 hover:text-white"
        >
          {copied ? <Check size={13} /> : <Copy size={13} />} {copied ? "Copié" : "Copier"}
        </button>
      </div>
      <pre className="overflow-x-auto px-sp-4 py-sp-4 text-[13px] leading-relaxed text-white/90">
        <code className="font-mono">{code}</code>
      </pre>
    </div>
  );
}
