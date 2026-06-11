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
      {/* Panneau marque (gauche) */}
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-[#0B1A12] p-sp-8 text-white lg:flex">
        {/* Halos de lumière (vert / violet / bleu), posés en couches */}
        <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-circle bg-primary/35 blur-[110px]" />
        <div className="pointer-events-none absolute -bottom-40 right-0 h-[28rem] w-[28rem] rounded-circle bg-tertiary/25 blur-[130px]" />
        <div className="pointer-events-none absolute right-24 top-1/3 h-40 w-40 rounded-circle bg-secondary/20 blur-[90px]" />
        {/* Trame de points discrète */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.13]"
          style={{
            backgroundImage: "radial-gradient(rgba(255,255,255,0.5) 1px, transparent 1px)",
            backgroundSize: "26px 26px",
          }}
        />

        <div className="relative">
          <Logo size="lg" className="[&_span:last-child]:text-white" />
        </div>

        <div className="relative max-w-md space-y-sp-6">
          <h1 className="text-h1 font-headline font-bold leading-tight">
            Toute la chaîne de l'e-mail,
            <br />
            <span className="text-primary">dans un seul produit.</span>
          </h1>
          <p className="text-white/75">
            Le meilleur de Smartlead, Instantly, Klaviyo, ActiveCampaign et Resend — sans le superflu.
          </p>
          <ul className="space-y-sp-3">
            {POINTS.map((p) => (
              <li
                key={p.title}
                className="group flex items-start gap-sp-3 rounded-md border border-white/10 bg-white/[0.04] p-sp-4 backdrop-blur-sm transition-colors duration-200 hover:border-primary/40 hover:bg-white/[0.07]"
              >
                <span className="mt-px flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/15 text-primary transition-colors duration-200 group-hover:bg-primary group-hover:text-white">
                  <p.icon size={18} />
                </span>
                <span>
                  <span className="block text-sm font-medium text-white">{p.title}</span>
                  <span className="block text-xs text-white/60">{p.text}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-sm text-white/40">© {new Date().getFullYear()} Luunch Mail — fait pour les équipes francophones</p>
      </div>

      {/* Formulaire (droite) */}
      <div className="flex w-full flex-col items-center justify-center bg-fill-subtle px-sp-5 py-sp-8 lg:w-1/2">
        <div className="mb-sp-6 lg:hidden"><Logo size="lg" /></div>
        <div className="w-full max-w-sm animate-pop-in">{children}</div>
      </div>
    </div>
  );
}
