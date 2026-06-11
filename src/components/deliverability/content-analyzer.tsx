"use client";

import { useState, useTransition } from "react";
import { ScanText, CheckCircle2, XCircle, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { analyzeContentAction } from "@/server/deliverability-actions";

type Check = { label: string; pass: boolean; weight: number; detail: string };
type Result = { score: number; max: number; checks: Check[]; recommendations: string[] };

/** Analyseur de contenu spam : appelle l'action serveur et affiche le retour en place. */
export function ContentAnalyzer() {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [pending, startTransition] = useTransition();

  function run() {
    startTransition(async () => {
      const r = await analyzeContentAction(subject, body);
      setResult(r);
    });
  }

  // Score = points de pénalité (0 = parfait). Plus c'est bas, mieux c'est.
  const tone = result
    ? result.score <= 2
      ? "success"
      : result.score <= 5
        ? "warning"
        : "error"
    : "primary";
  const verdict = result
    ? result.score <= 2
      ? "Excellent — prêt à envoyer"
      : result.score <= 5
        ? "Correct — quelques ajustements conseillés"
        : "À risque — corrigez avant d'envoyer"
    : "";

  return (
    <div className="grid gap-sp-6 lg:grid-cols-2">
      <div>
        <Field label="Objet de l'e-mail" htmlFor="ca-subject">
          <Input
            id="ca-subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Une idée pour booster vos ventes ce trimestre"
          />
        </Field>
        <Field
          label="Corps du message"
          htmlFor="ca-body"
          hint="Collez le HTML ou le texte de votre e-mail. Pensez au lien de désinscription."
        >
          <Textarea
            id="ca-body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Bonjour {{first_name}}, ..."
            className="min-h-[200px]"
          />
        </Field>
        <Button onClick={run} disabled={pending || (!subject && !body)}>
          <ScanText size={16} /> {pending ? "Analyse en cours…" : "Analyser le contenu"}
        </Button>
      </div>

      <div>
        {!result ? (
          <div className="flex h-full min-h-[240px] flex-col items-center justify-center rounded-md border border-dashed border-line bg-fill-subtle px-sp-5 py-sp-8 text-center">
            <span className="mb-sp-4 flex h-14 w-14 items-center justify-center rounded-pill bg-primary-soft text-primary">
              <ScanText size={26} />
            </span>
            <p className="text-sm text-ink-faint">
              Le score (filtres standards type SpamAssassin / Google / Barracuda) et les
              recommandations s'afficheront ici.
            </p>
          </div>
        ) : (
          <div className="space-y-sp-4">
            <div className="rounded-md border border-line bg-surface p-sp-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-ink-faint">Score de spam</span>
                <Badge tone={tone === "primary" ? "neutral" : tone}>{verdict}</Badge>
              </div>
              <div className="mt-sp-3 flex items-baseline gap-sp-1">
                <span className="text-h2 font-headline font-bold text-ink">{result.score}</span>
                <span className="text-sm text-ink-faint">/ {result.max} pts de pénalité</span>
              </div>
              <Progress
                value={result.max - result.score}
                max={result.max}
                tone={tone === "primary" ? "primary" : tone}
                className="mt-sp-3"
              />
              <p className="mt-sp-2 text-xs text-ink-disabled">
                Plus la barre est pleine, plus votre e-mail est sain.
              </p>
            </div>

            <div className="rounded-md border border-line bg-surface p-sp-5 shadow-sm">
              <p className="mb-sp-3 text-sm font-medium text-ink-muted">Vérifications</p>
              <ul className="space-y-sp-2">
                {result.checks.map((c, i) => (
                  <li key={i} className="flex items-start gap-sp-2 text-sm">
                    {c.pass ? (
                      <CheckCircle2 size={16} className="mt-[2px] shrink-0 text-success-fg" />
                    ) : (
                      <XCircle size={16} className="mt-[2px] shrink-0 text-error" />
                    )}
                    <span className={c.pass ? "text-ink" : "text-ink"}>
                      {c.label}
                      <span className="block text-xs text-ink-faint">{c.detail}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {result.recommendations.length > 0 && (
              <div className="rounded-md border border-warning/30 bg-warning-soft/50 p-sp-5">
                <p className="mb-sp-2 flex items-center gap-sp-2 text-sm font-medium text-warning-fg">
                  <Lightbulb size={16} /> Recommandations
                </p>
                <ul className="list-disc space-y-sp-1 pl-sp-5 text-sm text-ink-muted">
                  {result.recommendations.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
