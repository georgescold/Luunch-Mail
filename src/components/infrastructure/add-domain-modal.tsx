"use client";

import { Plus, ShieldCheck } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/input";
import { addDomainAction } from "@/server/infrastructure-actions";

export function AddDomainModal() {
  return (
    <Modal
      title="Connecter un domaine"
      description="Luunch Mail génère automatiquement SPF, DKIM et DMARC pour authentifier vos envois."
      trigger={(open) => (
        <Button onClick={open} size="sm">
          <Plus size={16} /> Connecter un domaine
        </Button>
      )}
    >
      {(close) => (
        <form action={addDomainAction} onSubmit={() => setTimeout(close, 0)}>
          <Field label="Nom de domaine" htmlFor="domain-name" hint="Le domaine que vous utiliserez pour expédier (ex. envois.maboite.fr).">
            <Input id="domain-name" name="name" placeholder="envois.maboite.fr" autoComplete="off" required />
          </Field>

          <div className="grid gap-sp-4 sm:grid-cols-2">
            <Field label="Région d'envoi" htmlFor="domain-region" hint="Envoie depuis la région la plus proche de vos destinataires.">
              <Select id="domain-region" name="region" defaultValue="eu">
                <option value="eu">Europe</option>
                <option value="us">Amérique du Nord</option>
                <option value="sa">Amérique du Sud</option>
                <option value="asia">Asie</option>
              </Select>
            </Field>

            <Field label="Configuration DNS" htmlFor="domain-provider" hint="Cloudflare : pose automatique des enregistrements.">
              <Select id="domain-provider" name="provider" defaultValue="manual">
                <option value="manual">Manuelle (copier-coller)</option>
                <option value="cloudflare">Cloudflare (API)</option>
              </Select>
            </Field>
          </div>

          <div className="mb-sp-4 flex items-start gap-sp-3 rounded-md bg-primary-soft/50 px-sp-4 py-sp-3 text-sm text-ink-muted">
            <ShieldCheck size={18} className="mt-px shrink-0 text-primary" />
            <span>
              À la création, nous générons une paire de clés <strong>DKIM</strong>, l'enregistrement <strong>SPF</strong> et
              une politique <strong>DMARC</strong>, plus le CNAME de tracking. Vous n'avez qu'à publier les enregistrements.
            </span>
          </div>

          <div className="flex justify-end gap-sp-2">
            <Button type="button" variant="subtle" onClick={close}>Annuler</Button>
            <Button type="submit">Connecter le domaine</Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
