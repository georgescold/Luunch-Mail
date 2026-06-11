import { db } from "./db";
import { env } from "./env";
import { encryptSecret, decryptSecret, signPayload, safeEqual } from "./crypto";
import { ingestReply } from "./inbox-ingest";

const SCOPES = [
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/userinfo.email",
];

type OAuthData = {
  refreshTokenEnc: string;
  accessToken?: string;
  expiresAt?: number;
  email: string;
  processedIds?: string[];
};

// ── State signé (anti-CSRF sur le flux OAuth) ──────────────────────────────
export function makeState(workspaceId: string): string {
  const payload = Buffer.from(JSON.stringify({ w: workspaceId, e: Date.now() + 600_000 })).toString("base64url");
  const sig = signPayload(payload, env.appSecret).slice(0, 32);
  return `${payload}.${sig}`;
}

export function verifyState(state: string): string | null {
  const [payload, sig] = state.split(".");
  if (!payload || !sig) return null;
  if (!safeEqual(sig, signPayload(payload, env.appSecret).slice(0, 32))) return null;
  try {
    const { w, e } = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (Date.now() > e) return null;
    return w as string;
  } catch {
    return null;
  }
}

/** URL de consentement Google (access_type=offline + prompt=consent → refresh token garanti). */
export function buildAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: env.google.clientId,
    redirect_uri: env.google.redirectUri,
    response_type: "code",
    scope: SCOPES.join(" "),
    access_type: "offline",
    prompt: "consent",
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

/** Échange le code d'autorisation contre des jetons. */
export async function exchangeCode(code: string) {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: env.google.clientId,
      client_secret: env.google.clientSecret,
      redirect_uri: env.google.redirectUri,
      grant_type: "authorization_code",
    }),
  });
  if (!res.ok) throw new Error(`Échange OAuth échoué: ${await res.text()}`);
  return res.json() as Promise<{ access_token: string; refresh_token?: string; expires_in: number }>;
}

async function fetchUserEmail(accessToken: string): Promise<string> {
  const res = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { authorization: `Bearer ${accessToken}` },
  });
  const json = await res.json();
  return String(json.email ?? "").toLowerCase();
}

/** Finalise la connexion : crée/met à jour la boîte Gmail avec ses jetons. */
export async function connectGmailMailbox(workspaceId: string, code: string) {
  const tokens = await exchangeCode(code);
  if (!tokens.refresh_token) {
    throw new Error("Aucun refresh token renvoyé par Google (réautorisez en révoquant l'accès précédent).");
  }
  const email = await fetchUserEmail(tokens.access_token);
  if (!email) throw new Error("Impossible de récupérer l'adresse Google.");

  const oauthData: OAuthData = {
    refreshTokenEnc: encryptSecret(tokens.refresh_token),
    accessToken: tokens.access_token,
    expiresAt: Date.now() + tokens.expires_in * 1000,
    email,
    processedIds: [],
  };

  const emailDomain = email.split("@")[1];
  const matchedDomain = emailDomain
    ? await db.domain.findFirst({ where: { workspaceId, name: emailDomain } })
    : null;

  await db.mailbox.upsert({
    where: { workspaceId_email: { workspaceId, email } },
    create: {
      workspaceId, email, displayName: email.split("@")[0], provider: "gmail",
      domainId: matchedDomain?.id ?? null, status: "warming", warmupEnabled: true,
      oauthData: JSON.stringify(oauthData),
    },
    update: { provider: "gmail", status: "warming", oauthData: JSON.stringify(oauthData) },
  });
  return email;
}

/** Renvoie un access token valide (rafraîchit si expiré) et le persiste. */
async function getAccessToken(mailboxId: string): Promise<string> {
  const mb = await db.mailbox.findUnique({ where: { id: mailboxId } });
  if (!mb?.oauthData) throw new Error("Boîte Gmail non connectée.");
  const data = JSON.parse(mb.oauthData) as OAuthData;

  if (data.accessToken && data.expiresAt && data.expiresAt > Date.now() + 60_000) {
    return data.accessToken;
  }

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env.google.clientId,
      client_secret: env.google.clientSecret,
      refresh_token: decryptSecret(data.refreshTokenEnc),
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) throw new Error(`Rafraîchissement du token échoué: ${await res.text()}`);
  const json = (await res.json()) as { access_token: string; expires_in: number };

  data.accessToken = json.access_token;
  data.expiresAt = Date.now() + json.expires_in * 1000;
  await db.mailbox.update({ where: { id: mailboxId }, data: { oauthData: JSON.stringify(data) } });
  return json.access_token;
}

// ── Construction du message MIME ───────────────────────────────────────────
function encodeHeader(value: string): string {
  return /[^\x00-\x7F]/.test(value)
    ? `=?UTF-8?B?${Buffer.from(value, "utf8").toString("base64")}?=`
    : value;
}

