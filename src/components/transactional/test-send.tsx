"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { CheckCircle2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { sendTestEmailAction, type TestSendState } from "@/server/transactional-actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending}>
      <Send size={15} /> {pending ? "Envoi…" : "Envoyer en mode test"}
    </Button>
  );
}

export function TestSendForm({ defaultTo }: { defaultTo?: string }) {
  const [state, action] = useActionState<TestSendState, FormData>(sendTestEmailAction, {});

  return (
    <form action={action}>
      <div className="grid gap-sp-3 sm:grid-cols-2">
        <Field label="Destinataire" htmlFor="test-to" className="mb-0">
          <Input id="test-to" name="to" type="email" placeholder="vous@exemple.com" defaultValue={defaultTo} invalid={Boolean(state.error)} />
        </Field>
        <Field label="Sujet" htmlFor="test-subject" className="mb-0">
          <Input id="test-subject" name="subject" placeholder="E-mail de test Luunch Mail" />
        </Field>
      </div>

      <div className="mt-sp-4 flex flex-wrap items-center gap-sp-3">
        <SubmitButton />
        {state.ok && (
          <span className="inline-flex items-center gap-sp-1 text-sm text-success-fg">
            <CheckCircle2 size={16} /> Envoyé en mode test — retrouvez-le dans les logs (events simulés).
          </span>
        )}
        {state.error && <span className="text-sm text-error">{state.error}</span>}
      </div>
      <p className="mt-sp-2 text-xs text-ink-faint">
        Mode test : aucun e-mail réel n'est délivré, mais les événements (delivered, opened…) sont simulés pour vos tests d'intégration.
      </p>
    </form>
  );
}
