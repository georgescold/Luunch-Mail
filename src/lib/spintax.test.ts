import { describe, it, expect } from "vitest";
import { renderSpintax, renderVariables, renderTemplate, contactContext } from "./spintax";

describe("renderVariables", () => {
  it("remplace les variables snake_case et insensibles à la casse", () => {
    expect(renderVariables("Bonjour {{first_name}}", { first_name: "Léa" })).toBe("Bonjour Léa");
    expect(renderVariables("Bonjour {{{FIRST_NAME}}}", { first_name: "Léa" })).toBe("Bonjour Léa");
  });
  it("utilise le fallback quand la valeur est absente", () => {
    expect(renderVariables('Salut {{first_name|"ami"}}', { first_name: "" })).toBe("Salut ami");
  });
});

describe("renderSpintax", () => {
  it("résout une option unique de façon déterministe", () => {
    expect(renderSpintax("{Bonjour}")).toBe("Bonjour");
  });
  it("résout le spintax imbriqué", () => {
    const out = renderSpintax("{A|A} {B}");
    expect(out).toBe("A B");
  });
  it("choisit une variante valide", () => {
    const out = renderSpintax("{Bonjour|Salut|Hello}");
    expect(["Bonjour", "Salut", "Hello"]).toContain(out);
  });
});

describe("renderTemplate + contactContext", () => {
  it("combine variables et spintax sur un contact", () => {
    const ctx = contactContext({ email: "lea@acme.com", firstName: "Léa", lastName: null, company: "ACME", attributes: '{"city":"Paris"}' });
    const out = renderTemplate("{Bonjour} {{first_name}} de {{company}} ({{city}})", ctx);
    expect(out).toBe("Bonjour Léa de ACME (Paris)");
  });
});
