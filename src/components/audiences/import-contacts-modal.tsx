"use client";

import { useActionState } from "react";
import { Upload, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Textarea, Field } from "@/components/ui/input";
import { importContactsAction, type ImportContactsState } from "@/server/audiences-actions";

export function ImportContactsModal() {
  return (
    <Modal
      wide
      title="Importer des contacts"
      description="Collez votre CSV : les colonnes sont reconnues automatiquement (avec ou sans ligne d'en-tête)."
      trigger={(open) => (
        <Button size="sm" variant="secondary" onClick={open}>
          <Upload size={16} /> Importer (CSV collé)
        </Button>
      )}
    >
      {() => <ImportForm />}
    </Modal>
  );
}

function ImportForm() {
  const [state, action, pending] = useActionState<ImportContactsState, FormData>(importContactsAction, {});

  return (
    <form action={action}>
      <Field
        label="Contacts à importer"
        hint={'En-têtes reconnus : e-mail, prénom, nom, société (FR/EN, accents acceptés). Toute autre colonne devient une variable personnalisée — « Ville » → {{ville}} dans vos templates.'}
        htmlFor="imp-csv"
      >
        <Textarea
          id="imp-csv"
          name="csv"
          required
          className="min-h-[200px] font-mono text-xs"
          placeholder={"Email;Prénom;Nom;Société;Ville\ncamille@acme.com;Camille;Durand;Acme;Lyon\nlucas@startup.io;Lucas;Martin;Startup SAS;Paris"}
        />
      </Field>

      <p className="mb-sp-4 rounded-sm bg-primary-soft/50 px-sp-3 py-sp-2 text-xs text-ink-muted">
        En important, vous confirmez disposer du consentement (RGPD) de ces contacts.
        Ils seront ajoutés en statut « abonné » avec une source de consentement « import ».
        Les contacts désinscrits ou supprimés ne seront jamais recontactés.
      </p>

      {state.ok && (
        <div className="mb-sp-4 rounded-md bg-success-soft px-sp-4 py-sp-3 text-sm text-success-fg">
          <p className="flex items-center gap-sp-2 font-medium">
            <CheckCircle2 size={16} />
            {state.imported} contact(s) créé(s){state.updated ? `, ${state.updated} mis à jour` : ""}
            {state.skipped ? ` · ${state.skipped} ligne(s) ignorée(s)` : ""}
          </p>
          <p className="mt-sp-1 text-xs">
            {state.headerDetected ? "Ligne d'en-tête détectée et mappée automatiquement." : "Pas d'en-tête : colonnes déduites du contenu."}
            {state.customFields && state.customFields.length > 0 && (
              <> Variables personnalisées créées : {state.customFields.map((f) => `{{${f}}}`).join(", ")}.</>
            )}
          </p>
        </div>
      )}
      {state.error && (
        <p className="mb-sp-4 flex items-center gap-sp-2 rounded-md bg-error-soft px-sp-4 py-sp-3 text-sm text-error-fg">
          <XCircle size={16} /> {state.error}
        </p>
      )}

      <div className="mt-sp-2 flex justify-end gap-sp-2">
        <Button type="submit" disabled={pending}>
          {pending ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
          {pending ? "Import en cours…" : "Importer les contacts"}
        </Button>
      </div>
    </form>
  );
}
