"use client";

import { calculPrimeRCD } from "@/lib/tarificateurs/rcd";
import { useState, useEffect } from "react";

interface QuoteSuccessPageProps {
  quote: {
    id: string;
    reference: string;
    companyData: {
      companyName: string;
      siret: string;
      address: string;
    };
    product: {
      name: string;
      code: string;
    };
    formData?: any;
    estimatedPremium?: number;
    status: string;
    createdAt: Date | string;
  };
  onBackToDashboard: () => void;
}

export default function QuoteSuccessPage({
  quote,
  onBackToDashboard,
}: QuoteSuccessPageProps) {
  const [calculatedPremium, setCalculatedPremium] = useState<number | null>(
    null
  );
  const [premiumDetails, setPremiumDetails] = useState<any>(null);
  const [calculationError, setCalculationError] = useState<string | null>(null);

  useEffect(() => {
    // Only calculate for RCD products with formData
    if (quote.formData) {
      try {
        console.log("=== DEBUG CALCUL RCD SUCCESS PAGE ===");
        console.log("FormData reçu:", quote.formData);
        console.log("CompanyData reçu:", quote.companyData);

        // Validation des données requises (même logique que page.tsx)
        const validationErrors: string[] = [];

        if (!quote.formData.chiffreAffaires) {
          validationErrors.push("chiffreAffaires manquant");
        } else {
          const ca = Number(quote.formData.chiffreAffaires);
          if (isNaN(ca) || ca <= 0) {
            validationErrors.push(
              "chiffreAffaires invalide: " + quote.formData.chiffreAffaires
            );
          }
        }

        if (!quote.formData.nombreSalaries) {
          validationErrors.push("nombreSalaries manquant");
        } else {
          const etp = Number(quote.formData.nombreSalaries);
          if (isNaN(etp) || etp <= 0) {
            validationErrors.push(
              "nombreSalaries invalide: " + quote.formData.nombreSalaries
            );
          }
        }

        if (
          !quote.formData.activities ||
          !Array.isArray(quote.formData.activities)
        ) {
          validationErrors.push("activities manquant ou invalide");
        } else if (quote.formData.activities.length === 0) {
          validationErrors.push("aucune activite selectionnee");
        }

        if (!quote.formData.experienceMetier) {
          validationErrors.push("experienceMetier manquant");
        } else {
          const exp = Number(quote.formData.experienceMetier);
          if (isNaN(exp) || exp < 0) {
            validationErrors.push(
              "experienceMetier invalide: " + quote.formData.experienceMetier
            );
          }
        }

        // Validation de la date de création
        const creationDate =
          quote.formData.companyCreationDate ||
          (quote.companyData as any).creationDate;
        if (!creationDate) {
          validationErrors.push("companyCreationDate manquante");
        }

        if (validationErrors.length > 0) {
          throw new Error("Données manquantes: " + validationErrors.join(", "));
        }

        // Conversion des valeurs string en numbers
        const chiffreAffaires = Number(quote.formData.chiffreAffaires);
        const nombreSalaries = Number(quote.formData.nombreSalaries);
        const experienceMetier = Number(quote.formData.experienceMetier);

        console.log("Valeurs converties:");
        console.log("- CA:", chiffreAffaires);
        console.log("- ETP:", nombreSalaries);
        console.log("- Exp:", experienceMetier);

        // Mapper les activités au format attendu par calculPrimeRCD
        const activitesFormatted = quote.formData.activities.map(
          (activity: any) => ({
            code: Number(activity.code),
            caSharePercent: Number(activity.caSharePercent),
          })
        );

        const calculParams = {
          caDeclared: chiffreAffaires,
          etp: nombreSalaries,
          activites: activitesFormatted,
          dateCreation: new Date(creationDate || "2020-01-01"),
          tempsSansActivite12mois: Boolean(
            quote.formData.tempsSansActivite12mois
          ),
          nomDeLAsurreur: quote.formData.assureurDefaillant
            ? "Defaillant"
            : "Non defaillant",
          anneeExperience: experienceMetier,
          assureurDefaillant: Boolean(quote.formData.assureurDefaillant),
          nombreAnneeAssuranceContinue: Number(
            quote.formData.nombreAnneeAssuranceContinue || 0
          ),
          qualif: Boolean(quote.formData.hasQualification),
          ancienneAssurance: quote.formData.previousRcdStatus || "JAMAIS",
          activiteSansEtreAssure: Boolean(
            quote.formData.activiteSansEtreAssure
          ),
          experienceDirigeant: experienceMetier,
          // Ajouter les paramètres manquants si nécessaire
          dateEffet: quote.formData.dateEffetSouhaitee,
          dateFinCouverturePrecedente: quote.formData.previousResiliationDate,
          sinistresPrecedents: quote.formData.lossHistory || [],
          tauxTI: quote.formData.tauxTI || 0,
          coefficientAntecedent: quote.formData.coefficientAntecedent || 1,
        };

        console.log("Paramètres finaux:", calculParams);

        const result = calculPrimeRCD(calculParams);
        console.log("Résultat calcul:", result);

        // Calculer la prime finale (avec majorations)
        const majorationsTotal =
          Object.values(result.majorations || {}).reduce(
            (sum, val) => (sum || 0) + (Number(val) || 0),
            0
          ) || 0;
        const primeFinale = (result.PrimeHT || 0) * (1 + majorationsTotal);

        setCalculatedPremium(primeFinale);
        setPremiumDetails(result);
      } catch (error) {
        console.error("=== ERREUR CALCUL RCD SUCCESS PAGE ===");
        console.error("Type erreur:", typeof error);
        console.error("Message erreur:", error);
        console.error(
          "Stack trace:",
          error instanceof Error ? error.stack : "Pas de stack"
        );

        let errorMessage = "Erreur de calcul inconnue";
        if (error instanceof Error) {
          errorMessage = error.message;
        } else if (typeof error === "string") {
          errorMessage = error;
        } else {
          errorMessage = String(error);
        }

        setCalculationError(errorMessage);
      }
    }
  }, [quote]);

  // Fallback calculation for non-RCD or missing data
  const calculateEstimation = () => {
    const baseAmount = 1500;
    const companyFactor = quote.companyData.companyName.length * 10;
    const productFactor = quote.product.name.includes("Responsabilité")
      ? 500
      : 300;
    return Math.round((baseAmount + companyFactor + productFactor) / 100) * 100;
  };

  const estimation = calculatedPremium
    ? calculatedPremium
    : quote.estimatedPremium
    ? quote.estimatedPremium
    : calculateEstimation();

  return (
    <div className="space-y-6">
      {/* Success Header */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-6">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <svg
              className="h-8 w-8 text-green-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <div className="ml-4">
            <h1 className="text-2xl font-bold text-green-800">
              Devis créé avec succès !
            </h1>
            <p className="text-green-700 mt-1">
              Votre demande de devis a été enregistrée et sera traitée dans les
              plus brefs délais.
            </p>
          </div>
        </div>
      </div>

      {/* Quote Details */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Détails de votre devis
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-2">
              Référence
            </h3>
            <p className="text-lg font-mono text-gray-900">{quote.reference}</p>
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-2">
              Statut
            </h3>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
              {quote.status === "INCOMPLETE"
                ? "En cours de traitement"
                : quote.status}
            </span>
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-2">
              Entreprise
            </h3>
            <p className="text-lg text-gray-900">
              {quote.companyData.companyName}
            </p>
            <p className="text-sm text-gray-600">
              SIRET: {quote.companyData.siret}
            </p>
            <p className="text-sm text-gray-600">{quote.companyData.address}</p>
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-2">
              Produit d'assurance
            </h3>
            <p className="text-lg text-gray-900">{quote.product.name}</p>
            <p className="text-sm text-gray-600">Code: {quote.product.code}</p>
          </div>
        </div>
      </div>

      {/* Estimation */}
      <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-indigo-900 mb-4">
          {premiumDetails ? "Calcul de prime RCD" : "Estimation préliminaire"}
        </h2>

        {calculationError && (
          <div className="mb-4 p-3 bg-red-100 border border-red-300 rounded-md">
            <p className="text-sm text-red-800">
              <strong>Erreur de calcul :</strong> {calculationError}
            </p>
          </div>
        )}

        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm text-indigo-700 mb-1">
              Prime d'assurance {premiumDetails ? "calculée" : "estimée"}{" "}
              (annuelle TTC)
            </p>
            <p className="text-3xl font-bold text-indigo-900">
              {estimation.toLocaleString("fr-FR")} €
            </p>
          </div>
          <div className="text-right">
            <div className="bg-indigo-100 rounded-full p-4">
              <svg
                className="h-8 w-8 text-indigo-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
                />
              </svg>
            </div>
          </div>
        </div>

        <div className="mt-4 p-3 bg-indigo-100 rounded-md">
          <p className="text-sm text-indigo-800">
            <strong>Information :</strong>{" "}
            {premiumDetails
              ? "Ce calcul est basé sur les données saisies et les tarifs en vigueur. Le montant final pourra être ajusté après vérification des pièces justificatives."
              : "Cette estimation est indicative et basée sur les informations fournies. Le montant définitif sera calculé après analyse complète de votre dossier par nos experts."}
          </p>
        </div>
      </div>

      {/* Next Steps */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Prochaines étapes
        </h2>

        <div className="space-y-4">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <div className="flex items-center justify-center h-8 w-8 rounded-full bg-blue-100">
                <span className="text-sm font-medium text-blue-600">1</span>
              </div>
            </div>
            <div className="ml-4">
              <h3 className="text-sm font-medium text-gray-900">
                Analyse de votre dossier
              </h3>
              <p className="text-sm text-gray-600">
                Nos experts vont analyser votre demande dans les 24h ouvrées
              </p>
            </div>
          </div>

          <div className="flex items-start">
            <div className="flex-shrink-0">
              <div className="flex items-center justify-center h-8 w-8 rounded-full bg-blue-100">
                <span className="text-sm font-medium text-blue-600">2</span>
              </div>
            </div>
            <div className="ml-4">
              <h3 className="text-sm font-medium text-gray-900">
                Documents complémentaires
              </h3>
              <p className="text-sm text-gray-600">
                Vous recevrez une notification si des documents supplémentaires
                sont nécessaires
              </p>
            </div>
          </div>

          <div className="flex items-start">
            <div className="flex-shrink-0">
              <div className="flex items-center justify-center h-8 w-8 rounded-full bg-blue-100">
                <span className="text-sm font-medium text-blue-600">3</span>
              </div>
            </div>
            <div className="ml-4">
              <h3 className="text-sm font-medium text-gray-900">
                Réception de votre devis
              </h3>
              <p className="text-sm text-gray-600">
                Vous recevrez votre devis personnalisé sous 2-3 jours ouvrés
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-center space-x-4">
        <button
          onClick={onBackToDashboard}
          className="px-6 py-3 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          Retourner au tableau de bord
        </button>
      </div>
    </div>
  );
}
