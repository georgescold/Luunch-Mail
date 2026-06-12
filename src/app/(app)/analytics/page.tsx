import { requireAuth } from "@/lib/core/auth";
import { db } from "@/lib/core/db";
import { isDemoMode } from "@/lib/core/env";
import { num, pct, money, parseJson } from "@/lib/core/fmt";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { EmptyState } from "@/components/ui/empty-state";
import { Tabs } from "@/components/ui/tabs";
import { Table, THead, TH, TR, TD } from "@/components/ui/table";
import { buttonClasses } from "@/components/ui/button";
import { BarChart, StackBar } from "@/components/bar-chart";
import {
  Download, CheckCircle2, AlertTriangle, ShieldAlert, MousePointerClick,
  Reply, MailX, Link2, Inbox, Server, Target, BarChart3, Send,
} from "lucide-react";

export default async function AnalyticsPage() {
  const { workspace } = await requireAuth();
  const wid = workspace.id;
  const since = new Date(Date.now() - 14 * 86400_000);

  const [
    sent,
    delivered,
    opened,
    clicked,
    bounced,
    complained,
    unsubscribedEvents,
    contactsCount,
    suppressUnsub,
    suppressComplaint,
    lastPlacement,
    recentMessages,
    engagementEvents,
    clickEvents,
    mailboxes,
    flows,
    campaigns,
    replyThreads,
  ] = await Promise.all([
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
    // Envois sur 14 jours (regroupés par date côté JS)
    db.emailMessage.findMany({
      where: { workspaceId: wid, createdAt: { gte: since } },
      select: { createdAt: true },
      take: 8000,
    }),
    // Events d'engagement sur 14 jours (ouvertures/clics par date côté JS)
    db.emailEvent.findMany({
      where: { type: { in: ["opened", "clicked"] }, occurredAt: { gte: since }, message: { workspaceId: wid } },
      select: { type: true, occurredAt: true },
      take: 12000,
    }),
    // Clics pour le top liens (data JSON à parser)
    db.emailEvent.findMany({
      where: { type: "clicked", message: { workspaceId: wid } },
      select: { data: true },
      take: 5000,
    }),
    db.mailbox.findMany({ where: { workspaceId: wid }, orderBy: { sentToday: "desc" } }),
    db.flow.findMany({ where: { workspaceId: wid }, orderBy: { updatedAt: "desc" } }),
    db.campaign.findMany({ where: { workspaceId: wid }, orderBy: { updatedAt: "desc" } }),
    db.inboxThread.count({ where: { workspaceId: wid } }),
  ]);

  // ---- Taux principaux ----
  const deliveryRate = sent ? (delivered / sent) * 100 : 0;
  const bounceRate = sent ? (bounced / sent) * 100 : 0;
  const complaintRate = sent ? (complained / sent) * 100 : 0;
  const openRate = delivered ? (opened / delivered) * 100 : 0;
  const clickRate = delivered ? (clicked / delivered) * 100 : 0;
  const ctor = opened ? (clicked / opened) * 100 : 0;
  const replyRate = delivered ? (replyThreads / delivered) * 100 : 0;
  const unsubRate = delivered ? ((suppressUnsub + unsubscribedEvents) / delivered) * 100 : 0;
  const optoutComplaintRate = delivered ? (suppressComplaint / delivered) * 100 : 0;

  const hasData = sent > 0 || mailboxes.length > 0 || contactsCount > 0;

  // ---- Séries 14 jours (regroupement par date côté JS) ----
  const dayKeys: { key: string; label: string }[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400_000);
    dayKeys.push({ key: d.toISOString().slice(0, 10), label: d.toLocaleDateString("fr-FR", { day: "2-digit" }) });
  }
  const sentByDay = new Map<string, number>();
  for (const m of recentMessages) {
    const k = m.createdAt.toISOString().slice(0, 10);
    sentByDay.set(k, (sentByDay.get(k) ?? 0) + 1);
  }
  const openByDay = new Map<string, number>();
  const clickByDay = new Map<string, number>();
  for (const e of engagementEvents) {
    const k = e.occurredAt.toISOString().slice(0, 10);
    if (e.type === "opened") openByDay.set(k, (openByDay.get(k) ?? 0) + 1);
    else clickByDay.set(k, (clickByDay.get(k) ?? 0) + 1);
  }
  const sentSeries = dayKeys.map((d) => ({ label: d.label, value: sentByDay.get(d.key) ?? 0 }));
  const openSeries = dayKeys.map((d) => ({ label: d.label, value: openByDay.get(d.key) ?? 0 }));
  const clickSeries = dayKeys.map((d) => ({ label: d.label, value: clickByDay.get(d.key) ?? 0 }));

  // ---- Placement (StackBar) ----
  const placementSegments = lastPlacement
    ? [
        { label: "Principale", value: lastPlacement.inboxPct, color: "bg-success" },
        { label: "Promotions", value: lastPlacement.promotionsPct, color: "bg-warning" },
        { label: "Spam", value: lastPlacement.spamPct, color: "bg-error" },
      ]
    : [];

  // ---- Attribution CA (flows) ----
  const flowRows = flows
    .map((f) => {
      const stats = parseJson<{ entered?: number; completed?: number; revenue?: number }>(f.stats, {});
      return { id: f.id, name: f.name, status: f.status, entered: stats.entered ?? 0, completed: stats.completed ?? 0, revenue: stats.revenue ?? 0 };
    })
    .sort((a, b) => b.revenue - a.revenue);
  const totalFlowRevenue = flowRows.reduce((s, f) => s + f.revenue, 0);

  // ---- Attribution / performance par campagne ----
  const campaignRows = campaigns
    .map((c) => {
      const s = parseJson<{ sent?: number; delivered?: number; opened?: number; clicked?: number; replied?: number; bounced?: number; revenue?: number }>(c.stats, {});
      const cSent = s.sent ?? 0;
      const cOpened = s.opened ?? 0;
      const cClicked = s.clicked ?? 0;
      return {
        id: c.id,
        name: c.name,
        type: c.type,
        status: c.status,
        sent: cSent,
        opened: cOpened,
        clicked: cClicked,
        replied: s.replied ?? 0,
        revenue: s.revenue ?? 0,
        openRate: cSent ? (cOpened / cSent) * 100 : 0,
        clickRate: cSent ? (cClicked / cSent) * 100 : 0,
      };
    })
    .sort((a, b) => b.sent - a.sent);
  const totalCampaignRevenue = campaignRows.reduce((s, c) => s + c.revenue, 0);

  // ---- Top liens cliqués ----
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

  // ============================ ONGLETS ============================

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
        <StatCard label="E-mails envoyés" value={num(sent)} icon={Send} hint="cumul historique" />
      </div>

      <div className="grid gap-sp-6 lg:grid-cols-2">
        <Card>
          <CardTitle>Détail des événements</CardTitle>
          <CardDescription>Répartition des événements de remise sur l'historique.</CardDescription>
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
                description="Lancez un test pour voir où vos e-mails atterrissent (principale, promotions, spam) chez les principaux fournisseurs."
                action={<a href="/deliverability" className={buttonClasses({ size: "sm" })}>Lancer un test de placement</a>}
              />
            )}
          </div>
        </Card>
      </div>
    </div>
  );

  const engagementTab = (
    <div className="space-y-sp-6">
      <div className="grid grid-cols-2 gap-sp-4 lg:grid-cols-4">
        <StatCard label="Taux d'ouverture" value={pct(openRate)} icon={MousePointerClick} hint="ouvertures / délivrés" />
        <StatCard label="Taux de clic" value={pct(clickRate)} icon={Link2} hint="clics / délivrés" />
        <StatCard label="CTOR" value={pct(ctor)} icon={BarChart3} hint="clics / ouvertures" />
        <StatCard label="Taux de réponse" value={pct(replyRate)} icon={Reply} hint="conversations / délivrés" />
      </div>

      <Card>
        <CardTitle>Envois, ouvertures et clics (14 jours)</CardTitle>
        <CardDescription>Tendances quotidiennes regroupées par date.</CardDescription>
        {sent > 0 ? (
          <div className="mt-sp-6 grid gap-sp-6 lg:grid-cols-3">
            <ChartBlock title="Envois" total={recentMessages.length} data={sentSeries} tone="primary" />
            <ChartBlock title="Ouvertures" total={openSeries.reduce((s, d) => s + d.value, 0)} data={openSeries} tone="secondary" />
            <ChartBlock title="Clics" total={clickSeries.reduce((s, d) => s + d.value, 0)} data={clickSeries} tone="success" />
          </div>
        ) : (
          <div className="mt-sp-5">
            <EmptyState
              icon={Send}
              title="Pas encore d'envois"
              description="Lancez une première campagne ou un broadcast pour voir vos tendances d'engagement apparaître ici."
              action={<a href="/outreach" className={buttonClasses({ size: "sm" })}>Créer une campagne</a>}
            />
          </div>
        )}
      </Card>

      <Card>
        <CardTitle>Top liens cliqués</CardTitle>
        <CardDescription>Les 5 liens les plus performants de vos e-mails.</CardDescription>
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
          protéger votre réputation d'expéditeur.
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

  const revenueTab = (
    <div className="space-y-sp-6">
      <div className="grid grid-cols-2 gap-sp-4 lg:grid-cols-3">
        <StatCard label="CA attribué aux flows" value={money(totalFlowRevenue)} icon={Target} hint="automations" />
        <StatCard label="CA attribué aux campagnes" value={money(totalCampaignRevenue)} icon={Send} hint="broadcasts & outreach" />
        <StatCard label="CA total attribué" value={money(totalFlowRevenue + totalCampaignRevenue)} icon={BarChart3} />
      </div>

      <Card>
        <CardTitle>Attribution par flow (automation)</CardTitle>
        <CardDescription>Le chiffre d'affaires généré par chaque parcours automatisé.</CardDescription>
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
              description="Créez une automation (bienvenue, panier abandonné, post-achat) pour générer et mesurer du chiffre d'affaires récurrent."
              action={<a href="/automations" className={buttonClasses({ size: "sm" })}>Créer un flow</a>}
            />
          )}
        </div>
      </Card>

      <Card>
        <CardTitle>Performance par campagne</CardTitle>
        <CardDescription>Volumes, engagement et chiffre d'affaires par campagne.</CardDescription>
        <div className="mt-sp-5">
          {campaignRows.length > 0 ? (
            <Table>
              <THead>
                <TR>
                  <TH>Campagne</TH>
                  <TH>Statut</TH>
                  <TH className="text-right">Envoyés</TH>
                  <TH className="text-right">Ouv.</TH>
                  <TH className="text-right">Clics</TH>
                  <TH className="text-right">Réponses</TH>
                  <TH className="text-right">CA</TH>
                </TR>
              </THead>
              <tbody>
                {campaignRows.map((c) => (
                  <TR key={c.id}>
                    <TD>
                      <div className="flex items-center gap-sp-2">
                        <span className="font-medium text-ink">{c.name}</span>
                        <Badge tone={c.type === "broadcast" ? "info" : "purple"}>
                          {c.type === "broadcast" ? "Broadcast" : "Outreach"}
                        </Badge>
                      </div>
                    </TD>
                    <TD><StatusBadge status={c.status} /></TD>
                    <TD className="text-right">{num(c.sent)}</TD>
                    <TD className="text-right">{num(c.opened)} <span className="text-xs text-ink-faint">({pct(c.openRate, 0)})</span></TD>
                    <TD className="text-right">{num(c.clicked)} <span className="text-xs text-ink-faint">({pct(c.clickRate, 0)})</span></TD>
                    <TD className="text-right">{num(c.replied)}</TD>
                    <TD className="text-right font-medium text-success-fg">{c.revenue > 0 ? money(c.revenue) : "—"}</TD>
                  </TR>
                ))}
              </tbody>
            </Table>
          ) : (
            <EmptyState
              icon={Send}
              title="Aucune campagne"
              description="Lancez un broadcast ou une séquence d'outreach pour suivre ici ses performances et son chiffre d'affaires."
              action={<a href="/outreach" className={buttonClasses({ size: "sm" })}>Créer une campagne</a>}
            />
          )}
        </div>
      </Card>
    </div>
  );

  const mailboxTab = (
    <Card>
      <CardTitle>Performance par boîte d'envoi</CardTitle>
      <CardDescription>Volume du jour, limite quotidienne et réputation de chaque boîte.</CardDescription>
      <div className="mt-sp-5">
        {mailboxes.length > 0 ? (
          <Table>
            <THead>
              <TR>
                <TH>Boîte</TH>
                <TH>Statut</TH>
                <TH className="text-right">Envoyés aujourd'hui</TH>
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
            description="Connectez une boîte d'envoi (Gmail, Outlook ou SMTP) pour suivre son volume et sa réputation au quotidien."
            action={<a href="/infrastructure" className={buttonClasses({ size: "sm" })}>Connecter une boîte</a>}
          />
        )}
      </div>
    </Card>
  );

  return (
    <>
      <PageHeader
        title="Analytics"
        description="Délivrabilité, engagement, opt-out, attribution du chiffre d'affaires et performance par boîte."
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
          description="Connectez un domaine, importez des contacts et lancez une première campagne. Vos tableaux de bord (délivrabilité, engagement, revenus) se rempliront automatiquement."
          action={
            <div className="flex flex-wrap justify-center gap-sp-2">
              <a href="/infrastructure" className={buttonClasses({ size: "sm" })}>Connecter un domaine</a>
              <a href="/outreach" className={buttonClasses({ size: "sm", variant: "secondary" })}>Créer une campagne</a>
            </div>
          }
        />
      ) : (
        <>
          {/* Aperçu express */}
          <div className="mb-sp-6 grid grid-cols-2 gap-sp-4 lg:grid-cols-4">
            <StatCard label="E-mails envoyés" value={num(sent)} icon={Send} />
            <StatCard label="Délivrabilité" value={pct(deliveryRate)} icon={CheckCircle2} deltaTone={deliveryRate >= 98 ? "up" : "down"} delta={deliveryRate >= 98 ? "sain" : "à surveiller"} />
            <StatCard label="Ouverture" value={pct(openRate)} icon={MousePointerClick} />
            <StatCard label="Réponses" value={num(replyThreads)} icon={Inbox} hint="conversations reçues" />
          </div>

          <Tabs
            defaultTab="deliverability"
            items={[
              { id: "deliverability", label: "Délivrabilité", content: deliverabilityTab },
              { id: "engagement", label: "Engagement", content: engagementTab },
              { id: "optout", label: "Opt-out", content: optoutTab },
              { id: "revenue", label: "Revenus", content: revenueTab },
              { id: "mailboxes", label: "Par boîte", content: mailboxTab },
            ]}
          />
        </>
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
