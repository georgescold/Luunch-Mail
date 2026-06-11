import Link from "next/link";
import { Hourglass, ArrowLeft, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { cn } from "@/lib/cn";

/** Écran pleine page pour une fonctionnalité verrouillée « Bientôt disponible ». */
export function ComingSoon({
  title,
  description,
  bullets = [],
}: {
  title: string;
  description: string;
  bullets?: string[];
}) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <span className="mb-sp-5 flex h-16 w-16 animate-float-soft items-center justify-center rounded-pill bg-primary-soft text-primary">
        <Hourglass size={30} />
      </span>
      <Badge tone="primary" className="mb-sp-3">
        <Sparkles size={12} /> Bientôt disponible
      </Badge>
      <h1 className="text-h2 font-headline font-bold text-ink">{title}</h1>
      <p className="mt-sp-2 max-w-md text-sm text-ink-faint">{description}</p>

      {bullets.length > 0 && (
        <ul className="mt-sp-5 space-y-sp-2 text-left">
          {bullets.map((b) => (
            <li key={b} className="flex items-center gap-sp-2 text-sm text-ink-muted">
              <span className="h-1.5 w-1.5 shrink-0 rounded-circle bg-primary" /> {b}
            </li>
          ))}
        </ul>
      )}

      <Link href="/dashboard" className={cn(buttonClasses({ variant: "secondary" }), "mt-sp-6")}>
        <ArrowLeft size={16} /> Retour au tableau de bord
      </Link>
    </div>
  );
}

/** Variante compacte (à l'intérieur d'un onglet ou d'une carte). */
export function ComingSoonInline({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-md border border-dashed border-line bg-fill-subtle px-sp-5 py-sp-8 text-center">
      <span className="mb-sp-3 flex h-12 w-12 items-center justify-center rounded-pill bg-primary-soft text-primary">
        <Hourglass size={22} />
      </span>
      <Badge tone="primary" className="mb-sp-2">Bientôt disponible</Badge>
      <h3 className="text-h4 font-headline font-semibold text-ink">{title}</h3>
      <p className="mt-sp-1 max-w-sm text-sm text-ink-faint">{description}</p>
    </div>
  );
}
