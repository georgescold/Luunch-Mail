import { cn } from "@/lib/core/cn";

/** Carte normée DESIGN.md : fond blanc, bordure chaude, radius 10px, padding 24px.
 *  La carte tient par sa bordure — ombre minimale, pas d'effet flottant. */
export function Card({ className, hover = false, ...props }: React.HTMLAttributes<HTMLDivElement> & { hover?: boolean }) {
  return (
    <div
      className={cn(
        "rounded-md border border-line bg-surface p-sp-5 shadow-sm transition-[box-shadow,border-color] duration-200",
        hover && "hover:border-line-strong hover:shadow-md",
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("mb-sp-4 flex items-start justify-between gap-sp-3", className)} {...props} />;
}

export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn("text-h4 font-headline font-semibold text-ink", className)} {...props} />;
}

export function CardDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-sm text-ink-faint", className)} {...props} />;
}
