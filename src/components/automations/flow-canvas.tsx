"use client";

import { useState } from "react";
import {
  Zap, Mail, Clock, GitBranch, Tag, Plus, ArrowDown, Trash2, Flag,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/core/cn";
import { addNodeAction, removeNodeAction } from "@/server/automations-actions";

export type CanvasNode = {
  id: string;
  type: "trigger" | "email" | "wait" | "condition" | "action";
  title: string;
  detail?: string;
  subject?: string;
  waitDays?: number;
  conditionIf?: string;
  actionKind?: string;
};

const NODE_META: Record<
  CanvasNode["type"],
  { icon: typeof Zap; label: string; ring: string; chip: string; iconWrap: string }
> = {
  trigger: { icon: Zap, label: "Déclencheur", ring: "border-primary", chip: "bg-primary-soft text-primary", iconWrap: "bg-primary text-white" },
  email: { icon: Mail, label: "E-mail", ring: "border-line", chip: "bg-primary-soft text-primary", iconWrap: "bg-primary-soft text-primary" },
  wait: { icon: Clock, label: "Attente", ring: "border-line", chip: "bg-warning-soft text-warning-fg", iconWrap: "bg-warning-soft text-warning-fg" },
  condition: { icon: GitBranch, label: "Condition", ring: "border-line", chip: "bg-[#DBEAFE] text-secondary", iconWrap: "bg-[#DBEAFE] text-secondary" },
  action: { icon: Tag, label: "Action", ring: "border-line", chip: "bg-[#EDE9FE] text-[#6D28D9]", iconWrap: "bg-[#EDE9FE] text-[#6D28D9]" },
};

const ADD_OPTIONS: { type: CanvasNode["type"]; label: string; icon: typeof Mail }[] = [
  { type: "email", label: "E-mail", icon: Mail },
  { type: "wait", label: "Attente", icon: Clock },
  { type: "condition", label: "Condition", icon: GitBranch },
  { type: "action", label: "Action", icon: Tag },
];

/** Canvas visuel : rend la chaîne de nodes reliés par des connecteurs verticaux,
 *  avec ajout/suppression de nodes via server actions. */
export function FlowCanvas({
  flowId,
  nodes,
  goal,
  editable = true,
}: {
  flowId: string;
  nodes: CanvasNode[];
  goal?: string | null;
  editable?: boolean;
}) {
  const [picking, setPicking] = useState(false);

  return (
    <div className="flex flex-col items-center">
      {nodes.map((node, i) => {
        const meta = NODE_META[node.type] ?? NODE_META.email;
        const Icon = meta.icon;
        return (
          <div key={node.id} className="flex w-full max-w-md flex-col items-center">
            <Card className={cn("w-full border-2 shadow-sm transition-shadow hover:shadow-md", meta.ring)}>
              <div className="flex items-start gap-sp-3">
                <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-md", meta.iconWrap)}>
                  <Icon size={18} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-sp-2">
                    <span className={cn("rounded-pill px-sp-2 py-[2px] text-[10px] font-semibold uppercase tracking-wide", meta.chip)}>
                      {meta.label}
                    </span>
                    {node.type === "wait" && node.waitDays != null && (
                      <Badge tone="warning">{node.waitDays === 0 ? "< 1 j" : `${node.waitDays} j`}</Badge>
                    )}
                  </div>
                  <p className="mt-sp-2 truncate font-medium text-ink">{node.title}</p>
                  {node.subject && <p className="truncate text-xs text-ink-faint">Objet : {node.subject}</p>}
                  {node.detail && <p className="mt-sp-1 text-xs text-ink-faint">{node.detail}</p>}
                </div>

                {editable && node.type !== "trigger" && (
                  <form action={removeNodeAction}>
                    <input type="hidden" name="flowId" value={flowId} />
                    <input type="hidden" name="nodeId" value={node.id} />
                    <button
                      type="submit"
                      title="Supprimer cette étape"
                      className="rounded-sm p-sp-1 text-ink-faint transition-colors hover:bg-error-soft hover:text-error"
                    >
                      <Trash2 size={16} />
                    </button>
                  </form>
                )}
              </div>
            </Card>

            {/* connecteur vertical vers le node suivant */}
            {i < nodes.length - 1 && <Connector />}
          </div>
        );
      })}

      {/* connecteur vers la zone d'ajout */}
      {nodes.length > 0 && editable && <Connector />}

      {/* Ajout d'un node */}
      {editable && (
        <div className="flex w-full max-w-md flex-col items-center">
          {picking ? (
            <Card className="w-full border-dashed">
              <p className="mb-sp-3 text-center text-sm font-medium text-ink-muted">Ajouter une étape</p>
              <div className="grid grid-cols-2 gap-sp-2">
                {ADD_OPTIONS.map((opt) => {
                  const OptIcon = opt.icon;
                  return (
                    <form key={opt.type} action={addNodeAction} onSubmit={() => setPicking(false)}>
                      <input type="hidden" name="flowId" value={flowId} />
                      <input type="hidden" name="type" value={opt.type} />
                      <button
                        type="submit"
                        className="flex w-full items-center justify-center gap-sp-2 rounded-md border border-line bg-fill-subtle px-sp-3 py-sp-3 text-sm font-medium text-ink-muted transition-colors hover:border-primary hover:bg-primary-soft hover:text-primary"
                      >
                        <OptIcon size={16} /> {opt.label}
                      </button>
                    </form>
                  );
                })}
              </div>
              <button
                type="button"
                onClick={() => setPicking(false)}
                className="mt-sp-3 w-full text-center text-xs text-ink-faint hover:text-ink"
              >
                Annuler
              </button>
            </Card>
          ) : (
            <Button variant="secondary" size="sm" onClick={() => setPicking(true)}>
              <Plus size={16} /> Ajouter une étape
            </Button>
          )}
        </div>
      )}

      {/* Objectif de sortie */}
      {goal && (
        <>
          <Connector />
          <div className="flex w-full max-w-md items-center justify-center gap-sp-2 rounded-md border-2 border-dashed border-success bg-success-soft px-sp-4 py-sp-3 text-sm font-medium text-success-fg">
            <Flag size={16} /> Objectif : {goal}
          </div>
        </>
      )}
    </div>
  );
}

function Connector() {
  return (
    <div className="flex h-8 w-full max-w-md flex-col items-center justify-center text-ink-disabled">
      <div className="h-4 w-px bg-line-strong" />
      <ArrowDown size={14} className="-mt-1" />
    </div>
  );
}
