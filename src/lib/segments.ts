import { db } from "./db";
import { parseJson } from "./fmt";

export type Condition = {
  field: string; // email | firstName | company | status | engagementScore | churnRisk | predictedClv | createdAt | attr:<key>
  op: "equals" | "not_equals" | "contains" | "gt" | "lt" | "is_set" | "not_set";
  value?: string | number;
};

export type SegmentDefinition = {
  match: "all" | "any";
  conditions: Condition[];
};

type ContactRow = Awaited<ReturnType<typeof db.contact.findMany>>[number];

function getField(contact: ContactRow, field: string): unknown {
  if (field.startsWith("attr:")) {
    const attrs = parseJson<Record<string, unknown>>(contact.attributes, {});
    return attrs[field.slice(5)];
  }
  return (contact as unknown as Record<string, unknown>)[field];
}

function matchCondition(contact: ContactRow, cond: Condition): boolean {
  const actual = getField(contact, cond.field);
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
}

/** Évalue une définition de segment et renvoie les contacts correspondants (temps réel). */
export async function evaluateSegment(workspaceId: string, def: SegmentDefinition): Promise<ContactRow[]> {
  const contacts = await db.contact.findMany({ where: { workspaceId } });
  if (!def.conditions?.length) return contacts;
  return contacts.filter((c) => {
    const results = def.conditions.map((cond) => matchCondition(c, cond));
    return def.match === "any" ? results.some(Boolean) : results.every(Boolean);
  });
}

/** Recalcule et met en cache le nombre de membres d'un segment. */
export async function refreshSegmentCount(segmentId: string) {
  const segment = await db.segment.findUnique({ where: { id: segmentId } });
  if (!segment) return 0;
  const def = parseJson<SegmentDefinition>(segment.definition, { match: "all", conditions: [] });
  const matched = await evaluateSegment(segment.workspaceId, def);
  await db.segment.update({ where: { id: segmentId }, data: { matchCount: matched.length } });
  return matched.length;
}
