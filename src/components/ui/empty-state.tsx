import { cn } from "@/lib/core/cn";
import type { LucideIcon } from "lucide-react";

/** État vide encourageant (DESIGN.md : surface toujours la prochaine action). */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center rounded-md border border-dashed border-line bg-surface px-sp-5 py-sp-8 text-center", className)}>
      {Icon && (
        <span className="mb-sp-4 flex h-14 w-14 animate-float-soft items-center justify-center rounded-pill bg-primary-soft text-primary">
          <Icon size={26} />
        </span>
      )}
      <h3 className="text-h4 font-headline font-semibold text-ink">{title}</h3>
      {description && <p className="mt-sp-2 max-w-md text-sm text-ink-faint">{description}</p>}
      {action && <div className="mt-sp-5">{action}</div>}
    </div>
  );
}
