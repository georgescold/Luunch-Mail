import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAuth } from "@/lib/core/auth";
import { db } from "@/lib/core/db";
import { num, ratio, dateTime, parseJson, initials } from "@/lib/core/fmt";
import { PageHeader } from "@/components/page-header";
import { Card, CardTitle, CardDescription } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
import { Table, THead, TH, TR, TD } from "@/components/ui/table";
import { AddStepModal } from "@/components/outreach/add-step-modal";
import {
  startCampaignActionWrapper, pauseCampaignAction, enrollFromListAction,
} from "@/server/outreach-actions";
import {
  ArrowLeft, Mail, Clock, GitBranch, Play, Pause, Users, Shuffle,
  GitCompareArrows, FlaskConical, Reply, Info, Sparkles,
} from "lucide-react";

type Stats = {
  sent?: number;
  delivered?: number;
  opened?: number;
  clicked?: number;
  replied?: number;
  bounced?: number;
};

export default async function OutreachDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { workspace } = await requireAuth();
  const wid = workspace.id;

  const campaign = await db.campaign.findFirst({
    where: { id, workspaceId: wid, type: "outreach" },
    include: {
      steps: { orderBy: { order: "asc" } },
      enrollments: {
        include: { contact: true, mailbox: true },
        orderBy: { updatedAt: "desc" },
        take: 100,
      },
    },
  });
  if (!campaign) notFound();

  const [lists, mailboxCount] = await Promise.all([
    db.contactList.findMany({
      where: { workspaceId: wid },
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { members: true } } },
    }),
    db.mailbox.count({ where: { workspaceId: wid, status: { in: ["active", "warming"] } } }),
  ]);

  const stats = parseJson<Stats>(campaign.stats, {});
  const hasEmailStep = campaign.steps.some((s) => s.type === "email");
  const canLaunch =
    hasEmailStep && campaign.enrollments.length > 0 && campaign.status !== "running";
  const enrolledActive = campaign.enrollments.filter((e) => e.status === "active").length;
  const repliedCount = campaign.enrollments.filter((e) => e.status === "replied").length;

  return (
    <>
      <div className="mb-sp-3">
        <Link href="/outreach" className="inline-flex items-center gap-sp-1 text-sm text-ink-faint hover:text-ink">
          <ArrowLeft size={16} /> Toutes les séquences
        </Link>
      </div>

      <PageHeader
        title={campaign.name}
        description={campaign.subject ? `Objet par défaut : ${campaign.subject}` : "Aucun objet par défaut défini."}
        actions={
          <div className="flex items-center gap-sp-2">
            <StatusBadge status={campaign.status} />
            {campaign.status === "running" ? (
              <form action={pauseCampaignAction}>
                <input type="hidden" name="campaignId" value={campaign.id} />
                <Button type="submit" variant="subtle" size="sm">
                  <Pause size={16} /> Mettre en pause
                </Button>
              </form>
            ) : (
              <form action={startCampaignActionWrapper}>
                <input type="hidden" name="campaignId" value={campaign.id} />
                <Button type="submit" size="sm" disabled={!canLaunch}>
                  <Play size={16} /> Lancer la campagne
                </Button>
              </form>
            )}
          </div>
        }
      />

      {!canLaunch && campaign.status !== "running" && (
        <Card className="mb-sp-6 border-primary/30 bg-primary-soft/40">
          <div className="flex items-start gap-sp-3">
            <Info className="mt-sp-1 shrink-0 text-primary" size={20} />
            <div className="text-sm text-ink-muted">
              <p className="font-medium text-ink">Avant de lancer cette séquence :</p>
              <ul className="mt-sp-2 list-inside list-disc space-y-sp-1">
                {!hasEmailStep && <li>Ajoutez au moins une étape de type e-mail.</li>}
                {campaign.enrollments.length === 0 && <li>Inscrivez des contacts via une liste ci-dessous.</li>}
                {mailboxCount === 0 && (
                  <li>
                    Aucune boîte d'envoi active —{" "}
                    <Link href="/infrastructure" className="text-primary hover:underline">
                      connectez-en une
                    </Link>{" "}
                    pour l'envoi réel.
                  </li>
                )}
              </ul>
            </div>
          </div>
        </Card>
      )}

      {/* Réglages d'envoi intelligent */}
      <div className="mb-sp-6 flex flex-wrap gap-sp-2">
        <FeatureChip on={campaign.mailboxRotation} icon={Shuffle} label="Rotation des boîtes" />
        <FeatureChip on={campaign.espMatching} icon={GitCompareArrows} label="ESP matching" />
        <FeatureChip on={campaign.abTesting} icon={FlaskConical} label="A/B testing" />
      </div>

      {/* KPIs de la séquence */}
      <div className="grid grid-cols-2 gap-sp-4 lg:grid-cols-4">
        <StatCard label="Envoyés" value={num(stats.sent)} icon={Mail} hint={`${enrolledActive} inscrit(s) actif(s)`} />
        <StatCard label="Délivrés" value={ratio(stats.delivered ?? 0, stats.sent ?? 0)} />
        <StatCard label="Ouverts" value={ratio(stats.opened ?? 0, stats.delivered ?? 0)} />
        <StatCard label="Réponses" value={num(repliedCount)} icon={Reply} hint={`${ratio(repliedCount, campaign.enrollments.length)} des inscrits`} />
      </div>

      <div className="mt-sp-6 grid gap-sp-6 lg:grid-cols-3">
        {/* Timeline des étapes */}
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between">
            <CardTitle>Séquence ({campaign.steps.length} étape{campaign.steps.length > 1 ? "s" : ""})</CardTitle>
            <AddStepModal campaignId={campaign.id} />
          </div>

          {campaign.steps.length === 0 ? (
            <div className="mt-sp-5">
              <EmptyState
                icon={Mail}
                title="Construisez votre séquence"
                description="Commencez par un e-mail d'ouverture, ajoutez un délai d'attente, puis une relance. Les conditions arrêtent la séquence selon le comportement du prospect."
                action={<AddStepModal campaignId={campaign.id} />}
              />
            </div>
          ) : (
            <ol className="mt-sp-5 space-y-0">
              {campaign.steps.map((step, i) => (
                <StepRow key={step.id} step={step} index={i} last={i === campaign.steps.length - 1} />
              ))}
            </ol>
          )}
        </Card>

        {/* Inscrire des contacts + pédagogie */}
        <div className="space-y-sp-6">
          <Card>
            <CardTitle>Inscrire des contacts</CardTitle>
            <CardDescription className="mt-sp-1">
              Sélectionnez une liste : ses contacts abonnés sont inscrits et la séquence démarre.
            </CardDescription>

            {lists.length === 0 ? (
              <div className="mt-sp-4 rounded-md border border-dashed border-line bg-fill-subtle p-sp-4 text-center text-sm text-ink-faint">
                Aucune liste de contacts.{" "}
                <Link href="/audiences" className="text-primary hover:underline">
                  Créez-en une
                </Link>
                .
              </div>
            ) : (
              <form action={enrollFromListAction} className="mt-sp-4 space-y-sp-3">
                <input type="hidden" name="campaignId" value={campaign.id} />
                <Select name="listId" defaultValue="" required>
                  <option value="" disabled>
                    Choisir une liste…
                  </option>
                  {lists.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name} ({num(l._count.members)})
                    </option>
                  ))}
                </Select>
                <Button type="submit" className="w-full" disabled={!hasEmailStep}>
                  <Users size={16} /> Inscrire et démarrer
                </Button>
                {!hasEmailStep && (
                  <p className="text-xs text-ink-faint">Ajoutez d'abord une étape e-mail.</p>
                )}
              </form>
            )}
          </Card>

          <Card className="bg-fill-subtle">
            <div className="flex items-center gap-sp-2">
              <Sparkles size={18} className="text-primary" />
              <CardTitle className="text-h4">Comment ça marche</CardTitle>
            </div>
            <ul className="mt-sp-4 space-y-sp-3 text-sm text-ink-muted">
              <Tip label="Détection de réponse">
                Dès qu'un prospect répond, sa séquence s'arrête automatiquement — on ne relance jamais quelqu'un qui a déjà répondu.
              </Tip>
              <Tip label="Rotation des boîtes">
                L'envoi est réparti sur vos boîtes pour rester sous la limite quotidienne (20-50/jour) et protéger chaque réputation.
              </Tip>
              <Tip label="ESP matching">
                Les e-mails partent depuis une boîte du même ESP que le prospect (Gmail→Gmail) pour une meilleure délivrabilité.
              </Tip>
              <Tip label="A/B testing">
                Plusieurs variantes d'objet/copy sont testées ; la plus performante est favorisée.
              </Tip>
              <Tip label="Spintax & variables">
                <code className="font-mono text-xs">{"{Bonjour|Salut}"}</code> génère des variantes uniques et{" "}
                <code className="font-mono text-xs">{"{{first_name}}"}</code> injecte les données du contact — chaque envoi est différent.
              </Tip>
              <Tip label="Fenêtres d'envoi">
                Les e-mails partent aux heures ouvrées du fuseau du prospect, à un rythme humain, jamais en pic suspect.
              </Tip>
            </ul>
          </Card>
        </div>
      </div>

      {/* Inscriptions */}
      <div className="mt-sp-6">
        <Card>
          <CardTitle>Inscriptions ({num(campaign.enrollments.length)})</CardTitle>
          {campaign.enrollments.length === 0 ? (
            <p className="mt-sp-4 py-sp-4 text-center text-sm text-ink-faint">
              Aucun contact inscrit pour l'instant. Utilisez « Inscrire des contacts » ci-dessus.
            </p>
          ) : (
            <div className="mt-sp-4">
              <Table>
                <THead>
                  <TR>
                    <TH>Contact</TH>
                    <TH>Boîte d'envoi</TH>
                    <TH>Étape</TH>
                    <TH>Statut</TH>
                    <TH>Prochaine action</TH>
                  </TR>
                </THead>
                <tbody>
                  {campaign.enrollments.map((en) => {
                    const stepNum = Math.min(en.currentStep + 1, campaign.steps.length || 1);
                    return (
                      <TR key={en.id}>
                        <TD>
                          <div className="flex items-center gap-sp-3">
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-pill bg-primary-soft text-xs font-semibold text-primary">
                              {initials(`${en.contact.firstName ?? ""} ${en.contact.lastName ?? ""}`.trim(), en.contact.email)}
                            </span>
                            <div className="min-w-0">
                              <p className="truncate font-medium text-ink">
                                {`${en.contact.firstName ?? ""} ${en.contact.lastName ?? ""}`.trim() || en.contact.email}
                              </p>
                              <p className="truncate text-xs text-ink-faint">{en.contact.email}</p>
                            </div>
                          </div>
                        </TD>
                        <TD className="text-sm text-ink-muted">{en.mailbox?.email ?? "—"}</TD>
                        <TD className="text-sm text-ink-muted">
                          {campaign.steps.length ? `${stepNum} / ${campaign.steps.length}` : "—"}
                        </TD>
                        <TD>
                          <StatusBadge status={en.status} />
                        </TD>
                        <TD className="text-sm text-ink-faint">
                          {en.status === "active" ? dateTime(en.nextActionAt) : "—"}
                        </TD>
                      </TR>
                    );
                  })}
                </tbody>
              </Table>
            </div>
          )}
        </Card>
      </div>
    </>
  );
}

