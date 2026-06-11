"use client";

import { Upload } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Textarea, Field } from "@/components/ui/input";
import { importContactsAction } from "@/server/audiences-actions";

export function ImportContactsModal() {
  return (
    <Modal
      wide
      title="Importer des contacts"
      description="Collez vos contacts opt-in (un par ligne). Format : e-mail, prénom, nom."
      trigger={(open) => (
        <Button size="sm" variant="secondary" onClick={open}>
          <Upload size={16} /> Importer (CSV collé)
        </Button>
      )}
    >
      {(close) => (
        <form action={importContactsAction} onSubmit={() => close()}>
          <Field
            label="Contacts à importer"
            hint="Une ligne par contact. Exemple : camille@acme.com, Camille, Durand"
            htmlFor="imp-csv"
          >
            <Textarea
              id="imp-csv"
              name="csv"
              required
              className="min-h-[200px] font-mono text-xs"
              placeholder={"camille@acme.com, Camille, Durand\nlucas@startup.io, Lucas, Martin\ncontact@boutique.fr"}
            />
          </Field>
          <p className="mb-sp-4 rounded-sm bg-primary-soft/50 px-sp-3 py-sp-2 text-xs text-ink-muted">
            En important, vous confirmez disposer du consentement (RGPD) de ces contacts.
            Ils seront ajoutés en statut « abonné » avec une source de consentement « import ».
          </p>
          <div className="mt-sp-2 flex justify-end gap-sp-2">
            <Button type="button" variant="subtle" onClick={close}>
              Annuler
            </Button>
            <Button type="submit">Importer les contacts</Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
