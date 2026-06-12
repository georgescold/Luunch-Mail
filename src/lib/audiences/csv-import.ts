/**
 * Import CSV intelligent de contacts.
 *
 * - Détecte le séparateur (virgule, point-virgule, tabulation).
 * - Détecte la ligne d'en-tête et mappe les colonnes par synonymes FR/EN,
 *   insensible aux accents et à la casse (« Prénom », "first_name", « Société »…).
 * - Les colonnes inconnues deviennent des attributs personnalisés, utilisables
 *   comme variables dans les templates : colonne « Ville » → {{ville}}.
 * - Sans en-tête : repère la colonne e-mail par son contenu, puis prénom /
 *   nom / société en positionnel.
 * - Gère les valeurs entre guillemets ("Dupont, Jr") et déduplique par e-mail.
 */

export type ParsedContact = {
  email: string;
  firstName: string | null;
  lastName: string | null;
  company: string | null;
  attributes: Record<string, string>;
};

export type ParseResult = {
  contacts: ParsedContact[];
  headerDetected: boolean;
  /** Libellés des colonnes telles que comprises (debug / affichage). */
  mapping: string[];
  /** Attributs personnalisés découverts (clés de variables). */
  customFields: string[];
  /** Lignes ignorées (e-mail manquant/invalide ou doublon). */
  skipped: number;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** minuscules + accents retirés + alphanumérique seulement — pour comparer les en-têtes. */
function normalizeHeader(h: string): string {
  return h
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

/** Clé d'attribut personnalisé : « Ville de naissance » → ville_de_naissance. */
function slugifyHeader(h: string): string {
  return h
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

const SYNONYMS: Record<string, string[]> = {
  email: ["email", "emails", "mail", "courriel", "adresseemail", "adresseemail", "emailaddress", "adressemail"],
  firstName: ["prenom", "firstname", "givenname", "first", "prenoms"],
  lastName: ["nom", "lastname", "surname", "familyname", "nomdefamille", "last"],
  company: ["societe", "entreprise", "company", "organisation", "organization", "org", "compagnie", "boite"],
};

function matchKnownColumn(header: string): keyof typeof SYNONYMS | null {
  const n = normalizeHeader(header);
  for (const [key, names] of Object.entries(SYNONYMS)) {
    if (names.includes(n)) return key as keyof typeof SYNONYMS;
  }
  return null;
}

/** Sépare une ligne CSV en respectant les guillemets ("a, b" reste une cellule). */
function splitLine(line: string, sep: string): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'; // guillemet échappé ""
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === sep && !inQuotes) {
      cells.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  cells.push(current.trim());
  return cells;
}

/** Choisit le séparateur le plus fréquent hors guillemets sur la 1re ligne. */
function detectSeparator(line: string): string {
  const counts: Record<string, number> = { ",": 0, ";": 0, "\t": 0 };
  let inQuotes = false;
  for (const ch of line) {
    if (ch === '"') inQuotes = !inQuotes;
    else if (!inQuotes && ch in counts) counts[ch]++;
  }
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][1] > 0
    ? Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0]
    : ",";
}

export function parseContactsCsv(raw: string): ParseResult {
  const lines = raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) {
    return { contacts: [], headerDetected: false, mapping: [], customFields: [], skipped: 0 };
  }

  const sep = detectSeparator(lines[0]);
  const firstCells = splitLine(lines[0], sep);

  // En-tête = aucune cellule e-mail valide ET au moins une colonne reconnue.
  const headerDetected =
    !firstCells.some((c) => EMAIL_RE.test(c)) && firstCells.some((c) => matchKnownColumn(c) !== null);

  // colonne index → rôle ("email" | "firstName" | "lastName" | "company" | "attr:<clé>" | null)
  let roles: (string | null)[];
  const dataLines = headerDetected ? lines.slice(1) : lines;

  if (headerDetected) {
    const used = new Set<string>();
    roles = firstCells.map((h) => {
      const known = matchKnownColumn(h);
      if (known && !used.has(known)) {
        used.add(known);
        return known;
      }
      const slug = slugifyHeader(h);
      return slug ? `attr:${slug}` : null;
    });
  } else {
    // Sans en-tête : trouve la colonne e-mail par le contenu, le reste en positionnel.
    const sample = dataLines.slice(0, 20).map((l) => splitLine(l, sep));
    const width = Math.max(...sample.map((r) => r.length), 1);
    let emailCol = 0;
    let best = -1;
    for (let col = 0; col < width; col++) {
      const hits = sample.filter((r) => EMAIL_RE.test(r[col] ?? "")).length;
      if (hits > best) {
        best = hits;
        emailCol = col;
      }
    }
    const positional = ["firstName", "lastName", "company"];
    let p = 0;
    roles = Array.from({ length: width }, (_, col) =>
      col === emailCol ? "email" : positional[p++] ?? null,
    );
  }

  const mapping = roles.map((r) =>
    r === null ? "(ignorée)" : r.startsWith("attr:") ? `{{${r.slice(5)}}}` : r,
  );
  const customFields = roles.filter((r) => r?.startsWith("attr:")).map((r) => r!.slice(5));

  const contacts: ParsedContact[] = [];
  const seen = new Set<string>();
  let skipped = 0;

  for (const line of dataLines) {
    const cells = splitLine(line, sep);
    const contact: ParsedContact = { email: "", firstName: null, lastName: null, company: null, attributes: {} };

    roles.forEach((role, i) => {
      const value = (cells[i] ?? "").trim();
      if (!role || !value) return;
      if (role === "email") contact.email = value.toLowerCase();
      else if (role === "firstName") contact.firstName = value;
      else if (role === "lastName") contact.lastName = value;
      else if (role === "company") contact.company = value;
      else if (role.startsWith("attr:")) contact.attributes[role.slice(5)] = value;
    });

    // Filet de sécurité : e-mail présent ailleurs que dans sa colonne attendue.
    if (!EMAIL_RE.test(contact.email)) {
      const anywhere = cells.find((c) => EMAIL_RE.test(c));
      if (anywhere) contact.email = anywhere.toLowerCase();
    }

    if (!EMAIL_RE.test(contact.email) || seen.has(contact.email)) {
      skipped++;
      continue;
    }
    seen.add(contact.email);
    contacts.push(contact);
  }

  return { contacts, headerDetected, mapping, customFields, skipped };
}
