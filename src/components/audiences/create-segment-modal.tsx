"use client";

import { useState } from "react";
import { Filter, Plus, Trash2 } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input, Select, Field, Label } from "@/components/ui/input";
import { createSegmentAction } from "@/server/audiences-actions";

const FIELDS = [
  { value: "email", label: "E-mail" },
  { value: "firstName", label: "Prénom" },
  { value: "company", label: "Société" },
  { value: "status", label: "Statut" },
  { value: "engagementScore", label: "Score d'engagement" },
  { value: "churnRisk", label: "Risque d'attrition" },
  { value: "predictedClv", label: "CLV prévue" },
];

const OPS = [
  { value: "equals", label: "est égal à" },
  { value: "contains", label: "contient" },
  { value: "gt", label: "supérieur à" },
  { value: "lt", label: "inférieur à" },
  { value: "is_set", label: "est renseigné" },
];

export function CreateSegmentModal() {
  return (
    <Modal
      wide
      title="Créer un segment"
      description="Un segment est dynamique : il se recalcule en temps réel selon les conditions."
      trigger={(open) => (
        <Button size="sm" onClick={open}>
          <Filter size={16} /> Créer un segment
        </Button>
      )}
    >
      {(close) => <SegmentForm close={close} />}
    </Modal>
  );
}

function SegmentForm({ close }: { close: () => void }) {
  const [rows, setRows] = useState([0, 1]);

  const addRow = () => setRows((r) => (r.length < 3 ? [...r, r.length] : r));
  const removeRow = (idx: number) => setRows((r) => (r.length > 1 ? r.filter((i) => i !== idx) : r));

  return (
    <form action={createSegmentAction} onSubmit={() => close()}>
      <Field label="Nom du segment" htmlFor="seg-name">
        <Input id="seg-name" name="name" required placeholder="Clients VIP engagés" />
      </Field>

      <Field label="Correspondance" htmlFor="seg-match" hint="« Toutes » = ET logique · « Au moins une » = OU logique.">
        <Select id="seg-match" name="match" defaultValue="all">
          <option value="all">Toutes les conditions</option>
          <option value="any">Au moins une condition</option>
        </Select>
      </Field>

      <Label>Conditions</Label>
      <div className="space-y-sp-2">
        {rows.map((idx) => (
          <div key={idx} className="grid grid-cols-[1fr_1fr_1fr_auto] items-center gap-sp-2">
            <Select name={`field_${idx}`} defaultValue="status">
              {FIELDS.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </Select>
            <Select name={`op_${idx}`} defaultValue="equals">
              {OPS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
            <Input name={`value_${idx}`} placeholder="Valeur" />
            <button
              type="button"
              onClick={() => removeRow(idx)}
              className="flex h-9 w-9 items-center justify-center rounded-sm text-ink-faint transition-colors hover:bg-error-soft hover:text-error disabled:opacity-30"
              disabled={rows.length <= 1}
              aria-label="Retirer la condition"
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </div>

      {rows.length < 3 && (
        <button
          type="button"
          onClick={addRow}
          className="mt-sp-2 inline-flex items-center gap-sp-1 text-sm font-medium text-primary hover:underline"
        >
          <Plus size={14} /> Ajouter une condition
        </button>
      )}

      <div className="mt-sp-5 flex justify-end gap-sp-2">
        <Button type="button" variant="subtle" onClick={close}>
          Annuler
        </Button>
        <Button type="submit">Créer le segment</Button>
      </div>
    </form>
  );
}
