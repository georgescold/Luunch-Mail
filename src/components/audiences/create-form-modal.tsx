"use client";

import { Plus } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input, Select, Field, Label } from "@/components/ui/input";
import { Switch } from "@/components/ui/toggle";
import { createFormAction } from "@/server/audiences-actions";

export function CreateFormModal() {
  return (
    <Modal
      title="Créer un formulaire"
      description="Collectez des contacts opt-in via un pop-up, un bloc intégré ou une landing page."
      trigger={(open) => (
        <Button size="sm" onClick={open}>
          <Plus size={16} /> Créer un formulaire
        </Button>
      )}
    >
      {(close) => (
        <form action={createFormAction} onSubmit={() => close()}>
          <Field label="Nom du formulaire" htmlFor="form-name">
            <Input id="form-name" name="name" required placeholder="Pop-up bienvenue -10%" />
          </Field>
          <Field label="Type" htmlFor="form-type">
            <Select id="form-type" name="type" defaultValue="popup">
              <option value="popup">Pop-up</option>
              <option value="embed">Intégré (embed)</option>
              <option value="landing">Landing page</option>
            </Select>
          </Field>

          <div className="mb-sp-4 flex items-start justify-between gap-sp-4 rounded-sm border border-line bg-fill-subtle px-sp-4 py-sp-3">
            <div>
              <Label className="mb-sp-1">Double opt-in (RGPD)</Label>
              <p className="text-xs text-ink-faint">
                Envoie un e-mail de confirmation : le contact n'est abonné qu'après avoir cliqué.
                Recommandé en Europe pour prouver le consentement.
              </p>
            </div>
            <div className="pt-sp-1">
              <Switch name="doubleOptIn" defaultChecked />
            </div>
          </div>

          <div className="mt-sp-2 flex justify-end gap-sp-2">
            <Button type="button" variant="subtle" onClick={close}>
              Annuler
            </Button>
            <Button type="submit">Créer le formulaire</Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
