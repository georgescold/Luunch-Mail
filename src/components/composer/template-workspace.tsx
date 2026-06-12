"use client";

import { useState } from "react";
import { FileText, Code2, LayoutTemplate } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/core/cn";
import { parseJson } from "@/lib/core/fmt";
import { BlockEditor, type Block } from "./block-editor";
import { CodeEditor } from "./code-editor";

export type EditableTemplate = {
  id: string;
  name: string;
  kind: string;
  category: string | null;
  subject: string | null;
  design: string | null;
  reactSource: string | null;
  html: string | null;
};

const KIND_LABEL: Record<string, string> = {
  drag: "Visuel",
  react_email: "React Email",
  html: "HTML",
};

/** Sélecteur de template + éditeur correspondant (visuel ou code). */
export function TemplateWorkspace({
  templates,
  mode,
}: {
  templates: EditableTemplate[];
  mode: "visual" | "code";
}) {
  // En mode visuel : on ne propose que les templates "drag". En mode code : react_email + html.
  const list = templates.filter((t) =>
    mode === "visual" ? t.kind === "drag" : t.kind === "react_email" || t.kind === "html",
  );

  const [activeId, setActiveId] = useState<string | null>(list[0]?.id ?? null);
  const active = list.find((t) => t.id === activeId) ?? null;

  if (list.length === 0) {
    return (
      <EmptyState
        icon={mode === "visual" ? LayoutTemplate : Code2}
        title={mode === "visual" ? "Aucun template visuel" : "Aucun template code"}
        description={
          mode === "visual"
            ? "Créez un template de type « Glisser-déposer » depuis l'onglet Bibliothèque pour l'éditer ici en blocs."
            : "Créez un template « React Email » ou « HTML » depuis l'onglet Bibliothèque pour éditer son code ici."
        }
      />
    );
  }

  return (
    <div className="space-y-sp-4">
      {/* Sélecteur de template */}
      <div className="flex flex-wrap gap-sp-2">
        {list.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setActiveId(t.id)}
            className={cn(
              "inline-flex items-center gap-sp-2 rounded-md border px-sp-3 py-sp-2 text-sm font-medium transition-colors",
              activeId === t.id
                ? "border-primary bg-primary-soft text-primary"
                : "border-line bg-surface text-ink-muted hover:border-line-strong hover:bg-fill-subtle",
            )}
          >
            <FileText size={15} />
            <span className="max-w-[160px] truncate">{t.name}</span>
            <Badge tone={activeId === t.id ? "primary" : "neutral"}>{KIND_LABEL[t.kind] ?? t.kind}</Badge>
          </button>
        ))}
      </div>

      {active && (
        <>
          <div className="flex flex-wrap items-center gap-sp-3 rounded-md border border-line bg-fill-subtle px-sp-4 py-sp-3">
            <span className="text-sm font-medium text-ink">{active.name}</span>
            {active.category && <Badge tone="info">{active.category}</Badge>}
            <Badge tone="purple">{KIND_LABEL[active.kind] ?? active.kind}</Badge>
          </div>

          {mode === "visual" ? (
            <BlockEditor
              key={active.id}
              templateId={active.id}
              initialSubject={active.subject ?? ""}
              initialDesign={parseJson<Block[]>(active.design, [])}
            />
          ) : (
            <CodeEditor
              key={active.id}
              templateId={active.id}
              field={active.kind === "html" ? "html" : "reactSource"}
              initialCode={(active.kind === "html" ? active.html : active.reactSource) ?? ""}
            />
          )}
        </>
      )}
    </div>
  );
}
