"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Eye,
  EyeOff,
  CheckCircle,
  XCircle,
  User,
  Building2,
} from "lucide-react";

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

  // Validation du mot de passe
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
      setError("Token manquant dans l'URL");
      return;
    }

    // Vérifier la validité du token
    const verifyToken = async () => {
      try {
        const response = await fetch("/api/auth/verify-invitation-token", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ token }),
        });

        const result = await response.json();

        if (result.success) {
          setTokenValid(true);
          setInvitation(result.invitation);
        } else {
          setTokenValid(false);
          setError(result.error || "Token invalide ou expiré");
        }
      } catch (err) {
        setTokenValid(false);
        setError("Erreur lors de la vérification du token");
      }
    };

    verifyToken();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isPasswordValid) {
      setError("Le mot de passe ne respecte pas les critères requis");
      return;
    }

    if (!passwordsMatch) {
      setError("Les mots de passe ne correspondent pas");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/complete-broker-setup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token,
          password,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setSuccess(true);
        setTimeout(() => {
          router.push("/login?message=account-created");
        }, 3000);
      } else {
        setError(result.error || "Erreur lors de la création du compte");
      }
    } catch (err) {
      setError("Erreur lors de la création du compte");
    } finally {
      setLoading(false);
    }
  };

  if (tokenValid === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Vérification de l'invitation...</p>
        </div>
      </div>
    );
  }

  if (tokenValid === false) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full space-y-8 p-8">
          <div className="text-center">
            <XCircle className="mx-auto h-16 w-16 text-red-500" />
            <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
              Invitation invalide
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              {error || "Cette invitation est invalide ou a expiré."}
            </p>
            <button
              onClick={() => router.push("/login")}
              className="mt-4 w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Retour à la connexion
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full space-y-8 p-8">
          <div className="text-center">
            <CheckCircle className="mx-auto h-16 w-16 text-green-500" />
            <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
              Compte créé avec succès !
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Votre compte courtier a été créé. Vous allez être redirigé vers la
              page de connexion.
            </p>
            <div className="mt-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl w-full space-y-8">
        <div>
          <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-indigo-100">
            <User className="h-6 w-6 text-indigo-600" />
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Créer votre compte courtier
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Bienvenue dans la plateforme Dune Assurances !
            <br />
            Configurez votre compte pour commencer.
          </p>
        </div>

        {/* Informations d'invitation */}
        {invitation && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center mb-4">
              <Building2 className="h-5 w-5 text-indigo-600 mr-2" />
              <h3 className="text-lg font-medium text-gray-900">
                Vos informations de courtier
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-700">Nom :</span>
                <span className="ml-2 text-gray-900">{invitation.name}</span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Email :</span>
                <span className="ml-2 text-gray-900">{invitation.email}</span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Entreprise :</span>
                <span className="ml-2 text-gray-900">
                  {invitation.companyName}
                </span>
              </div>
              <div>
                <span className="font-medium text-gray-700">
                  Code courtier :
                </span>
                <span className="ml-2 font-mono bg-gray-100 px-2 py-1 rounded text-gray-900">
                  {invitation.brokerCode}
                </span>
              </div>
            </div>
          </div>
        )}

        <form
          className="mt-8 space-y-6 bg-white rounded-lg shadow-sm border border-gray-200 p-6"
          onSubmit={handleSubmit}
        >
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Définir votre mot de passe
          </h3>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <div className="space-y-4">
            {/* Nouveau mot de passe */}
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700"
              >
                Mot de passe
              </label>
              <div className="mt-1 relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none relative block w-full px-3 py-2 pr-10 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Choisissez un mot de passe sécurisé"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
            </div>

            {/* Confirmation mot de passe */}
            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-medium text-gray-700"
              >
                Confirmer le mot de passe
              </label>
              <div className="mt-1 relative">
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="appearance-none relative block w-full px-3 py-2 pr-10 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Confirmez votre mot de passe"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Critères de validation */}
          {password && (
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">
                Critères du mot de passe :
              </h4>
              <div className="space-y-1">
                {Object.entries({
                  "Au moins 8 caractères": passwordValidation.length,
                  "Une majuscule": passwordValidation.uppercase,
                  "Une minuscule": passwordValidation.lowercase,
                  "Un chiffre": passwordValidation.number,
                  "Un caractère spécial": passwordValidation.special,
                }).map(([criterion, isValid]) => (
                  <div key={criterion} className="flex items-center text-sm">
                    {isValid ? (
                      <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                    ) : (
                      <XCircle className="h-4 w-4 text-gray-400 mr-2" />
                    )}
                    <span
                      className={isValid ? "text-green-700" : "text-gray-600"}
                    >
                      {criterion}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Vérification correspondance */}
          {confirmPassword && (
            <div className="flex items-center text-sm">
              {passwordsMatch ? (
                <>
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                  <span className="text-green-700">
                    Les mots de passe correspondent
                  </span>
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4 text-red-500 mr-2" />
                  <span className="text-red-700">
                    Les mots de passe ne correspondent pas
                  </span>
                </>
              )}
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading || !isPasswordValid || !passwordsMatch}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Création du compte...
                </div>
              ) : (
                "Créer mon compte"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function SetupAccountPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      }
    >
      <SetupAccountContent />
    </Suspense>
  );
}


