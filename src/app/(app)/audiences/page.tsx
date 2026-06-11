import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { num, money, pct, ratio, date, parseJson, initials } from "@/lib/fmt";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, THead, TH, TR, TD } from "@/components/ui/table";
import { Tabs } from "@/components/ui/tabs";
import {
  Users, Filter, List, FileText, Mail, UserMinus, Wallet, ShieldCheck, Sparkles,
} from "lucide-react";
import type { Condition, SegmentDefinition } from "@/lib/segments";
import { AddContactModal } from "@/components/audiences/add-contact-modal";
import { ImportContactsModal } from "@/components/audiences/import-contacts-modal";
import { CreateSegmentModal } from "@/components/audiences/create-segment-modal";
import { CreateListModal } from "@/components/audiences/create-list-modal";
import { CreateFormModal } from "@/components/audiences/create-form-modal";

const FIELD_LABELS: Record<string, string> = {
  email: "E-mail",
  firstName: "Prénom",
  company: "Société",
  status: "Statut",
  engagementScore: "Score d'engagement",
  churnRisk: "Risque d'attrition",
  predictedClv: "CLV prévue",
};
const OP_LABELS: Record<string, string> = {
  equals: "=",
  not_equals: "≠",
  contains: "contient",
  gt: ">",
  lt: "<",
  is_set: "renseigné",
  not_set: "vide",
};

function summarizeDefinition(raw: string): string {
  const def = parseJson<SegmentDefinition>(raw, { match: "all", conditions: [] });
  if (!def.conditions.length) return "Tous les contacts";
  const parts = def.conditions.map((c: Condition) => {
    const f = FIELD_LABELS[c.field] ?? c.field;
    const op = OP_LABELS[c.op] ?? c.op;
    return c.op === "is_set" || c.op === "not_set" ? `${f} ${op}` : `${f} ${op} ${c.value ?? ""}`;
  });
  const sep = def.match === "any" ? " OU " : " ET ";
  return parts.join(sep);
}

