"use client";

import Link from "next/link";
import { AuthLayout } from "@/components/ui/AppShell";

export default function RegisterPage() {
  return (
    <AuthLayout
      title="Créer un compte"
      subtitle="L'inscription se fait uniquement sur invitation Encyclie."
    >
      <div className="space-y-4 rounded-lg border border-line bg-white p-5 text-sm text-ink">
        <p>
          Un administrateur doit vous inviter. Vous recevrez alors un e-mail
          pour choisir votre mot de passe et activer l'espace courtier.
        </p>
        <p className="text-ink-muted">
          Si vous avez déjà un compte, connectez-vous. Si le lien d'invitation
          a expiré, demandez un nouvel envoi à Encyclie.
        </p>
        <Link
          href="/login"
          className="inline-flex font-semibold text-ink underline decoration-brand underline-offset-4"
        >
          Aller à la connexion
        </Link>
      </div>
    </AuthLayout>
  );
}
