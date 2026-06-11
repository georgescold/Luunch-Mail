"use client";

import { useState } from "react";
import { Plus, Mail, Server, ExternalLink, Hourglass, DownloadCloud } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button, buttonClasses } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/cn";
import { addMailboxAction } from "@/server/infrastructure-actions";
import { CheapInboxesImport } from "./cheapinboxes-import";

type Provider = "cheapinboxes" | "gmail" | "outlook" | "smtp";

const CHOICES: { id: Provider; label: string; hint: string; icon: typeof Mail }[] = [
  { id: "cheapinboxes", label: "Cheap Inboxes", hint: "Import auto par clé API", icon: DownloadCloud },
  { id: "smtp", label: "SMTP / IMAP", hint: "Hôte, port, identifiants", icon: Server },
  { id: "gmail", label: "Google (OAuth)", hint: "Une boîte à la fois", icon: Mail },
  { id: "outlook", label: "Microsoft 365", hint: "Bientôt disponible", icon: Mail },
];

export function AddMailboxModal({
  googleConfigured = false,
  cheapInboxesConnected = false,
}: {
  googleConfigured?: boolean;
  cheapInboxesConnected?: boolean;
}) {
  return (
    <Modal
      title="Connecter une boîte d'envoi"
      description="Branchez une boîte existante. Elle démarre en chauffe pour protéger votre réputation."
      wide
      trigger={(open) => (
        <Button onClick={open} size="sm">
          <Plus size={16} /> Connecter une boîte
        </Button>
      )}
    >
      {(close) => <MailboxForm close={close} googleConfigured={googleConfigured} cheapInboxesConnected={cheapInboxesConnected} />}
    </Modal>
  );
}

function MailboxForm({
  close, googleConfigured, cheapInboxesConnected,
}: { close: () => void; googleConfigured: boolean; cheapInboxesConnected: boolean }) {
  const [provider, setProvider] = useState<Provider>("cheapinboxes");

  return (
    <div>
      <p className="mb-sp-2 text-sm font-medium text-ink-muted">Type de boîte</p>
      <div className="mb-sp-5 grid gap-sp-2 sm:grid-cols-2 lg:grid-cols-4">
        {CHOICES.map((c) => {
          const Icon = c.icon;
          return (
            <button
              type="button"
              key={c.id}
              onClick={() => setProvider(c.id)}
              className={cn(
                "rounded-md border p-sp-3 text-left transition-colors",
                provider === c.id ? "border-primary bg-primary-soft/50" : "border-line hover:border-line-strong hover:bg-fill-subtle",
              )}
            >
              <span className="flex items-center gap-sp-2 font-medium text-ink">
                <Icon size={16} className="text-primary" /> {c.label}
              </span>
              <span className="mt-sp-1 block text-xs text-ink-faint">{c.hint}</span>
            </button>
          );
        })}
      </div>

      {provider === "cheapinboxes" && <CheapInboxesImport connected={cheapInboxesConnected} />}
      {provider === "gmail" && <GmailConnect configured={googleConfigured} />}
      {provider === "outlook" && (
        <div className="flex items-center gap-sp-3 rounded-md bg-fill-subtle px-sp-4 py-sp-4 text-sm text-ink-muted">
          <Hourglass size={18} className="shrink-0 text-primary" />
          <span>La connexion <strong>Microsoft 365</strong> arrive bientôt. Pour l'instant, utilisez Google Workspace ou SMTP/IMAP.</span>
        </div>
      )}
      {provider === "smtp" && <SmtpForm close={close} />}
    </div>
  );
}

