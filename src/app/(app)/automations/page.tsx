import Link from "next/link";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { isDemoMode } from "@/lib/env";
import { num, money, parseJson, dateTime, relativeTime } from "@/lib/fmt";
import { PageHeader } from "@/components/page-header";
import { Card, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Button, buttonClasses } from "@/components/ui/button";
import { StatCard } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import { Tabs } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { FlowCanvas, type CanvasNode } from "@/components/automations/flow-canvas";
import {
  Workflow, Send, Zap, Mail, Power, Pause, Users, FlaskConical, Clock,
} from "lucide-react";
import { toggleFlowAction, sendBroadcastAction } from "@/server/automations-actions";
import { CreateFlowModal } from "@/components/automations/create-flow-modal";
import { CreateBroadcastModal } from "@/components/automations/create-broadcast-modal";

const TRIGGER_LABELS: Record<string, string> = {
  signup: "Inscription",
  purchase: "Achat",
  abandoned_cart: "Panier abandonné",
  visit: "Visite",
  inactivity: "Inactivité",
  date: "Date",
  api_event: "Événement API",
};

export default async function AutomationsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; flow?: string }>;
}) {
  const { workspace } = await requireAuth();
  const wid = workspace.id;
  const sp = await searchParams;

  const [flows, broadcasts, lists, segments] = await Promise.all([
    db.flow.findMany({ where: { workspaceId: wid }, orderBy: { updatedAt: "desc" } }),
    db.campaign.findMany({
      where: { workspaceId: wid, type: "broadcast" },
      orderBy: { updatedAt: "desc" },
    }),
    db.contactList.findMany({
      where: { workspaceId: wid },
      include: { _count: { select: { members: true } } },
      orderBy: { createdAt: "desc" },
    }),
    db.segment.findMany({ where: { workspaceId: wid }, orderBy: { createdAt: "desc" } }),
  ]);

  // Flow sélectionné pour le canvas.
  const selectedFlow = sp.flow ? flows.find((f) => f.id === sp.flow) ?? null : null;

  const defaultTab = sp.tab === "broadcasts" ? "broadcasts" : "flows";

  const liveFlows = flows.filter((f) => f.status === "live").length;
  const totalRevenue = flows.reduce(
    (s, f) => s + (parseJson<{ revenue?: number }>(f.stats, {}).revenue ?? 0),
    0,
  );

  return (
    <>
      <PageHeader
        title="Automations"
        description="Parcours automatisés (flows) et diffusions ponctuelles (broadcasts) vers vos audiences opt-in."
        actions={
          <Link href="/audiences" className={buttonClasses({ variant: "secondary", size: "sm" })}>
            <Users size={16} /> Gérer les audiences
          </Link>
        }
      />

      <Tabs
        defaultTab={defaultTab}
        items={[
          {
            id: "flows",
            label: "Flows",
            content: (
              <FlowsTab
                flows={flows}
                selectedFlow={selectedFlow}
                liveFlows={liveFlows}
                totalRevenue={totalRevenue}
              />
            ),
          },
          {
            id: "broadcasts",
            label: "Broadcasts",
            content: <BroadcastsTab broadcasts={broadcasts} lists={lists} segments={segments} />,
          },
        ]}
      />

      {isDemoMode() && (
        <p className="mt-sp-6 text-center text-xs text-ink-disabled">
          Mode démo — les entrées de flux et les events de broadcast sont simulés par le worker.
        </p>
      )}
    </>
  );
}

/* ===========================================================================
 * Onglet FLOWS
 * ========================================================================= */
