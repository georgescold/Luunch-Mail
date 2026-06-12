import { describe, it, expect } from "vitest";
import { parseContactsCsv } from "./csv-import";

describe("parseContactsCsv", () => {
  it("détecte un en-tête français avec accents et mappe les colonnes", () => {
    const r = parseContactsCsv(
      `Email;Prénom;Nom;Société\ncamille@acme.fr;Camille;Durand;Acme\nlucas@start.io;Lucas;;Startup SAS`,
    );
    expect(r.headerDetected).toBe(true);
    expect(r.contacts).toHaveLength(2);
    expect(r.contacts[0]).toMatchObject({
      email: "camille@acme.fr", firstName: "Camille", lastName: "Durand", company: "Acme",
    });
    expect(r.contacts[1].lastName).toBeNull();
  });

  it("détecte un en-tête anglais et transforme les colonnes inconnues en variables", () => {
    const r = parseContactsCsv(
      `first_name,last_name,email,Job Title,Ville\nEmma,Stone,emma@corp.com,CTO,Paris`,
    );
    expect(r.headerDetected).toBe(true);
    expect(r.customFields).toEqual(["job_title", "ville"]);
    expect(r.contacts[0].attributes).toEqual({ job_title: "CTO", ville: "Paris" });
    expect(r.contacts[0].email).toBe("emma@corp.com");
  });

  it("fonctionne sans en-tête, e-mail repéré dans n'importe quelle colonne", () => {
    const r = parseContactsCsv(`Camille, Durand, camille@acme.fr\nLucas, Martin, lucas@start.io`);
    expect(r.headerDetected).toBe(false);
    expect(r.contacts).toHaveLength(2);
    expect(r.contacts[0].email).toBe("camille@acme.fr");
    expect(r.contacts[0].firstName).toBe("Camille");
    expect(r.contacts[0].lastName).toBe("Durand");
  });

  it("respecte les guillemets et les virgules internes", () => {
    const r = parseContactsCsv(`email,nom,societe\njean@x.fr,"Dupont, Jr","ACME, Inc."`);
    expect(r.contacts[0].lastName).toBe("Dupont, Jr");
    expect(r.contacts[0].company).toBe("ACME, Inc.");
  });

  it("déduplique et compte les lignes ignorées", () => {
    const r = parseContactsCsv(`a@b.fr\na@b.fr\npas-un-email\nc@d.fr`);
    expect(r.contacts).toHaveLength(2);
    expect(r.skipped).toBe(2);
  });

  it("normalise les e-mails en minuscules", () => {
    const r = parseContactsCsv(`Email\nCAMILLE@ACME.FR`);
    expect(r.contacts[0].email).toBe("camille@acme.fr");
  });
});
