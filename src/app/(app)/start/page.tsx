import Link from "next/link";
import { requireAuth } from "@/lib/core/auth";
import { db } from "@/lib/core/db";
import { googleConfigured } from "@/lib/core/env";
import { hasRealSmtp } from "@/lib/email/mailbox-creds";
import { isGmailConnected } from "@/lib/integrations/google";
import { hasCheapInboxes } from "@/lib/integrations/cheapinboxes";
import { PageHeader } from "@/components/page-header";
import { Card, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { AddDomainModal } from "@/components/infrastructure/add-domain-modal";
import { AddMailboxModal } from "@/components/infrastructure/add-mailbox-modal";
import { MailboxTester } from "@/components/onboarding/mailbox-tester";
import { cn } from "@/lib/core/cn";
import {
  Check, Globe, Server, Plug, Rocket, Send, Users, ShieldCheck, CircleDot,
} from "lucide-react";

export default async function StartPage() {
  const { workspace, user } = await requireAuth();
  const wid = workspace.id;

  const [domains, mailboxes, testSent, ws] = await Promise.all([
    db.domain.findMany({ where: { workspaceId: wid } }),
    db.mailbox.findMany({ where: { workspaceId: wid } }),
    db.emailMessage.count({ where: { workspaceId: wid, subject: { startsWith: "Test Luunch Mail" } } }),
    db.workspace.findUnique({ where: { id: wid }, select: { integrations: true } }),
  ]);
  const ciConnected = ws ? hasCheapInboxes(ws.integrations) : false;

  const dnsVerified = domains.some((d) => d.status === "verified");
  const realMailboxes = mailboxes.filter((m) => hasRealSmtp(m.smtpConfig) || isGmailConnected(m.provider, m.oauthData));
  const mailboxOptions = mailboxes
    .map((m) => ({
      id: m.id,
      email: m.email,
      hasSmtp: hasRealSmtp(m.smtpConfig),
      canSend: hasRealSmtp(m.smtpConfig) || isGmailConnected(m.provider, m.oauthData),
    }))
    .filter((m) => m.canSend);

  const steps = {
    domain: domains.length > 0,
    dns: dnsVerified,
    mailbox: realMailboxes.length > 0,
    test: testSent > 0,
  };
  const doneCount = Object.values(steps).filter(Boolean).length;

  return (
    <>
      <PageHeader
        title="Assistant de démarrage"
        description="4 étapes pour envoyer vos premiers vrais e-mails. Suivez-les dans l'ordre — chaque étape se coche automatiquement."
        actions={<Badge tone={doneCount === 4 ? "success" : "primary"}>{doneCount}/4 terminées</Badge>}
      />

      <div className="space-y-sp-5">
        <Step
          n={1}
          done={steps.domain}
          icon={Globe}
          title="Connecter un domaine d'envoi"
          desc="Le domaine depuis lequel vous enverrez (idéalement un domaine secondaire dédié à la prospection, pas votre domaine principal)."
        >
          <p className="text-sm text-ink-muted">
            Luunch Mail génère automatiquement les enregistrements <strong>SPF, DKIM et DMARC</strong> à copier chez votre
            hébergeur de domaine (OVH, Cloudflare, Namecheap…). Sans eux, vos e-mails partent en spam.
          </p>
          <div className="mt-sp-4 flex flex-wrap items-center gap-sp-3">
            <AddDomainModal />
            {domains.length > 0 && (
              <Link href="/infrastructure" className={buttonClasses({ variant: "secondary", size: "sm" })}>
                Voir les enregistrements DNS à copier
              </Link>
            )}
          </div>
          {domains.length > 0 && (
            <p className="mt-sp-3 text-xs text-ink-faint">
              {domains.length} domaine(s) ajouté(s) · {steps.dns ? "DNS vérifié ✓" : "DNS pas encore vérifié — copiez les enregistrements puis cliquez « Vérifier » dans Infrastructure."}
            </p>
          )}
        </Step>

        <Step
          n={2}
          done={steps.mailbox}
          icon={Server}
          title="Connecter une boîte d'envoi (achetée)"
          desc="Branchez les boîtes que vous avez achetées chez un fournisseur outreach (Mailreef, AeroSend, Zapmail…) avec leurs identifiants SMTP + IMAP."
        >
          <div className="rounded-md bg-fill-subtle p-sp-4 text-sm text-ink-muted">
            <p className="mb-sp-2 font-medium text-ink">Où trouver ces informations ?</p>
            <p>
              Votre vendeur de boîtes vous fournit, pour chaque adresse : un <strong>hôte SMTP</strong> (ex. smtp.maboite.fr),
              un <strong>port</strong> (587 ou 465), un <strong>identifiant</strong> et un <strong>mot de passe</strong>.
              Le mot de passe est chiffré avant d'être stocké, et chaque boîte enverra par son propre serveur (rotation).
            </p>
          </div>
          <div className="mt-sp-4 flex flex-wrap items-center gap-sp-3">
            <AddMailboxModal googleConfigured={googleConfigured()} cheapInboxesConnected={ciConnected} />
            {realMailboxes.length > 0 && (
              <span className="text-xs text-ink-faint">{realMailboxes.length} boîte(s) connectée(s) ✓</span>
            )}
          </div>
        </Step>

        <Step
          n={3}
          done={steps.test}
          icon={Plug}
          title="Tester votre boîte"
          desc="Vérifiez la connexion au serveur, puis envoyez-vous un vrai e-mail pour confirmer que tout fonctionne."
        >
          <MailboxTester mailboxes={mailboxOptions} defaultTo={user.email} />
        </Step>

        <Step
          n={4}
          done={false}
          icon={Rocket}
          title="C'est parti !"
          desc="Votre infrastructure est prête. Choisissez votre pôle pour lancer votre première campagne."
          last
        >
          <div className="grid gap-sp-3 sm:grid-cols-2">
            <Link href="/outreach" className="group rounded-md border border-line bg-surface p-sp-4 transition-colors hover:border-primary hover:bg-primary-soft/30">
              <span className="flex items-center gap-sp-2 font-medium text-ink"><Send size={16} className="text-primary" /> Cold outreach</span>
              <span className="mt-sp-1 block text-xs text-ink-faint">Créer une séquence de prospection multi-étapes.</span>
            </Link>
            <Link href="/audiences" className="group rounded-md border border-line bg-surface p-sp-4 transition-colors hover:border-primary hover:bg-primary-soft/30">
              <span className="flex items-center gap-sp-2 font-medium text-ink"><Users size={16} className="text-primary" /> Email marketing</span>
              <span className="mt-sp-1 block text-xs text-ink-faint">Importer vos contacts opt-in et créer un flow.</span>
            </Link>
          </div>
        </Step>
      </div>

      <Card className="mt-sp-6 border-primary/30 bg-primary-soft/30">
        <div className="flex items-start gap-sp-3">
          <ShieldCheck className="mt-sp-1 shrink-0 text-primary" />
          <div>
            <CardTitle>Bon à savoir</CardTitle>
            <CardDescription className="mt-sp-1">
              Tant qu'aucune boîte SMTP réelle n'est connectée, Luunch Mail reste en <strong>mode démo</strong> (aucun e-mail réel,
              events simulés). Dès qu'une boîte est branchée avec ses identifiants, l'outreach part <strong>réellement</strong> par
              cette boîte — et les réponses de vos prospects remontent automatiquement dans la Master Inbox (relève IMAP).
            </CardDescription>
          </div>
        </div>
      </Card>
    </>
  );
}

function Step({
  n, done, icon: Icon, title, desc, children, last,
}: {
  n: number; done: boolean; icon: any; title: string; desc: string; children: React.ReactNode; last?: boolean;
}) {
  return (
    <div className="relative pl-sp-8">
      {/* Ligne verticale du stepper */}
      {!last && <span className="absolute left-[15px] top-9 h-[calc(100%-12px)] w-px bg-line" />}
      {/* Pastille d'étape */}
      <span
        className={cn(
          "absolute left-0 top-1 flex h-8 w-8 items-center justify-center rounded-circle border-2 text-sm font-semibold",
          done ? "border-success bg-success text-white" : "border-primary bg-primary-soft text-primary",
        )}
      >
        {done ? <Check size={16} /> : n}
      </span>

      <Card hover>
        <div className="mb-sp-3 flex items-start justify-between gap-sp-3">
          <div>
            <CardTitle className="flex items-center gap-sp-2">
              <Icon size={18} className="text-primary" /> {title}
            </CardTitle>
            <CardDescription className="mt-sp-1">{desc}</CardDescription>
          </div>
          {done ? <Badge tone="success">Terminé</Badge> : <Badge tone="neutral"><CircleDot size={11} /> À faire</Badge>}
        </div>
        {children}
      </Card>
    </div>
  );
}
