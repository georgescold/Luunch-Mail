import { verifyOpenToken, verifyClickSig, recordClick } from "@/lib/email/tracking";

/** Redirection de clic tracké : /api/t/c/<token>?u=<url>&s=<signature>.
 *  L'URL de destination est signée avec le message → pas d'open redirect :
 *  impossible de fabriquer un lien luunch vers une URL arbitraire. */
export async function GET(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const { searchParams } = new URL(req.url);
  const url = searchParams.get("u") ?? "";
  const sig = searchParams.get("s") ?? "";

  const messageId = verifyOpenToken(token);
  const valid =
    messageId !== null && /^https?:\/\//i.test(url) && verifyClickSig(messageId, url, sig);

  if (!valid) return new Response("Lien invalide ou expiré.", { status: 400 });

  try {
    await recordClick(messageId, url, { userAgent: req.headers.get("user-agent") });
  } catch (err) {
    // Le tracking ne doit jamais empêcher la redirection.
    console.error("[tracking] click:", err instanceof Error ? err.message : err);
  }

  return Response.redirect(url, 302);
}
