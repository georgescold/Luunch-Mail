"use server";

import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { sendEmail } from "@/lib/messaging";

/* ============================================================================
 * AUTOMATIONS — server actions (flows visuels + broadcasts)
 * Modèles : Flow (trigger/nodes/goal/stats JSON String), Campaign type "broadcast".
 * Les champs JSON du schéma sont stockés en String → JSON.stringify/parse en ligne.
 * ========================================================================== */

/** Type d'un node du canvas (graphe sérialisé dans Flow.nodes).
 *  Non exporté : un fichier "use server" ne peut exporter que des fonctions async. */
type FlowNode = {
  id: string;
  type: "trigger" | "email" | "wait" | "condition" | "action";
  title: string;
  detail?: string;
  // email : objet | wait : jours | condition : si/alors | action : action
  subject?: string;
  waitDays?: number;
  conditionIf?: string;
  actionKind?: string;
};

type FlowTrigger = { type: string; label: string; params?: Record<string, unknown> };

/* ---------------------------------------------------------------------------
 * Modèles e-commerce préconçus (déclencheur + chaîne de nodes).
 * Voir marketing/00 §5.2 : flows e-commerce indispensables.
 * ------------------------------------------------------------------------- */
const FLOW_TEMPLATES: Record<
  string,
  { name: string; trigger: FlowTrigger; goal: string; nodes: Omit<FlowNode, "id">[] }
> = {
  welcome: {
    name: "Série de bienvenue",
    trigger: { type: "signup", label: "Inscription à une liste" },
    goal: "Première commande",
    nodes: [
      { type: "email", title: "E-mail 1 · Bienvenue", subject: "Bienvenue chez nous 👋", detail: "Présentation de la marque + code de bienvenue" },
      { type: "wait", title: "Attendre 1 jour", waitDays: 1 },
      { type: "condition", title: "A ouvert ?", conditionIf: "opened", detail: "Si ouvert → offre · sinon relance" },
      { type: "email", title: "E-mail 2 · Notre best-seller", subject: "Le produit que tout le monde adore", detail: "Mise en avant produit + avis clients" },
      { type: "wait", title: "Attendre 3 jours", waitDays: 3 },
      { type: "email", title: "E-mail 3 · Dernier rappel", subject: "Votre code expire bientôt", detail: "Urgence + réassurance livraison" },
    ],
  },
  abandoned_cart: {
    name: "Panier abandonné",
    trigger: { type: "abandoned_cart", label: "Ajout au panier sans achat" },
    goal: "Achat finalisé",
    nodes: [
      { type: "wait", title: "Attendre 1 heure", waitDays: 0 },
      { type: "email", title: "E-mail 1 · Vous avez oublié quelque chose", subject: "Votre panier vous attend 🛒", detail: "Rappel produits du panier" },
      { type: "wait", title: "Attendre 1 jour", waitDays: 1 },
      { type: "condition", title: "A acheté ?", conditionIf: "purchased", detail: "Si acheté → sortie · sinon relance" },
      { type: "email", title: "E-mail 2 · -10 % pour finaliser", subject: "Encore hésitant ? Voici -10 %", detail: "Incitatif + livraison offerte" },
    ],
  },
  browse_abandonment: {
    name: "Navigation abandonnée",
    trigger: { type: "visit", label: "Vue produit sans achat" },
    goal: "Vue panier ou achat",
    nodes: [
      { type: "wait", title: "Attendre 2 heures", waitDays: 0 },
      { type: "email", title: "E-mail 1 · Ce produit vous a plu ?", subject: "Vous regardiez ceci…", detail: "Rappel du produit consulté + similaires" },
      { type: "wait", title: "Attendre 2 jours", waitDays: 2 },
      { type: "email", title: "E-mail 2 · Toujours intéressé ?", subject: "On vous a gardé une sélection", detail: "Recommandations personnalisées" },
    ],
  },
  post_purchase: {
    name: "Post-achat",
    trigger: { type: "purchase", label: "Commande passée" },
    goal: "Avis laissé + ré-achat",
    nodes: [
      { type: "email", title: "E-mail 1 · Merci pour votre commande", subject: "Merci ! Voici votre confirmation", detail: "Onboarding produit + suivi" },
      { type: "wait", title: "Attendre 7 jours", waitDays: 7 },
      { type: "email", title: "E-mail 2 · Conseils d'utilisation", subject: "Tirez le meilleur de votre achat", detail: "Tutoriel + cross-sell" },
      { type: "wait", title: "Attendre 7 jours", waitDays: 7 },
      { type: "email", title: "E-mail 3 · Donnez votre avis", subject: "Comment s'est passée votre expérience ?", detail: "Demande d'avis produit" },
    ],
  },
  win_back: {
    name: "Win-back / réengagement",
    trigger: { type: "inactivity", label: "Inactivité 90 jours" },
    goal: "Réactivation (ouverture ou achat)",
    nodes: [
      { type: "email", title: "E-mail 1 · Vous nous manquez", subject: "Ça fait longtemps… 💛", detail: "Réengagement + nouveautés" },
      { type: "wait", title: "Attendre 4 jours", waitDays: 4 },
      { type: "condition", title: "A réagi ?", conditionIf: "opened", detail: "Si actif → sortie · sinon offre forte" },
      { type: "email", title: "E-mail 2 · -20 % pour revenir", subject: "Un cadeau pour votre retour", detail: "Offre de réactivation" },
      { type: "wait", title: "Attendre 7 jours", waitDays: 7 },
      { type: "action", title: "Marquer comme inactif", actionKind: "tag_inactive", detail: "Sunset policy si toujours pas de réaction" },
    ],
  },
  replenishment: {
    name: "Réapprovisionnement",
    trigger: { type: "date", label: "Cycle de consommation atteint" },
    goal: "Ré-achat du consommable",
    nodes: [
      { type: "email", title: "E-mail 1 · Bientôt à court ?", subject: "Il est temps de recommander", detail: "Rappel produit consommable" },
      { type: "wait", title: "Attendre 5 jours", waitDays: 5 },
      { type: "condition", title: "A re-commandé ?", conditionIf: "purchased", detail: "Si oui → sortie · sinon rappel" },
      { type: "email", title: "E-mail 2 · Rachat en 1 clic", subject: "On vous a préparé votre commande", detail: "Lien de rachat rapide" },
    ],
  },
};

