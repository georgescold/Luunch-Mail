/** Helpers de formatage (FR par défaut). */

const nf = new Intl.NumberFormat("fr-FR");

export function num(n: number | null | undefined) {
  return nf.format(n ?? 0);
}

export function pct(n: number | null | undefined, digits = 1) {
  return `${(n ?? 0).toFixed(digits)} %`;
}

export function ratio(part: number, total: number, digits = 1) {
  if (!total) return "0 %";
  return `${((part / total) * 100).toFixed(digits)} %`;
}

export function money(n: number | null | undefined, currency = "EUR") {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency }).format(n ?? 0);
}

export function date(d: Date | string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function dateTime(d: Date | string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function relativeTime(d: Date | string | null | undefined) {
  if (!d) return "—";
  const date = new Date(d);
  const diff = Date.now() - date.getTime();
  const min = Math.round(diff / 60000);
  if (min < 1) return "à l'instant";
  if (min < 60) return `il y a ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `il y a ${h} h`;
  const j = Math.round(h / 24);
  if (j < 30) return `il y a ${j} j`;
  return date.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
}

/** Parse un champ JSON stocké en String (schéma SQLite). */
export function parseJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export function initials(name?: string | null, email?: string | null) {
  const base = name?.trim() || email?.split("@")[0] || "?";
  const parts = base.split(/[ ._-]+/).filter(Boolean);
  return (parts[0]?.[0] ?? "?").toUpperCase() + (parts[1]?.[0]?.toUpperCase() ?? "");
}
