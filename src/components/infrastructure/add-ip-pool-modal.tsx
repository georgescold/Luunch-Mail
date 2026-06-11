"use client";

import { Plus } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/input";
import { Switch } from "@/components/ui/toggle";
import { addIpPoolAction } from "@/server/infrastructure-actions";

export function AddIpPoolModal() {
  return (
    <Modal
      title="Ajouter un pool d'IP"
      description="Une IP dédiée neuve démarre en chauffe ; un pool partagé est utilisable immédiatement."
      trigger={(open) => (
        <Button onClick={open} size="sm">
          <Plus size={16} /> Ajouter un pool
        </Button>
      )}
    >
      {(close) => (
        <form action={addIpPoolAction} onSubmit={() => setTimeout(close, 0)}>
          <Field label="Nom du pool" htmlFor="pool-name">
            <Input id="pool-name" name="name" placeholder="Pool transactionnel EU" autoComplete="off" required />
          </Field>

          <div className="grid gap-sp-4 sm:grid-cols-2">
            <Field label="Type" htmlFor="pool-type" hint="Dédié : IP réservée à votre seul trafic.">
              <Select id="pool-type" name="type" defaultValue="shared">
                <option value="shared">Partagé</option>
                <option value="dedicated">Dédié</option>
              </Select>
            </Field>
            <Field label="Région" htmlFor="pool-region">
              <Select id="pool-region" name="region" defaultValue="eu">
                <option value="eu">Europe</option>
                <option value="us">Amérique du Nord</option>
                <option value="sa">Amérique du Sud</option>
                <option value="asia">Asie</option>
              </Select>
            </Field>
          </div>

          <Field label="Adresse IP" htmlFor="pool-ip" hint="Optionnel — laissez vide pour une attribution automatique.">
            <Input id="pool-ip" name="ipAddress" placeholder="203.0.113.10" autoComplete="off" />
          </Field>

          <label className="mb-sp-4 flex items-center justify-between rounded-md border border-line px-sp-4 py-sp-3">
            <span>
              <span className="block text-sm font-medium text-ink">Auto-warmup</span>
              <span className="block text-xs text-ink-faint">Montée en volume progressive et automatique de la réputation.</span>
            </span>
            <Switch name="autoWarmup" defaultChecked value="on" />
          </label>

          <div className="flex justify-end gap-sp-2">
            <Button type="button" variant="subtle" onClick={close}>Annuler</Button>
            <Button type="submit">Ajouter le pool</Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
