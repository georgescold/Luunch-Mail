import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth";
import { env, googleConfigured } from "@/lib/env";
import { makeState, buildAuthUrl } from "@/lib/google";

/** Démarre le flux OAuth Google : redirige l'utilisateur vers le consentement. */
export async function GET() {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");
  if (!googleConfigured()) {
    redirect("/infrastructure?google=not_configured");
  }
  const url = buildAuthUrl(makeState(ctx.workspace.id));
  redirect(url);
}
