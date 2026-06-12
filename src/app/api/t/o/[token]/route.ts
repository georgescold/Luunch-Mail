import { verifyOpenToken, recordOpen } from "@/lib/email/tracking";

/** GIF transparent 1x1 (43 octets). */
const PIXEL = Buffer.from("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", "base64");

const PIXEL_HEADERS = {
  "content-type": "image/gif",
  "content-length": String(PIXEL.length),
  // no-store : chaque réouverture recharge le pixel → réouvertures comptées.
  "cache-control": "no-store, no-cache, must-revalidate, private",
  pragma: "no-cache",
  expires: "0",
};

/** Pixel d'ouverture. Répond TOUJOURS le gif (même token invalide) pour ne
 *  divulguer aucune information sur la validité des jetons. */
export async function GET(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const messageId = verifyOpenToken(token);
  if (messageId) {
    // L'enregistrement ne doit jamais retarder ni faire échouer le pixel.
    try {
      await recordOpen(messageId, { userAgent: req.headers.get("user-agent") });
    } catch (err) {
      console.error("[tracking] open:", err instanceof Error ? err.message : err);
    }
  }
  return new Response(PIXEL, { status: 200, headers: PIXEL_HEADERS });
}
