import { logoutAction } from "@/server/auth-actions";
import { isDemoMode } from "@/lib/core/env";
import { initials } from "@/lib/core/fmt";
import { Badge } from "@/components/ui";
import type { AuthContext } from "@/lib/core/auth";
import { LogOut, Globe } from "lucide-react";

const REGION_LABEL: Record<string, string> = { eu: "Europe", us: "Amérique du N.", sa: "Amérique du S.", asia: "Asie" };

export function Topbar({ ctx }: { ctx: AuthContext }) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-line bg-surface/90 px-sp-5 pl-16 backdrop-blur lg:pl-sp-5">
      <div className="flex items-center gap-sp-3">
        <span className="font-headline font-semibold text-ink">{ctx.workspace.name}</span>
        <Badge tone="neutral" className="hidden sm:inline-flex">
          <Globe size={12} /> {REGION_LABEL[ctx.workspace.region] ?? ctx.workspace.region}
        </Badge>
        {isDemoMode() && <Badge tone="warning">Mode démo</Badge>}
      </div>

      <div className="flex items-center gap-sp-3">
        <div className="hidden text-right sm:block">
          <p className="text-sm font-medium text-ink">{ctx.user.name ?? ctx.user.email}</p>
          <p className="text-xs text-ink-faint">{ctx.role === "owner" ? "Propriétaire" : ctx.role}</p>
        </div>
        <span className="relative flex h-9 w-9 items-center justify-center rounded-circle bg-secondary/15 text-sm font-semibold text-secondary">
          {initials(ctx.user.name, ctx.user.email)}
          <span className="absolute -bottom-px -right-px h-2.5 w-2.5 rounded-circle border-2 border-surface bg-success" title="En ligne" />
        </span>
        <form action={logoutAction}>
          <button className="flex h-9 w-9 items-center justify-center rounded-md text-ink-faint hover:bg-fill-subtle hover:text-error" title="Se déconnecter">
            <LogOut size={18} />
          </button>
        </form>
      </div>
    </header>
  );
}
