"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Check, Copy, KeyRound, ShieldCheck } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button, buttonClasses } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/toggle";
import { createApiKeyAction, type CreateKeyState } from "@/server/transactional-actions";

const SCOPES: { id: string; label: string; hint: string }[] = [
  { id: "emails:send", label: "emails:send", hint: "Envoyer des e-mails (transactionnel & broadcast)." },
  { id: "contacts:write", label: "contacts:write", hint: "Créer et mettre à jour des contacts." },
  { id: "webhooks:read", label: "webhooks:read", hint: "Lire les endpoints et livraisons webhook." },
  { id: "monitor:read", label: "monitor:read", hint: "Monitoring à distance : campagnes, boîtes, domaines, inbox, délivrabilité." },
];

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      <KeyRound size={16} /> {pending ? "Génération…" : "Générer la clé"}
    </Button>
  );
}

export function CreateKeyModal() {
  return (
    <Modal
      title="Créer une clé API"
      description="Choisissez un nom et les permissions. Le secret ne sera affiché qu'une seule fois."
      trigger={(open) => (
        <button onClick={open} className={buttonClasses({ size: "sm" })}>
          <KeyRound size={16} /> Créer une clé
        </button>
      )}
    >
      {(close) => <CreateKeyForm onClose={close} />}
    </Modal>
  );
}

function CreateKeyForm({ onClose }: { onClose: () => void }) {
  const [state, action] = useActionState<CreateKeyState, FormData>(createApiKeyAction, {});
  const [copied, setCopied] = useState(false);

  // Étape 2 : la clé est créée, on révèle le secret UNE FOIS.
  if (state.ok && state.secret) {
    return (
      <div>
        <div className="flex items-start gap-sp-3 rounded-md bg-warning-soft px-sp-4 py-sp-3 text-sm text-warning-fg">
          <ShieldCheck size={18} className="mt-px shrink-0" />
          <p>
            Copiez ce secret maintenant. Pour votre sécurité, il ne sera <strong>plus jamais affiché</strong>.
            Seul son empreinte est conservée.
          </p>
        </div>

        <div className="mt-sp-4 flex items-center gap-sp-2 rounded-md border border-line bg-fill-subtle px-sp-4 py-sp-3">
          <code className="min-w-0 flex-1 truncate font-mono text-sm text-ink">{state.secret}</code>
          <button
            type="button"
            onClick={() => {
              navigator.clipboard?.writeText(state.secret ?? "");
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            }}
            className={buttonClasses({ variant: "secondary", size: "sm" })}
          >
            {copied ? <Check size={15} /> : <Copy size={15} />} {copied ? "Copié" : "Copier"}
          </button>
        </div>

        <div className="mt-sp-5 flex justify-end">
          <Button type="button" onClick={onClose}>
            J'ai copié ma clé
          </Button>
        </div>
      </div>
    );
  }

  // Étape 1 : formulaire de création.
  return (
    <form action={action}>
      <Field label="Nom de la clé" hint="Une clé par intégration ou environnement (Production, Zapier…)." htmlFor="key-name">
        <Input id="key-name" name="name" placeholder="ex. Production" autoFocus invalid={Boolean(state.error)} />
      </Field>

      <fieldset className="mb-sp-4">
        <legend className="mb-sp-2 block text-sm font-medium text-ink-muted">Permissions (scopes)</legend>
        <div className="space-y-sp-2">
          {SCOPES.map((s) => (
            <label
              key={s.id}
              className="flex cursor-pointer items-start gap-sp-3 rounded-md border border-line bg-surface px-sp-3 py-sp-3 hover:bg-fill-subtle"
            >
              <Checkbox name={`scope:${s.id}`} defaultChecked={s.id === "emails:send"} className="mt-px" />
              <span className="min-w-0">
                <span className="block font-mono text-sm text-ink">{s.label}</span>
                <span className="block text-xs text-ink-faint">{s.hint}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      {state.error && <p className="mb-sp-3 text-sm text-error">{state.error}</p>}

      <div className="flex justify-end gap-sp-2">
        <Button type="button" variant="subtle" onClick={onClose}>
          Annuler
        </Button>
        <SubmitButton />
      </div>
    </form>
  );
}
