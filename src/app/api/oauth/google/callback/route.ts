import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth";
import { verifyState, connectGmailMailbox } from "@/lib/google";

/** Callback OAuth Google : échange le code, crée la boîte Gmail connectée. */
export async function GET(req: Request) {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  if (error) redirect(`/infrastructure?google=denied`);
  if (!code || !state) redirect(`/infrastructure?google=error`);

  const workspaceId = verifyState(state);
  // Le state doit correspondre au workspace de la session courante.
  if (!workspaceId || workspaceId !== ctx.workspace.id) {
    redirect(`/infrastructure?google=bad_state`);
  }

  try {
    await connectGmailMailbox(workspaceId, code);
  } catch (err) {
    console.error("[oauth google]", err);
    redirect(`/infrastructure?google=error`);
  }
  redirect(`/infrastructure?google=connected`);
}
