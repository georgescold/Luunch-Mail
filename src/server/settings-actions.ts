"use server";

import { requireAuth } from "@/lib/core/auth";
import { db } from "@/lib/core/db";
import { revalidatePath } from "next/cache";

/** Régions disponibles pour l'hébergement / l'envoi. */
const REGIONS = new Set(["eu", "us", "sa", "asia"]);
const ROLES = new Set(["owner", "admin", "member"]);

/**
 * Met à jour les informations du workspace (nom + région).
 * Le slug n'est pas modifiable (identifiant stable).
 */
export async function updateWorkspaceAction(formData: FormData) {
  const { workspace } = await requireAuth();

  const name = String(formData.get("name") ?? "").trim();
  const region = String(formData.get("region") ?? "eu").trim();

  await db.workspace.update({
    where: { id: workspace.id },
    data: {
      ...(name ? { name } : {}),
      region: REGIONS.has(region) ? region : "eu",
    },
  });

  revalidatePath("/settings");
}

/**
 * Met à jour le branding white-label de l'organisation (agence) :
 * domaine personnalisé, couleur de marque, logo.
 */
export async function updateWhiteLabelAction(formData: FormData) {
  const { workspace } = await requireAuth();

  const rawDomain = String(formData.get("whiteLabelDomain") ?? "").trim().toLowerCase();
  const brandColor = String(formData.get("brandColor") ?? "").trim();
  const logoUrl = String(formData.get("logoUrl") ?? "").trim();

  // Nettoie un éventuel protocole / chemin collé par l'utilisateur.
  const whiteLabelDomain = rawDomain
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "");

  await db.organization.update({
    where: { id: workspace.orgId },
    data: {
      whiteLabelDomain: whiteLabelDomain || null,
      brandColor: brandColor || null,
      logoUrl: logoUrl || null,
    },
  });

  revalidatePath("/settings");
}

/**
 * Invite un membre dans le workspace.
 * En démo : crée un utilisateur placeholder (sans mot de passe réel utilisable)
 * + une adhésion (Membership) avec le rôle choisi. Sièges illimités.
 */
export async function inviteMemberAction(formData: FormData) {
  const { workspace } = await requireAuth();

  const email = String(formData.get("email") ?? "").toLowerCase().trim();
  const role = String(formData.get("role") ?? "member").trim();
  const safeRole = ROLES.has(role) ? role : "member";

  if (!email || !email.includes("@")) {
    revalidatePath("/settings");
    return;
  }

  // Récupère l'utilisateur existant ou crée un placeholder (invitation en attente).
  let user = await db.user.findUnique({ where: { email } });
  if (!user) {
    user = await db.user.create({
      data: {
        email,
        name: email.split("@")[0],
        // Placeholder : pas un hash utilisable, l'invité définira son mot de passe à l'activation.
        passwordHash: "invited",
      },
    });
  }

  // Adhésion idempotente (contrainte unique userId+workspaceId).
  const existing = await db.membership.findUnique({
    where: { userId_workspaceId: { userId: user.id, workspaceId: workspace.id } },
  });
  if (!existing) {
    await db.membership.create({
      data: { userId: user.id, workspaceId: workspace.id, role: safeRole },
    });
  }

  revalidatePath("/settings");
}

/**
 * Droit à l'effacement (RGPD) — placeholder de démo.
 * Une vraie implémentation programmerait un export/purge asynchrone.
 */
export async function requestDataExportAction() {
  await requireAuth();
  revalidatePath("/settings");
}

export async function requestDataDeletionAction() {
  await requireAuth();
  revalidatePath("/settings");
}
