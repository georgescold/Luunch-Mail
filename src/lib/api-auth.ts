import { db } from "./db";
import { hashApiKey } from "./crypto";
import { parseJson } from "./fmt";

export type ApiAuthResult =
  | { ok: true; workspaceId: string; scopes: string[]; keyId: string }
  | { ok: false; status: number; error: string };

/** Authentifie une requête API via `Authorization: Bearer gm_live_…`. */
export async function authenticateApiKey(req: Request, requiredScope?: string): Promise<ApiAuthResult> {
  const header = req.headers.get("authorization") ?? "";
  const token = header.replace(/^Bearer\s+/i, "").trim();
  if (!token) return { ok: false, status: 401, error: "Clé API manquante (Authorization: Bearer …)." };

  const hash = hashApiKey(token);
  const key = await db.apiKey.findFirst({ where: { hash, revokedAt: null } });
  if (!key) return { ok: false, status: 401, error: "Clé API invalide ou révoquée." };

  const scopes = parseJson<string[]>(key.scopes, []);
  if (requiredScope && !scopes.includes(requiredScope)) {
    return { ok: false, status: 403, error: `Permission manquante : ${requiredScope}.` };
  }

  await db.apiKey.update({ where: { id: key.id }, data: { lastUsedAt: new Date() } });
  return { ok: true, workspaceId: key.workspaceId, scopes, keyId: key.id };
}
