"use client";

import { Plus } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input, Select, Field } from "@/components/ui/input";
import { createListAction } from "@/server/audiences-actions";

export function CreateListModal() {
  return (
    <Modal
      title="Créer une liste"
      description="Une liste est un groupe de contacts auquel on s'inscrit / se désinscrit."
      trigger={(open) => (
        <Button size="sm" onClick={open}>
          <Plus size={16} /> Créer une liste
        </Button>
      )}
    >
      {(close) => (
        <form action={createListAction} onSubmit={() => close()}>
          <Field label="Nom de la liste" htmlFor="list-name">
            <Input id="list-name" name="name" required placeholder="Newsletter mensuelle" />
          </Field>
          <Field label="Type" htmlFor="list-type" hint="Statique : on gère les membres à la main. Dynamique : alimentée par un segment.">
            <Select id="list-type" name="type" defaultValue="static">
              <option value="static">Statique</option>
              <option value="dynamic">Dynamique</option>
            </Select>
          </Field>
          <div className="mt-sp-4 flex justify-end gap-sp-2">
            <Button type="button" variant="subtle" onClick={close}>
              Annuler
            </Button>
            <Button type="submit">Créer la liste</Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
