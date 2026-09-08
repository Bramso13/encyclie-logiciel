"use client";

import { useState, useEffect } from "react";
import { resetPassword } from "@/lib/auth-client";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import { AuthLayout } from "@/components/ui/AppShell";
import { Button, FormField, inputClassName } from "@/components/ui/Controls";
import { ErrorBanner } from "@/components/ui/Feedback";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  useEffect(() => {
    if (!token) {
      setError(
        "Ce lien de réinitialisation est incomplet ou a expiré. Demandez un nouveau lien.",
      );
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    if (password.length < 8) {
      setError("Le mot de passe doit contenir au moins 8 caractères.");
      setIsLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError("Les deux saisies de mot de passe ne correspondent pas.");
      setIsLoading(false);
      return;
    }

    if (!token) {
      setError("Lien de réinitialisation invalide ou expiré.");
      setIsLoading(false);
      return;
    }

    try {
      const result = await resetPassword({
        token,
        newPassword: password,
      });

      if (result.error) {
        setError(
          "La réinitialisation a échoué. Le lien est peut-être expiré. Demandez-en un nouveau.",
        );
      } else {
        setSuccess(true);
        setTimeout(() => {
          router.push("/login?message=password-reset");
        }, 3000);
      }
    } catch {
      setError("La réinitialisation a échoué. Réessayez dans un instant.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!token) {
    return (
      <AuthLayout title="Lien invalide ou expiré">
        <ErrorBanner>
          {error || "Ce lien de réinitialisation n'est plus valable."}
        </ErrorBanner>
        <p className="mt-4 text-sm">
          <Link
            href="/forgot-password"
            className="font-semibold underline decoration-brand underline-offset-4"
          >
            Demander un nouveau lien
          </Link>
        </p>
      </AuthLayout>
    );
  }

  if (success) {
    return (
      <AuthLayout title="Mot de passe mis à jour">
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
          Vous allez être redirigé vers la connexion.
        </div>
        <p className="mt-4 text-sm">
          <Link
            href="/login"
            className="font-semibold underline decoration-brand underline-offset-4"
          >
            Aller à la connexion
          </Link>
        </p>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Choisir un nouveau mot de passe"
      subtitle="Au moins 8 caractères. Conservez-le en lieu sûr."
    >
      <form className="space-y-5" onSubmit={handleSubmit}>
        {error ? <ErrorBanner>{error}</ErrorBanner> : null}
        <FormField id="password" label="Nouveau mot de passe">
          <div className="relative">
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              required
              minLength={8}
              className={`${inputClassName} pr-10`}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              className="absolute inset-y-0 right-0 px-3 text-ink-muted"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? "Masquer" : "Afficher"}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </FormField>
        <FormField id="confirmPassword" label="Confirmer le mot de passe">
          <div className="relative">
            <input
              id="confirmPassword"
              name="confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
              autoComplete="new-password"
              required
              minLength={8}
              className={`${inputClassName} pr-10`}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
            <button
              type="button"
              className="absolute inset-y-0 right-0 px-3 text-ink-muted"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              aria-label={showConfirmPassword ? "Masquer" : "Afficher"}
            >
              {showConfirmPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
        </FormField>
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? "Enregistrement…" : "Enregistrer le mot de passe"}
        </Button>
        <p className="text-center text-sm">
          <Link
            href="/login"
            className="font-medium underline decoration-brand underline-offset-4"
          >
            Retourner à la connexion
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}
