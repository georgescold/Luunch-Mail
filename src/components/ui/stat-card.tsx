import { cn } from "@/lib/cn";
import type { LucideIcon } from "lucide-react";

/** Stat Card (métrique centrée) — variante de carte DESIGN.md. */
export function StatCard({
  label,
  value,
  delta,
  deltaTone = "neutral",
  icon: Icon,
  hint,
  className,
}: {
  label: string;
  value: string | number;
  delta?: string;
  deltaTone?: "up" | "down" | "neutral";
  icon?: LucideIcon;
  hint?: string;
  className?: string;
}) {
  return (
    <div className={cn("group rounded-md border border-line bg-surface p-sp-5 shadow-sm transition-[box-shadow,border-color] duration-200 hover:border-line-strong hover:shadow-md", className)}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-ink-faint">{label}</span>
        {Icon && (
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary-soft text-primary transition-colors duration-200 group-hover:bg-primary group-hover:text-white">
            <Icon size={16} />
          </span>
        )}
      </div>
      <div className="tnum mt-sp-3 text-h2 font-headline font-bold text-ink">{value}</div>
      {(delta || hint) && (
        <div className="mt-sp-1 flex items-center gap-sp-2 text-xs">
          {delta && (
            <span
              className={cn(
                "font-medium",
                deltaTone === "up" && "text-success-fg",
                deltaTone === "down" && "text-error",
                deltaTone === "neutral" && "text-ink-faint",
              )}
            >
              {delta}
            </span>
          )}
          {hint && <span className="text-ink-disabled">{hint}</span>}
        </div>
      )}
    </div>
  );
}
