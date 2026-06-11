import Link from "next/link";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { env, isDemoMode } from "@/lib/env";
import { num, dateTime, relativeTime, parseJson } from "@/lib/fmt";
import { PageHeader } from "@/components/page-header";
import { Card, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { EmptyState } from "@/components/ui/empty-state";
import { Tabs } from "@/components/ui/tabs";
import { Table, THead, TH, TR, TD } from "@/components/ui/table";
import { StatCard } from "@/components/ui/stat-card";
import {
  KeyRound, ScrollText, Webhook, Code2, Mail, Send, ShieldCheck, Clock,
  Layers, FlaskConical, Inbox, ArrowRight, Trash2, Power,
} from "lucide-react";
import { isFeatureEnabled } from "@/lib/features";
import { ComingSoon } from "@/components/coming-soon";
import { CreateKeyModal } from "@/components/transactional/create-key";
import { CreateWebhookModal } from "@/components/transactional/create-webhook";
import { TestSendForm } from "@/components/transactional/test-send";
import { CodeBlock } from "@/components/transactional/code-block";
import { revokeApiKeyAction, toggleWebhookAction, deleteWebhookAction } from "@/server/transactional-actions";

const STATUS_FILTERS = [
  { id: "all", label: "Tous" },
  { id: "delivered", label: "Délivrés" },
  { id: "opened", label: "Ouverts" },
  { id: "clicked", label: "Cliqués" },
  { id: "bounced", label: "Bounces" },
  { id: "complained", label: "Plaintes" },
  { id: "queued", label: "En file" },
  { id: "failed", label: "Échecs" },
];

export default async function TransactionalPage({
  searchParams,
}: {
  searchParams: Promise<{ msg?: string; status?: string }>;
}) {
  // Fonctionnalité verrouillée : le produit est recentré sur les 2 pôles
  // (cold outreach + email marketing). Repassez le drapeau à true pour rouvrir.
  if (!isFeatureEnabled("transactionalApi")) {
    await requireAuth();
    return (
      <ComingSoon
        title="API transactionnelle"
        description="L'envoi d'e-mails transactionnels par API arrive prochainement. Concentrez-vous d'abord sur vos deux pôles : cold outreach et email marketing."
        bullets={[
          "API REST + relais SMTP + SDKs",
          "Clés API à permissions granulaires",
          "Webhooks signés temps réel (delivered, opened, clicked…)",
          "Mode test, idempotence, envoi planifié",
        ]}
      />
    );
  }

  const { workspace, user } = await requireAuth();
  const wid = workspace.id;
  const sp = await searchParams;
  const statusFilter = sp.status && sp.status !== "all" ? sp.status : null;
  const selectedMsgId = sp.msg ?? null;

  const [keys, totalSent, testCount, messages, endpoints, recentDeliveries] = await Promise.all([
    db.apiKey.findMany({ where: { workspaceId: wid }, orderBy: { createdAt: "desc" } }),
    db.emailMessage.count({ where: { workspaceId: wid, source: "transactional" } }),
    db.emailMessage.count({ where: { workspaceId: wid, source: "transactional", test: true } }),
    db.emailMessage.findMany({
      where: { workspaceId: wid, source: "transactional", ...(statusFilter ? { status: statusFilter } : {}) },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    db.webhookEndpoint.findMany({ where: { workspaceId: wid }, orderBy: { createdAt: "desc" } }),
    db.webhookDelivery.findMany({
      where: { endpoint: { workspaceId: wid } },
      orderBy: { createdAt: "desc" },
      take: 12,
    }),
  ]);

  const selectedMsg = selectedMsgId
    ? await db.emailMessage.findFirst({
        where: { id: selectedMsgId, workspaceId: wid },
        include: { events: { orderBy: { occurredAt: "asc" } } },
      })
    : null;

  const activeKeys = keys.filter((k) => !k.revokedAt).length;
  const activeEndpoints = endpoints.filter((e) => e.status === "active").length;
  const appUrl = env.appUrl;

  // ---- Onglet : Clés API ----
  const keysTab = (
    <div className="space-y-sp-5">
      <div className="grid grid-cols-2 gap-sp-4 lg:grid-cols-3">
        <StatCard label="Clés actives" value={num(activeKeys)} icon={KeyRound} />
        <StatCard label="E-mails transactionnels" value={num(totalSent)} icon={Mail} hint="cumul" />
        <StatCard label="Endpoints webhook" value={num(activeEndpoints)} icon={Webhook} />
      </div>

      <Card>
        <div className="flex items-center justify-between gap-sp-3">
          <div>
            <CardTitle>Clés API</CardTitle>
            <CardDescription>Authentifiez vos appels via l'en-tête <code className="font-mono">Authorization: Bearer</code>. Une clé par intégration.</CardDescription>
          </div>
          <CreateKeyModal />
        </div>

        <div className="mt-sp-5">
          {keys.length === 0 ? (
            <EmptyState
              icon={KeyRound}
              title="Aucune clé API pour l'instant"
              description="Créez une clé pour envoyer des e-mails par code, synchroniser vos contacts ou lire vos webhooks."
              action={<CreateKeyModal />}
            />
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Nom</TH>
                  <TH>Préfixe</TH>
                  <TH>Permissions</TH>
                  <TH>Dernier usage</TH>
                  <TH>Statut</TH>
                  <TH className="text-right">Action</TH>
                </TR>
              </THead>
              <tbody>
                {keys.map((k) => {
                  const scopes = parseJson<string[]>(k.scopes, []);
                  const revoked = Boolean(k.revokedAt);
                  return (
                    <TR key={k.id}>
                      <TD className="font-medium text-ink">{k.name}</TD>
                      <TD><code className="font-mono text-xs text-ink-muted">{k.prefix}…</code></TD>
                      <TD>
                        <div className="flex flex-wrap gap-sp-1">
                          {scopes.map((s) => (
                            <Badge key={s} tone="neutral"><span className="font-mono">{s}</span></Badge>
                          ))}
                        </div>
                      </TD>
                      <TD className="text-ink-faint">{k.lastUsedAt ? relativeTime(k.lastUsedAt) : "Jamais utilisée"}</TD>
                      <TD><StatusBadge status={revoked ? "disconnected" : "active"} /></TD>
                      <TD className="text-right">
                        {revoked ? (
                          <span className="text-xs text-ink-disabled">Révoquée {relativeTime(k.revokedAt)}</span>
                        ) : (
                          <form action={revokeApiKeyAction} className="inline">
                            <input type="hidden" name="id" value={k.id} />
                            <Button type="submit" variant="ghost" size="sm">Révoquer</Button>
                          </form>
                        )}
                      </TD>
                    </TR>
                  );
                })}
              </tbody>
            </Table>
          )}
        </div>
      </Card>
    </div>
  );

  // ---- Onglet : Logs ----
  const logsTab = (
    <div className="space-y-sp-5">
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-sp-3">
          <div>
            <CardTitle>Journal des envois</CardTitle>
            <CardDescription>Chaque e-mail transactionnel et son cycle de vie. Cliquez une ligne pour la chronologie des événements.</CardDescription>
          </div>
          <div className="flex flex-wrap gap-sp-1">
            {STATUS_FILTERS.map((f) => (
              <Link key={f.id} href={`/transactional?status=${f.id}`} scroll={false}>
                <Chip selected={(sp.status ?? "all") === f.id} type="button">{f.label}</Chip>
              </Link>
            ))}
          </div>
        </div>

        <div className="mt-sp-5">
          {messages.length === 0 ? (
            <EmptyState
              icon={Send}
              title={statusFilter ? "Aucun e-mail avec ce statut" : "Aucun e-mail transactionnel"}
              description="Envoyez votre premier e-mail via l'API, le SDK, ou un envoi de test depuis l'onglet « Docs & SDK »."
            />
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Destinataire</TH>
                  <TH>Sujet</TH>
                  <TH>Statut</TH>
                  <TH>Date</TH>
                  <TH>Provider ID</TH>
                  <TH></TH>
                </TR>
              </THead>
              <tbody>
                {messages.map((m) => (
                  <TR key={m.id} className={selectedMsgId === m.id ? "bg-primary-soft/40" : undefined}>
                    <TD className="font-medium text-ink">
                      {m.toEmail}
                      {m.test && <Badge tone="purple" className="ml-sp-2">test</Badge>}
                    </TD>
                    <TD className="max-w-[260px] truncate text-ink-muted">{m.subject}</TD>
                    <TD><StatusBadge status={m.status} /></TD>
                    <TD className="text-ink-faint">{dateTime(m.createdAt)}</TD>
                    <TD><code className="font-mono text-xs text-ink-faint">{m.providerId ?? "—"}</code></TD>
                    <TD className="text-right">
                      <Link
                        href={`/transactional?status=${sp.status ?? "all"}&msg=${m.id}`}
                        scroll={false}
                        className="inline-flex items-center gap-sp-1 text-sm font-medium text-primary hover:underline"
                      >
                        Détails <ArrowRight size={14} />
                      </Link>
                    </TD>
                  </TR>
                ))}
              </tbody>
            </Table>
          )}
        </div>
      </Card>

      {selectedMsg && (
        <Card>
          <div className="flex items-start justify-between gap-sp-3">
            <div className="min-w-0">
              <CardTitle>Chronologie — {selectedMsg.toEmail}</CardTitle>
              <CardDescription className="truncate">{selectedMsg.subject}</CardDescription>
            </div>
            <Link href={`/transactional?status=${sp.status ?? "all"}`} scroll={false} className="text-sm font-medium text-ink-faint hover:text-ink">
              Fermer
            </Link>
          </div>

          <dl className="mt-sp-4 grid grid-cols-2 gap-sp-3 text-sm sm:grid-cols-4">
            <div><dt className="text-ink-faint">De</dt><dd className="truncate font-medium text-ink">{selectedMsg.fromEmail}</dd></div>
            <div><dt className="text-ink-faint">Statut</dt><dd><StatusBadge status={selectedMsg.status} /></dd></div>
            <div><dt className="text-ink-faint">Provider ID</dt><dd className="font-mono text-xs text-ink-muted">{selectedMsg.providerId ?? "—"}</dd></div>
            <div><dt className="text-ink-faint">Idempotency-Key</dt><dd className="font-mono text-xs text-ink-muted">{selectedMsg.idempotencyKey ?? "—"}</dd></div>
          </dl>

          <ol className="mt-sp-5 space-y-sp-3 border-l-2 border-line pl-sp-5">
            {selectedMsg.events.length === 0 ? (
              <li className="text-sm text-ink-faint">Aucun événement enregistré pour l'instant.</li>
            ) : (
              selectedMsg.events.map((ev) => {
                const data = parseJson<Record<string, unknown>>(ev.data, {});
                const keys = Object.keys(data);
                return (
                  <li key={ev.id} className="relative">
                    <span className="absolute -left-[27px] top-1 h-3 w-3 rounded-circle border-2 border-surface bg-primary" />
                    <div className="flex flex-wrap items-center gap-sp-2">
                      <StatusBadge status={ev.type} />
                      <span className="text-xs text-ink-faint">{dateTime(ev.occurredAt)}</span>
                    </div>
                    {keys.length > 0 && (
                      <p className="mt-sp-1 font-mono text-xs text-ink-muted">
                        {keys.map((k) => `${k}: ${String(data[k])}`).join(" · ")}
                      </p>
                    )}
                  </li>
                );
              })
            )}
          </ol>
        </Card>
      )}
    </div>
  );

  // ---- Onglet : Webhooks ----
  const webhooksTab = (
    <div className="space-y-sp-5">
      <Card>
        <div className="flex items-center justify-between gap-sp-3">
          <div>
            <CardTitle>Endpoints webhook</CardTitle>
            <CardDescription>
              Recevez les événements en temps réel. Chaque requête POST est signée (en-tête <code className="font-mono">luunch-signature</code>).
            </CardDescription>
          </div>
          <CreateWebhookModal />
        </div>

        <div className="mt-sp-5">
          {endpoints.length === 0 ? (
            <EmptyState
              icon={Webhook}
              title="Aucun endpoint webhook"
              description="Branchez votre serveur, Slack ou votre CRM pour réagir aux événements delivered, opened, clicked, bounced et complained."
              action={<CreateWebhookModal />}
            />
          ) : (
            <div className="space-y-sp-3">
              {endpoints.map((ep) => {
                const events = parseJson<string[]>(ep.events, []);
                return (
                  <div key={ep.id} className="flex flex-col gap-sp-3 rounded-md border border-line bg-surface p-sp-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex items-center gap-sp-2">
                        <code className="truncate font-mono text-sm text-ink">{ep.url}</code>
                        <StatusBadge status={ep.status} />
                      </div>
                      <div className="mt-sp-2 flex flex-wrap gap-sp-1">
                        {events.map((e) => (
                          <Badge key={e} tone="info"><span className="font-mono">{e}</span></Badge>
                        ))}
                      </div>
                      <p className="mt-sp-2 text-xs text-ink-faint">Secret : <code className="font-mono">{ep.secret.slice(0, 12)}…</code> · créé {relativeTime(ep.createdAt)}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-sp-2">
                      <form action={toggleWebhookAction}>
                        <input type="hidden" name="id" value={ep.id} />
                        <Button type="submit" variant="ghost" size="sm">
                          <Power size={14} /> {ep.status === "active" ? "Désactiver" : "Activer"}
                        </Button>
                      </form>
                      <form action={deleteWebhookAction}>
                        <input type="hidden" name="id" value={ep.id} />
                        <Button type="submit" variant="ghost" size="sm"><Trash2 size={14} /></Button>
                      </form>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Card>

      <Card>
        <CardTitle>Livraisons récentes</CardTitle>
        <CardDescription>Les dernières tentatives d'appel vers vos endpoints.</CardDescription>
        <div className="mt-sp-4">
          {recentDeliveries.length === 0 ? (
            <p className="py-sp-5 text-center text-sm text-ink-faint">Aucune livraison pour l'instant — elles apparaîtront dès le premier événement.</p>
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Événement</TH>
                  <TH>Réponse HTTP</TH>
                  <TH>Résultat</TH>
                  <TH>Tentatives</TH>
                  <TH>Date</TH>
                </TR>
              </THead>
              <tbody>
                {recentDeliveries.map((d) => (
                  <TR key={d.id}>
                    <TD><code className="font-mono text-xs text-ink-muted">{d.eventType}</code></TD>
                    <TD className="text-ink">{d.responseStatus ?? "—"}</TD>
                    <TD><Badge tone={d.success ? "success" : "error"}>{d.success ? "Succès" : "Échec"}</Badge></TD>
                    <TD className="text-ink-faint">{d.attempts}</TD>
                    <TD className="text-ink-faint">{dateTime(d.createdAt)}</TD>
                  </TR>
                ))}
              </tbody>
            </Table>
          )}
        </div>
      </Card>

      <Card className="border-primary/30 bg-primary-soft/30">
        <div className="flex items-start gap-sp-3">
          <Inbox className="mt-px shrink-0 text-primary" size={20} />
          <div>
            <CardTitle>E-mails entrants (inbound)</CardTitle>
            <CardDescription className="mt-sp-1">
              Recevez et parsez les réponses : pointez vos enregistrements MX vers Luunch Mail, et chaque e-mail entrant est livré à votre webhook
              comme un événement <code className="font-mono">email.inbound</code> (corps, pièces jointes et champs parsés inclus).
            </CardDescription>
          </div>
        </div>
      </Card>
    </div>
  );

  // ---- Onglet : Docs & SDK ----
  const curlExample = `curl -X POST ${appUrl}/api/v1/emails \\
  -H "Authorization: Bearer gm_live_xxxxxxxxxxxx" \\
  -H "Content-Type: application/json" \\
  -H "Idempotency-Key: order-4242-receipt" \\
  -d '{
    "from": "Acme <no-reply@acme.com>",
    "to": "client@exemple.com",
    "subject": "Votre reçu de commande",
    "html": "<h1>Merci !</h1><p>Votre commande est confirmée.</p>"
  }'`;

  const nodeExample = `// Aucune dépendance : fetch natif (Node 18+ / Edge / navigateur).
const res = await fetch("${appUrl}/api/v1/emails", {
  method: "POST",
  headers: {
    Authorization: \`Bearer \${process.env.LUUNCH_API_KEY}\`,
    "Content-Type": "application/json",
    // Rejouer en toute sécurité : même clé => même e-mail (pas de doublon).
    "Idempotency-Key": \`welcome-\${userId}\`,
  },
  body: JSON.stringify({
    from: "Acme <no-reply@acme.com>",
    to: user.email,
    subject: "Bienvenue chez Acme",
    html: render(<WelcomeEmail name={user.name} />), // ex. React Email
  }),
});
const { id } = await res.json();`;

  const batchExample = `// Envoi par lot : jusqu'à des milliers d'e-mails en un appel (mis en file & throttlés).
await fetch("${appUrl}/api/v1/emails/batch", {
  method: "POST",
  headers: { Authorization: "Bearer gm_live_xxx", "Content-Type": "application/json" },
  body: JSON.stringify([
    { from: "no-reply@acme.com", to: "a@x.com", subject: "Hello A", html: "<p>…</p>" },
    { from: "no-reply@acme.com", to: "b@x.com", subject: "Hello B", html: "<p>…</p>" },
  ]),
});`;

  const scheduleExample = `// Envoi planifié : passez scheduledAt (ISO 8601).
await fetch("${appUrl}/api/v1/emails", {
  method: "POST",
  headers: { Authorization: "Bearer gm_live_xxx", "Content-Type": "application/json" },
  body: JSON.stringify({
    to: "client@exemple.com",
    subject: "Rappel de rendez-vous",
    html: "<p>À demain !</p>",
    scheduledAt: "2026-06-12T09:00:00Z",
  }),
});`;

  const smtpExample = `# Relais SMTP — pour les stacks existantes (legacy).
Host:     smtp.luunchmail.local
Port:     587 (STARTTLS) ou 465 (SSL)
Username: luunchmail
Password: <votre clé API gm_live_…>  # la clé sert de mot de passe SMTP`;

  const verifyExample = `// Vérifier la signature du webhook (en-tête luunch-signature = HMAC-SHA256 du corps brut).
import { createHmac, timingSafeEqual } from "node:crypto";

function verify(rawBody, signatureHeader, secret /* whsec_… */) {
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  const a = Buffer.from(expected), b = Buffer.from(signatureHeader);
  return a.length === b.length && timingSafeEqual(a, b);
}`;

  const docsTab = (
    <div className="space-y-sp-6">
      <div className="grid gap-sp-5 lg:grid-cols-2">
        <Card>
          <div className="mb-sp-3 flex items-center gap-sp-2">
            <Code2 size={18} className="text-primary" />
            <CardTitle>Envoyer un e-mail — REST</CardTitle>
          </div>
          <CodeBlock label="cURL" code={curlExample} />
          <p className="mt-sp-3 text-sm text-ink-faint">
            Réponse <code className="font-mono">200 OK</code> avec l'<code className="font-mono">id</code> de l'e-mail. Suivez ensuite son cycle de vie dans l'onglet « Logs ».
          </p>
        </Card>

        <Card>
          <div className="mb-sp-3 flex items-center gap-sp-2">
            <Code2 size={18} className="text-primary" />
            <CardTitle>SDK Node (fetch)</CardTitle>
          </div>
          <CodeBlock label="TypeScript" code={nodeExample} />
        </Card>
      </div>

      <div className="grid gap-sp-5 lg:grid-cols-2">
        <Card>
          <div className="mb-sp-3 flex items-center gap-sp-2">
            <Layers size={18} className="text-secondary" />
            <CardTitle>Envoi par lot (batch)</CardTitle>
          </div>
          <CodeBlock label="TypeScript" code={batchExample} />
        </Card>

        <Card>
          <div className="mb-sp-3 flex items-center gap-sp-2">
            <Clock size={18} className="text-secondary" />
            <CardTitle>Envoi planifié</CardTitle>
          </div>
          <CodeBlock label="TypeScript" code={scheduleExample} />
        </Card>
      </div>

      <div className="grid gap-sp-5 lg:grid-cols-2">
        <Card>
          <div className="mb-sp-3 flex items-center gap-sp-2">
            <Send size={18} className="text-ink-muted" />
            <CardTitle>Relais SMTP</CardTitle>
          </div>
          <CodeBlock label="Configuration SMTP" code={smtpExample} />
        </Card>

        <Card>
          <div className="mb-sp-3 flex items-center gap-sp-2">
            <ShieldCheck size={18} className="text-success-fg" />
            <CardTitle>Webhooks signés</CardTitle>
          </div>
          <CodeBlock label="Vérification de signature" code={verifyExample} />
          <p className="mt-sp-3 text-sm text-ink-faint">
            Vérifiez toujours l'en-tête <code className="font-mono">luunch-signature</code> avec le secret <code className="font-mono">whsec_…</code> de l'endpoint avant de traiter l'événement.
          </p>
        </Card>
      </div>

      <Card>
        <div className="grid gap-sp-4 sm:grid-cols-3">
          <Concept icon={<ShieldCheck size={16} />} title="Idempotence">
            En-tête <code className="font-mono">Idempotency-Key</code> : un rejeu avec la même clé renvoie l'e-mail déjà créé, sans doublon.
          </Concept>
          <Concept icon={<Layers size={16} />} title="Batch & throttle">
            Des milliers d'e-mails en un appel, mis en file et espacés automatiquement pour préserver la délivrabilité.
          </Concept>
          <Concept icon={<FlaskConical size={16} />} title="Mode test">
            <code className="font-mono">test: true</code> simule les événements (delivered, opened…) sans rien envoyer de réel.
          </Concept>
        </div>
      </Card>

      <Card className="border-primary/30 bg-primary-soft/30">
        <div className="flex items-center gap-sp-2">
          <FlaskConical size={18} className="text-primary" />
          <CardTitle>Envoyer un e-mail de test</CardTitle>
        </div>
        <CardDescription className="mt-sp-1">
          Déclenche un envoi en mode test via l'API unifiée — aucun e-mail réel, mais une trace complète dans les logs.
        </CardDescription>
        <div className="mt-sp-4">
          <TestSendForm defaultTo={user.email} />
        </div>
      </Card>
    </div>
  );

  return (
    <>
      <PageHeader
        title="Transactionnel & API"
        description="Envoyez vos e-mails applicatifs par code, suivez chaque envoi, branchez des webhooks signés et intégrez Luunch Mail en quelques lignes."
        actions={<CreateKeyModal />}
      />

      <Tabs
        defaultTab={selectedMsgId || sp.status ? "logs" : "keys"}
        items={[
          { id: "keys", label: "Clés API", content: keysTab },
          { id: "logs", label: "Logs", content: logsTab },
          { id: "webhooks", label: "Webhooks", content: webhooksTab },
          { id: "docs", label: "Docs & SDK", content: docsTab },
        ]}
      />

      {isDemoMode() && (
        <p className="mt-sp-6 text-center text-xs text-ink-disabled">
          Mode démo actif — les envois et les événements (ouvertures, clics, bounces) sont simulés par le worker. Configurez <code className="font-mono">RESEND_API_KEY</code> pour l'envoi réel.
        </p>
      )}
    </>
  );
}

function Concept({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="flex items-center gap-sp-2 font-medium text-ink"><span className="text-primary">{icon}</span> {title}</p>
      <p className="mt-sp-1 text-sm text-ink-faint">{children}</p>
    </div>
  );
}