function GmailConnect({ configured }: { configured: boolean }) {
  if (configured) {
    return (
      <div className="space-y-sp-4">
        <p className="text-sm text-ink-muted">
          Autorisez Luunch Mail à envoyer et lire les e-mails de votre boîte Google — <strong>aucun mot de passe stocké</strong>,
          connexion sécurisée par OAuth. L'adresse est récupérée automatiquement après autorisation.
        </p>
        <a href="/api/oauth/google/start" className={cn(buttonClasses({}), "w-full")}>
          <Mail size={16} /> Se connecter avec Google
        </a>
        <p className="text-center text-xs text-ink-faint">Vous serez redirigé vers la page de consentement Google.</p>
      </div>
    );
  }
  return (
    <div className="space-y-sp-3">
      <div className="flex items-start gap-sp-3 rounded-md bg-warning-soft px-sp-4 py-sp-3 text-sm text-warning-fg">
        <Badge tone="warning" className="shrink-0">Config requise</Badge>
        <span>L'OAuth Google n'est pas encore configuré sur ce serveur. C'est une opération unique (~5 min).</span>
      </div>
      <ol className="space-y-sp-2 rounded-md border border-line bg-surface p-sp-4 text-sm text-ink-muted">
        <li>1. Allez sur <a className="text-primary underline" href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noreferrer">Google Cloud → Identifiants <ExternalLink size={11} className="inline" /></a></li>
        <li>2. Créez un <strong>ID client OAuth</strong> de type « Application Web ».</li>
        <li>3. URI de redirection autorisée : <code className="rounded bg-fill-muted px-sp-1 font-mono text-xs">http://localhost:3000/api/oauth/google/callback</code></li>
        <li>4. Activez l'<strong>API Gmail</strong> dans la bibliothèque d'API.</li>
        <li>5. Collez l'ID et le secret dans le fichier <code className="rounded bg-fill-muted px-sp-1 font-mono text-xs">.env</code> (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET), puis relancez.</li>
      </ol>
      <p className="text-xs text-ink-faint">Le guide complet est dans <code className="font-mono">SETUP-GOOGLE.md</code> à la racine du projet.</p>
    </div>
  );
}

function SmtpForm({ close }: { close: () => void }) {
  return (
    <form action={addMailboxAction} onSubmit={() => setTimeout(close, 0)}>
      <input type="hidden" name="provider" value="smtp" />
      <Field label="Adresse e-mail" htmlFor="mailbox-email">
        <Input id="mailbox-email" name="email" type="email" placeholder="prenom@maboite.fr" autoComplete="off" required />
      </Field>
      <Field label="Nom d'expéditeur" htmlFor="mailbox-name" hint="Affiché aux destinataires (optionnel).">
        <Input id="mailbox-name" name="displayName" placeholder="Marie Dupont" autoComplete="off" />
      </Field>

      <div className="mb-sp-4 space-y-sp-3">
        <p className="rounded-md bg-fill-subtle px-sp-3 py-sp-2 text-xs text-ink-faint">
          Identifiants fournis par votre vendeur de boîtes. Le mot de passe est <strong>chiffré</strong> avant stockage.
        </p>
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-disabled">Envoi (SMTP)</p>
        <div className="grid gap-sp-3 sm:grid-cols-3">
          <Field label="Hôte SMTP" htmlFor="smtp-host" className="mb-0 sm:col-span-2">
            <Input id="smtp-host" name="smtpHost" placeholder="smtp.maboite.fr" autoComplete="off" required />
          </Field>
          <Field label="Port" htmlFor="smtp-port" className="mb-0">
            <Input id="smtp-port" name="smtpPort" type="number" defaultValue={587} />
          </Field>
        </div>
        <div className="grid gap-sp-3 sm:grid-cols-2">
          <Field label="Utilisateur" htmlFor="smtp-user" className="mb-0" hint="Souvent l'adresse e-mail.">
            <Input id="smtp-user" name="smtpUser" placeholder="prenom@maboite.fr" autoComplete="off" />
          </Field>
          <Field label="Mot de passe" htmlFor="smtp-pass" className="mb-0">
            <Input id="smtp-pass" name="password" type="password" placeholder="••••••••" autoComplete="new-password" required />
          </Field>
        </div>
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-disabled">Réception des réponses (IMAP)</p>
        <div className="grid gap-sp-3 sm:grid-cols-3">
          <Field label="Hôte IMAP" htmlFor="imap-host" className="mb-0 sm:col-span-2" hint="Vide = déduit de l'hôte SMTP.">
            <Input id="imap-host" name="imapHost" placeholder="imap.maboite.fr" autoComplete="off" />
          </Field>
          <Field label="Port" htmlFor="imap-port" className="mb-0">
            <Input id="imap-port" name="imapPort" type="number" defaultValue={993} />
          </Field>
        </div>
      </div>

      <div className="flex justify-end gap-sp-2">
        <Button type="button" variant="subtle" onClick={close}>Annuler</Button>
        <Button type="submit">Connecter la boîte</Button>
      </div>
    </form>
  );
}
