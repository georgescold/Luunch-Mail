"use server";

import { requireAuth } from "@/lib/core/auth";
import { db } from "@/lib/core/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { enrollContacts, startCampaign } from "@/lib/outreach/outreach";

/** Crée une nouvelle campagne d'outreach (status draft) puis ouvre son détail. */
export async function createCampaignAction(formData: FormData) {
  const { workspace } = await requireAuth();

  const name = String(formData.get("name") ?? "").trim();
  const subject = String(formData.get("subject") ?? "").trim();
  // Les Switch (checkbox) renvoient "on" quand actifs, sinon absents.
  const mailboxRotation = formData.get("mailboxRotation") === "on";
  const espMatching = formData.get("espMatching") === "on";
  const abTesting = formData.get("abTesting") === "on";
  const trackOpens = formData.get("trackOpens") === "on";
  const trackClicks = formData.get("trackClicks") === "on";
  const includeUnsubscribe = formData.get("includeUnsubscribe") === "on";

  if (!name) return;

  const campaign = await db.campaign.create({
    data: {
      workspaceId: workspace.id,
      name,
      type: "outreach",
      status: "draft",
      subject: subject || null,
      mailboxRotation,
      espMatching,
      abTesting,
      trackOpens,
      trackClicks,
      includeUnsubscribe,
      stats: "{}",
    },
  });

  revalidatePath("/outreach");
  redirect(`/outreach/${campaign.id}`);
}

/** Ajoute une étape (email | wait | condition) à la séquence d'une campagne, à la fin de l'ordre. */
export async function addStepAction(formData: FormData) {
  const { workspace } = await requireAuth();

  const campaignId = String(formData.get("campaignId") ?? "");
  const type = String(formData.get("type") ?? "email");

  // Scoper la campagne au workspace courant.
  const campaign = await db.campaign.findFirst({
    where: { id: campaignId, workspaceId: workspace.id, type: "outreach" },
  });
  if (!campaign) return;

  const last = await db.sequenceStep.findFirst({
    where: { campaignId },
    orderBy: { order: "desc" },
  });
  const order = (last?.order ?? -1) + 1;

  const subject = String(formData.get("subject") ?? "").trim();
  const body = String(formData.get("body") ?? "");
  const waitDaysRaw = Number(formData.get("waitDays"));
  const waitDays = Number.isFinite(waitDaysRaw) && waitDaysRaw > 0 ? Math.round(waitDaysRaw) : 3;
  const conditionEvent = String(formData.get("conditionEvent") ?? "replied");

  await db.sequenceStep.create({
    data: {
      campaignId,
      order,
      type,
      subject: type === "email" ? subject || null : null,
      body: type === "email" ? body || null : null,
      waitDays: type === "wait" ? waitDays : null,
      condition:
        type === "condition"
          ? JSON.stringify({ if: conditionEvent, then: "stop" })
          : null,
    },
  });

  revalidatePath(`/outreach/${campaignId}`);
}

/** Lance la campagne (passe en running et amorce le worker de séquences). */
export async function startCampaignActionWrapper(formData: FormData) {
  const { workspace } = await requireAuth();
  const campaignId = String(formData.get("campaignId") ?? "");

  const campaign = await db.campaign.findFirst({
    where: { id: campaignId, workspaceId: workspace.id, type: "outreach" },
    include: { steps: true, enrollments: true },
  });
  if (!campaign) return;
  // On ne lance que s'il y a au moins une étape e-mail et des inscrits.
  if (!campaign.steps.some((s) => s.type === "email") || campaign.enrollments.length === 0) return;

  await startCampaign(campaignId);
  revalidatePath(`/outreach/${campaignId}`);
  revalidatePath("/outreach");
}

/** Met la campagne en pause (les inscriptions actives ne sont plus traitées). */
export async function pauseCampaignAction(formData: FormData) {
  const { workspace } = await requireAuth();
  const campaignId = String(formData.get("campaignId") ?? "");

  const campaign = await db.campaign.findFirst({
    where: { id: campaignId, workspaceId: workspace.id, type: "outreach" },
  });
  if (!campaign) return;

  await db.campaign.update({ where: { id: campaignId }, data: { status: "paused" } });
  revalidatePath(`/outreach/${campaignId}`);
  revalidatePath("/outreach");
}

/** Inscrit tous les contacts d'une liste dans la campagne puis la démarre. */
export async function enrollFromListAction(formData: FormData) {
  const { workspace } = await requireAuth();
  const campaignId = String(formData.get("campaignId") ?? "");
  const listId = String(formData.get("listId") ?? "");

  const campaign = await db.campaign.findFirst({
    where: { id: campaignId, workspaceId: workspace.id, type: "outreach" },
    include: { steps: true },
  });
  if (!campaign || !listId) return;

  // Récupère les contactIds de la liste, scopés au workspace courant.
  const memberships = await db.contactListMembership.findMany({
    where: {
      list: { id: listId, workspaceId: workspace.id },
      contact: { workspaceId: workspace.id, status: "subscribed" },
    },
    select: { contactId: true },
  });
  const contactIds = memberships.map((m) => m.contactId);
  if (contactIds.length === 0) {
    revalidatePath(`/outreach/${campaignId}`);
    return;
  }

  await enrollContacts(campaignId, contactIds);

  // Démarre la campagne si elle a au moins une étape e-mail et n'est pas déjà lancée.
  if (campaign.steps.some((s) => s.type === "email") && campaign.status !== "running") {
    await startCampaign(campaignId);
  }

  revalidatePath(`/outreach/${campaignId}`);
  revalidatePath("/outreach");
}
