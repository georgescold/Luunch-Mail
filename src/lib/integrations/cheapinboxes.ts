import { db } from "@/lib/core/db";
import { encryptSecret, decryptSecret } from "@/lib/core/crypto";
import { serializeMailboxCreds } from "@/lib/email/mailbox-creds";
import { parseJson } from "@/lib/core/fmt";

const API_BASE = process.env.CHEAPINBOXES_API_URL || "https://api.cheapinboxes.com";

type CiMailbox = {
  id: string;
  full_email: string;
  first_name?: string | null;
  last_name?: string | null;
  status: string; // active | provisioning | ...
  source_provider?: string; // google | microsoft
  daily_limit?: number;
};

type CiCredentials = {
  email?: string;
  password?: string;
  app_password?: string;
  imap_host?: string;
  imap_port?: number;
  smtp_host?: string;
  smtp_port?: number;
};

async function ci<T>(apiKey: string, path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { authorization: `Bearer ${apiKey}`, accept: "application/json" },
    signal: AbortSignal.timeout(20_000),
  });
  if (res.status === 401 || res.status === 403) throw new Error("Clé API Cheap Inboxes invalide ou non autorisée.");
  if (!res.ok) throw new Error(`Cheap Inboxes API ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return res.json() as Promise<T>;
}

/** Liste TOUTES les boîtes (pagination). */
async function listAllMailboxes(apiKey: string): Promise<CiMailbox[]> {
  const all: CiMailbox[] = [];
  let offset = 0;
  const limit = 100;
  for (let i = 0; i < 100; i++) {
    const page = await ci<{ mailboxes: CiMailbox[]; pagination?: { total: number } }>(
      apiKey,
      `/v1/mailboxes?limit=${limit}&offset=${offset}`,
    );
    all.push(...(page.mailboxes ?? []));
    const total = page.pagination?.total ?? all.length;
    offset += limit;
    if (offset >= total || (page.mailboxes ?? []).length === 0) break;
  }
  return all;
}

/** Vérifie la validité de la clé (et renvoie le nombre de boîtes). */
export async function validateKey(apiKey: string): Promise<number> {
  const page = await ci<{ pagination?: { total: number }; mailboxes: CiMailbox[] }>(apiKey, "/v1/mailboxes?limit=1&offset=0");
  return page.pagination?.total ?? page.mailboxes?.length ?? 0;
}

/** Importe / met à jour les boîtes actives de Cheap Inboxes dans le workspace. */
export async function importMailboxes(workspaceId: string, apiKey: string) {
  const boxes = await listAllMailboxes(apiKey);
  let imported = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const b of boxes) {
    if (b.status !== "active") {
      skipped++; // les identifiants ne sont dispo qu'une fois la boîte active
      continue;
    }
    try {
      const { credentials } = await ci<{ credentials: CiCredentials }>(apiKey, `/v1/mailboxes/${b.id}/credentials`);
      const c = credentials ?? {};
      const password = (c.app_password || c.password || "").replace(/\s+/g, "");
      const smtpHost = c.smtp_host || "smtp.gmail.com";
      if (!password) { skipped++; continue; }

      const smtpPort = c.smtp_port || 587;
      const smtpConfig = serializeMailboxCreds({
        user: c.email || b.full_email,
        password,
        smtpHost,
        smtpPort,
        smtpSecure: smtpPort === 465, // 587 = STARTTLS (secure:false), 465 = SSL
        imapHost: c.imap_host || "imap.gmail.com",
        imapPort: c.imap_port || 993,
        imapSecure: true,
      });

      const emailDomain = b.full_email.split("@")[1] ?? "";
      const matchedDomain = emailDomain
        ? await db.domain.findFirst({ where: { workspaceId, name: emailDomain } })
        : null;
      const displayName = [b.first_name, b.last_name].filter(Boolean).join(" ") || null;

      await db.mailbox.upsert({
        where: { workspaceId_email: { workspaceId, email: b.full_email.toLowerCase() } },
        create: {
          workspaceId,
          email: b.full_email.toLowerCase(),
          displayName,
          provider: "gmail", // boîtes Google ; envoi/réception via SMTP/IMAP (app password)
          domainId: matchedDomain?.id ?? null,
          status: "warming",
          warmupEnabled: true,
          dailyLimit: b.daily_limit ?? 45,
          smtpConfig,
        },
        update: { smtpConfig, dailyLimit: b.daily_limit ?? 45, ...(displayName ? { displayName } : {}) },
      });
      imported++;
    } catch (err) {
      errors.push(`${b.full_email} : ${err instanceof Error ? err.message : "erreur"}`);
    }
  }

  return { imported, skipped, errors, total: boxes.length };
}

// ── Stockage de la clé API (chiffrée) dans Workspace.integrations ───────────
type Integrations = { cheapinboxes?: { keyEnc: string; lastSyncAt?: string } };

export function getStoredKey(integrationsJson: string): string | null {
  const data = parseJson<Integrations>(integrationsJson, {});
  return data.cheapinboxes?.keyEnc ? decryptSecret(data.cheapinboxes.keyEnc) : null;
}

export async function storeKey(workspaceId: string, apiKey: string) {
  const ws = await db.workspace.findUnique({ where: { id: workspaceId } });
  const data = parseJson<Integrations>(ws?.integrations ?? "{}", {});
  data.cheapinboxes = { keyEnc: encryptSecret(apiKey), lastSyncAt: new Date().toISOString() };
  await db.workspace.update({ where: { id: workspaceId }, data: { integrations: JSON.stringify(data) } });
}

export function hasCheapInboxes(integrationsJson: string): boolean {
  return Boolean(parseJson<Integrations>(integrationsJson, {}).cheapinboxes?.keyEnc);
}

/** Synchronise tous les workspaces ayant connecté Cheap Inboxes (job périodique). */
export async function syncAllCheapInboxes() {
  const workspaces = await db.workspace.findMany();
  let synced = 0;
  for (const ws of workspaces) {
    const key = getStoredKey(ws.integrations);
    if (!key) continue;
    try {
      await importMailboxes(ws.id, key);
      await storeKey(ws.id, key); // met à jour lastSyncAt
      synced++;
    } catch (err) {
      console.error(`[cheapinboxes] sync ${ws.slug}:`, err instanceof Error ? err.message : err);
    }
  }
  return { synced };
}
