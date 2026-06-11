import {
  createHmac, randomBytes, scryptSync, timingSafeEqual,
  createCipheriv, createDecipheriv,
} from "node:crypto";
import { env } from "./env";

// Clé de chiffrement symétrique dérivée du secret applicatif (AES-256-GCM).
const encKey = scryptSync(env.appSecret, "gigamail-enc-salt-v1", 32);

/** Chiffre un secret (mot de passe SMTP/IMAP…) → "iv:tag:cipher" (hex). */
export function encryptSecret(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encKey, iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${tag.toString("hex")}:${enc.toString("hex")}`;
}

/** Déchiffre un secret produit par encryptSecret. Renvoie "" si invalide. */
export function decryptSecret(payload: string | null | undefined): string {
  if (!payload) return "";
  try {
    const [ivHex, tagHex, dataHex] = payload.split(":");
    if (!ivHex || !tagHex || !dataHex) return "";
    const decipher = createDecipheriv("aes-256-gcm", encKey, Buffer.from(ivHex, "hex"));
    decipher.setAuthTag(Buffer.from(tagHex, "hex"));
    return Buffer.concat([decipher.update(Buffer.from(dataHex, "hex")), decipher.final()]).toString("utf8");
  } catch {
    return "";
  }
}

/** Hash de mot de passe via scrypt natif (format `salt:hash`). */
export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export async function verifyPassword(password: string, stored: string) {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const test = scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, "hex");
  return expected.length === test.length && timingSafeEqual(expected, test);
}

/** Jeton opaque (sessions, secrets de webhook). */
export function randomToken(bytes = 32) {
  return randomBytes(bytes).toString("base64url");
}

/** Génère une clé API : partie visible (prefix) + secret + son hash. */
export function generateApiKey() {
  const secret = randomBytes(24).toString("base64url");
  const full = `gm_live_${secret}`;
  const prefix = full.slice(0, 16);
  const hash = hashApiKey(full);
  return { full, prefix, hash };
}

export function hashApiKey(full: string) {
  return createHmac("sha256", env.appSecret).update(full).digest("hex");
}

/** Signature HMAC d'un payload de webhook (entête `luunch-signature`). */
export function signPayload(payload: string, secret: string) {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

export function safeEqual(a: string, b: string) {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}
