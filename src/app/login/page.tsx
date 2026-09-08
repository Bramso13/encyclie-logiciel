"use client";

import { useState, useEffect } from "react";
import { signIn } from "@/lib/auth-client";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { AuthLayout } from "@/components/ui/AppShell";
import { Button, FormField, inputClassName } from "@/components/ui/Controls";
import { ErrorBanner } from "@/components/ui/Feedback";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const message = searchParams.get("message");
    if (message === "account-created") {
      setSuccessMessage(
        "Votre compte a été créé. Vous pouvez maintenant vous connecter.",
      );
    } else if (message === "password-reset") {
      setSuccessMessage(
        "Votre mot de passe a été réinitialisé. Connectez-vous avec le nouveau mot de passe.",
      );
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const result = await signIn.email({
        email,
        password,
      });

      if (result.error) {
        setError(
          "Identifiants incorrects. Vérifiez l'adresse e-mail et le mot de passe.",
        );
      } else {
        router.push("/dashboard");
      }
    } catch {
      setError("La connexion a échoué. Réessayez dans un instant.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Se connecter"
      subtitle="Accédez à votre espace courtier ou administrateur."
    >
      <form className="space-y-5" onSubmit={handleSubmit}>
        {successMessage ? (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            {successMessage}
          </div>
        ) : null}
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
        <FormField id="password" label="Mot de passe">
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            className={inputClassName}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </FormField>
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? "Connexion…" : "Se connecter"}
        </Button>
        <p className="text-center text-sm">
          <Link
            href="/forgot-password"
            className="font-medium text-ink underline decoration-brand underline-offset-4"
          >
            Mot de passe oublié
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}