function buildMime(input: {
  from: string; fromName?: string; to: string; subject: string;
  html?: string; text?: string; headers?: Record<string, string>;
}): string {
  const fromHeader = input.fromName ? `${encodeHeader(input.fromName)} <${input.from}>` : input.from;
  const content = input.html ?? input.text ?? "";
  const b64 = Buffer.from(content, "utf8").toString("base64").replace(/(.{76})/g, "$1\r\n");
  return [
    `From: ${fromHeader}`,
    `To: ${input.to}`,
    `Subject: ${encodeHeader(input.subject)}`,
    "MIME-Version: 1.0",
    ...Object.entries(input.headers ?? {}).map(([k, v]) => `${k}: ${v}`),
    `Content-Type: ${input.html ? "text/html" : "text/plain"}; charset=UTF-8`,
    "Content-Transfer-Encoding: base64",
    "",
    b64,
  ].join("\r\n");
}

/** Envoie un e-mail via l'API Gmail de la boîte connectée. */
export async function sendViaGmail(
  mailboxId: string,
  input: { from: string; fromName?: string; to: string; subject: string; html?: string; text?: string; headers?: Record<string, string> },
): Promise<string> {
  const token = await getAccessToken(mailboxId);
  const raw = Buffer.from(buildMime(input), "utf8").toString("base64url");
  const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({ raw }),
  });
  if (!res.ok) throw new Error(`Envoi Gmail échoué: ${await res.text()}`);
  const json = (await res.json()) as { id: string };
  return json.id;
}

// ── Relève des réponses via l'API Gmail ─────────────────────────────────────
function findBody(payload: any): string {
  if (!payload) return "";
  const decode = (d?: string) => (d ? Buffer.from(d, "base64url").toString("utf8") : "");
  if (payload.body?.data && (payload.mimeType === "text/plain" || payload.mimeType === "text/html")) {
    return decode(payload.body.data);
  }
  if (Array.isArray(payload.parts)) {
    // Priorité au texte brut, sinon HTML, sinon récursif.
    const plain = payload.parts.find((p: any) => p.mimeType === "text/plain");
    if (plain?.body?.data) return decode(plain.body.data);
    const html = payload.parts.find((p: any) => p.mimeType === "text/html");
    if (html?.body?.data) return decode(html.body.data);
    for (const p of payload.parts) {
      const nested = findBody(p);
      if (nested) return nested;
    }
  }
  return "";
}

export async function pollGmailMailbox(mailboxId: string): Promise<number> {
  const mb = await db.mailbox.findUnique({ where: { id: mailboxId } });
  if (!mb?.oauthData) return 0;
  const data = JSON.parse(mb.oauthData) as OAuthData;
  const processed = new Set(data.processedIds ?? []);
  const token = await getAccessToken(mailboxId);

  const listRes = await fetch(
    "https://gmail.googleapis.com/gmail/v1/users/me/messages?" +
      new URLSearchParams({ q: "in:inbox newer_than:7d -from:me", maxResults: "25" }),
    { headers: { authorization: `Bearer ${token}` } },
  );
  if (!listRes.ok) throw new Error(`Liste Gmail échouée: ${await listRes.text()}`);
  const list = (await listRes.json()) as { messages?: { id: string }[] };
  if (!list.messages?.length) return 0;

  let count = 0;
  const newlyProcessed: string[] = [];
  for (const { id } of list.messages) {
    if (processed.has(id)) continue;
    newlyProcessed.push(id);

    const msgRes = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=full`, {
      headers: { authorization: `Bearer ${token}` },
    });
    if (!msgRes.ok) continue;
    const msg = (await msgRes.json()) as any;
    const headers: { name: string; value: string }[] = msg.payload?.headers ?? [];
    const getH = (n: string) => headers.find((h) => h.name.toLowerCase() === n)?.value ?? "";
    const fromRaw = getH("from");
    const fromEmail = (fromRaw.match(/<([^>]+)>/)?.[1] ?? fromRaw).toLowerCase().trim();
    if (!fromEmail || fromEmail === mb.email.toLowerCase()) continue; // ignore nos propres envois
    const subject = getH("subject") || "(sans objet)";
    const body = findBody(msg.payload) || msg.snippet || "";

    await ingestReply({ workspaceId: mb.workspaceId, mailboxId: mb.id, mailboxEmail: mb.email, fromEmail, subject, body });
    count++;
  }

  // Mémorise les IDs traités (capés à 400) pour éviter les doublons sans toucher à la boîte.
  data.processedIds = [...newlyProcessed, ...(data.processedIds ?? [])].slice(0, 400);
  await db.mailbox.update({ where: { id: mailboxId }, data: { oauthData: JSON.stringify(data) } });
  return count;
}

/** Vrai si la boîte est une boîte Gmail réellement connectée en OAuth. */
export function isGmailConnected(provider: string, oauthData: string | null): boolean {
  if (provider !== "gmail" || !oauthData) return false;
  try {
    return Boolean((JSON.parse(oauthData) as OAuthData).refreshTokenEnc);
  } catch {
    return false;
  }
}
