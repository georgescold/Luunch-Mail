import { Logo } from "@/components/brand";
import { ShieldCheck, Zap, Inbox } from "lucide-react";

const POINTS = [
  { icon: ShieldCheck, title: "Délivrabilité de classe mondiale", text: "SPF, DKIM, DMARC, warmup automatique et tests de placement." },
  { icon: Zap, title: "Trois moteurs d'envoi", text: "Cold outreach, marketing automation et API transactionnelle." },
  { icon: Inbox, title: "Inbox unifiée + IA", text: "Toutes vos réponses au même endroit, triées et pré-rédigées." },
];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      {/* Panneau marque (gauche) — sapin profond, composition éditoriale */}
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-pine p-sp-8 text-ink-inverse lg:flex">
        {/* Lune : grand disque géométrique en bas à droite, croissant doré */}
        <div className="pointer-events-none absolute -bottom-40 -right-32 h-[30rem] w-[30rem]">
          <div className="absolute inset-0 rounded-circle bg-pine-raised" />
          <div className="absolute inset-0 -translate-x-5 -translate-y-5 rounded-circle bg-pine" />
          <div className="absolute right-14 top-16 h-2 w-2 rounded-circle bg-moon/80" />
        </div>

        <div className="relative">
          <Logo size="lg" className="[&_span:last-child]:text-ink-inverse" />
        </div>

        <div className="relative max-w-md">
          <p className="mb-sp-3 font-mono text-xs uppercase tracking-[0.18em] text-moon">
            Plateforme e-mail tout-en-un
          </p>
          <h1 className="text-[40px] font-headline font-bold leading-[1.1] tracking-tight">
            Toute la chaîne de l&apos;e-mail, dans un seul produit.
          </h1>
          <p className="mt-sp-4 text-body text-ink-inverse/70">
            Le meilleur de Smartlead, Instantly, Klaviyo, ActiveCampaign et Resend — sans le superflu.
          </p>

          <ul className="mt-sp-6">
            {POINTS.map((p) => (
              <li key={p.title} className="flex items-start gap-sp-4 border-t border-white/10 py-sp-4">
                <p.icon size={18} className="mt-px shrink-0 text-moon" />
                <span>
                  <span className="block text-sm font-semibold">{p.title}</span>
                  <span className="block text-sm text-ink-inverse/60">{p.text}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-sm text-ink-inverse/45">
          © {new Date().getFullYear()} Luunch Mail — fait pour les équipes francophones
        </p>
      </div>

      {/* Formulaire (droite) */}
      <div className="flex w-full flex-col items-center justify-center bg-paper px-sp-5 py-sp-8 lg:w-1/2">
        <div className="mb-sp-6 lg:hidden"><Logo size="lg" /></div>
        <div className="w-full max-w-sm animate-pop-in">{children}</div>
      </div>
    </div>
  );
}
