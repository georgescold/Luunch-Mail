"use client";

import { useActionState } from "react";
import { Plug, Send, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/input";
import { testMailboxAction, sendTestEmailAction } from "@/server/infrastructure-actions";

type ActionState = { ok?: boolean; error?: string };
type MailboxOption = { id: string; email: string; hasSmtp: boolean; canSend: boolean };

export function MailboxTester({ mailboxes, defaultTo }: { mailboxes: MailboxOption[]; defaultTo: string }) {
  const sendable = mailboxes.filter((m) => m.canSend);
  const smtpBoxes = mailboxes.filter((m) => m.hasSmtp);

  if (sendable.length === 0) {
    return (
      <p className="rounded-md bg-warning-soft px-sp-4 py-sp-3 text-sm text-warning-fg">
        Connectez d'abord une boîte (étape précédente) pour pouvoir la tester.
      </p>
    );
  }

  return (
    <div className="space-y-sp-5">
      {smtpBoxes.length > 0 ? (
        <ConnectionTest mailboxes={smtpBoxes} />
      ) : (
        <p className="rounded-md bg-fill-subtle px-sp-3 py-sp-2 text-xs text-ink-faint">
          Les boîtes Google sont validées automatiquement par OAuth — passez directement au test d'envoi ci-dessous.
        </p>
      )}
      <SendTest mailboxes={sendable} defaultTo={defaultTo} />
    </div>
  );
}

function ConnectionTest({ mailboxes }: { mailboxes: MailboxOption[] }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(testMailboxAction, {});
  return (
    <form action={action} className="rounded-md border border-line bg-surface p-sp-4">
      <p className="mb-sp-3 flex items-center gap-sp-2 text-sm font-medium text-ink">
        <Plug size={16} className="text-primary" /> 1. Vérifier la connexion au serveur
      </p>
      <div className="flex flex-col gap-sp-3 sm:flex-row sm:items-end">
        <Field label="Boîte" htmlFor="t-mailbox" className="mb-0 flex-1">
          <Select id="t-mailbox" name="mailboxId" required>
            {mailboxes.map((m) => <option key={m.id} value={m.id}>{m.email}</option>)}
          </Select>
        </Field>
        <Button type="submit" variant="secondary" disabled={pending} className="shrink-0">
          {pending ? <Loader2 size={16} className="animate-spin" /> : <Plug size={16} />}
          Tester la connexion
        </Button>
      </div>
      {state.ok && <Result ok>Connexion réussie — vos identifiants SMTP sont valides.</Result>}
      {state.error && <Result>Échec : {state.error}</Result>}
    </form>
  );
}

function SendTest({ mailboxes, defaultTo }: { mailboxes: MailboxOption[]; defaultTo: string }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(sendTestEmailAction, {});
  return (
    <form action={action} className="rounded-md border border-line bg-surface p-sp-4">
      <p className="mb-sp-3 flex items-center gap-sp-2 text-sm font-medium text-ink">
        <Send size={16} className="text-primary" /> 2. S'envoyer un vrai e-mail de test
      </p>
      <div className="grid gap-sp-3 sm:grid-cols-2">
        <Field label="Envoyer depuis" htmlFor="s-mailbox" className="mb-0">
          <Select id="s-mailbox" name="mailboxId" required>
            {mailboxes.map((m) => <option key={m.id} value={m.id}>{m.email}</option>)}
          </Select>
        </Field>
        <Field label="Vers votre adresse" htmlFor="s-to" className="mb-0">
          <Input id="s-to" name="to" type="email" defaultValue={defaultTo} placeholder="vous@gmail.com" required />
        </Field>
      </div>
      <Button type="submit" disabled={pending} className="mt-sp-3">
        {pending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
        Envoyer l'e-mail de test
      </Button>
      {state.ok && <Result ok>E-mail envoyé ! Vérifiez votre boîte de réception (et les spams) dans quelques instants.</Result>}
      {state.error && <Result>Échec : {state.error}</Result>}
    </form>
  );
}

function Result({ ok, children }: { ok?: boolean; children: React.ReactNode }) {
  return (
    <p className={`mt-sp-3 flex items-center gap-sp-2 rounded-md px-sp-3 py-sp-2 text-sm ${ok ? "bg-success-soft text-success-fg" : "bg-error-soft text-error"}`}>
      {ok ? <CheckCircle2 size={16} /> : <XCircle size={16} />} {children}
    </p>
  );
}
