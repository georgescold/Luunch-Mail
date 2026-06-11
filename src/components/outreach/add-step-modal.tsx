"use client";

import { useState } from "react";
import { Plus, Mail, Clock, GitBranch } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button, buttonClasses } from "@/components/ui/button";
import { Input, Textarea, Select, Field } from "@/components/ui/input";
import { addStepAction } from "@/server/outreach-actions";

type StepType = "email" | "wait" | "condition";

/** Modal "Ajouter une étape" : email | wait | condition. */
export function AddStepModal({ campaignId }: { campaignId: string }) {
  return (
    <Modal
      title="Ajouter une étape"
      description="Construisez votre séquence : e-mail, délai d'attente ou condition d'arrêt."
      trigger={(open) => (
        <button onClick={open} className={buttonClasses({ variant: "secondary", size: "sm" })}>
          <Plus size={16} /> Ajouter une étape
        </button>
      )}
    >
      {(close) => <AddStepForm campaignId={campaignId} onDone={close} />}
    </Modal>
  );
}

function AddStepForm({ campaignId, onDone }: { campaignId: string; onDone: () => void }) {
  const [type, setType] = useState<StepType>("email");

  const types: { id: StepType; label: string; icon: typeof Mail }[] = [
    { id: "email", label: "E-mail", icon: Mail },
    { id: "wait", label: "Attente", icon: Clock },
    { id: "condition", label: "Condition", icon: GitBranch },
  ];

  return (
    <form action={addStepAction} onSubmit={() => setTimeout(onDone, 0)}>
      <input type="hidden" name="campaignId" value={campaignId} />
      <input type="hidden" name="type" value={type} />

      <Field label="Type d'étape">
        <div className="grid grid-cols-3 gap-sp-2">
          {types.map((t) => {
            const active = type === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setType(t.id)}
                className={`flex flex-col items-center gap-sp-1 rounded-md border px-sp-3 py-sp-3 text-sm transition-colors ${
                  active
                    ? "border-primary bg-primary-soft text-primary"
                    : "border-line text-ink-muted hover:border-line-strong"
                }`}
              >
                <t.icon size={18} />
                {t.label}
              </button>
            );
          })}
        </div>
      </Field>

      {type === "email" && (
        <>
          <Field
            label="Objet"
            htmlFor="subject"
            hint="Variables {{first_name}}, {{company}} et spintax {Bonjour|Salut} acceptés."
          >
            <Input
              id="subject"
              name="subject"
              placeholder="{Une idée|Une piste} pour {{company}}"
            />
          </Field>
          <Field
            label="Corps du message"
            htmlFor="body"
            hint="Personnalisé par contact à l'envoi. Texte court et conversationnel recommandé."
          >
            <Textarea
              id="body"
              name="body"
              className="min-h-[160px] font-mono text-sm"
              placeholder={
                "{Bonjour|Salut} {{first_name}},\n\nJe vous écris car {{company}} ...\n\n{Au plaisir|Bien à vous},\nL'équipe"
              }
            />
          </Field>
        </>
      )}

      {type === "wait" && (
        <Field
          label="Délai d'attente (jours)"
          htmlFor="waitDays"
          hint="80 % des réponses viennent des relances. Espacez de 2 à 4 jours."
        >
          <Input id="waitDays" name="waitDays" type="number" min={1} max={60} defaultValue={3} />
        </Field>
      )}

      {type === "condition" && (
        <Field
          label="Si le prospect…"
          htmlFor="conditionEvent"
          hint="La séquence s'arrête automatiquement quand la condition est remplie."
        >
          <Select id="conditionEvent" name="conditionEvent" defaultValue="replied">
            <option value="replied">a répondu → arrêter la séquence</option>
            <option value="opened">a ouvert → arrêter la séquence</option>
            <option value="clicked">a cliqué → arrêter la séquence</option>
          </Select>
        </Field>
      )}

      <div className="mt-sp-5 flex justify-end gap-sp-2">
        <Button type="button" variant="subtle" onClick={onDone}>
          Annuler
        </Button>
        <Button type="submit">Ajouter l'étape</Button>
      </div>
    </form>
  );
}
