"use client";

import { useActionState } from "react";
import { DownloadCloud, CheckCircle2, XCircle, Loader2, ExternalLink, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { importCheapInboxesAction } from "@/server/infrastructure-actions";

type State = { ok?: boolean; imported?: number; skipped?: number; errors?: string[]; error?: string };

export function CheapInboxesImport({ connected = false }: { connected?: boolean }) {
  const [state, action, pending] = useActionState<State, FormData>(importCheapInboxesAction, {});

  return (
    <div className="space-y-sp-4">
      <div className="rounded-md bg-fill-subtle px-sp-4 py-sp-3 text-sm text-ink-muted">
        Collez votre <strong>clé API Cheap Inboxes</strong> : Luunch Mail importe automatiquement toutes vos boîtes
        actives avec leurs identifiants (SMTP + IMAP), les met en chauffe et active la relève des réponses.
        {connected && <span className="mt-sp-1 block text-xs text-success-fg">✓ Cheap Inboxes déjà connecté — laissez le champ vide pour resynchroniser.</span>}
      </div>

      <form action={action} className="space-y-sp-3">
        <Field
          label="Clé API"
          htmlFor="ci-key"
          hint="Tableau de bord Cheap Inboxes → API → Create key. Format : ci_live_…"
        >
          <Input id="ci-key" name="apiKey" type="password" placeholder={connected ? "•••••••• (déjà enregistrée)" : "ci_live_..."} autoComplete="off" />
        </Field>

        <a
          href="https://app.cheapinboxes.com"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-sp-1 text-xs text-primary hover:underline"
        >
          <KeyRound size={12} /> Obtenir / gérer ma clé API <ExternalLink size={11} />
        </a>

        <Button type="submit" disabled={pending} className="w-full">
          {pending ? <Loader2 size={16} className="animate-spin" /> : <DownloadCloud size={16} />}
          {pending ? "Import en cours…" : connected ? "Resynchroniser mes boîtes" : "Importer mes boîtes"}
        </Button>
      </form>

      {state.ok && (
        <div className="rounded-md bg-success-soft px-sp-4 py-sp-3 text-sm text-success-fg">
          <p className="flex items-center gap-sp-2 font-medium">
            <CheckCircle2 size={16} /> {state.imported} boîte(s) importée(s) et configurée(s) !
          </p>
          {Boolean(state.skipped) && (
            <p className="mt-sp-1 text-xs">{state.skipped} ignorée(s) (pas encore actives — relancez plus tard).</p>
          )}
          {state.errors && state.errors.length > 0 && (
            <ul className="mt-sp-2 list-disc space-y-px pl-sp-5 text-xs text-warning-fg">
              {state.errors.slice(0, 5).map((e, i) => <li key={i}>{e}</li>)}
            </ul>
          )}
        </div>
      )}
      {state.error && (
        <p className="flex items-center gap-sp-2 rounded-md bg-error-soft px-sp-4 py-sp-3 text-sm text-error">
          <XCircle size={16} /> {state.error}
        </p>
      )}
    </div>
  );
}
