import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/core/auth";
import { env, googleConfigured } from "@/lib/core/env";
import { makeState, buildAuthUrl } from "@/lib/integrations/google";

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
