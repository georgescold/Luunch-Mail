import { cn } from "@/lib/cn";

/** Filter chip (DESIGN.md §Chips) — sélectionnable. */
export function Chip({
  selected = false,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { selected?: boolean }) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex items-center gap-sp-1 rounded-pill border px-sp-3 py-sp-1 text-xs font-medium transition-colors",
        selected
          ? "border-primary bg-primary-soft text-primary"
          : "border-line bg-fill-muted text-ink-muted hover:border-line-strong hover:bg-line",
        className,
      )}
      {...props}
    />
  );
}
