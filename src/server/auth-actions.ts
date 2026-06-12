"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/core/db";
import { hashPassword, verifyPassword } from "@/lib/core/crypto";
import { createSession, destroySession } from "@/lib/core/auth";

function slugify(input: string) {
  const base = input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `${base || "ws"}-${Math.random().toString(36).slice(2, 7)}`;
}

export type AuthState = { error?: string };

export async function registerAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").toLowerCase().trim();
  const password = String(formData.get("password") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const company = String(formData.get("company") ?? "").trim() || "Mon entreprise";

  if (!email || !password) return { error: "E-mail et mot de passe requis." };
  if (password.length < 8) return { error: "Le mot de passe doit faire au moins 8 caractères." };

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) return { error: "Un compte existe déjà avec cet e-mail." };

  const user = await db.user.create({ data: { email, name, passwordHash: await hashPassword(password) } });
  const org = await db.organization.create({ data: { name: company, slug: slugify(company) } });
  const workspace = await db.workspace.create({ data: { name: company, slug: slugify(company), orgId: org.id, region: "eu" } });
  await db.membership.create({ data: { userId: user.id, workspaceId: workspace.id, role: "owner" } });

  // Compteurs de quotas par défaut.
  const period = new Date().toISOString().slice(0, 7);
  await db.usageCounter.createMany({
    data: [
      { workspaceId: workspace.id, period, metric: "emails_sent", used: 0, quota: 150_000 },
      { workspaceId: workspace.id, period, metric: "contacts", used: 0, quota: 100_000 },
      { workspaceId: workspace.id, period, metric: "ai_credits", used: 0, quota: 500 },
      { workspaceId: workspace.id, period, metric: "verifications", used: 0, quota: 10_000 },
    ],
  });

  await createSession(user.id, workspace.id);
  redirect("/dashboard");
}

export async function loginAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").toLowerCase().trim();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: "E-mail et mot de passe requis." };

  const user = await db.user.findUnique({ where: { email }, include: { memberships: true } });
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return { error: "Identifiants incorrects." };
  }
  await createSession(user.id, user.memberships[0]?.workspaceId ?? null);
  redirect("/dashboard");
}

export async function logoutAction() {
  await destroySession();
  redirect("/login");
}