function FlowsTab({
  flows,
  selectedFlow,
  liveFlows,
  totalRevenue,
}: {
  flows: Awaited<ReturnType<typeof db.flow.findMany>>;
  selectedFlow: Awaited<ReturnType<typeof db.flow.findMany>>[number] | null;
  liveFlows: number;
  totalRevenue: number;
}) {
  return (
    <div className="space-y-sp-6">
      <div className="grid grid-cols-2 gap-sp-4 lg:grid-cols-4">
        <StatCard label="Flows" value={num(flows.length)} icon={Workflow} />
        <StatCard label="En ligne" value={num(liveFlows)} icon={Power} deltaTone={liveFlows ? "up" : "neutral"} delta={liveFlows ? "actifs" : "aucun"} />
        <StatCard
          label="Contacts entrés"
          value={num(flows.reduce((s, f) => s + (parseJson<{ entered?: number }>(f.stats, {}).entered ?? 0), 0))}
          icon={Users}
        />
        <StatCard label="CA attribué" value={money(totalRevenue)} icon={Mail} hint="généré par les flux" />
      </div>

      <div className="grid gap-sp-6 lg:grid-cols-5">
        {/* Liste des flows */}
        <div className="lg:col-span-2">
          <div className="mb-sp-4 flex items-center justify-between">
            <CardTitle>Vos flows</CardTitle>
            <CreateFlowModal />
          </div>

          {flows.length === 0 ? (
            <EmptyState
              icon={Workflow}
              title="Aucun flow pour l'instant"
              description="Démarrez avec un modèle e-commerce préconçu — bienvenue, panier abandonné, post-achat… Les flux automatisés génèrent l'essentiel du chiffre d'affaires e-mail."
              action={<CreateFlowModal />}
            />
          ) : (
            <div className="space-y-sp-2">
              {flows.map((f) => {
                const trigger = parseJson<{ type?: string; label?: string }>(f.trigger, {});
                const nodes = parseJson<CanvasNode[]>(f.nodes, []);
                const stats = parseJson<{ entered?: number; completed?: number; revenue?: number }>(f.stats, {});
                const active = selectedFlow?.id === f.id;
                return (
                  <Link
                    key={f.id}
                    href={`/automations?tab=flows&flow=${f.id}`}
                    scroll={false}
                    className={`block rounded-md border p-sp-4 transition-colors ${active ? "border-primary bg-primary-soft/40" : "border-line bg-surface hover:border-line-strong"}`}
                  >
                    <div className="flex items-start justify-between gap-sp-2">
                      <p className="min-w-0 truncate font-medium text-ink">{f.name}</p>
                      <StatusBadge status={f.status} />
                    </div>
                    <p className="mt-sp-1 text-xs text-ink-faint">
                      <Zap size={11} className="mr-sp-1 inline" />
                      {trigger.label ?? TRIGGER_LABELS[trigger.type ?? ""] ?? "Déclencheur"} · {num(nodes.length)} étape{nodes.length > 1 ? "s" : ""}
                    </p>
                    <div className="mt-sp-2 flex flex-wrap gap-sp-3 text-xs text-ink-faint">
                      <span>{num(stats.entered ?? 0)} entrés</span>
                      <span>{num(stats.completed ?? 0)} complétés</span>
                      <span className="font-medium text-success-fg">{money(stats.revenue ?? 0)}</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Canvas du flow sélectionné */}
        <div className="lg:col-span-3">
          {selectedFlow ? (
            <FlowDetail flow={selectedFlow} />
          ) : (
            <Card className="flex min-h-[280px] flex-col items-center justify-center text-center">
              <span className="mb-sp-4 flex h-14 w-14 items-center justify-center rounded-pill bg-primary-soft text-primary">
                <Workflow size={26} />
              </span>
              <CardTitle>Sélectionnez un flow</CardTitle>
              <CardDescription className="mt-sp-2 max-w-sm">
                Choisissez un flow à gauche pour visualiser son parcours, ajouter des étapes et l'activer.
              </CardDescription>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function FlowDetail({ flow }: { flow: Awaited<ReturnType<typeof db.flow.findMany>>[number] }) {
  const nodes = parseJson<CanvasNode[]>(flow.nodes, []);
  const goal = parseJson<{ label?: string }>(flow.goal, {});
  const trigger = parseJson<{ label?: string; type?: string }>(flow.trigger, {});
  const isLive = flow.status === "live";

  return (
    <Card>
      <div className="mb-sp-4 flex flex-wrap items-center justify-between gap-sp-3">
        <div className="min-w-0">
          <div className="flex items-center gap-sp-2">
            <CardTitle>{flow.name}</CardTitle>
            <StatusBadge status={flow.status} />
          </div>
          <CardDescription className="mt-sp-1">
            Déclencheur : {trigger.label ?? TRIGGER_LABELS[trigger.type ?? ""] ?? "—"} · modifié {relativeTime(flow.updatedAt)}
          </CardDescription>
        </div>
        <form action={toggleFlowAction}>
          <input type="hidden" name="flowId" value={flow.id} />
          <Button variant={isLive ? "subtle" : "primary"} size="sm">
            {isLive ? <><Pause size={16} /> Mettre en pause</> : <><Power size={16} /> Activer</>}
          </Button>
        </form>
      </div>

      <div className="rounded-md bg-fill-subtle p-sp-5">
        <FlowCanvas flowId={flow.id} nodes={nodes} goal={goal.label ?? null} />
      </div>
    </Card>
  );
}

/* ===========================================================================
 * Onglet BROADCASTS
 * ========================================================================= */
function BroadcastsTab({
  broadcasts,
  lists,
  segments,
}: {
  broadcasts: Awaited<ReturnType<typeof db.campaign.findMany>>;
  lists: (Awaited<ReturnType<typeof db.contactList.findMany>>[number] & { _count: { members: number } })[];
  segments: Awaited<ReturnType<typeof db.segment.findMany>>;
}) {
  const totalSent = broadcasts.reduce(
    (s, b) => s + (parseJson<{ sent?: number }>(b.stats, {}).sent ?? 0),
    0,
  );
  const listOpts = lists.map((l) => ({ id: l.id, name: l.name, members: l._count.members }));
  const segOpts = segments.map((s) => ({ id: s.id, name: s.name, matchCount: s.matchCount }));

  return (
    <div className="space-y-sp-6">
      <div className="grid grid-cols-2 gap-sp-4 lg:grid-cols-4">
        <StatCard label="Broadcasts" value={num(broadcasts.length)} icon={Send} />
        <StatCard label="Planifiés" value={num(broadcasts.filter((b) => b.status === "scheduled").length)} icon={Clock} />
        <StatCard label="E-mails diffusés" value={num(totalSent)} icon={Mail} />
        <StatCard
          label="A/B testing"
          value={num(broadcasts.filter((b) => b.abTesting).length)}
          icon={FlaskConical}
          hint="broadcasts en test"
        />
      </div>

      <div className="flex items-center justify-between">
        <CardTitle>Vos diffusions</CardTitle>
        <CreateBroadcastModal lists={listOpts} segments={segOpts} />
      </div>

      {broadcasts.length === 0 ? (
        <EmptyState
          icon={Send}
          title="Aucun broadcast"
          description="Un broadcast est l'envoi ponctuel d'un e-mail à une liste ou un segment (newsletter, annonce, promo). Créez votre première diffusion."
          action={<CreateBroadcastModal lists={listOpts} segments={segOpts} />}
        />
      ) : (
        <div className="space-y-sp-3">
          {broadcasts.map((b) => {
            const stats = parseJson<{ sent?: number; delivered?: number; opened?: number; clicked?: number }>(b.stats, {});
            const target = resolveTarget(b, lists, segments);
            const canSend = b.status === "draft" || b.status === "scheduled";
            return (
              <Card key={b.id}>
                <div className="flex flex-wrap items-start justify-between gap-sp-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-sp-2">
                      <p className="font-medium text-ink">{b.name}</p>
                      <StatusBadge status={b.status} />
                      {b.abTesting && <Badge tone="purple"><FlaskConical size={11} /> A/B/n</Badge>}
                      {b.sendTimeOpt && <Badge tone="info"><Clock size={11} /> Send-time IA</Badge>}
                    </div>
                    <p className="mt-sp-1 text-xs text-ink-faint">
                      {b.subject ? `Objet : ${b.subject}` : "Objet non défini"} · Cible : {target}
                      {b.scheduleAt ? ` · Planifié le ${dateTime(b.scheduleAt)}` : ""}
                    </p>
                  </div>
                  {canSend && (
                    <form action={sendBroadcastAction}>
                      <input type="hidden" name="campaignId" value={b.id} />
                      <Button size="sm">
                        <Send size={16} /> Envoyer
                      </Button>
                    </form>
                  )}
                </div>

                <div className="mt-sp-4 grid grid-cols-2 gap-sp-4 sm:grid-cols-4">
                  <MiniStat label="Envoyés" value={num(stats.sent ?? 0)} />
                  <MiniStat label="Délivrés" value={num(stats.delivered ?? 0)} />
                  <MiniStat label="Ouverts" value={num(stats.opened ?? 0)} />
                  <MiniStat label="Cliqués" value={num(stats.clicked ?? 0)} />
                </div>
                {(stats.sent ?? 0) > 0 && (
                  <div className="mt-sp-3">
                    <div className="mb-sp-1 flex justify-between text-xs text-ink-faint">
                      <span>Taux d'ouverture</span>
                      <span>{num(stats.opened ?? 0)} / {num(stats.delivered ?? 0)}</span>
                    </div>
                    <Progress value={stats.opened ?? 0} max={stats.delivered || 1} tone="primary" />
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function resolveTarget(
  b: Awaited<ReturnType<typeof db.campaign.findMany>>[number],
  lists: (Awaited<ReturnType<typeof db.contactList.findMany>>[number] & { _count: { members: number } })[],
  segments: Awaited<ReturnType<typeof db.segment.findMany>>,
) {
  if (b.segmentId) {
    const seg = segments.find((s) => s.id === b.segmentId);
    return seg ? `Segment « ${seg.name} »` : "Segment";
  }
  const sw = parseJson<{ listId?: string }>(b.sendWindow, {});
  if (sw.listId) {
    const list = lists.find((l) => l.id === sw.listId);
    return list ? `Liste « ${list.name} » (${num(list._count.members)})` : "Liste";
  }
  return "Non définie";
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-ink-faint">{label}</p>
      <p className="text-h4 font-headline font-bold text-ink">{value}</p>
    </div>
  );
}