function makeNodeId() {
  return `n_${Math.random().toString(36).slice(2, 9)}`;
}

/** Crée un flow à partir d'un modèle préconçu (ou un flow vide « custom »). */
export async function createFlowAction(formData: FormData) {
  const { workspace } = await requireAuth();
  const template = String(formData.get("template") ?? "");
  const customName = String(formData.get("name") ?? "").trim();

  const tpl = FLOW_TEMPLATES[template];

  const trigger: FlowTrigger = tpl
    ? tpl.trigger
    : { type: "signup", label: "Inscription à une liste" };

  // Le trigger est toujours le premier node visuel du canvas.
  const nodes: FlowNode[] = [
    { id: makeNodeId(), type: "trigger", title: trigger.label, detail: "Point de départ du parcours" },
    ...(tpl ? tpl.nodes.map((n) => ({ ...n, id: makeNodeId() })) : []),
  ];

  const created = await db.flow.create({
    data: {
      workspaceId: workspace.id,
      name: customName || tpl?.name || "Nouveau flow",
      status: "draft",
      trigger: JSON.stringify(trigger),
      nodes: JSON.stringify(nodes),
      goal: tpl ? JSON.stringify({ label: tpl.goal }) : null,
      stats: JSON.stringify({ entered: 0, completed: 0, revenue: 0 }),
    },
  });

  revalidatePath("/automations");
  redirect(`/automations?tab=flows&flow=${created.id}`);
}

/** Ajoute un node à la chaîne d'un flow (appelé depuis le canvas client). */
export async function addNodeAction(formData: FormData) {
  const { workspace } = await requireAuth();
  const flowId = String(formData.get("flowId") ?? "");
  const type = String(formData.get("type") ?? "email") as FlowNode["type"];

  const flow = await db.flow.findFirst({ where: { id: flowId, workspaceId: workspace.id } });
  if (!flow) return;

  const nodes: FlowNode[] = safeParse<FlowNode[]>(flow.nodes, []);

  const presets: Record<string, Omit<FlowNode, "id" | "type">> = {
    email: { title: "Nouvel e-mail", subject: "Objet à définir", detail: "Étape d'envoi" },
    wait: { title: "Attendre 1 jour", waitDays: 1, detail: "Temporisation" },
    condition: { title: "Condition (a ouvert ?)", conditionIf: "opened", detail: "Branche si/alors" },
    action: { title: "Action", actionKind: "tag", detail: "Mettre à jour le contact" },
  };

  const preset = presets[type] ?? presets.email;
  nodes.push({ id: makeNodeId(), type, ...preset });

  await db.flow.update({ where: { id: flow.id }, data: { nodes: JSON.stringify(nodes) } });
  revalidatePath("/automations");
}

