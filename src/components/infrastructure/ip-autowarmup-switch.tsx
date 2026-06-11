"use client";

import { useRef } from "react";
import { Switch } from "@/components/ui/toggle";
import { toggleIpAutoWarmupAction } from "@/server/infrastructure-actions";

/** Switch d'auto-warmup d'un pool : soumet l'action au changement. */
export function IpAutoWarmupSwitch({ poolId, enabled }: { poolId: string; enabled: boolean }) {
  const formRef = useRef<HTMLFormElement>(null);
  return (
    <form ref={formRef} action={toggleIpAutoWarmupAction} className="inline-flex">
      <input type="hidden" name="poolId" value={poolId} />
      <Switch
        checked={enabled}
        onChange={() => formRef.current?.requestSubmit()}
        aria-label="Activer ou désactiver l'auto-warmup"
      />
    </form>
  );
}