export default async function AudiencesPage() {
  const { workspace } = await requireAuth();
  const wid = workspace.id;

  const [
    contacts,
    totalContacts,
    subscribedCount,
    unsubscribedCount,
    clvAgg,
    segments,
    lists,
    forms,
  ] = await Promise.all([
    db.contact.findMany({ where: { workspaceId: wid }, orderBy: { createdAt: "desc" }, take: 50 }),
    db.contact.count({ where: { workspaceId: wid } }),
    db.contact.count({ where: { workspaceId: wid, status: "subscribed" } }),
    db.contact.count({ where: { workspaceId: wid, status: "unsubscribed" } }),
    db.contact.aggregate({ where: { workspaceId: wid }, _avg: { predictedClv: true } }),
    db.segment.findMany({ where: { workspaceId: wid }, orderBy: { createdAt: "desc" } }),
    db.contactList.findMany({
      where: { workspaceId: wid },
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { members: true } } },
    }),
    db.form.findMany({ where: { workspaceId: wid }, orderBy: { createdAt: "desc" } }),
  ]);

  const avgClv = clvAgg._avg.predictedClv ?? 0;

  // ----- Onglet Contacts -----
  const contactsTab = (
    <div>
      <div className="mb-sp-5 grid grid-cols-2 gap-sp-4 lg:grid-cols-4">
        <StatCard label="Contacts" value={num(totalContacts)} icon={Users} />
        <StatCard label="Abonnés" value={num(subscribedCount)} icon={Mail} deltaTone="up" delta={ratio(subscribedCount, totalContacts)} />
        <StatCard label="Désinscrits" value={num(unsubscribedCount)} icon={UserMinus} hint="hygiène de liste" />
        <StatCard label="CLV moyenne" value={money(avgClv)} icon={Wallet} hint="valeur vie client prévue (IA)" />
      </div>

      {contacts.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Aucun contact pour l'instant"
          description="Constituez votre base opt-in : ajoutez un contact manuellement ou importez votre liste existante (RGPD : consentement requis)."
          action={
            <div className="flex flex-wrap justify-center gap-sp-2">
              <AddContactModal />
              <ImportContactsModal />
            </div>
          }
        />
      ) : (
        <Table>
          <THead>
            <TR>
              <TH>Contact</TH>
              <TH>Société</TH>
              <TH>Statut</TH>
              <TH className="w-40">Engagement</TH>
              <TH>CLV prévue</TH>
              <TH>Risque d'attrition</TH>
              <TH>Attributs</TH>
            </TR>
          </THead>
          <tbody>
            {contacts.map((c) => {
              const name = [c.firstName, c.lastName].filter(Boolean).join(" ");
              const attrs = parseJson<Record<string, unknown>>(c.attributes, {});
              const attrKeys = Object.keys(attrs);
              const churnPct = c.churnRisk != null ? Math.round(c.churnRisk * 100) : null;
              return (
                <TR key={c.id}>
                  <TD>
                    <div className="flex items-center gap-sp-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-pill bg-primary-soft text-xs font-semibold text-primary">
                        {initials(name, c.email)}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate font-medium text-ink">{name || "—"}</p>
                        <p className="truncate text-xs text-ink-faint">{c.email}</p>
                      </div>
                    </div>
                  </TD>
                  <TD className="text-ink-muted">{c.company || "—"}</TD>
                  <TD>
                    <StatusBadge status={c.status} />
                  </TD>
                  <TD>
                    <Progress
                      value={c.engagementScore}
                      showLabel
                      tone={c.engagementScore >= 70 ? "success" : c.engagementScore >= 40 ? "primary" : "warning"}
                    />
                  </TD>
                  <TD className="font-medium">{c.predictedClv != null ? money(c.predictedClv) : "—"}</TD>
                  <TD>
                    {churnPct == null ? (
                      <span className="text-ink-faint">—</span>
                    ) : (
                      <Badge tone={churnPct >= 60 ? "error" : churnPct >= 30 ? "warning" : "success"}>{pct(churnPct, 0)}</Badge>
                    )}
                  </TD>
                  <TD>
                    {attrKeys.length === 0 ? (
                      <span className="text-ink-faint">—</span>
                    ) : (
                      <div className="flex flex-wrap gap-sp-1">
                        {attrKeys.slice(0, 3).map((k) => (
                          <Badge key={k} tone="neutral">
                            {k}: {String(attrs[k])}
                          </Badge>
                        ))}
                        {attrKeys.length > 3 && <Badge tone="neutral">+{attrKeys.length - 3}</Badge>}
                      </div>
                    )}
                  </TD>
                </TR>
              );
            })}
          </tbody>
        </Table>
      )}

      {contacts.length > 0 && (
        <p className="mt-sp-3 text-xs text-ink-faint">
          {contacts.length} contacts récents affichés (sur {num(totalContacts)}). Profils unifiés : engagement, CLV et risque d'attrition enrichis par l'IA.
        </p>
      )}
    </div>
  );

  // ----- Onglet Segments -----
  const segmentsTab = (
    <div>
      <div className="mb-sp-4 flex items-center justify-between gap-sp-4">
        <CardDescription>
          Groupes dynamiques recalculés en temps réel selon des conditions sur vos données (statut, engagement, CLV…).
        </CardDescription>
        {segments.length > 0 && <CreateSegmentModal />}
      </div>

      {segments.length === 0 ? (
        <EmptyState
          icon={Filter}
          title="Aucun segment"
          description="Un segment cible automatiquement les bons contacts (ex. « engagement > 70 » ou « risque d'attrition élevé »). Il se met à jour tout seul quand le comportement change."
          action={<CreateSegmentModal />}
        />
      ) : (
        <div className="grid gap-sp-4 sm:grid-cols-2">
          {segments.map((s) => (
            <Card key={s.id} hover>
              <div className="flex items-start justify-between gap-sp-3">
                <div className="min-w-0">
                  <CardTitle className="truncate">{s.name}</CardTitle>
                  <p className="mt-sp-1 text-sm text-ink-muted">{summarizeDefinition(s.definition)}</p>
                </div>
                <Badge tone="purple">
                  <Filter size={12} /> Dynamique
                </Badge>
              </div>
              <div className="mt-sp-4 flex items-center justify-between border-t border-fill-muted pt-sp-3">
                <span className="text-sm text-ink-faint">Membres</span>
                <span className="text-h4 font-headline font-bold text-ink">{num(s.matchCount)}</span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );

  // ----- Onglet Listes -----
  const listsTab = (
    <div>
      <div className="mb-sp-4 flex items-center justify-between gap-sp-4">
        <CardDescription>
          Une liste est un groupe statique de contacts auquel on s'inscrit ou se désinscrit (ex. « Newsletter », « Clients VIP »).
        </CardDescription>
        {lists.length > 0 && <CreateListModal />}
      </div>

      {lists.length === 0 ? (
        <EmptyState
          icon={List}
          title="Aucune liste"
          description="Créez des listes pour organiser vos abonnés. Contrairement aux segments, une liste se gère manuellement."
          action={<CreateListModal />}
        />
      ) : (
        <div className="grid gap-sp-4 sm:grid-cols-2 lg:grid-cols-3">
          {lists.map((l) => (
            <Card key={l.id} hover>
              <div className="flex items-start justify-between gap-sp-3">
                <CardTitle className="truncate">{l.name}</CardTitle>
                <StatusBadge status={l.type === "dynamic" ? "running" : "active"} />
              </div>
              <div className="mt-sp-4 flex items-end justify-between">
                <div>
                  <p className="text-h2 font-headline font-bold text-ink">{num(l._count.members)}</p>
                  <p className="text-xs text-ink-faint">membres</p>
                </div>
                <span className="flex items-center gap-sp-1 text-xs text-ink-disabled">
                  <List size={14} /> créée le {date(l.createdAt)}
                </span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );

  // ----- Onglet Formulaires -----
  const formsTab = (
    <div>
      <div className="mb-sp-4 flex items-center justify-between gap-sp-4">
        <CardDescription>
          Collectez des contacts opt-in via pop-ups, blocs intégrés et landing pages — avec double opt-in pour la conformité RGPD.
        </CardDescription>
        {forms.length > 0 && <CreateFormModal />}
      </div>

      {forms.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="Aucun formulaire"
          description="Capturez des leads avec un pop-up de bienvenue, un bloc d'inscription newsletter ou une landing page. Le double opt-in garantit un consentement prouvable (RGPD)."
          action={<CreateFormModal />}
        />
      ) : (
        <Table>
          <THead>
            <TR>
              <TH>Formulaire</TH>
              <TH>Type</TH>
              <TH>Statut</TH>
              <TH>Vues</TH>
              <TH>Inscriptions</TH>
              <TH>Taux de conversion</TH>
              <TH>Consentement</TH>
            </TR>
          </THead>
          <tbody>
            {forms.map((f) => {
              const typeLabel = f.type === "popup" ? "Pop-up" : f.type === "embed" ? "Intégré" : "Landing page";
              return (
                <TR key={f.id}>
                  <TD className="font-medium">{f.name}</TD>
                  <TD>
                    <Badge tone="info">{typeLabel}</Badge>
                  </TD>
                  <TD>
                    <StatusBadge status={f.status} />
                  </TD>
                  <TD className="text-ink-muted">{num(f.views)}</TD>
                  <TD className="text-ink-muted">{num(f.submissions)}</TD>
                  <TD className="font-medium">{ratio(f.submissions, f.views)}</TD>
                  <TD>
                    {f.doubleOptIn ? (
                      <Badge tone="success">
                        <ShieldCheck size={12} /> Double opt-in
                      </Badge>
                    ) : (
                      <Badge tone="warning">Simple opt-in</Badge>
                    )}
                  </TD>
                </TR>
              );
            })}
          </tbody>
        </Table>
      )}
    </div>
  );

  return (
    <>
      <PageHeader
        title="Audiences"
        description="Profils clients unifiés, segmentation dynamique, listes et formulaires de collecte — sur une base opt-in conforme RGPD."
        actions={
          <div className="flex items-center gap-sp-2">
            <ImportContactsModal />
            <AddContactModal />
          </div>
        }
      />

      <Card className="mb-sp-6 border-primary/20 bg-primary-soft/30">
        <div className="flex items-start gap-sp-3">
          <Sparkles className="mt-sp-1 shrink-0 text-primary" size={18} />
          <p className="text-sm text-ink-muted">
            Vos profils sont enrichis par l'IA prédictive : <strong className="text-ink">CLV prévue</strong> et{" "}
            <strong className="text-ink">risque d'attrition</strong> pilotent la rétention. La segmentation se recalcule en
            temps réel pour une personnalisation à grande échelle.
          </p>
        </div>
      </Card>

      <Tabs
        items={[
          { id: "contacts", label: `Contacts (${num(totalContacts)})`, content: contactsTab },
          { id: "segments", label: `Segments (${num(segments.length)})`, content: segmentsTab },
          { id: "lists", label: `Listes (${num(lists.length)})`, content: listsTab },
          { id: "forms", label: `Formulaires (${num(forms.length)})`, content: formsTab },
        ]}
      />
    </>
  );
}
