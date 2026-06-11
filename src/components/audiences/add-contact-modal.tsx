"use client";

import { UserPlus } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input, Field } from "@/components/ui/input";
import { addContactAction } from "@/server/audiences-actions";

export function AddContactModal() {
  return (
    <Modal
      title="Ajouter un contact"
      description="Saisissez un contact opt-in. Il sera ajouté en statut « abonné »."
      trigger={(open) => (
        <Button size="sm" onClick={open}>
          <UserPlus size={16} /> Ajouter un contact
        </Button>
      )}
    >
      {(close) => (
        <form action={addContactAction} onSubmit={() => close()}>
          <Field label="E-mail" htmlFor="ac-email">
            <Input id="ac-email" name="email" type="email" required placeholder="prenom@entreprise.com" />
          </Field>
          <div className="grid grid-cols-2 gap-sp-4">
            <Field label="Prénom" htmlFor="ac-firstName">
              <Input id="ac-firstName" name="firstName" placeholder="Camille" />
            </Field>
            <Field label="Nom" htmlFor="ac-lastName">
              <Input id="ac-lastName" name="lastName" placeholder="Durand" />
            </Field>
          </div>
          <Field label="Société" htmlFor="ac-company">
            <Input id="ac-company" name="company" placeholder="Acme SAS" />
          </Field>
          <div className="mt-sp-4 flex justify-end gap-sp-2">
            <Button type="button" variant="subtle" onClick={close}>
              Annuler
            </Button>
            <Button type="submit">Ajouter</Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
