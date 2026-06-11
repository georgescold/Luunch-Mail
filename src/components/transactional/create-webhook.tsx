"use client";

import { Webhook } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button, buttonClasses } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/toggle";
import { createWebhookAction } from "@/server/transactional-actions";

const EVENTS: { id: string; label: string }[] = [
  { id: "delivered", label: "Délivré (delivered)" },
  { id: "opened", label: "Ouvert (opened)" },
  { id: "clicked", label: "Cliqué (clicked)" },
  { id: "bounced", label: "Bounce (bounced)" },
  { id: "complained", label: "Plainte (complained)" },
];

export function CreateWebhookModal() {
  return (
    <Modal
      title="Ajouter un endpoint webhook"
      description="Recevez les événements en temps réel sur votre serveur. La requête est signée (en-tête luunch-signature)."
      trigger={(open) => (
        <button onClick={open} className={buttonClasses({ size: "sm" })}>
          <Webhook size={16} /> Ajouter un endpoint
        </button>
      )}
    >
      {(close) => (
        <form action={createWebhookAction} onSubmit={() => setTimeout(close, 0)}>
          <Field label="URL de destination" hint="Doit accepter des requêtes POST en HTTPS." htmlFor="wh-url">
            <Input id="wh-url" name="url" type="url" placeholder="https://api.monapp.com/webhooks/luunch" autoFocus required />
          </Field>

          <fieldset className="mb-sp-4">
            <legend className="mb-sp-2 block text-sm font-medium text-ink-muted">Événements à recevoir</legend>
            <div className="grid grid-cols-1 gap-sp-2 sm:grid-cols-2">
              {EVENTS.map((e) => (
                <label
                  key={e.id}
                  className="flex cursor-pointer items-center gap-sp-2 rounded-md border border-line bg-surface px-sp-3 py-sp-2 text-sm hover:bg-fill-subtle"
                >
                  <Checkbox name={`event:${e.id}`} defaultChecked />
                  <span className="text-ink">{e.label}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="flex justify-end gap-sp-2">
            <Button type="button" variant="subtle" onClick={close}>
              Annuler
            </Button>
            <Button type="submit">
              <Webhook size={16} /> Créer l'endpoint
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
