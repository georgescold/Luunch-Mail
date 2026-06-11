"use client";

import { useState, useTransition } from "react";
import {
  Heading1, Type, MousePointerClick, Image as ImageIcon, Minus,
  Quote as QuoteIcon, Share2, MailMinus, Braces,
  GripVertical, Trash2, ArrowUp, ArrowDown, Plus, Save, Check, Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/cn";
import { updateTemplateDesignAction } from "@/server/composer-actions";

/** Types de blocs supportés par l'éditeur drag-and-drop. */
export type BlockType =
  | "heading" | "text" | "button" | "image"
  | "divider" | "quote" | "social" | "unsubscribe" | "variable";

export type Block = { id: string; type: BlockType; text: string };

const BLOCK_META: Record<BlockType, { label: string; icon: any; placeholder: string; defaultText: string }> = {
  heading: { label: "Titre", icon: Heading1, placeholder: "Votre titre accrocheur", defaultText: "Un titre accrocheur" },
  text: { label: "Texte", icon: Type, placeholder: "Votre paragraphe…", defaultText: "Un paragraphe de votre message. Vous pouvez utiliser {{first_name}}." },
  button: { label: "Bouton", icon: MousePointerClick, placeholder: "Libellé du bouton", defaultText: "Cliquez ici" },
  image: { label: "Image", icon: ImageIcon, placeholder: "URL de l'image (https://…)", defaultText: "https://" },
  divider: { label: "Séparateur", icon: Minus, placeholder: "—", defaultText: "" },
  quote: { label: "Citation", icon: QuoteIcon, placeholder: "Une citation inspirante", defaultText: "« Une citation marquante. »" },
  social: { label: "Réseaux sociaux", icon: Share2, placeholder: "Instagram, LinkedIn, X…", defaultText: "Instagram · LinkedIn · X" },
  unsubscribe: { label: "Pied désinscription", icon: MailMinus, placeholder: "Texte du lien de désinscription", defaultText: "Se désinscrire" },
  variable: { label: "Variable", icon: Braces, placeholder: "{{first_name}}", defaultText: "{{first_name}}" },
};

const PALETTE: BlockType[] = ["heading", "text", "button", "image", "divider", "quote", "social", "unsubscribe", "variable"];

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

export function BlockEditor({
  templateId,
  initialDesign,
  initialSubject,
}: {
  templateId: string;
  initialDesign: Block[];
  initialSubject: string;
}) {
  const [blocks, setBlocks] = useState<Block[]>(initialDesign);
  const [subject, setSubject] = useState(initialSubject);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  function touch() {
    setDirty(true);
    setSaved(false);
  }

  function addBlock(type: BlockType) {
    setBlocks((b) => [...b, { id: uid(), type, text: BLOCK_META[type].defaultText }]);
    touch();
  }

  function removeBlock(id: string) {
    setBlocks((b) => b.filter((x) => x.id !== id));
    touch();
  }

  function updateText(id: string, text: string) {
    setBlocks((b) => b.map((x) => (x.id === id ? { ...x, text } : x)));
    touch();
  }

  function move(index: number, dir: -1 | 1) {
    const target = index + dir;
    if (target < 0 || target >= blocks.length) return;
    setBlocks((b) => {
      const next = [...b];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
    touch();
  }

  function onDrop(targetIndex: number) {
    if (dragIndex === null || dragIndex === targetIndex) return;
    setBlocks((b) => {
      const next = [...b];
      const [moved] = next.splice(dragIndex, 1);
      next.splice(targetIndex, 0, moved);
      return next;
    });
    setDragIndex(null);
    touch();
  }

  function save() {
    startTransition(async () => {
      await updateTemplateDesignAction(templateId, JSON.stringify(blocks), subject);
      setDirty(false);
      setSaved(true);
    });
  }

  return (
    <div className="grid gap-sp-5 lg:grid-cols-[1fr_minmax(320px,420px)]">
      {/* Colonne édition */}
      <div className="space-y-sp-4">
        <div className="flex flex-col gap-sp-3 rounded-md border border-line bg-surface p-sp-4 shadow-md sm:flex-row sm:items-end sm:justify-between">
          <div className="w-full">
            <label className="mb-sp-2 block text-sm font-medium text-ink-muted">Objet de l'e-mail</label>
            <Input
              value={subject}
              onChange={(e) => { setSubject(e.target.value); touch(); }}
              placeholder="Ex : Bienvenue chez {{company}} 🎉"
            />
          </div>
          <Button onClick={save} disabled={pending || !dirty} className="shrink-0">
            {saved && !dirty ? <Check size={16} /> : <Save size={16} />}
            {pending ? "Enregistrement…" : saved && !dirty ? "Enregistré" : "Sauvegarder"}
          </Button>
        </div>

        {/* Palette d'ajout */}
        <div className="rounded-md border border-line bg-surface p-sp-4 shadow-md">
          <p className="mb-sp-3 flex items-center gap-sp-2 text-sm font-medium text-ink-muted">
            <Plus size={16} className="text-primary" /> Ajouter un bloc
          </p>
          <div className="flex flex-wrap gap-sp-2">
            {PALETTE.map((t) => {
              const Icon = BLOCK_META[t].icon;
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => addBlock(t)}
                  className="inline-flex items-center gap-sp-1 rounded-pill border border-line bg-fill-muted px-sp-3 py-sp-1 text-xs font-medium text-ink-muted transition-colors hover:border-primary hover:bg-primary-soft hover:text-primary"
                >
                  <Icon size={14} /> {BLOCK_META[t].label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Liste des blocs */}
        {blocks.length === 0 ? (
          <div className="rounded-md border border-dashed border-line bg-surface px-sp-5 py-sp-8 text-center text-sm text-ink-faint">
            Aucun bloc pour l'instant. Ajoutez-en un depuis la palette ci-dessus.
          </div>
        ) : (
          <ul className="space-y-sp-3">
            {blocks.map((block, index) => {
              const meta = BLOCK_META[block.type];
              const Icon = meta.icon;
              return (
                <li
                  key={block.id}
                  draggable
                  onDragStart={() => setDragIndex(index)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => onDrop(index)}
                  onDragEnd={() => setDragIndex(null)}
                  className={cn(
                    "rounded-md border border-line bg-surface p-sp-4 shadow-sm transition-shadow hover:shadow-md",
                    dragIndex === index && "opacity-50 ring-2 ring-primary",
                  )}
                >
                  <div className="mb-sp-3 flex items-center justify-between gap-sp-2">
                    <span className="flex items-center gap-sp-2">
                      <GripVertical size={16} className="cursor-grab text-ink-disabled" />
                      <Badge tone="primary"><Icon size={12} /> {meta.label}</Badge>
                    </span>
                    <span className="flex items-center gap-sp-1">
                      <IconBtn label="Monter" onClick={() => move(index, -1)} disabled={index === 0}>
                        <ArrowUp size={15} />
                      </IconBtn>
                      <IconBtn label="Descendre" onClick={() => move(index, 1)} disabled={index === blocks.length - 1}>
                        <ArrowDown size={15} />
                      </IconBtn>
                      <IconBtn label="Supprimer" onClick={() => removeBlock(block.id)} destructive>
                        <Trash2 size={15} />
                      </IconBtn>
                    </span>
                  </div>

                  {block.type === "divider" ? (
                    <p className="text-xs italic text-ink-faint">Séparateur visuel (aucun texte).</p>
                  ) : block.type === "text" || block.type === "quote" ? (
                    <textarea
                      value={block.text}
                      onChange={(e) => updateText(block.id, e.target.value)}
                      placeholder={meta.placeholder}
                      rows={3}
                      className="w-full resize-y rounded-sm border border-line-strong bg-surface px-sp-3 py-sp-2 text-sm text-ink transition-colors placeholder:text-ink-disabled focus:border-primary focus:outline-none focus:shadow-focus"
                    />
                  ) : (
                    <input
                      value={block.text}
                      onChange={(e) => updateText(block.id, e.target.value)}
                      placeholder={meta.placeholder}
                      className={cn(
                        "w-full rounded-sm border border-line-strong bg-surface px-sp-3 py-sp-2 text-sm text-ink transition-colors placeholder:text-ink-disabled focus:border-primary focus:outline-none focus:shadow-focus",
                        (block.type === "variable" || block.type === "image") && "font-mono",
                      )}
                    />
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Colonne aperçu */}
      <div>
        <div className="sticky top-sp-4 rounded-md border border-line bg-surface shadow-md">
          <div className="flex items-center gap-sp-2 border-b border-line px-sp-4 py-sp-3 text-sm font-medium text-ink-muted">
            <Eye size={16} className="text-primary" /> Aperçu
          </div>
          <div className="max-h-[70vh] overflow-y-auto bg-fill-subtle p-sp-4">
            <div className="mx-auto max-w-md rounded-md border border-line bg-surface p-sp-5 shadow-sm">
              <p className="mb-sp-4 border-b border-line pb-sp-2 text-xs text-ink-faint">
                Objet : <span className="font-medium text-ink">{subject || "(sans objet)"}</span>
              </p>
              {blocks.length === 0 ? (
                <p className="py-sp-6 text-center text-sm text-ink-disabled">L'aperçu apparaîtra ici.</p>
              ) : (
                <div className="space-y-sp-3">
                  {blocks.map((b) => (
                    <BlockPreview key={b.id} block={b} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function IconBtn({
  children, onClick, label, disabled, destructive,
}: { children: React.ReactNode; onClick: () => void; label: string; disabled?: boolean; destructive?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={cn(
        "rounded-sm p-sp-1 text-ink-faint transition-colors hover:bg-fill-subtle disabled:cursor-not-allowed disabled:opacity-30",
        destructive ? "hover:bg-error-soft hover:text-error" : "hover:text-ink",
      )}
    >
      {children}
    </button>
  );
}

/** Rend visuellement un bloc dans l'aperçu (le texte garde ses variables/spintax bruts). */
function BlockPreview({ block }: { block: Block }) {
  switch (block.type) {
    case "heading":
      return <h2 className="text-h4 font-headline font-bold text-ink">{block.text}</h2>;
    case "text":
      return <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink-muted">{block.text}</p>;
    case "button":
      return (
        <div>
          <span className="inline-flex items-center rounded-md bg-primary px-sp-5 py-sp-2 text-sm font-medium text-white">
            {block.text || "Bouton"}
          </span>
        </div>
      );
    case "image":
      return (
        <div className="flex h-28 items-center justify-center rounded-sm bg-fill-muted text-xs text-ink-faint">
          {block.text && block.text !== "https://" ? `Image : ${block.text}` : "Emplacement image"}
        </div>
      );
    case "divider":
      return <hr className="border-line" />;
    case "quote":
      return (
        <blockquote className="border-l-2 border-primary pl-sp-3 text-sm italic text-ink-muted">
          {block.text}
        </blockquote>
      );
    case "social":
      return <p className="text-center text-xs font-medium text-secondary">{block.text}</p>;
    case "unsubscribe":
      return <p className="text-center text-xs text-ink-faint underline">{block.text || "Se désinscrire"}</p>;
    case "variable":
      return <code className="rounded bg-fill-muted px-sp-1 font-mono text-xs text-primary">{block.text}</code>;
    default:
      return null;
  }
}
