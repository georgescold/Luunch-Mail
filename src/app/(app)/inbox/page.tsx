import Link from "next/link";
import { requireAuth } from "@/lib/core/auth";
import { db } from "@/lib/core/db";
import { aiAvailable } from "@/lib/integrations/ai";
import { relativeTime, dateTime, initials } from "@/lib/core/fmt";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { Chip } from "@/components/ui/chip";
import { EmptyState } from "@/components/ui/empty-state";
import { ReplyPanel } from "@/components/inbox/reply-panel";
import { CampaignFilter } from "@/components/inbox/campaign-filter";
import { Inbox, Sparkles, MailQuestion, Bot, ChevronLeft } from "lucide-react";

const CATEGORY_FILTERS: { value: string; label: string }[] = [
  { value: "all", label: "Tous" },
  { value: "interested", label: "Intéressé" },
  { value: "not_interested", label: "Pas intéressé" },
  { value: "ooo", label: "Absent / OOO" },
  { value: "unsubscribe", label: "Désinscription" },
  { value: "bounce", label: "Bounce" },
  { value: "neutral", label: "Neutre" },
];

function buildHref(cat: string, thread?: string, campaign?: string) {
  const params = new URLSearchParams();
  if (cat && cat !== "all") params.set("cat", cat);
  if (campaign) params.set("campaign", campaign);
  if (thread) params.set("thread", thread);
  const qs = params.toString();
  return qs ? `/inbox?${qs}` : "/inbox";
}

