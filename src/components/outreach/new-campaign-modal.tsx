"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button, buttonClasses } from "@/components/ui/button";
import { Input, Textarea, Field } from "@/components/ui/input";
import { Switch } from "@/components/ui/toggle";
import { createCampaignAction } from "@/server/outreach-actions";

/** Modal « Nouvelle campagne » : nom, objet + réglages d'envoi intelligent. */
export function NewCampaignModal() {
  return (
    <Modal
      title="Nouvelle campagne d'outreach"
      description="Une campagne déroule une séquence : e-mails et relances automatiques jusqu'à obtenir une réponse."
      trigger={(open) => (
        <button onClick={open} className={buttonClasses({})}>
          <Plus size={16} /> Nouvelle campagne
        </button>
      )}
    >
      {(close) => <NewCampaignForm onDone={close} />}
    </Modal>
  );
}

function NewCampaignForm({ onDone }: { onDone: () => void }) {
  const [rotation, setRotation] = useState(true);
  const [esp, setEsp] = useState(false);
  const [ab, setAb] = useState(false);

  return (
    <form action={createCampaignAction} onSubmit={() => setTimeout(onDone, 0)}>
      <Field label="Nom de la campagne" htmlFor="name">
        <Input id="name" name="name" placeholder="Prospection CTO SaaS — Q3" required autoFocus />
      </Field>

      <Field
        label="Objet par défaut"
        htmlFor="subject"
        hint="Utilisable comme repli si une étape n'a pas son propre objet. Variables {{first_name}} et spintax {Bonjour|Salut} acceptés."
      >
        <Textarea
          id="subject"
          name="subject"
          className="min-h-[60px]"
          placeholder="{Bonjour|Salut} {{first_name}}, une idée pour {{company}}"
        />
      </Field>

      <div className="space-y-sp-3 rounded-md border border-line bg-fill-subtle p-sp-4">
        <SettingRow
          label="Rotation des boîtes"
          hint="Répartit l'envoi sur toutes vos boîtes pour protéger chaque réputation."
          name="mailboxRotation"
          checked={rotation}
          onChange={setRotation}
        />
        <SettingRow
          label="ESP matching"
          hint="Envoie depuis Gmail vers les prospects Gmail, Outlook vers Outlook."
          name="espMatching"
          checked={esp}
          onChange={setEsp}
        />
        <SettingRow
          label="A/B testing"
          hint="Teste plusieurs variantes d'objet/copy et favorise la plus performante."
          name="abTesting"
          checked={ab}
          onChange={setAb}
        />
      </div>

      <div className="mt-sp-5 flex justify-end gap-sp-2">
        <Button type="button" variant="subtle" onClick={onDone}>
          Annuler
        </Button>
        <Button type="submit">Créer la campagne</Button>
      </div>
    </form>
  );
}

function SettingRow({
  label,
  hint,
  name,
  checked,
  onChange,
}: {
  label: string;
  hint: string;
  name: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-sp-4">
      <div className="min-w-0">
        <p className="text-sm font-medium text-ink">{label}</p>
        <p className="text-xs text-ink-faint">{hint}</p>
      </div>
      <Switch name={name} checked={checked} onChange={(e) => onChange(e.currentTarget.checked)} />
    </div>
  );
}
