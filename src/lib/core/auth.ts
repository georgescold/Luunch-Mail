import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/core/db";
import { randomToken } from "@/lib/core/crypto";

const COOKIE = "gm_session";
const SESSION_DAYS = 30;

export type AuthContext = {
  user: { id: string; email: string; name: string | null };
  workspace: { id: string; name: string; slug: string; orgId: string; region: string };
  role: string;
};

/** Crée une session et pose le cookie. */
export async function createSession(userId: string, workspaceId: string | null) {
  const token = randomToken();
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86400_000);
  await db.session.create({ data: { token, userId, workspaceId, expiresAt } });
  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
  return token;
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) await db.session.deleteMany({ where: { token } });
  jar.delete(COOKIE);
}

/** Récupère le contexte courant (utilisateur + workspace actif) ou null. */
export async function getAuthContext(): Promise<AuthContext | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;

  const session = await db.session.findUnique({
    where: { token },
    include: { user: { include: { memberships: { include: { workspace: true } } } } },
  });
  if (!session || session.expiresAt < new Date()) return null;
  const memberships = session.user.memberships;
  if (memberships.length === 0) return null;

  // workspace actif = celui de la session, sinon le premier
  const active =
    memberships.find((m) => m.workspaceId === session.workspaceId) ?? memberships[0];

  return {
    user: { id: session.user.id, email: session.user.email, name: session.user.name },
    workspace: {
      id: active.workspace.id,
      name: active.workspace.name,
      slug: active.workspace.slug,
      orgId: active.workspace.orgId,
      region: active.workspace.region,
    },
    role: active.role,
  };
}

/** À utiliser dans les pages protégées : redirige vers /login si non connecté. */
export async function requireAuth(): Promise<AuthContext> {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");
  return ctx;
}

/** Change le workspace actif de la session. */
export async function switchWorkspace(workspaceId: string) {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return;
  await db.session.updateMany({ where: { token }, data: { workspaceId } });
}
