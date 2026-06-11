"use client";

import { Plus } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button, buttonClasses } from "@/components/ui/button";
import { Input, Select, Field } from "@/components/ui/input";
import { createTemplateAction } from "@/server/composer-actions";

export function NewTemplateModal() {
  return (
    <Modal
      title="Nouveau template"
      description="Choisissez un nom, un type d'éditeur et une catégorie. Vous pourrez l'éditer juste après."
      trigger={(open) => (
        <button type="button" onClick={open} className={buttonClasses({})}>
          <Plus size={16} /> Nouveau template
        </button>
      )}
    >
      {(close) => (
        <form action={createTemplateAction} onSubmit={() => setTimeout(close, 0)}>
          <Field label="Nom du template" htmlFor="tpl-name" hint="Visible uniquement dans votre bibliothèque.">
            <Input id="tpl-name" name="name" required placeholder="Ex : E-mail de bienvenue" />
          </Field>

          <Field label="Type d'éditeur" htmlFor="tpl-kind" hint="Glisser-déposer pour le no-code, React Email ou HTML pour le code.">
            <Select id="tpl-kind" name="kind" defaultValue="drag">
              <option value="drag">Glisser-déposer (blocs visuels)</option>
              <option value="react_email">React Email (composants React)</option>
              <option value="html">HTML brut</option>
            </Select>
          </Field>

          <Field label="Catégorie" htmlFor="tpl-cat" hint="Pour ranger et filtrer vos templates.">
            <Select id="tpl-cat" name="category" defaultValue="newsletter">
              <option value="welcome">Bienvenue</option>
              <option value="promo">Promotion</option>
              <option value="newsletter">Newsletter</option>
              <option value="transactional">Transactionnel</option>
              <option value="outreach">Cold outreach</option>
            </Select>
          </Field>

          <div className="mt-sp-5 flex justify-end gap-sp-2">
            <Button type="button" variant="subtle" onClick={close}>Annuler</Button>
            <Button type="submit">Créer le template</Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
