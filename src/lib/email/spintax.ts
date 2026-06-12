/** Personnalisation : variables {{ }} + spintax {a|b|c} (anti-spam). */

export type RenderContext = Record<string, string | number | null | undefined>;

/** Résout le spintax : {Bonjour|Salut|Hello} → une variante aléatoire (récursif). */
export function renderSpintax(input: string): string {
  const re = /\{([^{}]*)\}/;
  let text = input;
  let guard = 0;
  while (re.test(text) && guard++ < 100) {
    text = text.replace(re, (_m, group: string) => {
      const options = group.split("|");
      return options[Math.floor(Math.random() * options.length)] ?? "";
    });
  }
  return text;
}

/** Remplace les variables {{ first_name }} / {{{FIRST_NAME}}} avec fallback
 *  {{ first_name | "ami" }}. Insensible à la casse et aux espaces. */
export function renderVariables(input: string, ctx: RenderContext): string {
  return input.replace(/\{\{\{?\s*([\w.]+)\s*(?:\|\s*"?([^"}]*)"?\s*)?\}?\}\}/g, (_m, key: string, fallback?: string) => {
    const normalized = key.toLowerCase();
    // accepte first_name, firstName, FIRST_NAME...
    const found = Object.entries(ctx).find(
      ([k]) => k.toLowerCase().replace(/_/g, "") === normalized.replace(/_/g, ""),
    );
    const value = found?.[1];
    if (value === null || value === undefined || value === "") return (fallback ?? "").trim();
    return String(value);
  });
}

/** Rendu complet d'un contenu personnalisé : variables puis spintax. */
export function renderTemplate(input: string, ctx: RenderContext): string {
  return renderSpintax(renderVariables(input, ctx));
}

/** Construit le contexte de variables à partir d'un contact. */
export function contactContext(contact: {
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  company?: string | null;
  attributes?: string | null;
}): RenderContext {
  let attrs: Record<string, unknown> = {};
  try {
    attrs = contact.attributes ? JSON.parse(contact.attributes) : {};
  } catch {
    /* ignore */
  }
  return {
    email: contact.email,
    first_name: contact.firstName ?? "",
    last_name: contact.lastName ?? "",
    company: contact.company ?? "",
    ...(attrs as RenderContext),
  };
}
