import { requireAuth } from "@/lib/core/auth";
import { db } from "@/lib/core/db";
import { isDemoMode, googleConfigured } from "@/lib/core/env";
import { num, pct } from "@/lib/core/fmt";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Card } from "@/components/ui/card";
import { StatusBadge, Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Tabs } from "@/components/ui/tabs";
import {
  Globe, Mail, Server, ShieldCheck, Flame, CheckCircle2, Pause, Play, Network,
} from "lucide-react";
import { DomainCard, type DomainView } from "@/components/infrastructure/domain-card";
import { AddDomainModal } from "@/components/infrastructure/add-domain-modal";
import { AddMailboxModal } from "@/components/infrastructure/add-mailbox-modal";
import { AddIpPoolModal } from "@/components/infrastructure/add-ip-pool-modal";
import { IpAutoWarmupSwitch } from "@/components/infrastructure/ip-autowarmup-switch";
import { regionLabel, providerLabel } from "@/components/infrastructure/region-label";
import { toggleMailboxAction, toggleWarmupAction } from "@/server/infrastructure-actions";
import { cn } from "@/lib/core/cn";
import { hasCheapInboxes } from "@/lib/integrations/cheapinboxes";

function repTone(score: number): "success" | "warning" | "error" {
  return score >= 80 ? "success" : score >= 60 ? "warning" : "error";
}

const GOOGLE_FEEDBACK: Record<string, { tone: "success" | "error" | "warning"; msg: string }> = {
  connected: { tone: "success", msg: "Boîte Google connectée avec succès — elle démarre en chauffe." },
  denied: { tone: "warning", msg: "Connexion Google annulée." },
  error: { tone: "error", msg: "Échec de la connexion Google. Réessayez." },
  bad_state: { tone: "error", msg: "Session expirée pendant la connexion Google. Réessayez." },
  not_configured: { tone: "warning", msg: "L'OAuth Google n'est pas configuré (voir docs/SETUP-GOOGLE.md)." },
};

