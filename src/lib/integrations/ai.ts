import { env, hasAiKey } from "@/lib/core/env";

export function aiAvailable() {
  return hasAiKey();
}

/** Génération de texte via Claude (préféré) ou OpenAI, sinon réponse démo. */
export async function aiGenerate(opts: { system?: string; prompt: string; maxTokens?: number }): Promise<string> {
  const { system, prompt, maxTokens = 1024 } = opts;

  if (env.anthropicApiKey) {
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": env.anthropicApiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: env.anthropicModel,
          max_tokens: maxTokens,
          system,
          messages: [{ role: "user", content: prompt }],
        }),
        signal: AbortSignal.timeout(30_000),
      });
      const json = await res.json();
      const text = json?.content?.[0]?.text;
      if (text) return text;
    } catch {
      /* fallback démo */
    }
  }

  if (env.openaiApiKey) {
    try {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${env.openaiApiKey}` },
        body: JSON.stringify({
          model: "gpt-4o",
          max_tokens: maxTokens,
          messages: [
            ...(system ? [{ role: "system", content: system }] : []),
            { role: "user", content: prompt },
          ],
        }),
        signal: AbortSignal.timeout(30_000),
      });
      const json = await res.json();
      const text = json?.choices?.[0]?.message?.content;
      if (text) return text;
    } catch {
      /* fallback démo */
    }
  }

  return demoResponse(prompt);
}

function demoResponse(prompt: string) {
  return [
    "« (Mode démo IA — configurez ANTHROPIC_API_KEY ou OPENAI_API_KEY pour des résultats réels.) »",
    "",
    "Voici une proposition générée à partir de votre demande :",
    `> ${prompt.slice(0, 160)}${prompt.length > 160 ? "…" : ""}`,
    "",
    "Bonjour {{first_name}},",
    "",
    "J'ai remarqué que {{company}} pourrait gagner du temps sur sa prospection. Notre plateforme réunit délivrabilité, automatisation et inbox unifiée en un seul outil.",
    "",
    "Seriez-vous ouvert à un échange de 15 minutes cette semaine ?",
    "",
    "Bien à vous,",
  ].join("\n");
}

/** Génère des propositions d'objets d'e-mail. */
export async function aiSubjectLines(topic: string): Promise<string[]> {
  const text = await aiGenerate({
    system: "Tu es un copywriter expert en e-mail. Réponds uniquement par 5 objets d'e-mail courts, un par ligne, sans numérotation.",
    prompt: `Génère 5 objets d'e-mail accrocheurs (FR) pour : ${topic}`,
    maxTokens: 256,
  });
  const lines = text.split("\n").map((l) => l.replace(/^[\d.\-*)\s]+/, "").trim()).filter(Boolean);
  return lines.length >= 3
    ? lines.slice(0, 5)
    : [
        `${topic} : la solution que vous attendiez`,
        `Une idée rapide pour ${topic}`,
        `${topic} — 15 minutes cette semaine ?`,
        `Comment {{company}} peut accélérer sur ${topic}`,
        `À propos de ${topic}`,
      ];
}

/** Rédige un brouillon de réponse pour l'agent de l'inbox. */
export async function aiReplyDraft(threadSubject: string, lastMessage: string, guidance?: string): Promise<string> {
  return aiGenerate({
    system:
      "Tu es un assistant commercial qui répond aux prospects en français, ton professionnel et chaleureux, réponses courtes. Propose un créneau si pertinent." +
      (guidance ? ` Consignes : ${guidance}` : ""),
    prompt: `Sujet : ${threadSubject}\nMessage du prospect : "${lastMessage}"\n\nRédige une réponse adaptée.`,
    maxTokens: 400,
  });
}
