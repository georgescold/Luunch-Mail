import Link from "next/link";
import { requireAuth } from "@/lib/core/auth";
import { db } from "@/lib/core/db";
import { num, ratio, parseJson } from "@/lib/core/fmt";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { NewCampaignModal } from "@/components/outreach/new-campaign-modal";
import {
  Send, Reply, MailCheck, MousePointerClick, Rocket, Shuffle, GitCompareArrows, FlaskConical, ChevronRight,
} from "lucide-react";

type Stats = {
  sent?: number;
  delivered?: number;
  opened?: number;
  clicked?: number;
  replied?: number;
  bounced?: number;
};

export default async function OutreachPage() {
  const { workspace } = await requireAuth();
  const wid = workspace.id;

  const campaigns = await db.campaign.findMany({
    where: { workspaceId: wid, type: "outreach" },
    orderBy: { updatedAt: "desc" },
    include: {
      _count: { select: { steps: true, enrollments: true } },
    },
  });

  // Agrégats globaux à partir des stats parsées de chaque campagne.
  const totals = campaigns.reduce(
    (acc, c) => {
      const s = parseJson<Stats>(c.stats, {});
      acc.sent += s.sent ?? 0;
      acc.delivered += s.delivered ?? 0;
      acc.opened += s.opened ?? 0;
      acc.clicked += s.clicked ?? 0;
      acc.replied += s.replied ?? 0;
      acc.bounced += s.bounced ?? 0;
      return acc;
    },
    { sent: 0, delivered: 0, opened: 0, clicked: 0, replied: 0, bounced: 0 },
  );
  const running = campaigns.filter((c) => c.status === "running").length;

  return (
    <>
      <PageHeader
        title="Cold outreach"
        description="Séquences de prospection multi-boîtes : relances automatiques, rotation, spintax et arrêt sur réponse."
        actions={<NewCampaignModal />}
      />

      {campaigns.length === 0 ? (
        <EmptyState
          icon={Send}
          title="Lancez votre première séquence"
          description="Une séquence d'outreach enchaîne un premier e-mail puis des relances espacées, réparties sur vos boîtes d'envoi. Elle s'arrête dès qu'un prospect répond."
          action={<NewCampaignModal />}
        />
      ) : (
        <>
          {/* KPIs globaux */}
          <div className="grid grid-cols-2 gap-sp-4 lg:grid-cols-4">
            <StatCard label="E-mails envoyés" value={num(totals.sent)} icon={Send} hint={`${running} séquence(s) en cours`} />
            <StatCard
              label="Taux de délivrabilité"
              value={ratio(totals.delivered, totals.sent)}
              icon={MailCheck}
              deltaTone={totals.sent && totals.delivered / totals.sent >= 0.98 ? "up" : "neutral"}
              delta={totals.sent && totals.delivered / totals.sent >= 0.98 ? "sain" : undefined}
            />
            <StatCard label="Taux d'ouverture" value={ratio(totals.opened, totals.delivered)} icon={MousePointerClick} />
            <StatCard
              label="Taux de réponse"
              value={ratio(totals.replied, totals.delivered)}
              icon={Reply}
              hint="le KPI nº1 du cold email"
            />
          </div>

          {/* Liste des séquences */}
          <div className="mt-sp-6 grid gap-sp-4 md:grid-cols-2">
            {campaigns.map((c) => {
              const s = parseJson<Stats>(c.stats, {});
              const sent = s.sent ?? 0;
              return (
                <Link key={c.id} href={`/outreach/${c.id}`} className="group">
                  <Card hover className="h-full">
                    <div className="flex items-start justify-between gap-sp-3">
                      <div className="min-w-0">
                        <CardTitle className="truncate group-hover:text-primary">{c.name}</CardTitle>
                        <CardDescription className="mt-sp-1">
                          {c._count.steps} étape(s) · {num(c._count.enrollments)} inscrit(s)
                        </CardDescription>
                      </div>
                      <StatusBadge status={c.status} />
                    </div>

                    {/* Badges des fonctionnalités d'envoi intelligent */}
                    <div className="mt-sp-3 flex flex-wrap gap-sp-2">
                      {c.mailboxRotation && (
                        <Badge tone="info">
                          <Shuffle size={12} /> Rotation
                        </Badge>
                      )}
                      {c.espMatching && (
                        <Badge tone="purple">
                          <GitCompareArrows size={12} /> ESP matching
                        </Badge>
                      )}
                      {c.abTesting && (
                        <Badge tone="primary">
                          <FlaskConical size={12} /> A/B test
                        </Badge>
                      )}
                      {!c.mailboxRotation && !c.espMatching && !c.abTesting && (
                        <Badge tone="neutral">Réglages standard</Badge>
                      )}
                    </div>

                    {/* Stats parsées + taux */}
                    <div className="mt-sp-4 grid grid-cols-3 gap-sp-3 border-t border-fill-muted pt-sp-4 text-sm">
                      <Metric label="Envoyés" value={num(sent)} />
                      <Metric label="Délivrés" value={ratio(s.delivered ?? 0, sent)} />
                      <Metric label="Ouverts" value={ratio(s.opened ?? 0, s.delivered ?? 0)} />
                      <Metric label="Cliqués" value={ratio(s.clicked ?? 0, s.delivered ?? 0)} />
                      <Metric label="Réponses" value={ratio(s.replied ?? 0, s.delivered ?? 0)} tone="success" />
                      <Metric label="Bounces" value={ratio(s.bounced ?? 0, sent)} tone={(s.bounced ?? 0) / (sent || 1) > 0.03 ? "error" : undefined} />
                    </div>

                    <div className="mt-sp-4 flex items-center justify-end text-sm font-medium text-primary">
                      Ouvrir la séquence <ChevronRight size={16} />
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>

          <p className="mt-sp-6 flex items-center justify-center gap-sp-2 text-center text-xs text-ink-disabled">
            <Rocket size={14} /> Les relances partent automatiquement et la séquence s'arrête dès qu'un prospect répond.
          </p>
        </>
      )}
    </>
  );
}

function Metric({ label, value, tone }: { label: string; value: string; tone?: "success" | "error" }) {
  return (
    <div>
      <p className="text-xs text-ink-faint">{label}</p>
      <p
        className={`font-semibold ${
          tone === "success" ? "text-success-fg" : tone === "error" ? "text-error" : "text-ink"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
