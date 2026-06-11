import { cn } from "@/lib/cn";

/** Tableau / liste normé (DESIGN.md §Lists) — 12px/16px padding, divider #F3F4F6, hover #F9FAFB. */
export function Table({ className, ...props }: React.TableHTMLAttributes<HTMLTableElement>) {
  return (
    <div className="overflow-x-auto rounded-md border border-line bg-surface">
      <table className={cn("w-full border-collapse text-sm", className)} {...props} />
    </div>
  );
}

export function THead({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className={cn("border-b border-line bg-fill-subtle", className)} {...props} />;
}

export function TH({ className, ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return <th className={cn("px-sp-4 py-sp-3 text-left text-xs font-semibold uppercase tracking-wide text-ink-faint", className)} {...props} />;
}

export function TR({ className, ...props }: React.HTMLAttributes<HTMLTableRowElement>) {
  return <tr className={cn("border-b border-fill-muted transition-colors last:border-0 hover:bg-fill-subtle", className)} {...props} />;
}

export function TD({ className, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn("px-sp-4 py-sp-3 align-middle text-ink", className)} {...props} />;
}