/** Supprime un node du flow (le trigger initial ne peut pas être retiré). */
export async function removeNodeAction(formData: FormData) {
  const { workspace } = await requireAuth();
  const flowId = String(formData.get("flowId") ?? "");
  const nodeId = String(formData.get("nodeId") ?? "");

  const flow = await db.flow.findFirst({ where: { id: flowId, workspaceId: workspace.id } });
  if (!flow) return;

  const nodes: FlowNode[] = safeParse<FlowNode[]>(flow.nodes, []);
  const target = nodes.find((n) => n.id === nodeId);
  if (!target || target.type === "trigger") return; // on ne supprime jamais le déclencheur

  await db.flow.update({
    where: { id: flow.id },
    data: { nodes: JSON.stringify(nodes.filter((n) => n.id !== nodeId)) },
  });
  revalidatePath("/automations");
}

/** Active / met en pause un flow (draft|paused → live, live → paused). */
export async function toggleFlowAction(formData: FormData) {
  const { workspace } = await requireAuth();
  const flowId = String(formData.get("flowId") ?? "");

  const flow = await db.flow.findFirst({ where: { id: flowId, workspaceId: workspace.id } });
  if (!flow) return;

  const next = flow.status === "live" ? "paused" : "live";

  // Au passage en ligne, on amorce les stats d'entrée (démo) si encore vides.
  const stats = safeParse<{ entered?: number; completed?: number; revenue?: number }>(flow.stats, {});
  if (next === "live" && !stats.entered) {
    stats.entered = stats.entered ?? 0;
    stats.completed = stats.completed ?? 0;
    stats.revenue = stats.revenue ?? 0;
  }

  await db.flow.update({
    where: { id: flow.id },
    data: { status: next, stats: JSON.stringify(stats) },
  });
  revalidatePath("/automations");
}

/* ===========================================================================
 * BROADCASTS — Campaign type "broadcast"
 * ========================================================================= */

/** Crée un broadcast (campagne type broadcast) ciblant une liste ou un segment. */
export async function createBroadcastAction(formData: FormData) {
  const { workspace } = await requireAuth();

  const name = String(formData.get("name") ?? "").trim() || "Nouveau broadcast";
  const subject = String(formData.get("subject") ?? "").trim();
  const target = String(formData.get("target") ?? ""); // "list:<id>" | "segment:<id>"
  const schedule = String(formData.get("schedule") ?? "now"); // now | in1h | tomorrow9
  const sendTimeOpt = formData.get("sendTimeOpt") === "on";
  const abTesting = formData.get("abTesting") === "on";

  // Planification → scheduleAt + statut.
  let scheduleAt: Date | null = null;
  if (schedule === "in1h") scheduleAt = new Date(Date.now() + 3600_000);
  else if (schedule === "tomorrow9") {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(9, 0, 0, 0);
    scheduleAt = d;
  }
  const status = scheduleAt ? "scheduled" : "draft";

  // La cible segment est stockée dans segmentId ; la liste dans sendWindow (JSON) pour traçabilité.
  const [kind, id] = target.split(":");

  await db.campaign.create({
    data: {
      workspaceId: workspace.id,
      name,
      type: "broadcast",
      status,
      subject: subject || null,
      segmentId: kind === "segment" ? id || null : null,
      scheduleAt,
      sendTimeOpt,
      abTesting,
      sendWindow: kind === "list" && id ? JSON.stringify({ listId: id }) : null,
      stats: JSON.stringify({ sent: 0, delivered: 0, opened: 0, clicked: 0, bounced: 0 }),
    },
  });

  revalidatePath("/automations");
}

const BROADCAST_LIMIT = 200; // limite raisonnable par envoi (démo)

