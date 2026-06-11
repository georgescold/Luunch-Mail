import { cn } from "@/lib/cn";

/** En-tête de page : titre (Fredoka), description, actions à droite. */
export function PageHeader({
  title,
  description,
  actions,
  className,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-sp-6 flex flex-col gap-sp-3 sm:flex-row sm:items-center sm:justify-between", className)}>
      <div>
        <h1 className="text-h2 font-headline font-bold text-ink">{title}</h1>
        {description && <p className="mt-sp-1 max-w-2xl text-sm text-ink-faint">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-sp-2">{actions}</div>}
    </div>
  );
}

export function SectionTitle({ children, className }: { children: React.ReactNode; className?: string }) {
  return <h2 className={cn("mb-sp-4 text-h3 font-headline font-semibold text-ink", className)}>{children}</h2>;
}
