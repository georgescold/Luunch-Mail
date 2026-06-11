"use client";

import Link from "next/link";
import { useActionState } from "react";
import { registerAction, type AuthState } from "@/server/auth-actions";
import { Button, Card, Field, Input } from "@/components/ui";

export default function RegisterPage() {
  const [state, action, pending] = useActionState<AuthState, FormData>(registerAction, {});

  return (
    <Card className="shadow-lg">
      <h2 className="text-h3 font-headline font-bold text-ink">Créer votre compte</h2>
      <p className="mt-sp-1 mb-sp-5 text-sm text-ink-faint">Lancez votre workspace en 30 secondes.</p>

      <form action={action}>
        <Field label="Nom complet" htmlFor="name">
          <Input id="name" name="name" placeholder="Jean Dupont" autoComplete="name" />
        </Field>
        <Field label="Entreprise" htmlFor="company">
          <Input id="company" name="company" placeholder="Mon entreprise" />
        </Field>
        <Field label="E-mail" htmlFor="email">
          <Input id="email" name="email" type="email" placeholder="vous@entreprise.com" required autoComplete="email" />
        </Field>
        <Field label="Mot de passe" htmlFor="password" hint="8 caractères minimum">
          <Input id="password" name="password" type="password" placeholder="••••••••" required autoComplete="new-password" />
        </Field>
        {state.error && <p className="mb-sp-4 rounded-sm bg-error-soft px-sp-3 py-sp-2 text-sm text-error">{state.error}</p>}
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? "Création…" : "Créer mon compte"}
        </Button>
      </form>

      <p className="mt-sp-5 text-center text-sm text-ink-faint">
        Déjà inscrit ?{" "}
        <Link href="/login" className="font-medium text-primary hover:underline">Se connecter</Link>
      </p>
    </Card>
  );
}
