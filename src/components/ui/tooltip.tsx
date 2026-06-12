"use client";

import { useState } from "react";
import { cn } from "@/lib/core/cn";

/** Tooltip (DESIGN.md §Tooltips) — fond ink, texte blanc, 300ms show. */
export function Tooltip({ content, children, className }: { content: React.ReactNode; children: React.ReactNode; className?: string }) {
  const [show, setShow] = useState(false);
  return (
    <span className="relative inline-flex" onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      {children}
      {show && (
        <span
          role="tooltip"
          className={cn(
            "pointer-events-none absolute bottom-full left-1/2 z-50 mb-sp-2 -translate-x-1/2 whitespace-nowrap rounded-md bg-ink px-sp-3 py-sp-2 text-[13px] text-white shadow-md animate-fade-in",
            className,
          )}
        >
          {content}
          <span className="absolute left-1/2 top-full -translate-x-1/2 border-[6px] border-transparent border-t-ink" />
        </span>
      )}
    </span>
  );
}
