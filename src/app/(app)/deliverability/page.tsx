import { requireAuth } from "@/lib/core/auth";
import { db } from "@/lib/core/db";
import { isDemoMode } from "@/lib/core/env";
import { num, pct, date, dateTime, parseJson } from "@/lib/core/fmt";
import { PageHeader } from "@/components/page-header";
import { Card, CardTitle, CardDescription } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { buttonClasses } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Tabs } from "@/components/ui/tabs";
import { Table, THead, TH, TR, TD } from "@/components/ui/table";
import { BarChart, StackBar } from "@/components/bar-chart";
import { ContentAnalyzer } from "@/components/deliverability/content-analyzer";
import {
  PlacementModal, BlacklistModal, VerifyEmailModal, SuppressionModal,
} from "@/components/deliverability/action-modals";
import {
  Flame, Target, ShieldAlert, MailCheck, ListX, Inbox, Reply, ShieldCheck,
  ScanText, Lightbulb, CheckCircle2, Info, Trash2, Server,
} from "lucide-react";
import { removeSuppressionEntryAction } from "@/server/deliverability-actions";

export default async function DeliverabilityPage() {
  const { workspace } = await requireAuth();
  const wid = workspace.id;
  const since14 = new Date(Date.now() - 14 * 86400_000);

  const [
    warmupMailboxes,
    placementTests,
    blacklistChecks,
    verifications,
    suppressions,
    suppressionCount,
    domains,
  ] = await Promise.all([
    db.mailbox.findMany({
      where: { workspaceId: wid, warmupEnabled: true },
      orderBy: { reputationScore: "desc" },
      include: {
        warmup: { where: { date: { gte: since14 } }, orderBy: { date: "asc" } },
      },
    }),
    db.placementTest.findMany({ where: { workspaceId: wid }, orderBy: { createdAt: "desc" }, take: 20 }),
    db.blacklistCheck.findMany({ where: { workspaceId: wid }, orderBy: { createdAt: "desc" }, take: 20 }),
    db.emailVerification.findMany({ where: { workspaceId: wid }, orderBy: { createdAt: "desc" }, take: 25 }),
    db.suppressionEntry.findMany({ where: { workspaceId: wid }, orderBy: { createdAt: "desc" }, take: 50 }),
    db.suppressionEntry.count({ where: { workspaceId: wid } }),
    db.domain.findMany({ where: { workspaceId: wid }, include: { dnsRecords: true } }),
  ]);

  return (
    <>
      <PageHeader
        title="Délivrabilité"
        description="Chauffez vos boîtes, testez le placement en boîte de réception, surveillez 400+ blacklists, vérifiez vos adresses et gérez la liste de suppression."
      />

      <Tabs
        defaultTab="warmup"
        items={[
          { id: "warmup", label: "Warmup", content: <WarmupTab mailboxes={warmupMailboxes} /> },
          { id: "placement", label: "Placement", content: <PlacementTab tests={placementTests} /> },
          { id: "blacklists", label: "Blacklists", content: <BlacklistTab checks={blacklistChecks} domains={domains} /> },
          { id: "verification", label: "Vérification e-mails", content: <VerificationTab verifications={verifications} /> },
          { id: "suppression", label: "Suppression", content: <SuppressionTab entries={suppressions} total={suppressionCount} /> },
        ]}
      />

      {isDemoMode() && (
        <p className="mt-sp-6 text-center text-xs text-ink-disabled">
          Mode démo — les tests de placement et les résultats de chauffe sont simulés par le worker. Les lookups DNSBL et MX restent réels.
        </p>
      )}
    </>
  );
}

/* ====================================================================== */
/* WARMUP                                                                  */
/* ====================================================================== */

type WarmupMailbox = {
  id: string;
  email: string;
  displayName: string | null;
  status: string;
  warmupStage: number;
  reputationScore: number;
  dailyLimit: number;
  warmup: { date: Date; sent: number; opened: number; replied: number; savedFromSpam: number }[];
};

