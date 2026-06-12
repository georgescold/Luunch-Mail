import Link from "next/link";
import { requireAuth } from "@/lib/core/auth";
import { db } from "@/lib/core/db";
import { num, pct, date, initials } from "@/lib/core/fmt";
import { PageHeader } from "@/components/page-header";
import { Card, CardTitle, CardDescription } from "@/components/ui/card";
import { Button, buttonClasses } from "@/components/ui/button";
import { Input, Select, Field } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs } from "@/components/ui/tabs";
import { Table, THead, TH, TR, TD } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { ComplianceToggle } from "@/components/settings/compliance-toggles";
import { ComingSoonInline } from "@/components/coming-soon";
import { isFeatureEnabled } from "@/lib/core/features";
import {
  Building2, Palette, CreditCard, ShieldCheck, Users, Globe, MapPin,
  Mail, UserPlus, FileCheck2, MailX, ListX, Trash2, Download, Clock, Crown, KeyRound,
} from "lucide-react";
import {
  updateWorkspaceAction,
  updateWhiteLabelAction,
  inviteMemberAction,
  requestDataExportAction,
  requestDataDeletionAction,
} from "@/server/settings-actions";
import { revokeApiKeyAction } from "@/server/transactional-actions";
import { CreateKeyModal } from "@/components/transactional/create-key";
import { parseJson } from "@/lib/core/fmt";

const REGION_LABELS: Record<string, string> = {
  eu: "Europe (Francfort)",
  us: "Amérique du Nord (Virginie)",
  sa: "Amérique du Sud (São Paulo)",
  asia: "Asie-Pacifique (Singapour)",
};

const ROLE_LABELS: Record<string, string> = {
  owner: "Propriétaire",
  admin: "Administrateur",
  member: "Membre",
};

const METRIC_LABELS: Record<string, string> = {
  emails_sent: "E-mails envoyés",
  contacts: "Contacts",
  ai_credits: "Crédits IA",
  verifications: "Vérifications d'e-mails",
};

const METRIC_ORDER = ["emails_sent", "contacts", "ai_credits", "verifications"];