export default async function InboxPage({
  searchParams,
}: {
  searchParams: Promise<{ cat?: string; thread?: string; campaign?: string }>;
}) {
  const { workspace } = await requireAuth();
  const wid = workspace.id;
  const sp = await searchParams;
  const activeCat = sp.cat ?? "all";
  const activeThreadId = sp.thread;
  const activeCampaignId = sp.campaign;

  // Filtre liste : threads ouverts, filtrés par catégorie et/ou campagne.
  const listWhere = {
    workspaceId: wid,
    status: "open",
    ...(activeCat !== "all" ? { category: activeCat } : {}),
    ...(activeCampaignId ? { campaignId: activeCampaignId } : {}),
  };

  // Campagnes ayant au moins un thread (pour le filtre).
  const campaignsWithThreads = await db.campaign.findMany({
    where: { workspaceId: wid, threads: { some: {} } },
    select: { id: true, name: true, type: true },
    orderBy: { updatedAt: "desc" },
  });

  const [threads, openCount, interestedCount, toHandleCount] = await Promise.all([
    db.inboxThread.findMany({
      where: listWhere,
      orderBy: { lastMessageAt: "desc" },
      take: 100,
      include: {
        contact: true,
        campaign: { select: { name: true } },
        mailbox: { select: { email: true } },
      },
    }),
    db.inboxThread.count({ where: { workspaceId: wid, status: "open" } }),
    db.inboxThread.count({ where: { workspaceId: wid, status: "open", category: "interested" } }),
    db.inboxThread.count({
      where: {
        workspaceId: wid,
        status: "open",
        OR: [{ category: null }, { category: "neutral" }],
      },
    }),
  ]);

  // Thread actif (colonne droite) — scopé workspace.
  const activeThread = activeThreadId
    ? await db.inboxThread.findFirst({
        where: { id: activeThreadId, workspaceId: wid },
        include: {
          contact: true,
          campaign: { select: { name: true } },
          mailbox: { select: { email: true } },
          messages: { orderBy: { createdAt: "asc" } },
        },
      })
    : null;

  const existingDraft = activeThread?.messages.find((m) => m.aiDraft && !m.sentByAgent);
  const conversation = activeThread?.messages.filter((m) => !(m.aiDraft && !m.sentByAgent)) ?? [];

  const totalThreads = await db.inboxThread.count({ where: { workspaceId: wid } });

  return (
    <>
      <PageHeader
        title="Inbox unifiée"
        description="Toutes vos réponses au même endroit. L'agent IA trie les réponses et peut y répondre en moins de 5 minutes."
      />

      {/* KPIs */}
      <div className="mb-sp-6 grid grid-cols-1 gap-sp-4 sm:grid-cols-3">
        <StatCard label="Réponses ouvertes" value={openCount} icon={Inbox} hint="conversations actives" />
        <StatCard
          label="Intéressés"
          value={interestedCount}
          icon={Sparkles}
          delta={interestedCount > 0 ? "à relancer" : undefined}
          deltaTone="up"
        />
        <StatCard label="À traiter" value={toHandleCount} icon={MailQuestion} hint="non catégorisés" />
      </div>

      {totalThreads === 0 ? (
        <EmptyState
          icon={Inbox}
          title="Aucune réponse pour l'instant"
          description="Dès qu'un prospect répond à l'une de vos campagnes, la conversation apparaît ici, triée automatiquement par l'agent IA."
          action={
            <Link href="/outreach" className="text-sm font-medium text-primary hover:underline">
              Lancer une campagne d'outreach →
            </Link>
          }
        />
      ) : (
        <div className="grid gap-sp-4 lg:grid-cols-[minmax(0,360px)_1fr]">
          {/* Colonne gauche : filtres + liste */}
          <div className={activeThread ? "hidden lg:block" : "block"}>
            <div className="mb-sp-3 space-y-sp-3">
              {campaignsWithThreads.length > 0 && (
                <CampaignFilter campaigns={campaignsWithThreads} active={activeCampaignId} />
              )}
              <div className="flex flex-wrap gap-sp-1">
                {CATEGORY_FILTERS.map((f) => (
                  <Link key={f.value} href={buildHref(f.value, activeThreadId, activeCampaignId)}>
                    <Chip selected={activeCat === f.value}>{f.label}</Chip>
                  </Link>
                ))}
              </div>
            </div>

            <Card className="overflow-hidden p-0">
              {threads.length === 0 ? (
                <p className="px-sp-4 py-sp-8 text-center text-sm text-ink-faint">
                  Aucune conversation dans cette catégorie.
                </p>
              ) : (
                <ul className="max-h-[70vh] divide-y divide-line overflow-y-auto">
                  {threads.map((t) => {
                    const name =
                      [t.contact?.firstName, t.contact?.lastName].filter(Boolean).join(" ") ||
                      t.contact?.email ||
                      "Contact inconnu";
                    const isActive = t.id === activeThreadId;
                    return (
                      <li key={t.id}>
                        <Link
                          href={buildHref(activeCat, t.id, activeCampaignId)}
                          className={`flex flex-col gap-sp-1 px-sp-4 py-sp-3 transition-colors ${
                            isActive ? "bg-primary-soft" : "hover:bg-fill-subtle"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-sp-2">
                            <div className="flex min-w-0 items-center gap-sp-2">
                              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-pill bg-fill-muted text-xs font-semibold text-ink-muted">
                                {initials(name, t.contact?.email)}
                              </span>
                              <span className="truncate text-sm font-medium text-ink">{name}</span>
                            </div>
                            <span className="shrink-0 text-xs text-ink-faint">
                              {relativeTime(t.lastMessageAt)}
                            </span>
                          </div>
                          <p className="truncate pl-[36px] text-sm text-ink-muted">{t.subject}</p>
                          <div className="flex items-center gap-sp-2 pl-[36px]">
                            {t.category && <StatusBadge status={t.category} />}
                            {t.campaign?.name && (
                              <span className="truncate text-xs text-ink-faint">{t.campaign.name}</span>
                            )}
                          </div>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Card>
          </div>

          {/* Colonne droite : conversation + reply-panel */}
          <div className={activeThread ? "block" : "hidden lg:block"}>
            {!activeThread ? (
              <Card className="flex h-full min-h-[400px] flex-col items-center justify-center text-center">
                <span className="mb-sp-3 flex h-14 w-14 items-center justify-center rounded-pill bg-primary-soft text-primary">
                  <Bot size={26} />
                </span>
                <p className="text-h4 font-headline font-semibold text-ink">
                  Sélectionnez une conversation
                </p>
                <p className="mt-sp-2 max-w-sm text-sm text-ink-faint">
                  Choisissez une réponse à gauche pour lire le fil et y répondre. L'agent IA peut
                  rédiger un brouillon en un clic.
                </p>
              </Card>
            ) : (
              <Card className="flex h-full flex-col overflow-hidden p-0">
                {/* En-tête du thread */}
                <div className="border-b border-line p-sp-4">
                  <Link
                    href={buildHref(activeCat, undefined, activeCampaignId)}
                    className="mb-sp-2 inline-flex items-center gap-sp-1 text-xs text-ink-faint hover:text-ink lg:hidden"
                  >
                    <ChevronLeft size={14} /> Retour à la liste
                  </Link>
                  <div className="flex items-start justify-between gap-sp-3">
                    <div className="min-w-0">
                      <h2 className="truncate text-h4 font-headline font-semibold text-ink">
                        {activeThread.subject}
                      </h2>
                      <p className="mt-sp-1 truncate text-sm text-ink-muted">
                        {activeThread.contact
                          ? [activeThread.contact.firstName, activeThread.contact.lastName]
                              .filter(Boolean)
                              .join(" ") || activeThread.contact.email
                          : "Contact inconnu"}
                        {activeThread.contact?.email ? ` · ${activeThread.contact.email}` : ""}
                      </p>
                      <div className="mt-sp-2 flex flex-wrap items-center gap-sp-2 text-xs text-ink-faint">
                        {activeThread.category && <StatusBadge status={activeThread.category} />}
                        {activeThread.campaign?.name && <span>Campagne : {activeThread.campaign.name}</span>}
                        {activeThread.mailbox?.email && <span>· Boîte : {activeThread.mailbox.email}</span>}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Fil de messages */}
                <div className="flex-1 space-y-sp-4 overflow-y-auto bg-fill-subtle p-sp-4">
                  {conversation.length === 0 ? (
                    <p className="py-sp-6 text-center text-sm text-ink-faint">
                      Aucun message dans cette conversation.
                    </p>
                  ) : (
                    conversation.map((m) => {
                      const outbound = m.direction === "outbound";
                      return (
                        <div
                          key={m.id}
                          className={`flex flex-col ${outbound ? "items-end" : "items-start"}`}
                        >
                          <div
                            className={`max-w-[85%] rounded-lg px-sp-4 py-sp-3 text-sm shadow-sm ${
                              outbound
                                ? "rounded-br-sm bg-primary text-white"
                                : "rounded-bl-sm border border-line bg-surface text-ink"
                            }`}
                          >
                            <p className="whitespace-pre-wrap leading-relaxed">{m.body}</p>
                          </div>
                          <div className="mt-sp-1 flex items-center gap-sp-1 px-sp-1 text-xs text-ink-faint">
                            <span>{outbound ? m.fromEmail : m.fromEmail}</span>
                            <span>·</span>
                            <span>{dateTime(m.createdAt)}</span>
                            {m.sentByAgent && (
                              <span className="inline-flex items-center gap-sp-1 text-primary">
                                · <Bot size={12} /> Agent IA
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Panneau de réponse (client) */}
                <ReplyPanel
                  threadId={activeThread.id}
                  currentCategory={activeThread.category}
                  initialDraft={existingDraft?.body}
                  aiAvailable={aiAvailable()}
                />
              </Card>
            )}
          </div>
        </div>
      )}
    </>
  );
}
