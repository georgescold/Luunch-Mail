"use client";

import { useState, useTransition } from "react";
import { Save, Check, Code2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { updateTemplateCodeAction } from "@/server/composer-actions";

export function CodeEditor({
  templateId,
  initialCode,
  field = "reactSource",
}: {
  templateId: string;
  initialCode: string;
  field?: "reactSource" | "html";
}) {
  const [code, setCode] = useState(initialCode);
  const [dirty, setDirty] = useState(false);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  function save() {
    startTransition(async () => {
      await updateTemplateCodeAction(templateId, code, field);
      setDirty(false);
      setSaved(true);
    });
  }

  return (
    <div className="space-y-sp-3">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-sp-2 text-sm font-medium text-ink-muted">
          <Code2 size={16} className="text-primary" />
          {field === "html" ? "Code HTML" : "Code React Email (.tsx)"}
        </span>
        <Button size="sm" onClick={save} disabled={pending || !dirty}>
          {saved && !dirty ? <Check size={15} /> : <Save size={15} />}
          {pending ? "Enregistrement…" : saved && !dirty ? "Enregistré" : "Sauvegarder"}
        </Button>
      </div>
      <textarea
        value={code}
        onChange={(e) => { setCode(e.target.value); setDirty(true); setSaved(false); }}
        spellCheck={false}
        rows={20}
        className="w-full resize-y rounded-sm border border-line-strong bg-fill-subtle px-sp-4 py-sp-3 font-mono text-xs leading-relaxed text-ink transition-colors focus:border-primary focus:outline-none focus:shadow-focus"
        placeholder={field === "html" ? "<h1>Bonjour {{first_name}}</h1>" : "import { Html } from \"@react-email/components\";"}
      />
    </div>
  );
}
