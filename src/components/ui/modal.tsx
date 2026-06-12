"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/core/cn";

/** Modal/dialog (shadow-lg, radius 12px). Le trigger ouvre, ferme sur backdrop/Échap. */
export function Modal({
  trigger,
  title,
  description,
  children,
  wide = false,
}: {
  trigger: (open: () => void) => React.ReactNode;
  title: string;
  description?: string;
  children: React.ReactNode | ((close: () => void) => React.ReactNode);
  wide?: boolean;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    if (open) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      {trigger(() => setOpen(true))}
      {open && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-ink/40 p-sp-4 backdrop-blur-sm animate-fade-in" onClick={() => setOpen(false)}>
          <div
            className={cn("mt-[6vh] w-full animate-pop-in rounded-md border border-line bg-surface p-sp-6 shadow-xl", wide ? "max-w-3xl" : "max-w-lg")}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-sp-4 flex items-start justify-between gap-sp-4">
              <div>
                <h2 className="text-h3 font-headline font-semibold text-ink">{title}</h2>
                {description && <p className="mt-sp-1 text-sm text-ink-faint">{description}</p>}
              </div>
              <button onClick={() => setOpen(false)} className="rounded-sm p-sp-1 text-ink-faint hover:bg-fill-subtle hover:text-ink">
                <X size={20} />
              </button>
            </div>
            {typeof children === "function" ? children(() => setOpen(false)) : children}
          </div>
        </div>
      )}
    </>
  );
}
