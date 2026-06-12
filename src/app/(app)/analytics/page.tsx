import Link from "next/link";
import { requireAuth } from "@/lib/core/auth";
import { db } from "@/lib/core/db";
import { isDemoMode } from "@/lib/core/env";
import { num, pct, money, parseJson } from "@/lib/core/fmt";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardTitle, CardDescription } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { EmptyState } from "@/components/ui/empty-state";
import { Tabs } from "@/components/ui/tabs";
import { Table, THead, TH, TR, TD } from "@/components/ui/table";
import { buttonClasses } from "@/components/ui/button";
import { BarChart, StackBar } from "@/components/bar-chart";
import {
  Download, CheckCircle2, AlertTriangle, ShieldAlert, MousePointerClick,
  Reply, MailX, Link2, Inbox, Server, Target, BarChart3, Send, Sparkles, Workflow,
} from "lucide-react";

type CampaignStats = {
  sent?: number; delivered?: number; opened?: number; clicked?: number;
  replied?: number; bounced?: number; revenue?: number;
};

export default async function AnalyticsPage() {
  const { workspace } = await requireAuth();
  const wid = workspace.id;
  const since = new Date(Date.now() - 14 * 86400_000);

  const [
    // ---- Pôle outreach (source = "outreach") ----
    oSent, oDelivered, oOpened, oBounced,
    interestedCount, interestedByCampaign, replyThreads,
    // ---- Pôle marketing (source = "broadcast" + flows) ----
    mSent, mDelivered, mOpened, mClicked, mUnsubEvents,
    // ---- Global / partagé ----
    sent, delivered, opened, clicked, bounced, complained, unsubscribedEvents,
    contactsCount, suppressUnsub, suppressComplaint, lastPlacement,
    recentMessages, engagementEvents, clickEvents, mailboxes, flows, campaigns,
  ] = await Promise.all([
    db.emailMessage.count({ where: { workspaceId: wid, source: "outreach", sentAt: { not: null } } }),
    db.emailEvent.count({ where: { type: "delivered", message: { workspaceId: wid, source: "outreach" } } }),
    db.emailEvent.count({ where: { type: "opened", message: { workspaceId: wid, source: "outreach" } } }),
    db.emailEvent.count({ where: { type: "bounced", message: { workspaceId: wid, source: "outreach" } } }),
    db.inboxThread.count({ where: { workspaceId: wid, category: "interested" } }),
    db.inboxThread.groupBy({
      by: ["campaignId"],
      where: { workspaceId: wid, category: "interested", campaignId: { not: null } },
      _count: { _all: true },
    }),
    db.inboxThread.count({ where: { workspaceId: wid } }),

    db.emailMessage.count({ where: { workspaceId: wid, source: "broadcast", sentAt: { not: null } } }),
    db.emailEvent.count({ where: { type: "delivered", message: { workspaceId: wid, source: "broadcast" } } }),
    db.emailEvent.count({ where: { type: "opened", message: { workspaceId: wid, source: "broadcast" } } }),
    db.emailEvent.count({ where: { type: "clicked", message: { workspaceId: wid, source: "broadcast" } } }),
    db.emailEvent.count({ where: { type: "unsubscribed", message: { workspaceId: wid, source: "broadcast" } } }),

    db.emailMessage.count({ where: { workspaceId: wid, sentAt: { not: null } } }),
    db.emailEvent.count({ where: { type: "delivered", message: { workspaceId: wid } } }),
    db.emailEvent.count({ where: { type: "opened", message: { workspaceId: wid } } }),
    db.emailEvent.count({ where: { type: "clicked", message: { workspaceId: wid } } }),
    db.emailEvent.count({ where: { type: "bounced", message: { workspaceId: wid } } }),
    db.emailEvent.count({ where: { type: "complained", message: { workspaceId: wid } } }),
    db.emailEvent.count({ where: { type: "unsubscribed", message: { workspaceId: wid } } }),
    db.contact.count({ where: { workspaceId: wid } }),
    db.suppressionEntry.count({ where: { workspaceId: wid, reason: "unsubscribe" } }),
    db.suppressionEntry.count({ where: { workspaceId: wid, reason: "complaint" } }),
    db.placementTest.findFirst({ where: { workspaceId: wid }, orderBy: { createdAt: "desc" } }),
    db.emailMessage.findMany({
      where: { workspaceId: wid, createdAt: { gte: since } },
      select: { createdAt: true, source: true },
      take: 8000,
    }),
    db.emailEvent.findMany({
      where: { type: { in: ["opened", "clicked"] }, occurredAt: { gte: since }, message: { workspaceId: wid } },
      select: { type: true, occurredAt: true, message: { select: { source: true } } },
      take: 12000,
    }),
    db.emailEvent.findMany({
      where: { type: "clicked", message: { workspaceId: wid, source: "broadcast" } },
      select: { data: true },
      take: 5000,
    }),
    db.mailbox.findMany({ where: { workspaceId: wid }, orderBy: { sentToday: "desc" } }),
    db.flow.findMany({ where: { workspaceId: wid }, orderBy: { updatedAt: "desc" } }),
    db.campaign.findMany({ where: { workspaceId: wid }, orderBy: { updatedAt: "desc" } }),
  ]);

  // ---- Taux outreach (le taux de réponse est LE KPI du cold email) ----
  const oReplyRate = oDelivered ? (replyThreads / oDelivered) * 100 : 0;
  const oInterestedRate = replyThreads ? (interestedCount / replyThreads) * 100 : 0;
  const oBounceRate = oSent ? (oBounced / oSent) * 100 : 0;
  const oOpenRate = oDelivered ? (oOpened / oDelivered) * 100 : 0;
  const interestedMap = new Map(interestedByCampaign.map((g) => [g.campaignId, g._count._all]));

  // ---- Taux marketing ----
  const mOpenRate = mDelivered ? (mOpened / mDelivered) * 100 : 0;
  const mClickRate = mDelivered ? (mClicked / mDelivered) * 100 : 0;
  const mCtor = mOpened ? (mClicked / mOpened) * 100 : 0;
  const mUnsubRate = mDelivered ? (mUnsubEvents / mDelivered) * 100 : 0;

  // ---- Taux globaux (délivrabilité / opt-out, communs aux deux pôles) ----
  const deliveryRate = sent ? (delivered / sent) * 100 : 0;
  const bounceRate = sent ? (bounced / sent) * 100 : 0;
  const complaintRate = sent ? (complained / sent) * 100 : 0;
  const unsubRate = delivered ? ((suppressUnsub + unsubscribedEvents) / delivered) * 100 : 0;
  const optoutComplaintRate = delivered ? (suppressComplaint / delivered) * 100 : 0;

  const hasData = sent > 0 || mailboxes.length > 0 || contactsCount > 0;

  // ---- Séries 14 jours par pôle ----
  const dayKeys: { key: string; label: string }[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400_000);
    dayKeys.push({ key: d.toISOString().slice(0, 10), label: d.toLocaleDateString("fr-FR", { day: "2-digit" }) });
  }
  const bump = (map: Map<string, number>, k: string) => map.set(k, (map.get(k) ?? 0) + 1);
  const oSentByDay = new Map<string, number>();
  const mSentByDay = new Map<string, number>();
  for (const m of recentMessages) {
    const k = m.createdAt.toISOString().slice(0, 10);
    if (m.source === "outreach") bump(oSentByDay, k);
    else if (m.source === "broadcast") bump(mSentByDay, k);
  }
  const mOpenByDay = new Map<string, number>();
  const mClickByDay = new Map<string, number>();
  for (const e of engagementEvents) {
    if (e.message.source !== "broadcast") continue;
    const k = e.occurredAt.toISOString().slice(0, 10);
    if (e.type === "opened") bump(mOpenByDay, k);
    else bump(mClickByDay, k);
  }
  const series = (m: Map<string, number>) => dayKeys.map((d) => ({ label: d.label, value: m.get(d.key) ?? 0 }));

  // ---- Tables par campagne, par pôle ----
  const rows = (type: "outreach" | "broadcast") =>
    campaigns
      .filter((c) => c.type === type)
      .map((c) => {
        const s = parseJson<CampaignStats>(c.stats, {});
        return {
          id: c.id, name: c.name, status: c.status,
          sent: s.sent ?? 0, delivered: s.delivered ?? 0, opened: s.opened ?? 0,
          clicked: s.clicked ?? 0, replied: s.replied ?? 0, bounced: s.bounced ?? 0,
          revenue: s.revenue ?? 0, interested: interestedMap.get(c.id) ?? 0,
        };
      })
      .sort((a, b) => b.sent - a.sent);
  const outreachRows = rows("outreach");
  const broadcastRows = rows("broadcast");

  const flowRows = flows
    .map((f) => {
      const s = parseJson<{ entered?: number; completed?: number; revenue?: number }>(f.stats, {});
      return { id: f.id, name: f.name, status: f.status, entered: s.entered ?? 0, completed: s.completed ?? 0, revenue: s.revenue ?? 0 };
    })
    .sort((a, b) => b.revenue - a.revenue);
  const totalFlowRevenue = flowRows.reduce((s, f) => s + f.revenue, 0);
  const totalBroadcastRevenue = broadcastRows.reduce((s, c) => s + c.revenue, 0);

  // ---- Top liens cliqués (marketing) ----
  const linkCounts = new Map<string, number>();
  for (const e of clickEvents) {
    const parsed = parseJson<{ url?: string; link?: string; href?: string }>(e.data, {});
    const url = parsed.url || parsed.link || parsed.href;
    if (url) linkCounts.set(url, (linkCounts.get(url) ?? 0) + 1);
  }
  const topLinks = [...linkCounts.entries()]
    .map(([url, count]) => ({ url, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // ============================ ONGLET COLD OUTREACH ============================

  const outreachTab = (
    <div className="space-y-sp-6">
      <div className="grid grid-cols-2 gap-sp-4 lg:grid-cols-4">
        <StatCard label="E-mails outreach envoyés" value={num(oSent)} icon={Send} hint="cumul des campagnes" />
        <StatCard
          label="Taux de réponse"
          value={pct(oReplyRate)}
          icon={Reply}
          hint="le KPI nº1 du cold email"
          deltaTone={oReplyRate >= 3 ? "up" : "neutral"}
          delta={oReplyRate >= 3 ? "≥ 3 % : bon" : undefined}
        />
        <StatCard
          label="Réponses positives"
          value={num(interestedCount)}
          icon={Sparkles}
          hint={replyThreads ? `${pct(oInterestedRate, 0)} des réponses` : undefined}
          deltaTone="up"
        />
        <StatCard
          label="Taux de bounce"
          value={pct(oBounceRate)}
          icon={AlertTriangle}
          deltaTone={oBounceRate <= 3 ? "up" : "down"}
          delta={oBounceRate <= 3 ? "sous le seuil 3 %" : "liste à nettoyer"}
        />
      </div>

      <Card>
        <CardTitle>Volume outreach (14 jours)</CardTitle>
        <CardDescription>
          E-mails de campagne envoyés par jour. Ouverture : {pct(oOpenRate, 0)} — indicative seulement, le tracking
          d&apos;ouverture en cold email est peu fiable (pixel souvent bloqué) ; pilotez au taux de réponse.
        </CardDescription>
        <div className="mt-sp-5">
          {oSent > 0 ? (
            <BarChart data={series(oSentByDay)} tone="primary" height={140} />
          ) : (
            <EmptyState
              icon={Send}
              title="Aucun envoi outreach"
              description="Lancez une campagne pour suivre ici vos volumes, réponses et réponses positives."
              action={<Link href="/outreach" className={buttonClasses({ size: "sm" })}>Créer une campagne</Link>}
            />
          )}
        </div>
      </Card>

      <Card>
        <CardTitle>Performance par campagne</CardTitle>
        <CardDescription>Envoyés, réponses et intéressés — cliquez pour ouvrir la campagne ou ses réponses.</CardDescription>
        <div className="mt-sp-5">
          {outreachRows.length > 0 ? (
            <Table>
              <THead>
                <TR>
                  <TH>Campagne</TH>
                  <TH>Statut</TH>
                  <TH className="text-right">Envoyés</TH>
                  <TH className="text-right">Réponses</TH>
                  <TH className="text-right">Intéressés</TH>
                  <TH className="text-right">Bounces</TH>
                  <TH className="text-right">Inbox</TH>
                </TR>
              </THead>
              <tbody>
                {outreachRows.map((c) => (
                  <TR key={c.id}>
                    <TD>
                      <Link href={`/outreach/${c.id}`} className="font-medium text-ink hover:text-primary hover:underline">
                        {c.name}
                      </Link>
                    </TD>
                    <TD><StatusBadge status={c.status} /></TD>
                    <TD className="text-right">{num(c.sent)}</TD>
                    <TD className="text-right">
                      {num(c.replied)}{" "}
                      <span className="text-xs text-ink-faint">({pct(c.delivered ? (c.replied / c.delivered) * 100 : 0, 1)})</span>
                    </TD>
                    <TD className="text-right font-medium text-success-fg">{num(c.interested)}</TD>
                    <TD className="text-right">
                      <span className={c.sent && c.bounced / c.sent > 0.03 ? "font-medium text-error" : ""}>
                        {num(c.bounced)}
                      </span>
                    </TD>
                    <TD className="text-right">
                      <Link href={`/inbox?campaign=${c.id}`} className="text-sm font-medium text-primary hover:underline">
                        Ouvrir l&apos;inbox →
                      </Link>
                    </TD>
                  </TR>
                ))}
              </tbody>
            </Table>
          ) : (
            <EmptyState
              icon={Send}
              title="Aucune campagne"
              description="Créez une campagne d'outreach : ses stats apparaîtront ici, réponse par réponse."
              action={<Link href="/outreach" className={buttonClasses({ size: "sm" })}>Créer une campagne</Link>}
            />
          )}
        </div>
      </Card>

      <Card>
        <CardTitle>Performance par boîte d&apos;envoi</CardTitle>
        <CardDescription>Volume du jour, quota et réputation — la santé de votre infrastructure d&apos;outreach.</CardDescription>
        <div className="mt-sp-5">
          {mailboxes.length > 0 ? (
            <Table>
              <THead>
                <TR>
                  <TH>Boîte</TH>
                  <TH>Statut</TH>
                  <TH className="text-right">Envoyés aujourd&apos;hui</TH>
                  <TH className="w-1/4">Usage du quota</TH>
                  <TH className="w-1/5">Réputation</TH>
                </TR>
              </THead>
              <tbody>
                {mailboxes.map((m) => (
                  <TR key={m.id}>
                    <TD>
                      <div className="min-w-0">
                        <p className="truncate font-medium text-ink">{m.email}</p>
                        <p className="text-xs uppercase text-ink-faint">{m.provider}</p>
                      </div>
                    </TD>
                    <TD><StatusBadge status={m.status} /></TD>
                    <TD className="text-right">{num(m.sentToday)} / {num(m.dailyLimit)}</TD>
                    <TD>
                      <Progress
                        value={m.sentToday}
                        max={m.dailyLimit || 1}
                        tone={m.sentToday >= m.dailyLimit ? "warning" : "primary"}
                        showLabel
                      />
                    </TD>
                    <TD>
                      <Progress
                        value={m.reputationScore}
                        tone={m.reputationScore >= 80 ? "success" : m.reputationScore >= 60 ? "warning" : "error"}
                        showLabel
                      />
                    </TD>
                  </TR>
                ))}
              </tbody>
            </Table>
          ) : (
            <EmptyState
              icon={Server}
              title="Aucune boîte connectée"
              description="Connectez une boîte d'envoi (Gmail, Outlook, SMTP ou import Cheap Inboxes)."
              action={<Link href="/infrastructure" className={buttonClasses({ size: "sm" })}>Connecter une boîte</Link>}
            />
          )}
        </div>
      </Card>
    </div>
  );

  // ============================ ONGLET EMAIL MARKETING ============================

  const marketingTab = (
    <div className="space-y-sp-6">
      <div className="grid grid-cols-2 gap-sp-4 lg:grid-cols-4">
        <StatCard label="E-mails marketing délivrés" value={num(mDelivered)} icon={CheckCircle2} hint="broadcasts & flows" />
        <StatCard label="Taux d'ouverture" value={pct(mOpenRate)} icon={MousePointerClick} hint="ouvertures / délivrés" />
        <StatCard label="Taux de clic" value={pct(mClickRate)} icon={Link2} hint={`CTOR ${pct(mCtor, 0)}`} />
        <StatCard
          label="Désinscription"
          value={pct(mUnsubRate, 2)}
          icon={MailX}
          deltaTone={mUnsubRate <= 0.5 ? "up" : "down"}
          delta={mUnsubRate <= 0.5 ? "sous 0,5 %" : "à surveiller"}
        />
      </div>

      <Card>
        <CardTitle>Envois, ouvertures et clics marketing (14 jours)</CardTitle>
        <CardDescription>Tendances quotidiennes des broadcasts et automations.</CardDescription>
        {mSent > 0 ? (
          <div className="mt-sp-6 grid gap-sp-6 lg:grid-cols-3">
            <ChartBlock title="Envois" total={series(mSentByDay).reduce((s, d) => s + d.value, 0)} data={series(mSentByDay)} tone="primary" />
            <ChartBlock title="Ouvertures" total={series(mOpenByDay).reduce((s, d) => s + d.value, 0)} data={series(mOpenByDay)} tone="secondary" />
            <ChartBlock title="Clics" total={series(mClickByDay).reduce((s, d) => s + d.value, 0)} data={series(mClickByDay)} tone="success" />
          </div>
        ) : (
          <div className="mt-sp-5">
            <EmptyState
              icon={Workflow}
              title="Pas encore d'envois marketing"
              description="Lancez un broadcast ou un flow d'automation pour voir vos tendances d'engagement ici."
              action={<Link href="/automations" className={buttonClasses({ size: "sm" })}>Créer un broadcast</Link>}
            />
          </div>
        )}
      </Card>

      <div className="grid grid-cols-2 gap-sp-4 lg:grid-cols-3">
        <StatCard label="CA attribué aux flows" value={money(totalFlowRevenue)} icon={Target} hint="automations" />
        <StatCard label="CA attribué aux broadcasts" value={money(totalBroadcastRevenue)} icon={Send} />
        <StatCard label="CA total attribué" value={money(totalFlowRevenue + totalBroadcastRevenue)} icon={BarChart3} />
      </div>

      <Card>
        <CardTitle>Attribution par flow (automation)</CardTitle>
        <CardDescription>Le chiffre d&apos;affaires généré par chaque parcours automatisé.</CardDescription>
        <div className="mt-sp-5">
          {flowRows.length > 0 ? (
            <Table>
              <THead>
                <TR>
                  <TH>Flow</TH>
                  <TH>Statut</TH>
                  <TH className="text-right">Entrés</TH>
                  <TH className="text-right">Terminés</TH>
                  <TH className="text-right">CA attribué</TH>
                </TR>
              </THead>
              <tbody>
                {flowRows.map((f) => (
                  <TR key={f.id}>
                    <TD className="font-medium">{f.name}</TD>
                    <TD><StatusBadge status={f.status} /></TD>
                    <TD className="text-right">{num(f.entered)}</TD>
                    <TD className="text-right">{num(f.completed)}</TD>
                    <TD className="text-right font-medium text-success-fg">{money(f.revenue)}</TD>
                  </TR>
                ))}
              </tbody>
            </Table>
          ) : (
            <EmptyState
              icon={Target}
              title="Aucun flow pour le moment"
              description="Créez une automation (bienvenue, panier abandonné, post-achat) pour mesurer son chiffre d'affaires."
              action={<Link href="/automations" className={buttonClasses({ size: "sm" })}>Créer un flow</Link>}
            />
          )}
        </div>
      </Card>

      <Card>
        <CardTitle>Performance par broadcast</CardTitle>
        <CardDescription>Volumes, engagement et chiffre d&apos;affaires de chaque envoi de masse.</CardDescription>
        <div className="mt-sp-5">
          {broadcastRows.length > 0 ? (
            <Table>
              <THead>
                <TR>
                  <TH>Broadcast</TH>
                  <TH>Statut</TH>
                  <TH className="text-right">Envoyés</TH>
                  <TH className="text-right">Ouv.</TH>
                  <TH className="text-right">Clics</TH>
                  <TH className="text-right">CA</TH>
                </TR>
              </THead>
              <tbody>
                {broadcastRows.map((c) => (
                  <TR key={c.id}>
                    <TD className="font-medium">{c.name}</TD>
                    <TD><StatusBadge status={c.status} /></TD>
                    <TD className="text-right">{num(c.sent)}</TD>
                    <TD className="text-right">
                      {num(c.opened)}{" "}
                      <span className="text-xs text-ink-faint">({pct(c.sent ? (c.opened / c.sent) * 100 : 0, 0)})</span>
                    </TD>
                    <TD className="text-right">
                      {num(c.clicked)}{" "}
                      <span className="text-xs text-ink-faint">({pct(c.sent ? (c.clicked / c.sent) * 100 : 0, 0)})</span>
                    </TD>
                    <TD className="text-right font-medium text-success-fg">{c.revenue > 0 ? money(c.revenue) : "—"}</TD>
                  </TR>
                ))}
              </tbody>
            </Table>
          ) : (
            <EmptyState
              icon={Send}
              title="Aucun broadcast"
              description="Envoyez un broadcast à un segment pour suivre ici ses performances."
              action={<Link href="/automations" className={buttonClasses({ size: "sm" })}>Créer un broadcast</Link>}
            />
          )}
        </div>
      </Card>

      <Card>
        <CardTitle>Top liens cliqués</CardTitle>
        <CardDescription>Les 5 liens les plus performants de vos e-mails marketing.</CardDescription>
        <div className="mt-sp-5">
          {topLinks.length > 0 ? (
            <Table>
              <THead>
                <TR>
                  <TH>Lien</TH>
                  <TH className="text-right">Clics</TH>
                  <TH className="w-1/3">Part</TH>
                </TR>
              </THead>
              <tbody>
                {topLinks.map((l) => (
                  <TR key={l.url}>
                    <TD className="max-w-0">
                      <span className="flex items-center gap-sp-2">
                        <Link2 size={14} className="shrink-0 text-ink-faint" />
                        <span className="truncate font-mono text-xs text-ink-muted">{l.url}</span>
                      </span>
                    </TD>
                    <TD className="text-right font-medium">{num(l.count)}</TD>
                    <TD>
                      <Progress value={l.count} max={topLinks[0].count} tone="primary" showLabel />
                    </TD>
                  </TR>
                ))}
              </tbody>
            </Table>
          ) : (
            <EmptyState
              icon={Link2}
              title="Aucun clic de lien suivi"
              description="Dès que vos destinataires cliqueront sur des liens trackés, les plus populaires apparaîtront ici."
            />
          )}
        </div>
      </Card>
    </div>
  );

  // ============================ ONGLET DÉLIVRABILITÉ (commun) ============================

  const placementSegments = lastPlacement
    ? [
        { label: "Principale", value: lastPlacement.inboxPct, color: "bg-success" },
        { label: "Promotions", value: lastPlacement.promotionsPct, color: "bg-warning" },
        { label: "Spam", value: lastPlacement.spamPct, color: "bg-error" },
      ]
    : [];

  const deliverabilityTab = (
    <div className="space-y-sp-6">
      <div className="grid grid-cols-2 gap-sp-4 lg:grid-cols-4">
        <StatCard
          label="Taux de délivrabilité"
          value={pct(deliveryRate)}
          icon={CheckCircle2}
          deltaTone={deliveryRate >= 98 ? "up" : "down"}
          delta={deliveryRate >= 98 ? "sain (> 98 %)" : "à surveiller"}
        />
        <StatCard
          label="Taux de bounce"
          value={pct(bounceRate)}
          icon={AlertTriangle}
          deltaTone={bounceRate <= 2 ? "up" : "down"}
          delta={bounceRate <= 2 ? "sous le seuil 2 %" : "trop élevé"}
        />
        <StatCard
          label="Taux de plainte"
          value={pct(complaintRate, 2)}
          icon={ShieldAlert}
          deltaTone={complaintRate <= 0.1 ? "up" : "down"}
          delta={complaintRate <= 0.1 ? "sous 0,1 %" : "au-dessus du seuil"}
        />
        <StatCard label="E-mails envoyés (total)" value={num(sent)} icon={Send} hint="tous pôles confondus" />
      </div>

      <div className="grid gap-sp-6 lg:grid-cols-2">
        <Card>
          <CardTitle>Détail des événements</CardTitle>
          <CardDescription>Répartition des événements de remise sur l&apos;historique (tous envois).</CardDescription>
          <div className="mt-sp-5 space-y-sp-4">
            <EventRow label="Délivrés" value={delivered} total={sent} tone="success" />
            <EventRow label="Ouverts" value={opened} total={sent} tone="primary" />
            <EventRow label="Cliqués" value={clicked} total={sent} tone="primary" />
            <EventRow label="Bounces" value={bounced} total={sent} tone="error" />
            <EventRow label="Plaintes spam" value={complained} total={sent} tone="error" />
          </div>
        </Card>

        <Card>
          <div className="flex items-start justify-between gap-sp-3">
            <div>
              <CardTitle>Placement boîte de réception</CardTitle>
              <CardDescription>Dernier test de placement{lastPlacement ? ` · ${lastPlacement.name}` : ""}.</CardDescription>
            </div>
            {lastPlacement && <StatusBadge status={lastPlacement.status} />}
          </div>
          <div className="mt-sp-5">
            {lastPlacement ? (
              <>
                <StackBar segments={placementSegments} />
                <div className="mt-sp-5 grid grid-cols-3 gap-sp-4 text-center">
                  <PlacementStat label="Principale" value={`${lastPlacement.inboxPct} %`} tone="text-success-fg" />
                  <PlacementStat label="Promotions" value={`${lastPlacement.promotionsPct} %`} tone="text-warning-fg" />
                  <PlacementStat label="Spam" value={`${lastPlacement.spamPct} %`} tone="text-error" />
                </div>
              </>
            ) : (
              <EmptyState
                icon={Target}
                title="Aucun test de placement"
                description="Lancez un test pour voir où vos e-mails atterrissent (principale, promotions, spam)."
                action={<Link href="/deliverability" className={buttonClasses({ size: "sm" })}>Lancer un test de placement</Link>}
              />
            )}
          </div>
        </Card>
      </div>
    </div>
  );

  // ============================ ONGLET OPT-OUT (commun) ============================

  const optoutTab = (
    <div className="space-y-sp-6">
      <div className="grid grid-cols-2 gap-sp-4 lg:grid-cols-4">
        <StatCard
          label="Taux de désinscription"
          value={pct(unsubRate, 2)}
          icon={MailX}
          deltaTone={unsubRate <= 0.5 ? "up" : "down"}
          delta={unsubRate <= 0.5 ? "sous 0,5 %" : "à surveiller"}
        />
        <StatCard label="Désinscriptions" value={num(suppressUnsub + unsubscribedEvents)} icon={MailX} hint="liste de suppression" />
        <StatCard
          label="Taux de plainte"
          value={pct(optoutComplaintRate, 2)}
          icon={ShieldAlert}
          deltaTone={optoutComplaintRate <= 0.3 ? "up" : "down"}
          delta={optoutComplaintRate <= 0.3 ? "sous 0,3 %" : "au-dessus du seuil"}
        />
        <StatCard label="Plaintes spam" value={num(suppressComplaint)} icon={ShieldAlert} hint="signalées comme spam" />
      </div>

      <Card>
        <CardTitle>Hygiène de liste</CardTitle>
        <CardDescription>
          Google et Yahoo imposent un taux de plainte sous 0,3 % et une désinscription en 1 clic. Surveillez ces signaux pour
          protéger votre réputation d&apos;expéditeur.
        </CardDescription>
        <div className="mt-sp-5 space-y-sp-4">
          <div>
            <div className="mb-sp-2 flex items-center justify-between text-sm">
              <span className="text-ink-muted">Désinscriptions / délivrés</span>
              <span className="font-medium text-ink">{pct(unsubRate, 2)}</span>
            </div>
            <Progress value={unsubRate} max={1} tone={unsubRate <= 0.5 ? "success" : "warning"} />
          </div>
          <div>
            <div className="mb-sp-2 flex items-center justify-between text-sm">
              <span className="text-ink-muted">Plaintes / délivrés (seuil 0,3 %)</span>
              <span className="font-medium text-ink">{pct(optoutComplaintRate, 2)}</span>
            </div>
            <Progress value={optoutComplaintRate} max={0.3} tone={optoutComplaintRate <= 0.3 ? "success" : "error"} />
          </div>
        </div>
      </Card>
    </div>
  );

  return (
    <>
      <PageHeader
        title="Analytics"
        description="Deux pôles, deux lectures : le cold outreach se pilote au taux de réponse, l'email marketing à l'engagement et au chiffre d'affaires."
        actions={
          <a
            href="/api/export?type=overview"
            className={buttonClasses({ variant: "secondary" })}
            title="Exporter l'aperçu agrégé au format CSV"
          >
            <Download size={16} /> Exporter (CSV)
          </a>
        }
      />

      {!hasData ? (
        <EmptyState
          icon={BarChart3}
          title="Pas encore de données à analyser"
          description="Connectez un domaine, importez des contacts et lancez une première campagne. Vos tableaux de bord se rempliront automatiquement."
          action={
            <div className="flex flex-wrap justify-center gap-sp-2">
              <Link href="/infrastructure" className={buttonClasses({ size: "sm" })}>Connecter un domaine</Link>
              <Link href="/outreach" className={buttonClasses({ size: "sm", variant: "secondary" })}>Créer une campagne</Link>
            </div>
          }
        />
      ) : (
        <Tabs
          defaultTab="outreach"
          items={[
            { id: "outreach", label: "Cold outreach", content: outreachTab },
            { id: "marketing", label: "Email marketing", content: marketingTab },
            { id: "deliverability", label: "Délivrabilité", content: deliverabilityTab },
            { id: "optout", label: "Opt-out", content: optoutTab },
          ]}
        />
      )}

      {isDemoMode() && (
        <p className="mt-sp-6 text-center text-xs text-ink-disabled">
          Mode démo actif — les événements (ouvertures, clics, bounces) sont simulés par le worker. Les chiffres reflètent les données de démonstration.
        </p>
      )}
    </>
  );
}

// ============================ Sous-composants (serveur) ============================

function EventRow({ label, value, total, tone }: { label: string; value: number; total: number; tone: "success" | "primary" | "error" }) {
  return (
    <div>
      <div className="mb-sp-2 flex items-center justify-between text-sm">
        <span className="text-ink-muted">{label}</span>
        <span className="font-medium text-ink">
          {num(value)} <span className="text-xs text-ink-faint">({pct(total ? (value / total) * 100 : 0)})</span>
        </span>
      </div>
      <Progress value={value} max={total || 1} tone={tone} />
    </div>
  );
}

function PlacementStat({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div>
      <p className={`text-h4 font-headline font-bold ${tone}`}>{value}</p>
      <p className="text-xs text-ink-faint">{label}</p>
    </div>
  );
}

function ChartBlock({ title, total, data, tone }: { title: string; total: number; data: { label: string; value: number }[]; tone: "primary" | "secondary" | "success" }) {
  return (
    <div>
      <div className="mb-sp-3 flex items-baseline justify-between">
        <span className="text-sm font-medium text-ink-muted">{title}</span>
        <span className="text-h4 font-headline font-bold text-ink">{num(total)}</span>
      </div>
      <BarChart data={data} tone={tone} height={140} />
    </div>
  );
}