function WarmupTab({ mailboxes }: { mailboxes: WarmupMailbox[] }) {
  if (mailboxes.length === 0) {
    return (
      <EmptyState
        icon={Flame}
        title="Aucune boîte en chauffe"
        description="Activez le warmup sur vos boîtes d'envoi pour bâtir leur réputation progressivement (slow ramp) avant de scaler vos campagnes."
        action={
          <a href="/infrastructure" className={buttonClasses({})}>
            <Server size={16} /> Configurer une boîte
          </a>
        }
      />
    );
  }

  const totals = mailboxes.reduce(
    (acc, m) => {
      for (const w of m.warmup) {
        acc.sent += w.sent;
        acc.opened += w.opened;
        acc.replied += w.replied;
        acc.savedFromSpam += w.savedFromSpam;
      }
      return acc;
    },
    { sent: 0, opened: 0, replied: 0, savedFromSpam: 0 },
  );

  return (
    <div className="space-y-sp-6">
      <Card className="border-primary/30 bg-primary-soft/30">
        <div className="flex items-start gap-sp-4">
          <Flame className="mt-sp-1 shrink-0 text-primary" />
          <div>
            <CardTitle>Chauffe automatique (slow ramp)</CardTitle>
            <p className="mt-sp-2 text-sm text-ink-muted">
              Chaque boîte monte en puissance naturellement (J1 = 2 envois, J2 = 4, J3 = 6…). L'IA envoie, ouvre, lit
              et répond aux e-mails de chauffe, et les <strong>sort même des spams</strong>. Des garde-fous{" "}
              <strong>mettent automatiquement la boîte en pause</strong> en cas de pic de bounces ou de plaintes, puis
              la réintègrent une fois la réputation rétablie.
            </p>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-sp-4 lg:grid-cols-4">
        <StatCard label="Envois de chauffe (14 j)" value={num(totals.sent)} icon={Flame} />
        <StatCard label="Ouverts" value={num(totals.opened)} icon={Inbox} />
        <StatCard label="Réponses" value={num(totals.replied)} icon={Reply} />
        <StatCard label="Sortis des spams" value={num(totals.savedFromSpam)} icon={ShieldCheck} hint="récupérés par le réseau" />
      </div>

      <div className="space-y-sp-4">
        {mailboxes.map((m) => {
          const days = m.warmup.map((w) => ({
            label: new Date(w.date).toLocaleDateString("fr-FR", { day: "2-digit" }),
            value: w.sent,
          }));
          const mb = m.warmup.reduce(
            (a, w) => ({ opened: a.opened + w.opened, replied: a.replied + w.replied, saved: a.saved + w.savedFromSpam }),
            { opened: 0, replied: 0, saved: 0 },
          );
          const repTone = m.reputationScore >= 80 ? "success" : m.reputationScore >= 60 ? "warning" : "error";
          return (
            <Card key={m.id}>
              <div className="flex flex-col gap-sp-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-sp-2">
                    <CardTitle className="truncate">{m.displayName || m.email}</CardTitle>
                    <StatusBadge status={m.status} />
                  </div>
                  <CardDescription>{m.email}</CardDescription>
                  <div className="mt-sp-3 flex flex-wrap items-center gap-sp-4 text-sm">
                    <span className="flex items-center gap-sp-2 text-ink-muted">
                      Jour de ramp <Badge tone="primary">J{m.warmupStage}</Badge>
                    </span>
                    <span className="text-ink-muted">Limite quotidienne : <strong className="text-ink">{num(m.dailyLimit)}</strong></span>
                  </div>
                  <div className="mt-sp-4 max-w-sm">
                    <div className="mb-sp-1 flex items-center justify-between text-xs">
                      <span className="text-ink-faint">Score de réputation</span>
                      <span className="font-medium text-ink">{m.reputationScore}/100</span>
                    </div>
                    <Progress value={m.reputationScore} tone={repTone} />
                  </div>
                  {m.status === "paused" && (
                    <p className="mt-sp-3 flex items-center gap-sp-2 rounded-md bg-warning-soft px-sp-3 py-sp-2 text-xs text-warning-fg">
                      <Info size={14} /> Boîte mise en pause automatiquement — la chauffe reprendra une fois la réputation stabilisée.
                    </p>
                  )}
                </div>

                <div className="w-full lg:w-[360px] lg:shrink-0">
                  <p className="mb-sp-2 text-xs font-medium text-ink-faint">Envois de chauffe — 14 derniers jours</p>
                  {days.length > 0 ? (
                    <BarChart data={days} height={120} tone="success" />
                  ) : (
                    <p className="py-sp-5 text-center text-xs text-ink-disabled">Pas encore d'activité de chauffe.</p>
                  )}
                  <div className="mt-sp-3 grid grid-cols-3 gap-sp-2 text-center">
                    <MiniMetric label="Ouverts" value={num(mb.opened)} />
                    <MiniMetric label="Réponses" value={num(mb.replied)} />
                    <MiniMetric label="Anti-spam" value={num(mb.saved)} />
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-sm bg-fill-subtle px-sp-2 py-sp-2">
      <p className="text-h4 font-headline font-bold text-ink">{value}</p>
      <p className="text-[10px] text-ink-faint">{label}</p>
    </div>
  );
}

/* ====================================================================== */
/* PLACEMENT                                                               */
/* ====================================================================== */

type PlacementTestRow = {
  id: string;
  name: string;
  status: string;
  inboxPct: number;
  promotionsPct: number;
  spamPct: number;
  spamScore: number;
  providerResults: string | null;
  recommendations: string | null;
  createdAt: Date;
};

type ProviderResult = { inbox: number; promotions: number; spam: number };

function PlacementTab({ tests }: { tests: PlacementTestRow[] }) {
  return (
    <div className="space-y-sp-6">
      <div className="flex flex-col gap-sp-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-ink-muted">
            Tests de placement en temps réel sur des seed lists curées (Gmail, Outlook, Yahoo…) : savoir si vous tombez
            en <strong>Boîte principale</strong>, <strong>Promotions</strong> ou <strong>Spam</strong>.
          </p>
        </div>
        <PlacementModal />
      </div>

      {/* Analyseur de contenu */}
      <Card>
        <div className="mb-sp-4 flex items-start gap-sp-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary-soft text-primary">
            <ScanText size={18} />
          </span>
          <div>
            <CardTitle>Analyseur de contenu</CardTitle>
            <CardDescription>
              Scan de l'objet, du corps et des liens via des filtres standards (type SpamAssassin / Google / Barracuda)
              — score et recommandations instantanés.
            </CardDescription>
          </div>
        </div>
        <ContentAnalyzer />
      </Card>

      {tests.length === 0 ? (
        <EmptyState
          icon={Target}
          title="Aucun test de placement"
          description="Lancez un premier test pour savoir où atterrissent vos e-mails chez Gmail, Outlook et Yahoo."
        />
      ) : (
        <div className="space-y-sp-4">
          {tests.map((t) => {
            const providers = parseJson<Record<string, ProviderResult>>(t.providerResults, {});
            const recos = parseJson<string[]>(t.recommendations, []);
            const done = t.status === "done";
            return (
              <Card key={t.id}>
                <div className="flex flex-wrap items-center justify-between gap-sp-3">
                  <div>
                    <div className="flex items-center gap-sp-2">
                      <CardTitle>{t.name}</CardTitle>
                      <StatusBadge status={t.status} />
                    </div>
                    <CardDescription>{dateTime(t.createdAt)}</CardDescription>
                  </div>
                  {done && (
                    <div className="flex items-center gap-sp-4 text-sm">
                      <span className="text-ink-muted">Boîte principale <strong className="text-success-fg">{pct(t.inboxPct, 0)}</strong></span>
                      <span className="text-ink-muted">Score spam <strong className={t.spamScore > 5 ? "text-error" : "text-ink"}>{t.spamScore.toFixed(1)}/10</strong></span>
                    </div>
                  )}
                </div>

                {done ? (
                  <>
                    <div className="mt-sp-4">
                      <StackBar
                        segments={[
                          { label: "Boîte principale", value: t.inboxPct, color: "bg-success" },
                          { label: "Promotions", value: t.promotionsPct, color: "bg-warning" },
                          { label: "Spam", value: t.spamPct, color: "bg-error" },
                        ]}
                      />
                    </div>

                    {Object.keys(providers).length > 0 && (
                      <div className="mt-sp-5 grid gap-sp-3 sm:grid-cols-3">
                        {(["gmail", "outlook", "yahoo"] as const).map((key) => {
                          const p = providers[key];
                          if (!p) return null;
                          return (
                            <div key={key} className="rounded-md border border-line bg-fill-subtle p-sp-4">
                              <p className="mb-sp-2 text-sm font-medium capitalize text-ink">{key}</p>
                              <ProviderLine label="Principale" value={p.inbox} tone="text-success-fg" />
                              <ProviderLine label="Promotions" value={p.promotions} tone="text-warning-fg" />
                              <ProviderLine label="Spam" value={p.spam} tone="text-error" />
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {recos.length > 0 && (
                      <div className="mt-sp-4 rounded-md bg-warning-soft/50 p-sp-4">
                        <p className="mb-sp-2 flex items-center gap-sp-2 text-sm font-medium text-warning-fg">
                          <Lightbulb size={16} /> Recommandations
                        </p>
                        <ul className="list-disc space-y-sp-1 pl-sp-5 text-sm text-ink-muted">
                          {recos.map((r, i) => <li key={i}>{r}</li>)}
                        </ul>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="mt-sp-3 text-sm text-ink-faint">Test en cours — les résultats apparaîtront dans quelques instants.</p>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ProviderLine({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-ink-faint">{label}</span>
      <span className={`font-medium ${tone}`}>{pct(value, 0)}</span>
    </div>
  );
}

/* ====================================================================== */
/* BLACKLISTS                                                              */
/* ====================================================================== */

type BlacklistRow = {
  id: string;
  target: string;
  listsChecked: number;
  listedOn: string;
  status: string;
  createdAt: Date;
};
type DomainRow = { name: string; dnsRecords: { purpose: string; status: string }[] };

function BlacklistTab({ checks, domains }: { checks: BlacklistRow[]; domains: DomainRow[] }) {
  const listedCount = checks.filter((c) => c.status === "listed").length;

  return (
    <div className="space-y-sp-6">
      <div className="flex flex-col gap-sp-3 sm:flex-row sm:items-start sm:justify-between">
        <p className="max-w-2xl text-sm text-ink-muted">
          Surveillance de votre domaine et de vos IP sur <strong>400+ DNSBL</strong> (dont <strong>Spamhaus</strong>,
          SpamCop, Barracuda…). Une entité listée nuit gravement à la délivrabilité — agissez vite.
        </p>
        <BlacklistModal />
      </div>

      {/* Santé DNS (SPF/DKIM/DMARC) */}
      {domains.length > 0 && (
        <Card>
          <CardTitle>Santé DNS / authentification</CardTitle>
          <CardDescription>SPF, DKIM et DMARC corrects protègent contre le spoofing et améliorent le placement.</CardDescription>
          <div className="mt-sp-4 space-y-sp-3">
            {domains.map((d) => {
              const get = (p: string) => d.dnsRecords.find((r) => r.purpose === p)?.status;
              return (
                <div key={d.name} className="flex flex-wrap items-center justify-between gap-sp-3 border-b border-fill-muted pb-sp-3 last:border-0 last:pb-0">
                  <span className="font-medium text-ink">{d.name}</span>
                  <div className="flex flex-wrap items-center gap-sp-2">
                    {(["spf", "dkim", "dmarc"] as const).map((p) => {
                      const s = get(p);
                      return (
                        <Badge key={p} tone={s === "verified" ? "success" : s ? "warning" : "neutral"}>
                          {p.toUpperCase()} {s === "verified" ? "✓" : s === "failed" ? "✕" : "—"}
                        </Badge>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {listedCount > 0 && (
        <div className="flex items-center gap-sp-2 rounded-md bg-error-soft px-sp-4 py-sp-3 text-sm text-error">
          <ShieldAlert size={18} /> {num(listedCount)} entité(s) actuellement listée(s) sur au moins une blacklist.
        </div>
      )}

      {checks.length === 0 ? (
        <EmptyState
          icon={ShieldAlert}
          title="Aucune vérification de blacklist"
          description="Vérifiez votre domaine d'envoi ou vos IP sur Spamhaus et 400+ autres DNSBL pour anticiper les problèmes de réputation."
        />
      ) : (
        <Table>
          <THead>
            <TR>
              <TH>Cible</TH>
              <TH>Statut</TH>
              <TH>Listes consultées</TH>
              <TH>Listé sur</TH>
              <TH>Date</TH>
            </TR>
          </THead>
          <tbody>
            {checks.map((c) => {
              const listed = parseJson<string[]>(c.listedOn, []);
              return (
                <TR key={c.id}>
                  <TD className="font-medium">{c.target}</TD>
                  <TD><StatusBadge status={c.status} /></TD>
                  <TD className="text-ink-muted">{num(c.listsChecked)}</TD>
                  <TD>
                    {listed.length === 0 ? (
                      <span className="text-success-fg">Aucune</span>
                    ) : (
                      <span className="font-mono text-xs text-error">{listed.join(", ")}</span>
                    )}
                  </TD>
                  <TD className="text-ink-faint">{dateTime(c.createdAt)}</TD>
                </TR>
              );
            })}
          </tbody>
        </Table>
      )}
    </div>
  );
}

/* ====================================================================== */
/* VÉRIFICATION                                                            */
/* ====================================================================== */

type VerificationRow = { id: string; email: string; result: string; score: number; createdAt: Date };

function VerificationTab({ verifications }: { verifications: VerificationRow[] }) {
  return (
    <div className="space-y-sp-6">
      <div className="flex flex-col gap-sp-3 sm:flex-row sm:items-start sm:justify-between">
        <p className="max-w-2xl text-sm text-ink-muted">
          Validez vos adresses <strong>avant l'envoi</strong> pour réduire le taux de bounce et protéger votre réputation.
          Contrôle de la syntaxe, des enregistrements MX, et <strong>détection des catch-all</strong> (domaines qui acceptent
          tout) souvent non vérifiables ailleurs.
        </p>
        <VerifyEmailModal />
      </div>

      {verifications.length === 0 ? (
        <EmptyState
          icon={MailCheck}
          title="Aucune vérification"
          description="Vérifiez une première adresse pour estimer sa validité (valide, invalide, risqué ou catch-all) avant de l'inclure dans une campagne."
        />
      ) : (
        <Table>
          <THead>
            <TR>
              <TH>Adresse</TH>
              <TH>Résultat</TH>
              <TH>Score</TH>
              <TH>Date</TH>
            </TR>
          </THead>
          <tbody>
            {verifications.map((v) => (
              <TR key={v.id}>
                <TD className="font-medium">{v.email}</TD>
                <TD><StatusBadge status={v.result} /></TD>
                <TD className="w-40">
                  <div className="flex items-center gap-sp-2">
                    <Progress value={v.score} tone={v.score >= 80 ? "success" : v.score >= 40 ? "warning" : "error"} />
                    <span className="w-8 shrink-0 text-xs text-ink-faint">{v.score}</span>
                  </div>
                </TD>
                <TD className="text-ink-faint">{dateTime(v.createdAt)}</TD>
              </TR>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
}

/* ====================================================================== */
/* SUPPRESSION                                                             */
/* ====================================================================== */

type SuppressionRow = { id: string; email: string; reason: string; source: string | null; createdAt: Date };

const REASON_LABEL: Record<string, { label: string; tone: "neutral" | "error" | "warning" | "info" }> = {
  unsubscribe: { label: "Désinscription", tone: "neutral" },
  bounce: { label: "Bounce", tone: "error" },
  complaint: { label: "Plainte spam", tone: "error" },
  manual: { label: "Ajout manuel", tone: "info" },
};

function SuppressionTab({ entries, total }: { entries: SuppressionRow[]; total: number }) {
  return (
    <div className="space-y-sp-6">
      <Card className="border-primary/30 bg-primary-soft/30">
        <div className="flex items-start gap-sp-4">
          <ListX className="mt-sp-1 shrink-0 text-primary" />
          <div>
            <CardTitle>Liste de suppression dynamique</CardTitle>
            <p className="mt-sp-2 text-sm text-ink-muted">
              Toute adresse ici est <strong>automatiquement exclue de chaque envoi</strong> (sauf transactionnel critique) —
              conformité CAN-SPAM &amp; RGPD. Les désinscriptions <strong>1-clic</strong> (en-tête List-Unsubscribe), les bounces
              durs et les plaintes spam alimentent cette liste automatiquement.
            </p>
          </div>
        </div>
      </Card>

      <div className="flex flex-col gap-sp-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-sp-2 text-sm text-ink-muted">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-fill-muted text-ink-faint"><ListX size={16} /></span>
          <span><strong className="text-ink">{num(total)}</strong> adresse(s) supprimée(s)</span>
        </div>
        <SuppressionModal />
      </div>

      {entries.length === 0 ? (
        <EmptyState
          icon={CheckCircle2}
          title="Liste de suppression vide"
          description="Aucune adresse supprimée pour l'instant. Les désinscriptions, bounces et plaintes viendront s'ajouter ici automatiquement."
        />
      ) : (
        <Table>
          <THead>
            <TR>
              <TH>Adresse</TH>
              <TH>Motif</TH>
              <TH>Source</TH>
              <TH>Date</TH>
              <TH className="text-right">Action</TH>
            </TR>
          </THead>
          <tbody>
            {entries.map((e) => {
              const r = REASON_LABEL[e.reason] ?? { label: e.reason, tone: "neutral" as const };
              return (
                <TR key={e.id}>
                  <TD className="font-medium">{e.email}</TD>
                  <TD><Badge tone={r.tone}>{r.label}</Badge></TD>
                  <TD className="text-ink-faint">{e.source ?? "—"}</TD>
                  <TD className="text-ink-faint">{date(e.createdAt)}</TD>
                  <TD className="text-right">
                    <form action={removeSuppressionEntryAction}>
                      <input type="hidden" name="id" value={e.id} />
                      <button
                        type="submit"
                        className="inline-flex items-center gap-sp-1 rounded-sm px-sp-2 py-sp-1 text-xs text-ink-faint transition-colors hover:bg-error-soft hover:text-error"
                        title="Retirer de la liste de suppression"
                      >
                        <Trash2 size={14} /> Retirer
                      </button>
                    </form>
                  </TD>
                </TR>
              );
            })}
          </tbody>
        </Table>
      )}
    </div>
  );
}
