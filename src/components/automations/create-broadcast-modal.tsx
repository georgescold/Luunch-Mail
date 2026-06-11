"use client";

import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/input";
import { Switch } from "@/components/ui/toggle";
import { Send, Plus } from "lucide-react";
import { createBroadcastAction } from "@/server/automations-actions";

export type ListOption = { id: string; name: string; members: number };
export type SegmentOption = { id: string; name: string; matchCount: number };

export function CreateBroadcastModal({ lists, segments }: { lists: ListOption[]; segments: SegmentOption[] }) {
  const hasTargets = lists.length > 0 || segments.length > 0;
  return (
    <Modal
      title="Nouveau broadcast"
      description="Diffusion ponctuelle d'un e-mail à une liste ou un segment opt-in."
      trigger={(open) => (
        <Button size="sm" onClick={open}>
          <Plus size={16} /> Nouveau broadcast
        </Button>
      )}
    >
      {(close) => (
        <form action={createBroadcastAction} onSubmit={close}>
          <Field label="Nom interne" htmlFor="bc-name">
            <Input id="bc-name" name="name" placeholder="Newsletter de juin" required />
          </Field>
          <Field label="Objet de l'e-mail" htmlFor="bc-subject">
            <Input id="bc-subject" name="subject" placeholder="Nos nouveautés du mois ☀️" required />
          </Field>

          <Field label="Cible" htmlFor="bc-target" hint={hasTargets ? "Liste statique ou segment dynamique." : "Créez d'abord une liste ou un segment dans Audiences."}>
            <Select id="bc-target" name="target" required defaultValue="">
              <option value="" disabled>Choisir une cible…</option>
              {lists.length > 0 && (
                <optgroup label="Listes">
                  {lists.map((l) => (
                    <option key={l.id} value={`list:${l.id}`}>{l.name} ({l.members})</option>
                  ))}
                </optgroup>
              )}
              {segments.length > 0 && (
                <optgroup label="Segments">
                  {segments.map((s) => (
                    <option key={s.id} value={`segment:${s.id}`}>{s.name} ({s.matchCount})</option>
                  ))}
                </optgroup>
              )}
            </Select>
          </Field>

          <Field label="Planification" htmlFor="bc-schedule">
            <Select id="bc-schedule" name="schedule" defaultValue="now">
              <option value="now">Maintenant (brouillon prêt à envoyer)</option>
              <option value="in1h">Dans 1 heure</option>
              <option value="tomorrow9">Demain à 9h00</option>
            </Select>
          </Field>

          <div className="mt-sp-4 space-y-sp-3 rounded-md bg-fill-subtle p-sp-4">
            <label className="flex items-center justify-between gap-sp-4">
              <span>
                <span className="block text-sm font-medium text-ink">Optimisation de l'heure d'envoi</span>
                <span className="block text-xs text-ink-faint">Envoyer à l'heure où chaque contact ouvre le plus.</span>
              </span>
              <Switch name="sendTimeOpt" />
            </label>
            <label className="flex items-center justify-between gap-sp-4">
              <span>
                <span className="block text-sm font-medium text-ink">A/B/n testing</span>
                <span className="block text-xs text-ink-faint">Tester plusieurs objets et garder le meilleur.</span>
              </span>
              <Switch name="abTesting" />
            </label>
          </div>

          <div className="mt-sp-5 flex justify-end gap-sp-2">
            <Button type="button" variant="ghost" onClick={close}>Annuler</Button>
            <Button type="submit" disabled={!hasTargets}>
              <Send size={16} /> Créer le broadcast
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
