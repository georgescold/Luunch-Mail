"use server";

import { requireAuth } from "@/lib/core/auth";
import { db } from "@/lib/core/db";
import { revalidatePath } from "next/cache";
import { aiGenerate, aiSubjectLines } from "@/lib/integrations/ai";

/** Crée un nouveau template (drag / react_email / html). */
export async function createTemplateAction(formData: FormData) {
  const { workspace } = await requireAuth();

  const name = String(formData.get("name") ?? "").trim();
  const kindRaw = String(formData.get("kind") ?? "drag").trim();
  const category = String(formData.get("category") ?? "").trim();

  if (!name) return;

  const kind = ["drag", "react_email", "html"].includes(kindRaw) ? kindRaw : "drag";

  // Squelette par défaut selon le type, pour que l'éditeur ait toujours du contenu.
  const defaultDesign = JSON.stringify([
    { id: cryptoId(), type: "heading", text: "Bonjour {{first_name|\"ami\"}} 👋" },
    { id: cryptoId(), type: "text", text: "Merci de faire partie de la communauté. Voici les nouveautés du moment." },
    { id: cryptoId(), type: "button", text: "Découvrir" },
    { id: cryptoId(), type: "unsubscribe", text: "Se désinscrire" },
  ]);

  const defaultReact = `import { Html, Head, Preview, Body, Container, Heading, Text, Button } from "@react-email/components";

export default function Welcome({ firstName = "ami" }: { firstName?: string }) {
  return (
    <Html>
      <Head />
      <Preview>Bienvenue sur Luunch Mail</Preview>
      <Body style={{ backgroundColor: "#f6f7f9", fontFamily: "sans-serif" }}>
        <Container style={{ padding: "24px" }}>
          <Heading>Bonjour {firstName} 👋</Heading>
          <Text>Merci de nous rejoindre. On a hâte de vous accompagner.</Text>
          <Button href="https://exemple.fr" style={{ background: "#22C55E", color: "#fff", padding: "12px 20px", borderRadius: "8px" }}>
            Commencer
          </Button>
        </Container>
      </Body>
    </Html>
  );
}`;

  await db.template.create({
    data: {
      workspaceId: workspace.id,
      name,
      kind,
      category: category || null,
      subject: name,
      design: kind === "drag" ? defaultDesign : null,
      reactSource: kind === "react_email" ? defaultReact : null,
      html: kind === "html" ? "<h1>Bonjour {{first_name}}</h1>\n<p>Votre message ici.</p>" : null,
    },
  });

  revalidatePath("/composer");
}

/** Supprime un template du workspace. */
export async function deleteTemplateAction(formData: FormData) {
  const { workspace } = await requireAuth();
  const id = String(formData.get("templateId") ?? "");
  if (!id) return;

  await db.template.deleteMany({ where: { id, workspaceId: workspace.id } });
  revalidatePath("/composer");
}

/** Enregistre le tableau de blocs (JSON) de l'éditeur visuel drag-and-drop. */
export async function updateTemplateDesignAction(templateId: string, designJson: string, subject?: string) {
  const { workspace } = await requireAuth();
  if (!templateId) return;

  // Validation : doit être un JSON tableau parseable.
  try {
    const parsed = JSON.parse(designJson);
    if (!Array.isArray(parsed)) throw new Error("not array");
  } catch {
    return;
  }

  await db.template.updateMany({
    where: { id: templateId, workspaceId: workspace.id },
    data: { design: designJson, ...(subject !== undefined ? { subject } : {}) },
  });

  revalidatePath("/composer");
}

/** Enregistre le code React Email (ou HTML) d'un template. */
export async function updateTemplateCodeAction(templateId: string, code: string, field: "reactSource" | "html" = "reactSource") {
  const { workspace } = await requireAuth();
  if (!templateId) return;

  await db.template.updateMany({
    where: { id: templateId, workspaceId: workspace.id },
    data: field === "html" ? { html: code } : { reactSource: code },
  });

  revalidatePath("/composer");
}

/** Génère des propositions d'objets d'e-mail via l'IA. */
export async function aiSubjectsAction(topic: string): Promise<string[]> {
  await requireAuth();
  const clean = topic.trim();
  if (!clean) return [];
  return aiSubjectLines(clean);
}

/** Génère un corps d'e-mail à partir d'un brief. */
export async function aiBodyAction(brief: string): Promise<string> {
  await requireAuth();
  const clean = brief.trim();
  if (!clean) return "";
  return aiGenerate({
    system:
      "Tu es un copywriter e-mail expert (FR). Rédige un corps d'e-mail clair, chaleureux et orienté action. " +
      "Tu peux utiliser des variables de personnalisation comme {{first_name}} ou {{company}}. " +
      "Réponds uniquement par le corps de l'e-mail, sans objet ni signature superflue.",
    prompt: `Rédige le corps d'un e-mail pour : ${clean}`,
    maxTokens: 600,
  });
}

/** Identifiant court côté serveur (pour les blocs par défaut). */
function cryptoId() {
  return Math.random().toString(36).slice(2, 10);
}
