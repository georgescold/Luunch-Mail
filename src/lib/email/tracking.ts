import { createHmac, timingSafeEqual } from "node:crypto";
import { db } from "@/lib/core/db";
import { env } from "@/lib/core/env";
import { recordEvent } from "./messaging";

/**
 * Tracking des ouvertures (pixel) et des clics (liens réécrits).
 *
 * Bonnes pratiques appliquées :
 * - tokens signés HMAC : impossible d'énumérer les messages ou de forger
 *   une redirection (anti open-redirect : l'URL de destination est signée) ;
 * - ouvertures UNIQUES (stats « opened ») distinguées des RÉOUVERTURES
 *   (compteur « opensTotal ») — idem clics (« clicked » / « clicksTotal ») ;
 * - un clic implique une ouverture (comptée si le pixel a été bloqué) ;
 * - filtrage des scanners : ouverture < 10 s après l'envoi ou user-agent
 *   de passerelle de sécurité → événement enregistré marqué `bot`,
 *   exclu des statistiques ;
 * - le lien de désinscription (/u/) n'est JAMAIS réécrit (RFC 8058) ;
 * - pixel servi avec Cache-Control: no-store pour détecter les réouvertures ;
 * - domaine de tracking dédié optionnel (TRACKING_DOMAIN, CNAME vers l'app).
 */

// ── Tokens signés ────────────────────────────────────────────────────────────

function hmac(value: string): string {
  return createHmac("sha256", env.appSecret).update(value).digest("base64url").slice(0, 22);
}

function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

/** Base des URLs de tracking : domaine dédié si configuré, sinon l'app. */
export function trackingBaseUrl(): string {
  return env.trackingDomain ? `https://${env.trackingDomain}` : env.appUrl;
}

/** Jeton de pixel : `<messageId>.<sig>`. */
export function openToken(messageId: string): string {
  return `${messageId}.${hmac(`open:${messageId}`)}`;
}

export function verifyOpenToken(token: string): string | null {
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return null;
  const messageId = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  return safeEqual(sig, hmac(`open:${messageId}`)) ? messageId : null;
}

/** Signature d'un couple (message, URL de destination) pour les clics. */
export function clickSig(messageId: string, url: string): string {
  return hmac(`click:${messageId}|${url}`);
}

export function verifyClickSig(messageId: string, url: string, sig: string): boolean {
  return safeEqual(sig, clickSig(messageId, url));
}

export function clickUrl(messageId: string, url: string): string {
  const params = new URLSearchParams({ u: url, s: clickSig(messageId, url) });
  return `${trackingBaseUrl()}/api/t/c/${openToken(messageId)}?${params.toString()}`;
}

// ── Instrumentation du HTML au moment de l'envoi ────────────────────────────