export default async function InfrastructurePage({
  searchParams,
}: {
  searchParams: Promise<{ google?: string }>;
}) {
  const { workspace } = await requireAuth();
  const wid = workspace.id;
  const gConfig = googleConfigured();
  const sp = await searchParams;
  const feedback = sp.google ? GOOGLE_FEEDBACK[sp.google] : null;

  const [domains, mailboxes, ipPools, ws] = await Promise.all([
    db.domain.findMany({
      where: { workspaceId: wid },
      orderBy: { createdAt: "desc" },
      include: { dnsRecords: { orderBy: { createdAt: "asc" } } },
    }),
    db.mailbox.findMany({ where: { workspaceId: wid }, orderBy: { createdAt: "desc" } }),
    db.ipPool.findMany({ where: { workspaceId: wid }, orderBy: { createdAt: "desc" } }),
    db.workspace.findUnique({ where: { id: wid }, select: { integrations: true } }),
  ]);
  const ciConnected = ws ? hasCheapInboxes(ws.integrations) : false;

  // ---- KPIs ----
  const verifiedDomains = domains.filter((d) => d.status === "verified").length;
  const activeMailboxes = mailboxes.filter((m) => m.status === "active").length;
  const warmingMailboxes = mailboxes.filter((m) => m.status === "warming").length;
  const avgReputation = mailboxes.length
    ? Math.round(mailboxes.reduce((s, m) => s + m.reputationScore, 0) / mailboxes.length)
    : 0;

  // ---- Vues domaines (DNS vérifiés / total) ----
  const domainViews: DomainView[] = domains.map((d) => {
    const records = d.dnsRecords;
    const verifiedCount = records.filter((r) => r.status === "verified").length;
    return {
      id: d.id,
      name: d.name,
      status: d.status,
      provider: d.provider,
      region: d.region,
      verifiedCount,
      totalCount: records.length,
      records: records.map((r) => ({
        id: r.id,
        type: r.type,
        host: r.host,
        value: r.value,
        priority: r.priority,
        purpose: r.purpose,
        status: r.status,
      })),
    };
  });

  // ============================ ONGLET DOMAINES ============================
  const domainsTab = (
    <div className="space-y-sp-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-ink-faint">
          {domains.length ? `${domains.length} domaine(s) · ${verifiedDomains} vérifié(s)` : "Authentifiez vos domaines avant d'envoyer."}
        </p>
        <AddDomainModal />
      </div>

      {domainViews.length === 0 ? (
        <EmptyState
          icon={Globe}
          title="Aucun domaine connecté"
          description="Connectez un domaine d'envoi : Luunch Mail génère automatiquement SPF, DKIM et DMARC pour authentifier vos e-mails et maximiser la délivrabilité."
          action={<AddDomainModal />}
        />
      ) : (
        <div className="space-y-sp-4">
          {domainViews.map((d) => (
            <DomainCard key={d.id} domain={d} />
          ))}
        </div>
      )}
    </div>
  );

  // ============================ ONGLET BOÎTES ============================
  const mailboxesTab = (
    <div className="space-y-sp-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-ink-faint">
          {mailboxes.length ? `${mailboxes.length} boîte(s) · ${activeMailboxes} active(s) · ${warmingMailboxes} en chauffe` : "Connectez vos boîtes d'envoi."}
        </p>
        <AddMailboxModal googleConfigured={gConfig} cheapInboxesConnected={ciConnected} />
      </div>

      {mailboxes.length === 0 ? (
        <EmptyState
          icon={Mail}
          title="Aucune boîte d'envoi"
          description="Branchez une boîte Google Workspace, Microsoft 365 ou SMTP/IMAP. Chaque boîte démarre en chauffe pour bâtir progressivement sa réputation."
          action={<AddMailboxModal googleConfigured={gConfig} cheapInboxesConnected={ciConnected} />}
        />
      ) : (
        <div className="grid gap-sp-4 lg:grid-cols-2">
          {mailboxes.map((m) => {
            const limitPct = m.dailyLimit ? Math.round((m.sentToday / m.dailyLimit) * 100) : 0;
            return (
              <Card key={m.id} className="flex flex-col gap-sp-4">
                <div className="flex items-start justify-between gap-sp-3">
                  <div className="min-w-0">
                    <p className="truncate font-headline text-h4 font-semibold text-ink">{m.email}</p>
                    <p className="mt-sp-1 flex flex-wrap items-center gap-sp-2 text-xs text-ink-faint">
                      <Badge tone="neutral">{providerLabel(m.provider)}</Badge>
                      {m.displayName && <span>{m.displayName}</span>}
                    </p>
                  </div>
                  <StatusBadge status={m.status} />
                </div>

                <div className="grid grid-cols-2 gap-sp-4 text-sm">
                  <div>
                    <p className="text-xs text-ink-faint">Volume du jour</p>
                    <p className="font-medium text-ink">{num(m.sentToday)} / {num(m.dailyLimit)}</p>
                    <div className="mt-sp-2">
                      <Progress value={m.sentToday} max={m.dailyLimit || 1} tone={limitPct >= 90 ? "warning" : "primary"} />
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-ink-faint">Réputation</p>
                    <p className="font-medium text-ink">{m.reputationScore}/100</p>
                    <div className="mt-sp-2">
                      <Progress value={m.reputationScore} tone={repTone(m.reputationScore)} />
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-sp-2 text-ink-muted">
                    <Flame size={15} className={m.warmupEnabled ? "text-warning-fg" : "text-ink-disabled"} />
                    {m.warmupEnabled ? `Chauffe active · jour ${m.warmupStage}` : "Chauffe désactivée"}
                  </span>
                </div>

                <div className="mt-auto flex flex-wrap gap-sp-2 border-t border-fill-muted pt-sp-4">
                  <form action={toggleMailboxAction}>
                    <input type="hidden" name="mailboxId" value={m.id} />
                    {m.status === "paused" ? (
                      <Button type="submit" variant="secondary" size="sm"><Play size={14} /> Activer</Button>
                    ) : (
                      <Button type="submit" variant="subtle" size="sm"><Pause size={14} /> Mettre en pause</Button>
                    )}
                  </form>
                  <form action={toggleWarmupAction}>
                    <input type="hidden" name="mailboxId" value={m.id} />
                    {m.warmupEnabled ? (
                      <Button type="submit" variant="subtle" size="sm"><Flame size={14} /> Couper la chauffe</Button>
                    ) : (
                      <Button type="submit" variant="secondary" size="sm"><Flame size={14} /> Lancer la chauffe</Button>
                    )}
                  </form>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );

  // ============================ ONGLET POOLS D'IP ============================
  const ipTab = (
    <div className="space-y-sp-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-ink-faint">
          {ipPools.length ? `${ipPools.length} pool(s) d'IP` : "Gérez vos pools d'IP partagés et dédiés."}
        </p>
        <AddIpPoolModal />
      </div>

      {ipPools.length === 0 ? (
        <EmptyState
          icon={Network}
          title="Aucun pool d'IP"
          description="Ajoutez un pool partagé (IP propres mutualisées) ou dédié (IP réservée à votre trafic). L'auto-warmup monte le volume progressivement pour bâtir la réputation."
          action={<AddIpPoolModal />}
        />
      ) : (
        <div className="grid gap-sp-4 lg:grid-cols-2">
          {ipPools.map((p) => (
            <Card key={p.id} className="flex flex-col gap-sp-4">
              <div className="flex items-start justify-between gap-sp-3">
                <div className="min-w-0">
                  <p className="truncate font-headline text-h4 font-semibold text-ink">{p.name}</p>
                  <p className="mt-sp-1 flex flex-wrap items-center gap-sp-2 text-xs text-ink-faint">
                    <Badge tone={p.type === "dedicated" ? "purple" : "neutral"}>
                      {p.type === "dedicated" ? "Dédié" : "Partagé"}
                    </Badge>
                    <span>{regionLabel(p.region)}</span>
                    {p.ipAddress && <span className="font-mono">{p.ipAddress}</span>}
                  </p>
                </div>
                <StatusBadge status={p.status} />
              </div>

              <div>
                <div className="mb-sp-2 flex items-center justify-between text-sm">
                  <span className="flex items-center gap-sp-2 text-ink-muted"><ShieldCheck size={15} /> Réputation</span>
                  <span className="font-medium text-ink">{p.reputationScore}/100</span>
                </div>
                <Progress value={p.reputationScore} tone={repTone(p.reputationScore)} showLabel />
              </div>

              <label className="mt-auto flex items-center justify-between border-t border-fill-muted pt-sp-4 text-sm">
                <span className="flex items-center gap-sp-2 text-ink-muted">
                  <Flame size={15} className={p.autoWarmup ? "text-warning-fg" : "text-ink-disabled"} /> Auto-warmup
                </span>
                <IpAutoWarmupSwitch poolId={p.id} enabled={p.autoWarmup} />
              </label>
            </Card>
          ))}
        </div>
      )}
    </div>
  );

  const hasNothing = !domains.length && !mailboxes.length && !ipPools.length;

  return (
    <>
      <PageHeader
        title="Infrastructure"
        description="Domaines authentifiés, boîtes d'envoi et pools d'IP — les fondations de votre délivrabilité."
        actions={<AddDomainModal />}
      />

      {feedback && (
        <div
          className={cn(
            "mb-sp-5 flex items-center gap-sp-2 rounded-md px-sp-4 py-sp-3 text-sm",
            feedback.tone === "success" && "bg-success-soft text-success-fg",
            feedback.tone === "error" && "bg-error-soft text-error",
            feedback.tone === "warning" && "bg-warning-soft text-warning-fg",
          )}
        >
          {feedback.tone === "success" ? <CheckCircle2 size={16} /> : <ShieldCheck size={16} />} {feedback.msg}
        </div>
      )}

      <div className="grid grid-cols-2 gap-sp-4 lg:grid-cols-4">
        <StatCard label="Domaines vérifiés" value={`${verifiedDomains}/${domains.length}`} icon={Server} hint={domains.length ? undefined : "à connecter"} />
        <StatCard label="Boîtes actives" value={num(activeMailboxes)} icon={Mail} hint={`${mailboxes.length} au total`} />
        <StatCard
          label="Réputation moyenne"
          value={mailboxes.length ? pct(avgReputation, 0) : "—"}
          icon={ShieldCheck}
          deltaTone={avgReputation >= 80 ? "up" : "neutral"}
          delta={mailboxes.length ? (avgReputation >= 80 ? "saine" : "à surveiller") : undefined}
        />
        <StatCard label="Boîtes en chauffe" value={num(warmingMailboxes)} icon={Flame} hint="montée en volume" />
      </div>

      {hasNothing && (
        <Card className="mt-sp-6 border-primary/30 bg-primary-soft/40">
          <div className="flex items-start gap-sp-4">
            <CheckCircle2 className="mt-sp-1 shrink-0 text-primary" />
            <div>
              <p className="font-headline text-h4 font-semibold text-ink">Posez vos fondations d'envoi</p>
              <p className="mt-sp-2 text-sm text-ink-muted">
                Trois étapes pour une délivrabilité au top : connectez un <strong>domaine</strong> (SPF/DKIM/DMARC auto),
                branchez une <strong>boîte d'envoi</strong>, puis laissez la <strong>chauffe</strong> bâtir votre réputation.
              </p>
              <div className="mt-sp-4 flex flex-wrap gap-sp-2">
                <AddDomainModal />
                <AddMailboxModal googleConfigured={gConfig} cheapInboxesConnected={ciConnected} />
              </div>
            </div>
          </div>
        </Card>
      )}

      <div className="mt-sp-6">
        <Tabs
          items={[
            { id: "domains", label: "Domaines", content: domainsTab },
            { id: "mailboxes", label: "Boîtes d'envoi", content: mailboxesTab },
            { id: "ips", label: "Pools d'IP", content: ipTab },
          ]}
        />
      </div>

      {isDemoMode() && (
        <p className="mt-sp-6 text-center text-xs text-ink-disabled">
          Mode démo — les connexions OAuth (Google/Microsoft) et la vérification DNS sont simulées. Configurez vos clés pour
          le branchement réel.
        </p>
      )}
    </>
  );
}
