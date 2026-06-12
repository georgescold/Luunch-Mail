import { db } from "@/lib/core/db";
import { env } from "@/lib/core/env";
import { signPayload, safeEqual } from "@/lib/core/crypto";
import { addSuppression } from "@/lib/email/messaging";

/** Décode et vérifie le jeton de désinscription signé. */
function decode(token: string): { workspaceId: string; email: string } | null {
  try {
    const decoded = Buffer.from(token, "base64url").toString("utf8");
    const idx = decoded.lastIndexOf(":");
    const sig = decoded.slice(idx + 1);
    const rest = decoded.slice(0, idx);
    const sep = rest.indexOf(":");
    const workspaceId = rest.slice(0, sep);
    const email = rest.slice(sep + 1);
    const expected = signPayload(`${workspaceId}:${email}`, env.appSecret).slice(0, 32);
    if (!safeEqual(sig, expected)) return null;
    return { workspaceId, email };
  } catch {
    return null;
  }
}

async function unsubscribe(token: string) {
  const data = decode(token);
  if (!data) return false;
  await addSuppression(data.workspaceId, data.email, "unsubscribe", "1-click");
  return true;
}

/** POST = désinscription 1-clic (RFC 8058, List-Unsubscribe-Post). */
export async function POST(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const ok = await unsubscribe(token);
  return new Response(JSON.stringify({ unsubscribed: ok }), {
    status: ok ? 200 : 400,
    headers: { "content-type": "application/json" },
  });
}

/** GET = page de confirmation (lien cliquable). */
export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const ok = await unsubscribe(token);
  const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Désinscription — Luunch Mail</title>
  <style>body{font-family:system-ui,sans-serif;background:#f7f6f2;display:flex;min-height:100vh;align-items:center;justify-content:center;margin:0;color:#1c2722}
  .card{background:#fff;border:1px solid #e6e3da;border-radius:16px;padding:48px;max-width:440px;text-align:center;box-shadow:0 2px 8px -2px rgba(28,39,34,.08)}
  .badge{width:56px;height:56px;border-radius:9999px;display:inline-flex;align-items:center;justify-content:center;font-size:28px;margin-bottom:16px;color:${ok ? "#1a5c40" : "#a23636"};background:${ok ? "#e4efe6" : "#f9ecea"}}
  h1{font-size:22px;margin:0 0 8px} p{color:#6a7570;line-height:1.6;margin:0}</style></head>
  <body><div class="card"><div class="badge">${ok ? "✓" : "!"}</div>
  <h1>${ok ? "Vous êtes désinscrit·e" : "Lien invalide"}</h1>
  <p>${ok ? "Vous ne recevrez plus d'e-mails marketing de cet expéditeur. Vous pouvez fermer cette page." : "Ce lien de désinscription est invalide ou a expiré."}</p>
  </div></body></html>`;
  return new Response(html, { status: ok ? 200 : 400, headers: { "content-type": "text/html; charset=utf-8" } });
}
