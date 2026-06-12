"use server";

import { requireAuth } from "@/lib/core/auth";
import { db } from "@/lib/core/db";
import { revalidatePath } from "next/cache";
import { refreshSegmentCount, type Condition, type SegmentDefinition } from "@/lib/audiences/segments";

const ROUTE = "/audiences";

/** Crée un contact unique (saisie manuelle). Upsert sur (workspaceId, email). */
export async function addContactAction(formData: FormData) {
  const { workspace } = await requireAuth();
  const email = String(formData.get("email") ?? "").toLowerCase().trim();
  if (!email) return;

  const firstName = String(formData.get("firstName") ?? "").trim() || null;
  const lastName = String(formData.get("lastName") ?? "").trim() || null;
  const company = String(formData.get("company") ?? "").trim() || null;

  await db.contact.upsert({
    where: { workspaceId_email: { workspaceId: workspace.id, email } },
    update: { firstName, lastName, company },
    create: {
      workspaceId: workspace.id,
      email,
      firstName,
      lastName,
      company,
      status: "subscribed",
      consentSource: "api",
      consentAt: new Date(),
    },
  });

  revalidatePath(ROUTE);
}

/**
 * Import de contacts depuis un collage CSV (une ligne = email,prénom,nom).
 * Crée/maj chaque contact en statut "subscribed", consentSource "import".
 * Conforme à l'hygiène opt-in : on n'écrase pas un statut existant (désinscrit reste désinscrit).
 */
export async function importContactsAction(formData: FormData) {
  const { workspace } = await requireAuth();
  const raw = String(formData.get("csv") ?? "");
  const wid = workspace.id;

  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const lines = raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const seen = new Set<string>();
  for (const line of lines) {
    // séparateurs tolérés : virgule, point-virgule, tabulation
    const cols = line.split(/[,;\t]/).map((c) => c.trim());
    const email = (cols[0] ?? "").toLowerCase();
    if (!emailRe.test(email) || seen.has(email)) continue;
    seen.add(email);

    const firstName = cols[1] || null;
    const lastName = cols[2] || null;

    await db.contact.upsert({
      where: { workspaceId_email: { workspaceId: wid, email } },
      update: { firstName: firstName ?? undefined, lastName: lastName ?? undefined },
      create: {
        workspaceId: wid,
        email,
        firstName,
        lastName,
        status: "subscribed",
        consentSource: "import",
        consentAt: new Date(),
      },
    });
  }

  revalidatePath(ROUTE);
}

/** Crée un segment dynamique à partir du builder de conditions, puis recalcule le nb de membres. */
export async function createSegmentAction(formData: FormData) {
  const { workspace } = await requireAuth();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;

  const match = String(formData.get("match") ?? "all") === "any" ? "any" : "all";

  const conditions: Condition[] = [];
  for (let i = 0; i < 3; i++) {
    const field = String(formData.get(`field_${i}`) ?? "").trim();
    const op = String(formData.get(`op_${i}`) ?? "").trim();
    const value = String(formData.get(`value_${i}`) ?? "").trim();
    if (!field || !op) continue;

    const allowedOps = ["equals", "contains", "gt", "lt", "is_set"];
    if (!allowedOps.includes(op)) continue;

    // les champs numériques sont castés pour gt/lt
    const numericFields = ["engagementScore", "churnRisk", "predictedClv"];
    const parsedValue =
      op === "is_set"
        ? undefined
        : numericFields.includes(field) && value !== ""
          ? Number(value)
          : value;

    conditions.push({ field, op: op as Condition["op"], value: parsedValue });
  }

  const definition: SegmentDefinition = { match, conditions };

  const segment = await db.segment.create({
    data: {
      workspaceId: workspace.id,
      name,
      definition: JSON.stringify(definition),
    },
  });

  await refreshSegmentCount(segment.id);
  revalidatePath(ROUTE);
}

/** Crée une liste de contacts (statique par défaut). */
export async function createListAction(formData: FormData) {
  const { workspace } = await requireAuth();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;

  const type = String(formData.get("type") ?? "static") === "dynamic" ? "dynamic" : "static";

  await db.contactList.create({
    data: { workspaceId: workspace.id, name, type },
  });

  revalidatePath(ROUTE);
}

/** Crée un formulaire de collecte (pop-up / embed / landing) avec option double opt-in (RGPD). */
export async function createFormAction(formData: FormData) {
  const { workspace } = await requireAuth();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;

  const typeRaw = String(formData.get("type") ?? "popup");
  const type = ["popup", "embed", "landing"].includes(typeRaw) ? typeRaw : "popup";
  const doubleOptIn = formData.get("doubleOptIn") === "on";

  await db.form.create({
    data: {
      workspaceId: workspace.id,
      name,
      type,
      doubleOptIn,
      status: "draft",
      fields: JSON.stringify([
        { name: "email", label: "E-mail", required: true },
        { name: "firstName", label: "Prénom", required: false },
      ]),
    },
  });

  revalidatePath(ROUTE);
}
