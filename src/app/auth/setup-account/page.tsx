"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Eye, EyeOff, CheckCircle, XCircle } from "lucide-react";
import { AuthLayout } from "@/components/ui/AppShell";
import { Button, FormField, inputClassName } from "@/components/ui/Controls";
import { ErrorBanner, LoadingState } from "@/components/ui/Feedback";

interface BrokerInvitation {
  id: string;
  name: string;
  email: string;
  companyName: string;
  phone: string;
  address: string;
  siretNumber?: string;
  brokerCode: string;
}

function SetupAccountContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [tokenValid, setTokenValid] = useState<boolean | null>(null);
  const [invitation, setInvitation] = useState<BrokerInvitation | null>(null);

  const passwordValidation = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /\d/.test(password),
    special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
  };

  const isPasswordValid = Object.values(passwordValidation).every(Boolean);
  const passwordsMatch = password === confirmPassword && password !== "";

  useEffect(() => {
    if (!token) {
      setError("Le lien d'invitation est incomplet.");
      setTokenValid(false);
      return;
    }

    const verifyToken = async () => {
      try {
        const response = await fetch("/api/auth/verify-invitation-token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        const result = await response.json();
        if (result.success) {
          setTokenValid(true);
          setInvitation(result.invitation);
        } else {
          setTokenValid(false);
          setError(result.error || "Cette invitation n'est plus valable.");
        }
      } catch {
        setTokenValid(false);
        setError("Impossible de vérifier l'invitation pour le moment.");
      }
    };

    verifyToken();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isPasswordValid) {
      setError("Le mot de passe ne respecte pas les critères indiqués.");
      return;
    }
    if (!passwordsMatch) {
      setError("Les deux saisies de mot de passe ne correspondent pas.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/complete-broker-setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const result = await response.json();
      if (result.success) {
        setSuccess(true);
        setTimeout(() => {
          router.push("/login?message=account-created");
        }, 3000);
      } else {
        setError(result.error || "La création du compte a échoué.");
      }
    } catch {
      setError("La création du compte a échoué. Réessayez dans un instant.");
    } finally {
      setLoading(false);
    }
  };

  if (tokenValid === null) {
    return (
      <AuthLayout title="Vérification de l'invitation">
        <LoadingState active label="Vérification de votre invitation" />
      </AuthLayout>
    );
  }

  if (tokenValid === false) {
    return (
      <AuthLayout title="Invitation invalide ou expirée">
        <ErrorBanner>
          {error || "Demandez un nouvel e-mail d'invitation à Encyclie."}
        </ErrorBanner>
        <div className="mt-4">
          <Button onClick={() => router.push("/login")}>
            Aller à la connexion
          </Button>
        </div>
      </AuthLayout>
    );
  }

  if (success) {
    return (
      <AuthLayout title="Compte créé">
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
          Votre espace courtier est prêt. Redirection vers la connexion…
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Activer votre espace courtier"
      subtitle="Choisissez un mot de passe pour finaliser l'invitation Encyclie."
    >
      {invitation ? (
        <dl className="mb-6 grid grid-cols-1 gap-2 rounded-lg border border-line bg-white p-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-ink-muted">Nom</dt>
            <dd className="font-medium">{invitation.name}</dd>
          </div>
          <div>
            <dt className="text-ink-muted">E-mail</dt>
            <dd className="font-medium">{invitation.email}</dd>
          </div>
          <div>
            <dt className="text-ink-muted">Cabinet</dt>
            <dd className="font-medium">{invitation.companyName}</dd>
          </div>
          <div>
            <dt className="text-ink-muted">Code courtier</dt>
            <dd className="font-mono font-medium">{invitation.brokerCode}</dd>
          </div>
        </dl>
      ) : null}

      <form className="space-y-5" onSubmit={handleSubmit}>
        {error ? <ErrorBanner>{error}</ErrorBanner> : null}
        <FormField id="password" label="Mot de passe">
          <div className="relative">
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`${inputClassName} pr-10`}
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
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={`${inputClassName} pr-10`}
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

        {password ? (
          <ul className="space-y-1 text-sm">
            {Object.entries({
              "Au moins 8 caractères": passwordValidation.length,
              "Une majuscule": passwordValidation.uppercase,
              "Une minuscule": passwordValidation.lowercase,
              "Un chiffre": passwordValidation.number,
              "Un caractère spécial": passwordValidation.special,
            }).map(([criterion, isValid]) => (
              <li key={criterion} className="flex items-center gap-2">
                {isValid ? (
                  <CheckCircle className="h-4 w-4 text-emerald-600" />
                ) : (
                  <XCircle className="h-4 w-4 text-zinc-400" />
                )}
                <span className={isValid ? "text-emerald-800" : "text-ink-muted"}>
                  {criterion}
                </span>
              </li>
            ))}
          </ul>
        ) : null}

        <Button
          type="submit"
          className="w-full"
          disabled={loading || !isPasswordValid || !passwordsMatch}
        >
          {loading ? "Création du compte…" : "Activer mon compte"}
        </Button>
      </form>
    </AuthLayout>
  );
}

export default function SetupAccountPage() {
  return (
    <Suspense
      fallback={
        <AuthLayout title="Activation du compte">
          <LoadingState active label="Chargement" />
        </AuthLayout>
      }
    >
      <SetupAccountContent />
    </Suspense>
  );
}
