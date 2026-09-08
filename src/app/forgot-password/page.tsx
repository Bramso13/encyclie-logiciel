"use client";

import { useState } from "react";
import { requestPasswordReset } from "@/lib/auth-client";
import Link from "next/link";
import { AuthLayout } from "@/components/ui/AppShell";
import { Button, FormField, inputClassName } from "@/components/ui/Controls";
import { ErrorBanner } from "@/components/ui/Feedback";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setSuccess(false);

    try {
      const result = await requestPasswordReset({
        email,
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/reset-password`,
      });

      if (result.error) {
        setError(
          "L'envoi du lien a échoué. Vérifiez l'adresse e-mail et réessayez.",
        );
      } else {
        setSuccess(true);
      }
    } catch {
      setError("L'envoi du lien a échoué. Réessayez dans un instant.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Mot de passe oublié"
      subtitle="Saisissez l'e-mail de votre compte. Si un compte existe, un lien de réinitialisation sera envoyé."
    >
      {success ? (
        <div className="space-y-4 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
          <p>
            Si un compte existe pour cette adresse, vous recevrez un e-mail
            sous peu. Pensez à vérifier les courriers indésirables.
          </p>
          <Link
            href="/login"
            className="font-semibold underline decoration-brand underline-offset-4"
          >
            Retourner à la connexion
          </Link>
        </div>
      ) : (
        <form className="space-y-5" onSubmit={handleSubmit}>
          {error ? <ErrorBanner>{error}</ErrorBanner> : null}
          <FormField id="email" label="Adresse e-mail">
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className={inputClassName}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </FormField>
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Envoi…" : "Envoyer le lien de réinitialisation"}
          </Button>
          <p className="text-center text-sm">
            <Link
              href="/login"
              className="font-medium text-ink underline decoration-brand underline-offset-4"
            >
              Retourner à la connexion
            </Link>
          </p>
        </form>
      )}
    </AuthLayout>
  );
}
