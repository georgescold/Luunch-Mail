"use client";

import Link from "next/link";
import { useActionState } from "react";
import { loginAction, type AuthState } from "@/server/auth-actions";
import { Button, Card, Field, Input } from "@/components/ui";

export default function LoginPage() {
  const [state, action, pending] = useActionState<AuthState, FormData>(loginAction, {});

  return (
    <Card className="shadow-lg">
      <h2 className="text-h3 font-headline font-bold text-ink">Connexion</h2>
      <p className="mt-sp-1 mb-sp-5 text-sm text-ink-faint">Ravi de vous revoir 👋</p>

      <form action={action}>
        <Field label="E-mail" htmlFor="email">
          <Input id="email" name="email" type="email" placeholder="vous@entreprise.com" required autoComplete="email" />
        </Field>
        <Field label="Mot de passe" htmlFor="password">
          <Input id="password" name="password" type="password" placeholder="••••••••" required autoComplete="current-password" />
        </Field>
        {state.error && <p className="mb-sp-4 rounded-sm bg-error-soft px-sp-3 py-sp-2 text-sm text-error">{state.error}</p>}
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? "Connexion…" : "Se connecter"}
        </Button>
      </form>

      <p className="mt-sp-5 text-center text-sm text-ink-faint">
        Pas encore de compte ?{" "}
        <Link href="/register" className="font-medium text-primary hover:underline">Créer un compte</Link>
      </p>
      <p className="mt-sp-4 rounded-sm bg-primary-soft px-sp-3 py-sp-2 text-center text-xs text-primary">
        Démo : <strong>demo@luunchmail.io</strong> / <strong>demodemo</strong>
      </p>
    </Card>
  );
}