const SKIP_HREF = /^(mailto:|tel:|sms:|#)/i;

/** Réécrit les liens http(s) et ajoute le pixel selon les options de la campagne. */
export function instrumentHtml(
  html: string,
  messageId: string,
  opts: { opens: boolean; clicks: boolean },
): string {
  let out = html;

  if (opts.clicks) {
    out = out.replace(
      /(<a\b[^>]*?\bhref=)(["'])(.*?)\2/gi,
      (full, prefix: string, quote: string, href: string) => {
        if (SKIP_HREF.test(href)) return full;
        if (!/^https?:\/\//i.test(href)) return full;
        // Jamais le lien de désinscription ni un lien déjà tracké.
        if (href.includes("/u/") || href.includes("/api/t/")) return full;
        return `${prefix}${quote}${clickUrl(messageId, href)}${quote}`;
      },
    );
  }

  if (opts.opens) {
    const pixel = `<img src="${trackingBaseUrl()}/api/t/o/${openToken(messageId)}" width="1" height="1" alt="" style="display:block;width:1px;height:1px;border:0;overflow:hidden" />`;
    out = /<\/body>/i.test(out) ? out.replace(/<\/body>/i, `${pixel}</body>`) : out + pixel;
  }

  return out;
}

// ── Filtrage des scanners / bots ─────────────────────────────────────────────

/** Passerelles de sécurité et clients automatisés connus (pré-fetch des liens
 *  et pixels avant remise — à exclure des statistiques d'engagement). */
const BOT_UA =
  /barracuda|mimecast|proofpoint|symantec|trendmicro|forcepoint|sophos|bitdefender|python-requests|python-urllib|go-http-client|curl\/|wget\/|libwww|headlesschrome|phantomjs|bot\b|spider|crawler/i;

function isLikelyBot(userAgent: string | null, sentAt: Date | null): boolean {
  if (userAgent && BOT_UA.test(userAgent)) return true;
  // Ouverture quasi instantanée après l'envoi = scan de passerelle, pas un humain.
  if (sentAt && Date.now() - sentAt.getTime() < 10_000) return true;
  return false;
}

// ── Enregistrement des événements ────────────────────────────────────────────

async function bumpCounters(campaignId: string | null, keys: string[]) {
  if (!campaignId || keys.length === 0) return;
  const campaign = await db.campaign.findUnique({ where: { id: campaignId } });
  if (!campaign) return;
  const stats = JSON.parse(campaign.stats || "{}");
  for (const k of keys) stats[k] = (stats[k] ?? 0) + 1;
  await db.campaign.update({ where: { id: campaignId }, data: { stats: JSON.stringify(stats) } });
}

/** A-t-on déjà un événement non-bot de ce type pour ce message ? */
async function hasRealEvent(messageId: string, type: string): Promise<boolean> {
  const events = await db.emailEvent.findMany({ where: { messageId, type }, select: { data: true } });
  return events.some((e) => !e.data?.includes('"bot":true'));
}

/** Enregistre une ouverture (pixel chargé). */
export async function recordOpen(messageId: string, meta: { userAgent: string | null }) {
  const message = await db.emailMessage.findUnique({ where: { id: messageId } });
  if (!message || message.test) return;

  if (isLikelyBot(meta.userAgent, message.sentAt)) {
    await db.emailEvent.create({
      data: { messageId, type: "opened", data: JSON.stringify({ bot: true, user_agent: meta.userAgent }) },
    });
    return;
  }

  const alreadyOpened = await hasRealEvent(messageId, "opened");
  if (!alreadyOpened) {
    // Première ouverture : statut, stats (opened + opensTotal), webhooks —
    // via le chemin standard.
    await recordEvent(messageId, "opened", { user_agent: meta.userAgent, first: true });
  } else {
    // Réouverture : trace + compteur total, sans re-déclencher statut/webhooks.
    await db.emailEvent.create({
      data: { messageId, type: "opened", data: JSON.stringify({ user_agent: meta.userAgent, repeat: true }) },
    });
    await bumpCounters(message.campaignId, ["opensTotal"]);
  }
}

/** Enregistre un clic puis laisse la route rediriger vers l'URL d'origine. */
export async function recordClick(messageId: string, url: string, meta: { userAgent: string | null }) {
  const message = await db.emailMessage.findUnique({ where: { id: messageId } });
  if (!message || message.test) return;

  if (isLikelyBot(meta.userAgent, message.sentAt)) {
    await db.emailEvent.create({
      data: { messageId, type: "clicked", data: JSON.stringify({ bot: true, url, user_agent: meta.userAgent }) },
    });
    return;
  }

  // Un clic implique une ouverture (pixel souvent bloqué par le client mail).
  if (!(await hasRealEvent(messageId, "opened"))) {
    await recordEvent(messageId, "opened", { implied_by: "click" });
  }

  const alreadyClicked = await hasRealEvent(messageId, "clicked");
  if (!alreadyClicked) {
    // Premier clic : statut, stats (clicked + clicksTotal), webhooks.
    await recordEvent(messageId, "clicked", { url, user_agent: meta.userAgent, first: true });
  } else {
    await db.emailEvent.create({
      data: { messageId, type: "clicked", data: JSON.stringify({ url, user_agent: meta.userAgent, repeat: true }) },
    });
    await bumpCounters(message.campaignId, ["clicksTotal"]);
  }
}