/** Envoie un broadcast : boucle sur les contacts de la cible et appelle sendEmail. */
export async function sendBroadcastAction(formData: FormData) {
  const { workspace } = await requireAuth();
  const wid = workspace.id;
  const campaignId = String(formData.get("campaignId") ?? "");

  const campaign = await db.campaign.findFirst({
    where: { id: campaignId, workspaceId: wid, type: "broadcast" },
  });
  if (!campaign) return;

  // Résolution de la cible : liste (sendWindow.listId) ou segment (segmentId).
  let contacts: { id: string; email: string; firstName: string | null }[] = [];

  const sw = safeParse<{ listId?: string }>(campaign.sendWindow, {});
  if (sw.listId) {
    const members = await db.contactListMembership.findMany({
      where: { listId: sw.listId, list: { workspaceId: wid } },
      include: { contact: true },
      take: BROADCAST_LIMIT,
    });
    contacts = members
      .map((m) => m.contact)
      .filter((c) => c.status === "subscribed")
      .map((c) => ({ id: c.id, email: c.email, firstName: c.firstName }));
  } else if (campaign.segmentId) {
    const segment = await db.segment.findFirst({ where: { id: campaign.segmentId, workspaceId: wid } });
    const def = safeParse<{ match: "all" | "any"; conditions: SegmentCondition[] }>(
      segment?.definition,
      { match: "all", conditions: [] },
    );
    // Évaluation en ligne du segment (sans dépendre d'un helper externe).
    const all = await db.contact.findMany({ where: { workspaceId: wid, status: "subscribed" }, take: 5000 });
    contacts = all
      .filter((c) => matchSegment(c, def))
      .slice(0, BROADCAST_LIMIT)
      .map((c) => ({ id: c.id, email: c.email, firstName: c.firstName }));
  }

  if (contacts.length === 0) {
    // Rien à envoyer : on bascule en terminé pour éviter un état bloqué.
    await db.campaign.update({ where: { id: campaign.id }, data: { status: "completed" } });
    revalidatePath("/automations");
    return;
  }

  await db.campaign.update({ where: { id: campaign.id }, data: { status: "running" } });

  const subject = campaign.subject || campaign.name;
  for (const c of contacts) {
    const html = `<p>Bonjour ${c.firstName ?? ""},</p><p>${subject}</p><p>— ${workspace.name}</p>`;
    await sendEmail({
      workspaceId: wid,
      source: "broadcast",
      to: c.email,
      subject,
      html,
      campaignId: campaign.id,
      contactId: c.id,
      // idempotence par contact pour éviter les doublons sur double clic.
      idempotencyKey: `bcast:${campaign.id}:${c.id}`,
    });
  }

  await db.campaign.update({ where: { id: campaign.id }, data: { status: "completed" } });
  revalidatePath("/automations");
}

/** parseJson en ligne (pas d'import lib partagée requis côté action). */
function safeParse<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

/* --- Évaluation de segment en ligne (mêmes opérateurs que @/lib/segments) --- */
type SegmentCondition = {
  field: string;
  op: "equals" | "not_equals" | "contains" | "gt" | "lt" | "is_set" | "not_set";
  value?: string | number;
};

function matchSegment(
  contact: Record<string, unknown>,
  def: { match: "all" | "any"; conditions: SegmentCondition[] },
): boolean {
  if (!def.conditions?.length) return true;
  const results = def.conditions.map((cond) => {
    const actual = cond.field.startsWith("attr:")
      ? safeParse<Record<string, unknown>>(String(contact.attributes ?? ""), {})[cond.field.slice(5)]
      : contact[cond.field];
    switch (cond.op) {
      case "is_set": return actual !== null && actual !== undefined && actual !== "";
      case "not_set": return actual === null || actual === undefined || actual === "";
      case "equals": return String(actual ?? "") === String(cond.value ?? "");
      case "not_equals": return String(actual ?? "") !== String(cond.value ?? "");
      case "contains": return String(actual ?? "").toLowerCase().includes(String(cond.value ?? "").toLowerCase());
      case "gt": return Number(actual ?? 0) > Number(cond.value ?? 0);
      case "lt": return Number(actual ?? 0) < Number(cond.value ?? 0);
      default: return false;
    }
  });
  return def.match === "any" ? results.some(Boolean) : results.every(Boolean);
}