function FeatureChip({ on, icon: Icon, label }: { on: boolean; icon: typeof Mail; label: string }) {
  return (
    <span
      className={`inline-flex items-center gap-sp-1 rounded-pill px-sp-3 py-sp-1 text-xs font-medium ${
        on ? "bg-primary-soft text-primary" : "bg-fill-muted text-ink-disabled line-through"
      }`}
    >
      <Icon size={12} /> {label}
    </span>
  );
}

function StepRow({
  step,
  index,
  last,
}: {
  step: {
    id: string;
    type: string;
    subject: string | null;
    body: string | null;
    waitDays: number | null;
    condition: string | null;
  };
  index: number;
  last: boolean;
}) {
  const meta =
    step.type === "wait"
      ? { icon: Clock, tone: "bg-warning-soft text-warning-fg", title: "Attente" }
      : step.type === "condition"
        ? { icon: GitBranch, tone: "bg-[#EDE9FE] text-[#6D28D9]", title: "Condition" }
        : { icon: Mail, tone: "bg-primary-soft text-primary", title: "E-mail" };
  const Icon = meta.icon;

  const cond = parseJson<{ if?: string; then?: string }>(step.condition, {});
  const condLabel: Record<string, string> = {
    replied: "a répondu",
    opened: "a ouvert",
    clicked: "a cliqué",
  };

  return (
    <li className="relative flex gap-sp-4 pb-sp-5 last:pb-0">
      {/* Ligne verticale de la timeline */}
      {!last && <span className="absolute left-[15px] top-8 h-full w-px bg-line" aria-hidden />}

      <span className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-pill ${meta.tone}`}>
        <Icon size={16} />
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-sp-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
            Étape {index + 1}
          </span>
          <Badge tone="neutral">{meta.title}</Badge>
        </div>

        {step.type === "email" && (
          <div className="mt-sp-2 rounded-md border border-line bg-surface p-sp-4">
            <p className="text-sm font-semibold text-ink">
              {step.subject || <span className="text-ink-disabled">(objet par défaut de la séquence)</span>}
            </p>
            {step.body ? (
              <pre className="mt-sp-2 whitespace-pre-wrap break-words font-mono text-xs leading-relaxed text-ink-muted">
                {step.body}
              </pre>
            ) : (
              <p className="mt-sp-2 text-xs italic text-ink-disabled">Corps vide.</p>
            )}
          </div>
        )}

        {step.type === "wait" && (
          <p className="mt-sp-2 text-sm text-ink-muted">
            Attendre <span className="font-semibold text-ink">{step.waitDays ?? 1} jour{(step.waitDays ?? 1) > 1 ? "s" : ""}</span> avant l'étape suivante.
          </p>
        )}

        {step.type === "condition" && (
          <p className="mt-sp-2 text-sm text-ink-muted">
            Si le prospect <span className="font-semibold text-ink">{condLabel[cond.if ?? "replied"] ?? "a répondu"}</span> → <span className="font-semibold text-ink">arrêter la séquence</span>.
          </p>
        )}
      </div>
    </li>
  );
}

function Tip({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <li>
      <span className="font-semibold text-ink">{label} : </span>
      {children}
    </li>
  );
}
