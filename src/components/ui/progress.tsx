import { cn } from "@/lib/cn";

/** Barre de progression (progression visible partout — DESIGN.md Do's #1). */
export function Progress({
  value,
  max = 100,
  tone = "primary",
  className,
  showLabel = false,
}: {
  value: number;
  max?: number;
  tone?: "primary" | "success" | "warning" | "error" | "secondary";
  className?: string;
  showLabel?: boolean;
}) {
  const pct = Math.max(0, Math.min(100, (value / (max || 1)) * 100));
  const colors: Record<string, string> = {
    primary: "bg-primary",
    success: "bg-success",
    warning: "bg-warning",
    error: "bg-error",
    secondary: "bg-secondary",
  };
  return (
    <div className={cn("flex items-center gap-sp-2", className)}>
      <div className="h-2 w-full overflow-hidden rounded-pill bg-fill-muted">
        <div className={cn("h-full rounded-pill transition-all", colors[tone])} style={{ width: `${pct}%` }} />
      </div>
      {showLabel && <span className="w-10 shrink-0 text-right text-xs font-medium text-ink-faint">{Math.round(pct)}%</span>}
    </div>
  );
}
