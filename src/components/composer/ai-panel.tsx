"use client";

import { useState, useTransition } from "react";
import { Sparkles, Wand2, Copy, Check, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Card, CardTitle, CardDescription } from "@/components/ui/card";
import { aiSubjectsAction, aiBodyAction } from "@/server/composer-actions";

export function AiPanel({ aiReady }: { aiReady: boolean }) {
  const [topic, setTopic] = useState("");
  const [subjects, setSubjects] = useState<string[]>([]);
  const [brief, setBrief] = useState("");
  const [body, setBody] = useState("");
  const [copied, setCopied] = useState<string | null>(null);
  const [subjectsPending, startSubjects] = useTransition();
  const [bodyPending, startBody] = useTransition();

  function generateSubjects() {
    if (!topic.trim()) return;
    startSubjects(async () => {
      const res = await aiSubjectsAction(topic);
      setSubjects(res);
    });
  }

  function generateBody() {
    if (!brief.trim()) return;
    startBody(async () => {
      const res = await aiBodyAction(brief);
      setBody(res);
    });
  }

  async function copy(text: string, key: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied((c) => (c === key ? null : c)), 1500);
    } catch {
      /* presse-papiers indisponible */
    }
  }

  return (
    <div className="space-y-sp-5">
      {!aiReady && (
        <div className="flex items-start gap-sp-3 rounded-md border border-warning-soft bg-warning-soft px-sp-4 py-sp-3 text-sm text-warning-fg">
          <Lightbulb size={18} className="mt-px shrink-0" />
          <p>
            <span className="font-medium">Mode démo IA actif.</span> Les générations sont simulées localement.
            Configurez <code className="font-mono">ANTHROPIC_API_KEY</code> ou <code className="font-mono">OPENAI_API_KEY</code> pour des résultats réels.
          </p>
        </div>
      )}

      <div className="grid gap-sp-5 lg:grid-cols-2">
        {/* Objets */}
        <Card>
          <CardTitle className="flex items-center gap-sp-2"><Sparkles size={18} className="text-primary" /> Générer des objets</CardTitle>
          <CardDescription className="mt-sp-1">Donnez un sujet ou thème, l'IA propose 5 objets accrocheurs.</CardDescription>

          <div className="mt-sp-4 flex flex-col gap-sp-2 sm:flex-row">
            <Input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Ex : lancement de notre offre d'été"
              onKeyDown={(e) => e.key === "Enter" && generateSubjects()}
            />
            <Button onClick={generateSubjects} disabled={subjectsPending || !topic.trim()} className="shrink-0">
              <Wand2 size={16} /> {subjectsPending ? "Génération…" : "Générer"}
            </Button>
          </div>

          {subjects.length > 0 && (
            <ul className="mt-sp-4 space-y-sp-2">
              {subjects.map((s, i) => (
                <li key={i} className="flex items-center justify-between gap-sp-2 rounded-sm border border-line bg-fill-subtle px-sp-3 py-sp-2 text-sm text-ink">
                  <span className="min-w-0 truncate">{s}</span>
                  <button
                    type="button"
                    onClick={() => copy(s, `subj-${i}`)}
                    className="shrink-0 rounded-sm p-sp-1 text-ink-faint transition-colors hover:bg-surface hover:text-primary"
                    aria-label="Copier l'objet"
                    title="Copier"
                  >
                    {copied === `subj-${i}` ? <Check size={15} className="text-success-fg" /> : <Copy size={15} />}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Corps */}
        <Card>
          <CardTitle className="flex items-center gap-sp-2"><Sparkles size={18} className="text-primary" /> Générer un corps</CardTitle>
          <CardDescription className="mt-sp-1">Décrivez votre message, l'IA rédige un brouillon prêt à coller.</CardDescription>

          <div className="mt-sp-4 space-y-sp-2">
            <Textarea
              value={brief}
              onChange={(e) => setBrief(e.target.value)}
              placeholder="Ex : annoncer une remise de 20 % aux clients fidèles, ton chaleureux, inviter à cliquer"
              rows={3}
            />
            <Button onClick={generateBody} disabled={bodyPending || !brief.trim()}>
              <Wand2 size={16} /> {bodyPending ? "Rédaction…" : "Générer le corps"}
            </Button>
          </div>

          {body && (
            <div className="mt-sp-4">
              <div className="mb-sp-2 flex items-center justify-between">
                <span className="text-xs font-medium text-ink-muted">Brouillon généré</span>
                <button
                  type="button"
                  onClick={() => copy(body, "body")}
                  className="inline-flex items-center gap-sp-1 rounded-sm px-sp-2 py-sp-1 text-xs text-ink-faint transition-colors hover:bg-fill-subtle hover:text-primary"
                >
                  {copied === "body" ? <Check size={14} className="text-success-fg" /> : <Copy size={14} />} Copier
                </button>
              </div>
              <pre className="max-h-72 overflow-y-auto whitespace-pre-wrap rounded-sm border border-line bg-fill-subtle p-sp-3 text-sm leading-relaxed text-ink">
                {body}
              </pre>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