export default async function SettingsPage() {
  const { workspace, user, role } = await requireAuth();
  const wid = workspace.id;
  const period = new Date().toISOString().slice(0, 7); // YYYY-MM

  const [org, counters, memberships, apiKeys] = await Promise.all([
    db.organization.findUnique({ where: { id: workspace.orgId } }),
    db.usageCounter.findMany({ where: { workspaceId: wid, period } }),
    db.membership.findMany({
      where: { workspaceId: wid },
      include: { user: true },
      orderBy: { createdAt: "asc" },
    }),
    db.apiKey.findMany({ where: { workspaceId: wid }, orderBy: { createdAt: "desc" } }),
  ]);

  const counterByMetric = new Map(counters.map((c) => [c.metric, c]));

  // ── Onglet Workspace ──────────────────────────────────────────────────
  const workspaceTab = (
    <div className="grid gap-sp-6 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardTitle>Informations du workspace</CardTitle>
        <CardDescription>Nom affiché et région d'hébergement / d'envoi par défaut.</CardDescription>
        <form action={updateWorkspaceAction} className="mt-sp-5">
          <Field label="Nom du workspace" htmlFor="ws-name">
            <Input id="ws-name" name="name" defaultValue={workspace.name} required />
          </Field>
          <Field
            label="Région d'hébergement"
            htmlFor="ws-region"
            hint="Détermine où sont stockées vos données et depuis quelle zone vos e-mails partent (résidence des données)."
          >
            <Select id="ws-region" name="region" defaultValue={workspace.region}>
              {Object.entries(REGION_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </Select>
          </Field>
          <Button type="submit">Enregistrer</Button>
        </form>
      </Card>

      <Card>
        <CardTitle>Identifiants</CardTitle>
        <div className="mt-sp-4 space-y-sp-4 text-sm">
          <div>
            <p className="flex items-center gap-sp-2 text-ink-faint"><Globe size={15} /> Slug</p>
            <p className="mt-sp-1 font-mono text-ink">{workspace.slug}</p>
          </div>
          <div>
            <p className="flex items-center gap-sp-2 text-ink-faint"><Building2 size={15} /> Organisation</p>
            <p className="mt-sp-1 font-medium text-ink">{org?.name ?? "—"}</p>
          </div>
          <div>
            <p className="flex items-center gap-sp-2 text-ink-faint"><MapPin size={15} /> Région actuelle</p>
            <p className="mt-sp-1 font-medium text-ink">{REGION_LABELS[workspace.region] ?? workspace.region}</p>
          </div>
          <p className="rounded-sm bg-fill-subtle px-sp-3 py-sp-2 text-xs text-ink-faint">
            Le slug est un identifiant stable utilisé dans les URLs et l'API : il n'est pas modifiable.
          </p>
        </div>
      </Card>
    </div>
  );

  // ── Onglet White-label ────────────────────────────────────────────────
  const whiteLabelTab = (
    <div className="grid gap-sp-6 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardTitle>Marque blanche (agences)</CardTitle>
        <CardDescription>
          Proposez Luunch Mail sous votre propre marque à vos clients : domaine, couleur et logo personnalisés.
        </CardDescription>
        <form action={updateWhiteLabelAction} className="mt-sp-5">
          <Field
            label="Domaine personnalisé"
            htmlFor="wl-domain"
            hint="Ex. app.votre-agence.com — vos clients accèdent à la plateforme à cette adresse."
          >
            <Input
              id="wl-domain"
              name="whiteLabelDomain"
              placeholder="app.client.com"
              defaultValue={org?.whiteLabelDomain ?? ""}
            />
          </Field>

          <div className="grid gap-sp-4 sm:grid-cols-2">
            <Field label="Couleur de marque" htmlFor="wl-color" hint="Remplace l'orange Luunch Mail dans l'interface client.">
              <div className="flex items-center gap-sp-3">
                <input
                  id="wl-color"
                  name="brandColor"
                  type="color"
                  defaultValue={org?.brandColor || "#1E6B4A"}
                  className="h-10 w-14 shrink-0 cursor-pointer rounded-sm border border-line-strong bg-surface p-sp-1"
                  aria-label="Couleur de marque"
                />
                <span className="font-mono text-sm text-ink-muted">{org?.brandColor || "#1E6B4A"}</span>
              </div>
            </Field>

            <Field label="URL du logo" htmlFor="wl-logo" hint="Image affichée dans la barre latérale et les e-mails.">
              <Input
                id="wl-logo"
                name="logoUrl"
                type="url"
                placeholder="https://cdn.client.com/logo.svg"
                defaultValue={org?.logoUrl ?? ""}
              />
            </Field>
          </div>

          <Button type="submit" className="mt-sp-2">Enregistrer le branding</Button>
        </form>
      </Card>

      <Card>
        <CardTitle>Comment ça marche</CardTitle>
        <div className="mt-sp-4 space-y-sp-4 text-sm text-ink-muted">
          <div className="flex gap-sp-3">
            <Globe className="mt-sp-1 shrink-0 text-primary" size={18} />
            <p>Vos clients se connectent sur <span className="font-mono text-ink">{org?.whiteLabelDomain || "app.votre-agence.com"}</span> — aucune mention Luunch Mail visible.</p>
          </div>
          <div className="flex gap-sp-3">
            <Building2 className="mt-sp-1 shrink-0 text-primary" size={18} />
            <p>Chaque client dispose d'un <span className="font-medium text-ink">workspace isolé</span> : ses contacts, campagnes et statistiques restent strictement cloisonnés.</p>
          </div>
          <div className="flex gap-sp-3">
            <Users className="mt-sp-1 shrink-0 text-primary" size={18} />
            <p>Aucun paiement par siège : ajoutez toute votre équipe et celle de vos clients sans surcoût.</p>
          </div>
          <div className="rounded-sm bg-primary-soft px-sp-3 py-sp-3 text-xs text-primary">
            Astuce agence : revendez vos propres offres et gérez les crédits (envois, vérifications) workspace par workspace.
          </div>
        </div>
      </Card>
    </div>
  );

  // ── Onglet Facturation & quotas ───────────────────────────────────────
  const hasCounters = counters.length > 0;
  const billingTab = (
    <div className="space-y-sp-6">
      <Card className="flex flex-col gap-sp-4 border-primary/30 bg-primary-soft/40 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-sp-4">
          <span className="flex h-12 w-12 items-center justify-center rounded-md bg-primary text-white">
            <Crown size={22} />
          </span>
          <div>
            <p className="text-sm text-ink-faint">Votre plan</p>
            <p className="text-h3 font-headline font-bold text-ink">Scale</p>
          </div>
        </div>
        <div className="flex items-center gap-sp-3">
          <Badge tone="primary">Sièges illimités</Badge>
          <span className="text-sm text-ink-faint">Période : {period}</span>
        </div>
      </Card>

      {!hasCounters ? (
        <EmptyState
          icon={CreditCard}
          title="Aucun compteur ce mois-ci"
          description="Les compteurs d'usage s'initialisent automatiquement au premier envoi ou à la création du workspace."
          action={<Link href="/dashboard" className={buttonClasses({ size: "sm" })}>Aller au tableau de bord</Link>}
        />
      ) : (
        <div className="grid gap-sp-4 sm:grid-cols-2">
          {METRIC_ORDER.filter((m) => counterByMetric.has(m)).map((metric) => {
            const c = counterByMetric.get(metric)!;
            const usedPct = c.quota ? (c.used / c.quota) * 100 : 0;
            const tone = usedPct >= 90 ? "error" : usedPct >= 75 ? "warning" : "primary";
            return (
              <Card key={c.id}>
                <div className="flex items-start justify-between">
                  <CardTitle>{METRIC_LABELS[metric] ?? metric}</CardTitle>
                  <Badge tone={tone === "error" ? "error" : tone === "warning" ? "warning" : "neutral"}>
                    {pct(usedPct, 0)}
                  </Badge>
                </div>
                <p className="mt-sp-2 text-sm text-ink-muted">
                  <span className="font-headline text-h4 font-bold text-ink">{num(c.used)}</span>
                  {" "}/ {num(c.quota)} utilisés
                </p>
                <div className="mt-sp-3">
                  <Progress value={c.used} max={c.quota || 1} tone={tone} showLabel />
                </div>
                <p className="mt-sp-2 text-xs text-ink-faint">
                  {Math.max(0, c.quota - c.used) > 0
                    ? `${num(c.quota - c.used)} restant(s) ce mois-ci`
                    : "Quota atteint — pensez à augmenter votre plan."}
                </p>
              </Card>
            );
          })}
        </div>
      )}

      <Card>
        <CardTitle>À propos des compteurs</CardTitle>
        <CardDescription className="mt-sp-2">
          Chaque métrique est plafonnée par un quota mensuel (période {period}). Les compteurs se réinitialisent au début de chaque mois.
          La barre passe en orange à 75 % et en rouge à 90 % pour anticiper un dépassement.
        </CardDescription>
      </Card>
    </div>
  );

  // ── Onglet Conformité ─────────────────────────────────────────────────
  const complianceTab = (
    <div className="space-y-sp-6">
      <div className="grid gap-sp-6 lg:grid-cols-2">
        <Card>
          <div className="flex items-center gap-sp-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-md bg-success-soft text-success-fg"><FileCheck2 size={18} /></span>
            <CardTitle>Consentement &amp; preuve</CardTitle>
          </div>
          <CardDescription className="mt-sp-3">
            Pour chaque contact, Luunch Mail conserve la source du consentement (formulaire, import, API, checkout) et son horodatage —
            indispensable en cas de contrôle RGPD. Consultez ces champs sur la fiche contact.
          </CardDescription>
          <div className="mt-sp-4">
            <Link href="/audiences" className={buttonClasses({ size: "sm", variant: "secondary" })}>Voir les contacts</Link>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-sp-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-md bg-success-soft text-success-fg"><ShieldCheck size={18} /></span>
            <CardTitle>Options de conformité</CardTitle>
          </div>
          <CardDescription className="mt-sp-3">Activées par défaut sur vos formulaires et envois.</CardDescription>
          <div className="mt-sp-4 space-y-sp-3">
            <ComplianceToggle
              label="Double opt-in"
              description="Recommandé en Europe : l'inscrit confirme via un e-mail de validation avant d'entrer dans vos listes."
              defaultOn
            />
            <ComplianceToggle
              label="En-tête List-Unsubscribe"
              description="Ajouté automatiquement à chaque e-mail marketing (exigence Gmail / Yahoo 2024)."
              defaultOn
            />
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-sp-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary-soft text-primary"><MailX size={18} /></span>
            <CardTitle>Désinscription en 1 clic</CardTitle>
          </div>
          <CardDescription className="mt-sp-3">
            L'en-tête <span className="font-mono text-ink">List-Unsubscribe</span> et son complément{" "}
            <span className="font-mono text-ink">List-Unsubscribe-Post</span> permettent au destinataire de se désabonner
            directement depuis Gmail ou Outlook, sans ouvrir l'e-mail. La désinscription est traitée en moins de 48 h
            et le contact ajouté à votre liste de suppression.
          </CardDescription>
        </Card>

        <Card>
          <div className="flex items-center gap-sp-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary-soft text-primary"><ListX size={18} /></span>
            <CardTitle>Liste de suppression</CardTitle>
          </div>
          <CardDescription className="mt-sp-3">
            Centralise les adresses désinscrites, en bounce dur ou ayant porté plainte. Ces adresses sont automatiquement
            exclues de tous vos envois — aucun risque de recontacter un opt-out.
          </CardDescription>
          <div className="mt-sp-4">
            <Link href="/deliverability" className={buttonClasses({ size: "sm", variant: "secondary" })}>Gérer la suppression</Link>
          </div>
        </Card>
      </div>

      <Card>
        <div className="flex items-center gap-sp-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-warning-soft text-warning-fg"><Clock size={18} /></span>
          <CardTitle>Rétention des données</CardTitle>
        </div>
        <CardDescription className="mt-sp-3">
          Définissez combien de temps conserver les contacts inactifs et les événements d'envoi avant purge automatique.
          Par défaut, les events sont conservés 13 mois (suivi annuel) et les contacts inactifs anonymisés après 36 mois.
        </CardDescription>
      </Card>

      <Card className="border-line-strong">
        <div className="flex items-center gap-sp-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-fill-muted text-ink-muted"><Download size={18} /></span>
          <CardTitle>Droit à l'effacement &amp; portabilité</CardTitle>
        </div>
        <CardDescription className="mt-sp-3">
          Conformément au RGPD, vous pouvez exporter l'ensemble de vos données à tout moment, ou demander leur suppression définitive.
        </CardDescription>
        <div className="mt-sp-4 flex flex-wrap gap-sp-2">
          <form action={requestDataExportAction}>
            <Button type="submit" variant="secondary" size="sm"><Download size={15} /> Exporter mes données</Button>
          </form>
          <form action={requestDataDeletionAction}>
            <Button type="submit" variant="destructive" size="sm"><Trash2 size={15} /> Demander la suppression</Button>
          </form>
        </div>
      </Card>
    </div>
  );

  // ── Onglet Équipe ─────────────────────────────────────────────────────
  const teamTab = (
    <div className="grid gap-sp-6 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <div className="flex items-center justify-between">
          <CardTitle>Membres de l'équipe</CardTitle>
          <Badge tone="primary">{num(memberships.length)} membre(s)</Badge>
        </div>
        <CardDescription className="mt-sp-1">Sièges illimités : ajoutez toute votre équipe sans surcoût.</CardDescription>

        {memberships.length === 0 ? (
          <div className="mt-sp-5">
            <EmptyState
              icon={Users}
              title="Aucun membre"
              description="Invitez vos coéquipiers pour collaborer sur les campagnes et l'inbox unifiée."
            />
          </div>
        ) : (
          <div className="mt-sp-5">
            <Table>
              <THead>
                <TR>
                  <TH>Membre</TH>
                  <TH>Rôle</TH>
                  <TH>Ajouté le</TH>
                </TR>
              </THead>
              <tbody>
                {memberships.map((m) => (
                  <TR key={m.id}>
                    <TD>
                      <div className="flex items-center gap-sp-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-pill bg-primary-soft text-xs font-semibold text-primary">
                          {initials(m.user.name, m.user.email)}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate font-medium text-ink">{m.user.name || m.user.email.split("@")[0]}</p>
                          <p className="flex items-center gap-sp-1 truncate text-xs text-ink-faint">
                            <Mail size={12} /> {m.user.email}
                            {m.userId === user.id && <span className="ml-sp-1 text-primary">(vous)</span>}
                          </p>
                        </div>
                      </div>
                    </TD>
                    <TD>
                      <Badge tone={m.role === "owner" ? "purple" : m.role === "admin" ? "info" : "neutral"}>
                        {ROLE_LABELS[m.role] ?? m.role}
                      </Badge>
                    </TD>
                    <TD className="text-ink-faint">{date(m.createdAt)}</TD>
                  </TR>
                ))}
              </tbody>
            </Table>
          </div>
        )}
      </Card>

      <Card>
        <div className="flex items-center gap-sp-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary-soft text-primary"><UserPlus size={18} /></span>
          <CardTitle>Inviter un membre</CardTitle>
        </div>
        <CardDescription className="mt-sp-2">
          {role === "member"
            ? "Seuls les administrateurs et propriétaires peuvent inviter."
            : "L'invité rejoindra ce workspace et définira son mot de passe à l'activation."}
        </CardDescription>
        <form action={inviteMemberAction} className="mt-sp-4">
          <Field label="Adresse e-mail" htmlFor="inv-email">
            <Input id="inv-email" name="email" type="email" placeholder="collegue@agence.com" required />
          </Field>
          <Field label="Rôle" htmlFor="inv-role">
            <Select id="inv-role" name="role" defaultValue="member">
              <option value="member">Membre</option>
              <option value="admin">Administrateur</option>
              <option value="owner">Propriétaire</option>
            </Select>
          </Field>
          <Button type="submit" className="w-full"><UserPlus size={15} /> Envoyer l'invitation</Button>
        </form>
      </Card>
    </div>
  );

  // ── Onglet API (clés + endpoints de monitoring) ───────────────────────
  const apiTab = (
    <div className="space-y-sp-6">
      <Card>
        <div className="flex items-start justify-between gap-sp-3">
          <div>
            <CardTitle>Clés API</CardTitle>
            <CardDescription>
              Authentifiez vos intégrations avec <code className="font-mono text-xs">Authorization: Bearer gm_live_…</code>.
              Le secret n&apos;est affiché qu&apos;une seule fois à la création.
            </CardDescription>
          </div>
          <CreateKeyModal />
        </div>
        <div className="mt-sp-5">
          {apiKeys.length === 0 ? (
            <EmptyState
              icon={KeyRound}
              title="Aucune clé API"
              description="Créez une clé avec le scope monitor:read pour superviser vos campagnes, boîtes et domaines à distance."
              action={<CreateKeyModal />}
            />
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Nom</TH>
                  <TH>Clé</TH>
                  <TH>Permissions</TH>
                  <TH>Dernier usage</TH>
                  <TH>Statut</TH>
                  <TH className="text-right">Action</TH>
                </TR>
              </THead>
              <tbody>
                {apiKeys.map((k) => {
                  const scopes = parseJson<string[]>(k.scopes, []);
                  const revoked = Boolean(k.revokedAt);
                  return (
                    <TR key={k.id}>
                      <TD className="font-medium">{k.name}</TD>
                      <TD><code className="font-mono text-xs text-ink-muted">{k.prefix}…</code></TD>
                      <TD>
                        <div className="flex flex-wrap gap-sp-1">
                          {scopes.map((s) => (
                            <Badge key={s} tone={s === "monitor:read" ? "info" : "neutral"} className="font-mono">
                              {s}
                            </Badge>
                          ))}
                        </div>
                      </TD>
                      <TD className="text-sm text-ink-faint">{k.lastUsedAt ? date(k.lastUsedAt) : "jamais"}</TD>
                      <TD>
                        <Badge tone={revoked ? "neutral" : "success"}>{revoked ? "Révoquée" : "Active"}</Badge>
                      </TD>
                      <TD className="text-right">
                        {!revoked && (
                          <form action={revokeApiKeyAction}>
                            <input type="hidden" name="id" value={k.id} />
                            <Button type="submit" variant="subtle" size="sm">
                              <Trash2 size={14} /> Révoquer
                            </Button>
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

      <Card>
        <CardTitle>Endpoints de monitoring</CardTitle>
        <CardDescription>Lecture seule, scope <code className="font-mono text-xs">monitor:read</code>. Réponses JSON.</CardDescription>
        <div className="mt-sp-4 space-y-sp-2 font-mono text-sm text-ink-muted">
          {[
            ["GET /api/v1/overview", "KPIs outreach + marketing + santé infra"],
            ["GET /api/v1/campaigns", "campagnes & stats (?type= ?status=)"],
            ["GET /api/v1/campaigns/:id", "détail : séquence, inscrits, intéressés"],
            ["GET /api/v1/mailboxes", "boîtes : quota, warmup, réputation"],
            ["GET /api/v1/domains", "domaines & enregistrements DNS"],
            ["GET /api/v1/inbox", "conversations (?category= ?campaign=)"],
            ["GET /api/v1/deliverability", "bounces/plaintes vs seuils, blacklists"],
          ].map(([ep, desc]) => (
            <div key={ep} className="flex flex-wrap items-baseline justify-between gap-sp-2 border-t border-fill-muted pt-sp-2 first:border-t-0 first:pt-0">
              <code className="text-ink">{ep}</code>
              <span className="font-body text-xs text-ink-faint">{desc}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );

  return (
    <>
      <PageHeader
        title="Réglages"
        description="Workspace, API, facturation, conformité et équipe."
      />

      <Tabs
        defaultTab="workspace"
        items={[
          { id: "workspace", label: "Workspace", content: workspaceTab },
          { id: "api", label: "API", content: apiTab },
          {
            id: "white-label",
            label: "White-label",
            content: isFeatureEnabled("whiteLabel") ? (
              whiteLabelTab
            ) : (
              <ComingSoonInline
                title="White-label agence"
                description="Domaine personnalisé (app.votredomaine.com), branding par client et workspaces isolés — bientôt disponible."
              />
            ),
          },
          { id: "billing", label: "Facturation & quotas", content: billingTab },
          { id: "compliance", label: "Conformité", content: complianceTab },
          { id: "team", label: "Équipe", content: teamTab },
        ]}
      />
    </>
  );
}
