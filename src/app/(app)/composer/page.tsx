import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { hasAiKey } from "@/lib/env";
import { date } from "@/lib/fmt";
import { PageHeader } from "@/components/page-header";
import { Card, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Tabs } from "@/components/ui/tabs";
import { LayoutTemplate, Code2, Sparkles, FileText, Trash2, Braces, Wand2 } from "lucide-react";
import { NewTemplateModal } from "@/components/composer/new-template-modal";
import { TemplateWorkspace, type EditableTemplate } from "@/components/composer/template-workspace";
import { AiPanel } from "@/components/composer/ai-panel";
import { deleteTemplateAction } from "@/server/composer-actions";

const KIND_LABEL: Record<string, string> = {
  drag: "Visuel",
  react_email: "React Email",
  html: "HTML",
};

const CATEGORY_LABEL: Record<string, string> = {
  welcome: "Bienvenue",
  promo: "Promotion",
  newsletter: "Newsletter",
  transactional: "Transactionnel",
  outreach: "Cold outreach",
};

export default async function ComposerPage() {
  const { workspace } = await requireAuth();
  const wid = workspace.id;

  const templates = await db.template.findMany({
    where: { workspaceId: wid },
    orderBy: { updatedAt: "desc" },
  });

  const editable: EditableTemplate[] = templates.map((t) => ({
    id: t.id,
    name: t.name,
    kind: t.kind,
    category: t.category,
    subject: t.subject,
    design: t.design,
    reactSource: t.reactSource,
    html: t.html,
  }));

  const aiReady = hasAiKey();

  // ---- Onglet Bibliothèque ----
  const library = (
    <div className="space-y-sp-5">
      {templates.length === 0 ? (
        <EmptyState
          icon={LayoutTemplate}
          title="Votre bibliothèque est vide"
          description="Créez votre premier template — glisser-déposer pour le no-code, React Email ou HTML pour les développeurs."
          action={<NewTemplateModal />}
        />
      ) : (
        <div className="grid gap-sp-4 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((t) => (
            <Card key={t.id} hover className="flex flex-col">
              <div className="flex items-start justify-between gap-sp-2">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary-soft text-primary">
                  <FileText size={18} />
                </span>
                <div className="flex flex-wrap items-center justify-end gap-sp-1">
                  <Badge tone="purple">{KIND_LABEL[t.kind] ?? t.kind}</Badge>
                  {t.category && <Badge tone="info">{CATEGORY_LABEL[t.category] ?? t.category}</Badge>}
                </div>
              </div>

              <CardTitle className="mt-sp-3 truncate">{t.name}</CardTitle>
              <CardDescription className="mt-sp-1 line-clamp-2 min-h-[2.4em]">
                {t.subject ? `Objet : ${t.subject}` : "Sans objet défini"}
              </CardDescription>

              <div className="mt-sp-4 flex items-center justify-between border-t border-line pt-sp-3">
                <span className="text-xs text-ink-faint">Modifié le {date(t.updatedAt)}</span>
                <form action={deleteTemplateAction}>
                  <input type="hidden" name="templateId" value={t.id} />
                  <button
                    type="submit"
                    aria-label="Supprimer le template"
                    title="Supprimer"
                    className="rounded-sm p-sp-1 text-ink-faint transition-colors hover:bg-error-soft hover:text-error"
                  >
                    <Trash2 size={16} />
                  </button>
                </form>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );

  // ---- Onglet Éditeur visuel ----
  const visual = (
    <div className="space-y-sp-4">
      <p className="text-sm text-ink-faint">
        Composez votre e-mail en empilant des blocs (titre, texte, bouton, image, citation, réseaux sociaux…).
        Réordonnez par glisser-déposer ou avec les flèches, puis sauvegardez. L'aperçu se met à jour en direct.
      </p>
      <TemplateWorkspace templates={editable} mode="visual" />
    </div>
  );

  // ---- Onglet Code React Email ----
  const code = (
    <div className="space-y-sp-5">
      <Card className="border-primary/30 bg-primary-soft/30">
        <CardTitle className="flex items-center gap-sp-2"><Code2 size={18} className="text-primary" /> React Email</CardTitle>
        <CardDescription className="mt-sp-2 text-ink-muted">
          React Email est la bibliothèque open source (créée par l'équipe Resend) pour coder vos e-mails en{" "}
          <span className="font-medium text-ink">composants React</span> avec Tailwind, au lieu de bricoler des tableaux HTML.
          Vous importez des composants prêts à l'emploi — <code className="font-mono text-xs">Html</code>,{" "}
          <code className="font-mono text-xs">Head</code>, <code className="font-mono text-xs">Body</code>,{" "}
          <code className="font-mono text-xs">Container</code>, <code className="font-mono text-xs">Heading</code>,{" "}
          <code className="font-mono text-xs">Text</code>, <code className="font-mono text-xs">Button</code>,{" "}
          <code className="font-mono text-xs">Img</code> — et versionnez vos templates dans le code
          (<code className="font-mono text-xs">welcome.tsx</code>, <code className="font-mono text-xs">reset-password.tsx</code>…), sans quitter votre IDE.
        </CardDescription>
      </Card>
      <TemplateWorkspace templates={editable} mode="code" />
    </div>
  );

  // ---- Onglet IA ----
  const ai = (
    <div className="space-y-sp-5">
      <AiPanel aiReady={aiReady} />
      <PersonalizationCard />
    </div>
  );

  return (
    <>
      <PageHeader
        title="Composer"
        description="Bibliothèque de templates, éditeur visuel par blocs, code React Email et assistance IA — tout pour créer de beaux e-mails."
        actions={<NewTemplateModal />}
      />

      <Tabs
        items={[
          { id: "library", label: "Bibliothèque", content: library },
          { id: "visual", label: "Éditeur visuel", content: visual },
          { id: "code", label: "Code React Email", content: code },
          { id: "ai", label: "Assistant IA", content: ai },
        ]}
      />
    </>
  );
}

/** Encart de référence sur la personnalisation (variables + spintax). */
function PersonalizationCard() {
  const vars: { code: string; desc: string }[] = [
    { code: "{{first_name}}", desc: "Prénom du contact" },
    { code: "{{last_name}}", desc: "Nom de famille" },
    { code: "{{company}}", desc: "Société du contact" },
    { code: "{{email}}", desc: "Adresse e-mail" },
  ];

  return (
    <Card>
      <CardTitle className="flex items-center gap-sp-2"><Braces size={18} className="text-primary" /> Personnalisation</CardTitle>
      <CardDescription className="mt-sp-1">
        Insérez des variables dans vos objets et corps : elles sont remplacées par les données de chaque contact à l'envoi.
      </CardDescription>

      <div className="mt-sp-4 grid gap-sp-2 sm:grid-cols-2">
        {vars.map((v) => (
          <div key={v.code} className="flex items-center justify-between gap-sp-2 rounded-sm border border-line bg-fill-subtle px-sp-3 py-sp-2">
            <code className="font-mono text-xs text-primary">{v.code}</code>
            <span className="text-xs text-ink-faint">{v.desc}</span>
          </div>
        ))}
      </div>

      <div className="mt-sp-5 space-y-sp-3">
        <div>
          <p className="mb-sp-1 flex items-center gap-sp-2 text-sm font-medium text-ink">
            <Wand2 size={15} className="text-secondary" /> Valeur de repli (fallback)
          </p>
          <p className="text-sm text-ink-faint">
            Si la donnée manque, prévoyez une valeur par défaut entre guillemets :
          </p>
          <code className="mt-sp-2 block rounded-sm bg-fill-muted px-sp-3 py-sp-2 font-mono text-xs text-ink">
            Bonjour {`{{first_name|"ami"}}`}, ravi de vous revoir !
          </code>
        </div>

        <div>
          <p className="mb-sp-1 flex items-center gap-sp-2 text-sm font-medium text-ink">
            <Sparkles size={15} className="text-secondary" /> Spintax (variation aléatoire)
          </p>
          <p className="text-sm text-ink-faint">
            Variez vos formulations pour la délivrabilité : une option est tirée au hasard parmi les accolades.
          </p>
          <code className="mt-sp-2 block rounded-sm bg-fill-muted px-sp-3 py-sp-2 font-mono text-xs text-ink">
            {`{Bonjour|Salut|Hello}`} {`{{first_name}}`}, {`{j'espère que vous allez bien|en espérant que tout roule}`}.
          </code>
        </div>
      </div>
    </Card>
  );
}
