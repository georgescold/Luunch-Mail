"use client";

import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { Target, Search, MailCheck, Plus } from "lucide-react";
import {
  runPlacementAction,
  checkBlacklistAction,
  verifyEmailAction,
  addSuppressionEntryAction,
} from "@/server/deliverability-actions";

/** Modales d'action de la page Délivrabilité — composants client (le Modal
 *  exige des props fonction, interdites depuis un composant serveur). */

export function PlacementModal() {
  return (
    <Modal
      title="Lancer un test de placement"
      description="Le test est envoyé sur nos seed lists Gmail / Outlook / Yahoo, puis analysé."
      trigger={(open) => (
        <Button onClick={open} className="shrink-0">
          <Target size={16} /> Lancer un test de placement
        </Button>
      )}
    >
      {(close) => (
        <form action={runPlacementAction} className="space-y-sp-4">
          <Field label="Nom du test" htmlFor="pt-name" hint="Ex. « Pré-lancement campagne Q3 »">
            <Input id="pt-name" name="name" placeholder="Test de placement" autoFocus />
          </Field>
          <div className="flex justify-end gap-sp-2">
            <Button type="button" variant="subtle" onClick={close}>Annuler</Button>
            <Button type="submit" onClick={close}>Lancer le test</Button>
          </div>
        </form>
      )}
    </Modal>
  );
}

export function BlacklistModal() {
  return (
    <Modal
      title="Vérifier un domaine ou une IP"
      description="Lookup en temps réel sur les principales DNSBL surveillées."
      trigger={(open) => (
        <Button onClick={open} className="shrink-0">
          <Search size={16} /> Vérifier un domaine/IP
        </Button>
      )}
    >
      {(close) => (
        <form action={checkBlacklistAction} className="space-y-sp-4">
          <Field label="Domaine ou adresse IP" htmlFor="bl-target" hint="Ex. mondomaine.com ou 203.0.113.42">
            <Input id="bl-target" name="target" placeholder="mondomaine.com" autoFocus required />
          </Field>
          <div className="flex justify-end gap-sp-2">
            <Button type="button" variant="subtle" onClick={close}>Annuler</Button>
            <Button type="submit" onClick={close}>Vérifier</Button>
          </div>
        </form>
      )}
    </Modal>
  );
}

export function VerifyEmailModal() {
  return (
    <Modal
      title="Vérifier une adresse e-mail"
      description="Vérification syntaxe + MX en temps réel, avec détection catch-all / risqué."
      trigger={(open) => (
        <Button onClick={open} className="shrink-0">
          <MailCheck size={16} /> Vérifier une adresse
        </Button>
      )}
    >
      {(close) => (
        <form action={verifyEmailAction} className="space-y-sp-4">
          <Field label="Adresse e-mail" htmlFor="ev-email" hint="Ex. prenom.nom@entreprise.com">
            <Input id="ev-email" name="email" type="email" placeholder="contact@entreprise.com" autoFocus required />
          </Field>
          <div className="flex justify-end gap-sp-2">
            <Button type="button" variant="subtle" onClick={close}>Annuler</Button>
            <Button type="submit" onClick={close}>Vérifier</Button>
          </div>
        </form>
      )}
    </Modal>
  );
}

export function SuppressionModal() {
  return (
    <Modal
      title="Ajouter à la liste de suppression"
      description="L'adresse ne recevra plus aucun e-mail marketing ou outreach."
      trigger={(open) => (
        <Button onClick={open} className="shrink-0">
          <Plus size={16} /> Ajouter une adresse
        </Button>
      )}
    >
      {(close) => (
        <form action={addSuppressionEntryAction} className="space-y-sp-4">
          <Field label="Adresse e-mail" htmlFor="su-email">
            <Input id="su-email" name="email" type="email" placeholder="adresse@exemple.com" autoFocus required />
          </Field>
          <div className="flex justify-end gap-sp-2">
            <Button type="button" variant="subtle" onClick={close}>Annuler</Button>
            <Button type="submit" onClick={close}>Ajouter</Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
