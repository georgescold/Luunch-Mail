import { cn } from "@/lib/cn";

/** Mini histogramme CSS (zéro dépendance) pour l'analytics. */
export function BarChart({
  data,
  height = 160,
  tone = "primary",
  className,
}: {
  data: { label: string; value: number }[];
  height?: number;
  tone?: "primary" | "secondary" | "success";
  className?: string;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const colors = { primary: "bg-primary", secondary: "bg-secondary", success: "bg-success" };
  return (
    <div className={cn("flex items-end gap-sp-2", className)} style={{ height }}>
      {data.map((d, i) => (
        <div key={i} className="group flex flex-1 flex-col items-center justify-end gap-sp-2">
          <div className="flex w-full items-end justify-center" style={{ height: height - 24 }}>
            <div
              className={cn(
                "w-full max-w-[40px] origin-bottom animate-rise rounded-t-sm opacity-90 transition-opacity duration-150 group-hover:opacity-100",
                colors[tone],
              )}
              style={{
                height: `${(d.value / max) * 100}%`,
                minHeight: d.value > 0 ? 3 : 0,
                animationDelay: `${Math.min(i * 30, 400)}ms`,
              }}
              title={`${d.label} : ${d.value}`}
            />
          </div>
          <span className="truncate text-[10px] text-ink-disabled transition-colors group-hover:text-ink-faint">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

/** Barre de répartition horizontale (inbox/promotions/spam). */
export function StackBar({ segments }: { segments: { label: string; value: number; color: string }[] }) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  return (
    <div className="space-y-sp-2">
      <div className="flex h-4 w-full overflow-hidden rounded-pill bg-fill-muted">
        {segments.map((s, i) => (
          <div
            key={i}
            className={cn(s.color, "transition-[width] duration-700 ease-out")}
            style={{ width: `${(s.value / total) * 100}%` }}
            title={`${s.label} : ${s.value}%`}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-sp-4 text-xs text-ink-faint">
        {segments.map((s, i) => (
          <span key={i} className="inline-flex items-center gap-sp-1">
            <span className={cn("h-2 w-2 rounded-circle", s.color)} /> {s.label} · {s.value}%
          </span>
        ))}
      </div>
    </div>
  );
}
