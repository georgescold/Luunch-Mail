"use client";

import { useState, useTransition } from "react";
import { Sparkles, Send, Archive, Loader2, Bot, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { Switch } from "@/components/ui/toggle";
import { Chip } from "@/components/ui/chip";
import { Tooltip } from "@/components/ui/tooltip";
import {
  generateReplyAction,
  sendReplyAction,
  setCategoryAction,
  archiveThreadAction,
} from "@/server/inbox-actions";

const CATEGORY_OPTIONS: { value: string; label: string }[] = [
  { value: "interested", label: "Intéressé" },
  { value: "not_interested", label: "Pas intéressé" },
  { value: "ooo", label: "Absent / OOO" },
  { value: "unsubscribe", label: "Désinscription" },
  { value: "bounce", label: "Bounce" },
  { value: "neutral", label: "Neutre" },
];

export function ReplyPanel({
  threadId,
  currentCategory,
  initialDraft,
  aiAvailable,
}: {
  threadId: string;
  currentCategory: string | null;
  initialDraft?: string;
  aiAvailable: boolean;
}) {
  const [body, setBody] = useState(initialDraft ?? "");
  const [autopilot, setAutopilot] = useState(false);
  const [isGenerating, startGenerate] = useTransition();
  const [isSending, startSend] = useTransition();
  const [isMutating, startMutate] = useTransition();
  const [sent, setSent] = useState(false);

  function handleGenerate() {
    startGenerate(async () => {
      const draft = await generateReplyAction(threadId);
      setBody(draft ?? "");
      setSent(false);
    });
  }

  function handleSend() {
    const text = body.trim();
    if (!text) return;
    startSend(async () => {
      await sendReplyAction(threadId, text);
      setBody("");
      setSent(true);
    });
  }

  function handleCategory(value: string) {
    startMutate(async () => {
      await setCategoryAction(threadId, value);
    });
  }

  function handleArchive() {
    startMutate(async () => {
      await archiveThreadAction(threadId);
    });
  }

  return (
    <div className="border-t border-line bg-fill-subtle p-sp-4">
      {/* Mode de l'agent : Human-in-the-loop vs Autopilot */}
      <div className="mb-sp-3 flex flex-wrap items-center justify-between gap-sp-3">
        <div className="flex items-center gap-sp-3">
          <span
            className={`flex h-8 w-8 items-center justify-center rounded-md ${
              autopilot ? "bg-primary-soft text-primary" : "bg-fill-muted text-ink-faint"
            }`}
          >
            {autopilot ? <Bot size={16} /> : <UserCheck size={16} />}
          </span>
          <div>
            <p className="text-sm font-medium text-ink">
              {autopilot ? "Autopilot" : "Human-in-the-loop"}
            </p>
            <p className="text-xs text-ink-faint">
              {autopilot
                ? "L'agent répond seul aux prospects intéressés en moins de 5 min."
                : "Vous validez chaque réponse avant l'envoi."}
            </p>
          </div>
        </div>
        <label className="flex cursor-pointer items-center gap-sp-2 text-xs font-medium text-ink-muted">
          Autopilot
          <Switch checked={autopilot} onChange={(e) => setAutopilot(e.target.checked)} />
        </label>
      </div>

      {/* Étiquetage de la conversation (catégories) */}
      <div className="mb-sp-3 flex flex-wrap items-center gap-sp-1">
        <span className="mr-sp-1 text-xs text-ink-faint">Catégorie :</span>
        {CATEGORY_OPTIONS.map((opt) => (
          <Chip
            key={opt.value}
            selected={currentCategory === opt.value}
            disabled={isMutating}
            onClick={() => handleCategory(opt.value)}
          >
            {opt.label}
          </Chip>
        ))}
      </div>

      <Textarea
        value={body}
        onChange={(e) => {
          setBody(e.target.value);
          setSent(false);
        }}
        placeholder="Rédigez votre réponse, ou générez un brouillon avec l'IA…"
        className="min-h-[120px] bg-surface"
      />

      {sent && (
        <p className="mt-sp-2 text-xs text-success-fg">Réponse envoyée au prospect.</p>
      )}

      <div className="mt-sp-3 flex flex-wrap items-center gap-sp-2">
        <Tooltip
          className="w-64 whitespace-normal text-center"
          content={
            aiAvailable
              ? "L'agent rédige une réponse à partir du dernier message du prospect."
              : "Mode démo IA — configurez ANTHROPIC_API_KEY pour des réponses réelles."
          }
        >
          <Button
            variant="secondary"
            size="sm"
            onClick={handleGenerate}
            disabled={isGenerating || isSending}
          >
            {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
            Générer une réponse IA
          </Button>
        </Tooltip>

        <Button size="sm" onClick={handleSend} disabled={isSending || !body.trim()}>
          {isSending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          {autopilot ? "Approuver et envoyer" : "Envoyer"}
        </Button>

        <Button
          variant="subtle"
          size="sm"
          onClick={handleArchive}
          disabled={isMutating}
          className="ml-auto"
        >
          <Archive size={16} /> Archiver
        </Button>
      </div>
    </div>
  );
}
