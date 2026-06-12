import Link from "next/link";
import { requireAuth } from "@/lib/core/auth";
import { db } from "@/lib/core/db";
import { isDemoMode } from "@/lib/core/env";
import { num, pct, ratio } from "@/lib/core/fmt";
import { PageHeader, SectionTitle } from "@/components/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardTitle } from "@/components/ui/card";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { buttonClasses } from "@/components/ui/button";
import { BarChart } from "@/components/bar-chart";
import {
  Mail, Send, MousePointerClick, Inbox, ShieldCheck, AlertTriangle,
  CheckCircle2, Server, Users, Sparkles, Workflow,
} from "lucide-react";

export default async function DashboardPage() {
  const { workspace } = await requireAuth();
  const wid = workspace.id;
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

  const [
    sent, delivered, opened, clicked, bounced, complained,
    mailboxes, domains, contactsCount, openThreads,
    suppressions, blacklisted, recentCampaigns, recentMessages,
    // Pôle outreach
    oSent, oDelivered, oBounced, replyThreads, interestedCount, runningSequences,
    // Pôle marketing
    mDelivered, mOpened, mClicked, liveFlows,
  ] = await Promise.all([
    db.emailMessage.count({ where: { workspaceId: wid, sentAt: { not: null } } }),
    db.emailEvent.count({ where: { type: "delivered", message: { workspaceId: wid } } }),
    db.emailEvent.count({ where: { type: "opened", message: { workspaceId: wid } } }),
    db.emailEvent.count({ where: { type: "clicked", message: { workspaceId: wid } } }),
    db.emailEvent.count({ where: { type: "bounced", message: { workspaceId: wid } } }),
    db.emailEvent.count({ where: { type: "complained", message: { workspaceId: wid } } }),
    db.mailbox.findMany({ where: { workspaceId: wid } }),
    db.domain.findMany({ where: { workspaceId: wid } }),
    db.contact.count({ where: { workspaceId: wid } }),
    db.inboxThread.count({ where: { workspaceId: wid, status: "open" } }),
    db.suppressionEntry.count({ where: { workspaceId: wid } }),
    db.blacklistCheck.count({ where: { workspaceId: wid, status: "listed" } }),
    db.campaign.findMany({ where: { workspaceId: wid }, orderBy: { updatedAt: "desc" }, take: 5 }),
    db.emailMessage.findMany({ where: { workspaceId: wid, createdAt: { gte: new Date(Date.now() - 14 * 86400_000) } }, select: { createdAt: true }, take: 5000 }),

    db.emailMessage.count({ where: { workspaceId: wid, source: "outreach", sentAt: { not: null } } }),
    db.emailEvent.count({ where: { type: "delivered", message: { workspaceId: wid, source: "outreach" } } }),
    db.emailEvent.count({ where: { type: "bounced", message: { workspaceId: wid, source: "outreach" } } }),
    db.inboxThread.count({ where: { workspaceId: wid } }),
    db.inboxThread.count({ where: { workspaceId: wid, category: "interested" } }),
    db.campaign.count({ where: { workspaceId: wid, type: "outreach", status: "running" } }),

    db.emailEvent.count({ where: { type: "delivered", message: { workspaceId: wid, source: "broadcast" } } }),
    db.emailEvent.count({ where: { type: "opened", message: { workspaceId: wid, source: "broadcast" } } }),
    db.emailEvent.count({ where: { type: "clicked", message: { workspaceId: wid, source: "broadcast" } } }),
    db.flow.count({ where: { workspaceId: wid, status: "live" } }),
  ]);

  const avgReputation = mailboxes.length
    ? Math.round(mailboxes.reduce((s, m) => s + m.reputationScore, 0) / mailboxes.length)
    : 0;
  const verifiedDomains = domains.filter((d) => d.status === "verified").length;
  const warmingCount = mailboxes.filter((m) => m.status === "warming").length;
  const pausedMailboxes = mailboxes.filter((m) => m.status === "paused");

  // Volumes 14 jours
  const days: { label: string; value: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400_000);
    const key = d.toISOString().slice(0, 10);
    const value = recentMessages.filter((m) => m.createdAt.toISOString().slice(0, 10) === key).length;
    days.push({ label: d.toLocaleDateString("fr-FR", { day: "2-digit" }), value });
  }

  const deliveryRate = sent ? (delivered / sent) * 100 : 0;
  const oReplyRate = oDelivered ? (replyThreads / oDelivered) * 100 : 0;
  const oBounceRate = oSent ? (oBounced / oSent) * 100 : 0;
  const mOpenRate = mDelivered ? (mOpened / mDelivered) * 100 : 0;
  const mClickRate = mDelivered ? (mClicked / mDelivered) * 100 : 0;

  // Alertes
  const alerts: { tone: "error" | "warning" | "info"; text: string; href: string }[] = [];
  if (blacklisted > 0) alerts.push({ tone: "error", text: `${blacklisted} entité(s) sur une blacklist`, href: "/deliverability" });
  pausedMailboxes.forEach((m) => alerts.push({ tone: "warning", text: `Boîte ${m.email} en pause (réputation ${m.reputationScore})`, href: "/infrastructure" }));
  if (domains.some((d) => d.status === "error")) alerts.push({ tone: "warning", text: "Des enregistrements DNS échouent la vérification", href: "/infrastructure" });
  if (sent && bounced / sent > 0.03) alerts.push({ tone: "error", text: `Taux de bounce élevé (${ratio(bounced, sent)})`, href: "/deliverability" });

  const hasData = mailboxes.length || contactsCount || sent;

  return (
    <>
      <PageHeader
        title="Tableau de bord"
        description="Vos deux pôles en un coup d'œil : cold outreach de masse et email marketing pour vos apps."
        actions={
          <>
            <Link href="/outreach" className={buttonClasses({})}>
              <Send size={16} /> Campagne outreach
            </Link>
            <Link href="/automations" className={buttonClasses({ variant: "secondary" })}>
              <Workflow size={16} /> Flow marketing
            </Link>
          </>
        }
      />

      {!hasData && (
        <Card className="mb-sp-6 border-primary/30 bg-primary-soft/40">
          <div className="flex items-start gap-sp-4">
            <Sparkles className="mt-sp-1 text-primary" />
            <div>
              <CardTitle>Bienvenue sur Luunch Mail</CardTitle>
              <p className="mt-sp-2 text-sm text-ink-muted">
                Lancez la donnée de démonstration avec <code className="rounded bg-surface px-sp-1 font-mono text-xs">pnpm db:seed</code>,
                ou commencez par connecter un domaine et une boîte d'envoi.
              </p>
              <div className="mt-sp-4 flex flex-wrap gap-sp-2">
                <Link href="/start" className={buttonClasses({ size: "sm" })}>Lancer l'assistant de démarrage</Link>
                <Link href="/audiences" className={buttonClasses({ size: "sm", variant: "secondary" })}>Marketing : importer des contacts</Link>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* ── Pôle 1 : Cold outreach — se pilote au taux de réponse ── */}
      <div className="mb-sp-2 flex items-center justify-between">
        <SectionTitle className="mb-0">Cold outreach</SectionTitle>
        <Link href="/outreach" className="text-sm font-medium text-primary hover:underline">Voir les campagnes →</Link>
      </div>
      <div className="grid grid-cols-2 gap-sp-4 lg:grid-cols-4">
        <StatCard label="E-mails outreach envoyés" value={num(oSent)} icon={Send} hint={`${runningSequences} campagne(s) en cours`} />
        <StatCard label="Taux de réponse" value={pct(oReplyRate)} icon={Inbox} hint="le KPI nº1 du cold email" deltaTone={oReplyRate >= 3 ? "up" : "neutral"} delta={oReplyRate >= 3 ? "≥ 3 % : bon" : undefined} />
        <StatCard label="Réponses positives" value={num(interestedCount)} icon={Sparkles} hint="prospects intéressés" deltaTone="up" />
        <StatCard label="Taux de bounce" value={pct(oBounceRate)} icon={AlertTriangle} deltaTone={oBounceRate <= 3 ? "up" : "down"} delta={oBounceRate <= 3 ? "sous 3 %" : "liste à nettoyer"} />
      </div>

      {/* ── Pôle 2 : Email marketing — se pilote à l'engagement ── */}
      <div className="mb-sp-2 mt-sp-6 flex items-center justify-between">
        <SectionTitle className="mb-0">Email marketing</SectionTitle>
        <Link href="/automations" className="text-sm font-medium text-primary hover:underline">Voir les automations →</Link>
      </div>
      <div className="grid grid-cols-2 gap-sp-4 lg:grid-cols-4">
        <StatCard label="E-mails marketing délivrés" value={num(mDelivered)} icon={Mail} hint={`${liveFlows} flow(s) actif(s)`} />
        <StatCard label="Taux d'ouverture" value={pct(mOpenRate)} icon={MousePointerClick} hint="broadcasts & flows" />
        <StatCard label="Taux de clic" value={pct(mClickRate)} icon={MousePointerClick} />
        <StatCard label="Réponses ouvertes" value={num(openThreads)} icon={Inbox} hint="dans l'inbox unifiée" />
      </div>

      <div className="mt-sp-6 grid gap-sp-6 lg:grid-cols-3">
        {/* Volumes */}
        <Card className="lg:col-span-2">
          <CardTitle>Volume d'envoi (14 jours)</CardTitle>
          <div className="mt-sp-5">
            <BarChart data={days} />
          </div>
          <div className="mt-sp-5 grid grid-cols-2 gap-sp-4 sm:grid-cols-4">
            <MiniStat label="Délivrés" value={num(delivered)} />
            <MiniStat label="Ouverts" value={num(opened)} />
            <MiniStat label="Cliqués" value={num(clicked)} />
            <MiniStat label="Bounces" value={num(bounced)} tone="error" />
          </div>
        </Card>

        {/* Santé délivrabilité */}
        <Card>
          <CardTitle>Santé délivrabilité</CardTitle>
          <div className="mt-sp-5 space-y-sp-4">
            <HealthRow icon={ShieldCheck} label="Réputation moyenne" value={`${avgReputation}/100`}>
              <Progress value={avgReputation} tone={avgReputation >= 80 ? "success" : avgReputation >= 60 ? "warning" : "error"} />
            </HealthRow>
            <HealthRow icon={Server} label="Domaines vérifiés" value={`${verifiedDomains}/${domains.length || 0}`}>
              <Progress value={verifiedDomains} max={domains.length || 1} tone="primary" />
            </HealthRow>
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-sp-2 text-ink-muted"><Users size={16} /> Contacts</span>
              <span className="font-medium text-ink">{num(contactsCount)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-ink-muted">Boîtes en chauffe</span>
              <Badge tone={warmingCount ? "warning" : "neutral"}>{warmingCount}</Badge>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-ink-muted">Liste de suppression</span>
              <span className="font-medium text-ink">{num(suppressions)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-ink-muted">Plaintes spam</span>
              <Badge tone={complained ? "error" : "success"}>{complained}</Badge>
            </div>
          </div>
        </Card>
      </div>

      {/* Alertes + campagnes */}
      <div className="mt-sp-6 grid gap-sp-6 lg:grid-cols-3">
        <Card>
          <CardTitle>Alertes</CardTitle>
          <div className="mt-sp-4 space-y-sp-2">
            {alerts.length === 0 ? (
              <div className="flex items-center gap-sp-2 rounded-md bg-success-soft px-sp-3 py-sp-3 text-sm text-success-fg">
                <CheckCircle2 size={18} /> Tout va bien — aucune alerte.
              </div>
            ) : (
              alerts.slice(0, 6).map((a, i) => (
                <Link key={i} href={a.href} className={`flex items-center gap-sp-2 rounded-md px-sp-3 py-sp-2 text-sm transition-colors hover:opacity-80 ${a.tone === "error" ? "bg-error-soft text-error" : a.tone === "warning" ? "bg-warning-soft text-warning-fg" : "bg-primary-soft text-primary"}`}>
                  <AlertTriangle size={16} className="shrink-0" /> {a.text}
                </Link>
              ))
            )}
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between">
            <CardTitle>Campagnes récentes</CardTitle>
            <Link href="/outreach" className="text-sm font-medium text-primary hover:underline">Tout voir</Link>
          </div>
          <div className="mt-sp-4 divide-y divide-fill-muted">
            {recentCampaigns.length === 0 ? (
              <p className="py-sp-5 text-center text-sm text-ink-faint">Aucune campagne pour l'instant.</p>
            ) : (
              recentCampaigns.map((c) => {
                const stats = JSON.parse(c.stats || "{}");
                return (
                  <Link key={c.id} href={c.type === "broadcast" ? "/automations" : "/outreach"} className="flex items-center justify-between gap-sp-3 py-sp-3 hover:opacity-80">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-ink">{c.name}</p>
                      <p className="text-xs text-ink-faint">{c.type === "broadcast" ? "Broadcast" : "Cold outreach"} · {num(stats.sent ?? 0)} envoyés · {num(stats.opened ?? 0)} ouverts</p>
                    </div>
                    <StatusBadge status={c.status} />
                  </Link>
                );
              })
            )}
          </div>
        </Card>
      </div>

      {isDemoMode() && (
        <p className="mt-sp-6 text-center text-xs text-ink-disabled">
          Mode démo actif — les events (ouvertures, clics, bounces) sont simulés par le worker. Configurez <code className="font-mono">RESEND_API_KEY</code> pour l'envoi réel.
        </p>
      )}
    </>
  );
}

function MiniStat({ label, value, tone }: { label: string; value: string; tone?: "error" }) {
  return (
    <div>
      <p className="text-xs text-ink-faint">{label}</p>
      <p className={`text-h4 font-headline font-bold ${tone === "error" ? "text-error" : "text-ink"}`}>{value}</p>
    </div>
  );
}

function HealthRow({ icon: Icon, label, value, children }: { icon: any; label: string; value: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-sp-2 flex items-center justify-between text-sm">
        <span className="flex items-center gap-sp-2 text-ink-muted"><Icon size={16} /> {label}</span>
        <span className="font-medium text-ink">{value}</span>
      </div>
      {children}
    </div>
  );
}
