"use client";

import { calculPrimeRCD } from "@/lib/tarificateurs/rcd";
import { useState, useEffect } from "react";

interface QuoteSuccessPageProps {
  quote: {
    id: string;
    reference: string;
    productId: string;
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
  
  // États pour le mapping dynamique (identique à page.tsx)
  const [parameterMapping, setParameterMapping] = useState<Record<string, string>>({});
  const [formFields, setFormFields] = useState<Record<string, any>>({});
  const [calculationResult, setCalculationResult] = useState<any>(null);

  // Fonction pour charger le mapping et les formFields du produit (identique à page.tsx)
  const loadProductMapping = async (productId: string) => {
    try {
      const response = await fetch(`/api/products/${productId}`);
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          const product = result.data;
          setFormFields(product.formFields || {});
          setParameterMapping(product.mappingFields || {});
        }
      }
    } catch (error) {
      console.error('Erreur lors du chargement du mapping:', error);
    }
  };

  // Fonction de calcul dynamique basée sur le mapping (identique à page.tsx)
  const calculateWithMapping = (quoteData: any) => {
    try {
      console.log("=== CALCUL DYNAMIQUE AVEC MAPPING SUCCESS PAGE ===");
      console.log("FormData:", quoteData.formData);
      console.log("CompanyData:", quoteData.companyData);
      console.log("ParameterMapping:", parameterMapping);
      console.log("FormFields:", formFields);

      // Construire les paramètres à partir du mapping
      const mappedParams: any = {};
      
      Object.entries(parameterMapping).forEach(([paramKey, fieldKey]) => {
        if (fieldKey && formFields[fieldKey]) {
          const field = formFields[fieldKey];
          const value = quoteData.formData[fieldKey] || field.default;
          
          // Conversion selon le type de champ et le paramètre
          switch (paramKey) {
            case 'caDeclared':
            case 'etp':
            case 'anneeExperience':
            case 'nombreAnneeAssuranceContinue':
            case 'partSoutraitance':
            case 'partNegoce':
              if (field.type === 'number') {
                mappedParams[paramKey] = Number(value) || 0;
              }
              break;
              
            case 'dateCreation':
            case 'dateEffet':
              if (field.type === 'date') {
                mappedParams[paramKey] = value ? new Date(value) : new Date();
              }
              break;
              
            case 'tempsSansActivite':
            case 'sansActiviteDepuisPlusDe12MoisSansFermeture':
            case 'absenceDeSinistreSurLes5DernieresAnnees':
            case 'fractionnementPrime':
              mappedParams[paramKey] = value;
              break;
              
            case 'qualif':
            case 'assureurDefaillant':
            case 'protectionJuridique':
            case 'nonFournitureBilanN_1':
            case 'reprisePasse':
              if (field.type === 'checkbox') {
                mappedParams[paramKey] = Boolean(value);
              }
              break;
              
            case 'nomDeLAsurreur':
              if (field.type === 'text' || field.type === 'select') {
                mappedParams[paramKey] = value || "";
              }
              break;
              
            case 'activites':
              // Pour les activités, utiliser les données du formulaire
              if (quoteData.formData.activities && Array.isArray(quoteData.formData.activities)) {
                mappedParams[paramKey] = quoteData.formData.activities.map((a: any) => ({
                  code: parseInt(a.code),
                  caSharePercent: Number(a.caSharePercent)
                }));
              } else {
                mappedParams[paramKey] = [];
              }
              break;

            case 'dateFinCouverturePrecedente':
              if (field.type === 'date') {
                mappedParams[paramKey] = value ? new Date(value) : new Date();
              }
              break;

            
              
            case 'sinistresPrecedents':
              // Pour les sinistres, utiliser les données du formulaire
              mappedParams[paramKey] = quoteData.formData.lossHistory || [];
              break;
          }
        }
      });
      
      // Vérifier que tous les paramètres obligatoires sont présents
      const requiredParams = ['caDeclared', 'etp', 'activites'];
      const missingParams = requiredParams.filter(param => !mappedParams[param]);
      
      if (missingParams.length > 0) {
        throw new Error(`Paramètres obligatoires manquants : ${missingParams.join(', ')}`);
      }

      console.log("Paramètres mappés:", mappedParams);
      
      // Utiliser les valeurs par défaut pour les paramètres non mappés
      const finalParams = {
        // Valeurs par défaut
        caDeclared: 500000,
        etp: 3,
        activites: [],
        dateCreation: new Date(),
        tempsSansActivite: "NON" as any,
        anneeExperience: 5,
        assureurDefaillant: false,
        nombreAnneeAssuranceContinue: 3,
        qualif: false,
        nomDeLAsurreur: "AXA",
        dateEffet: new Date(),
        sinistresPrecedents: [],
        sansActiviteDepuisPlusDe12MoisSansFermeture: "NON" as "OUI" | "NON" | "CREATION",
        absenceDeSinistreSurLes5DernieresAnnees: "OUI" as "OUI" | "NON" | "CREATION" | "ASSUREUR_DEFAILLANT" | "A_DEFINIR",
        protectionJuridique: true,
        fractionnementPrime: "annuel" as "annuel" | "mensuel" | "trimestriel" | "semestriel",
        partSoutraitance: 0,
        partNegoce: 0,
        nonFournitureBilanN_1: false,
        reprisePasse: false,
        // Remplacer par les valeurs mappées
        ...mappedParams
      };

      console.log("Paramètres finaux:", finalParams);
      
      const result = calculPrimeRCD(finalParams);
      console.log("Résultat calcul:", result);
      return result;
    } catch (error) {
      console.error("Erreur calcul dynamique:", error);
      throw error;
    }
  };

  useEffect(() => {
    const fetchQuoteAndCalculate = async () => {
      try {
        console.log("=== CALCUL RCD SUCCESS PAGE ===");
        console.log("FormData reçu:", quote.formData);
        console.log("CompanyData reçu:", quote.companyData);

        // Charger le mapping du produit (identique à page.tsx)
        if (quote.productId) {
          await loadProductMapping(quote.productId);
        }

        // Si c'est un devis avec des données complètes, faire le calcul
        if (quote.formData) {
          try {
            console.log("=== CALCUL AVEC MAPPING DYNAMIQUE SUCCESS PAGE ===");
            console.log("FormData recu:", quote.formData);
            console.log("CompanyData recu:", quote.companyData);

            // Attendre que le mapping soit chargé avant de calculer
            if (Object.keys(parameterMapping).length === 0) {
              console.log("Mapping non encore chargé, calcul différé");
              // Le calcul sera refait quand le mapping sera chargé
              return;
            }

            const result = calculateWithMapping(quote);
            setCalculationResult(result);
            setCalculationError(null);

            // Utiliser la nouvelle structure de retour
            if (result.refus) {
              setCalculationError(result.refusReason || "Demande refusée");
              setCalculatedPremium(null);
              setPremiumDetails(result);
            } else {
              // Utiliser le total TTC directement depuis la nouvelle structure
              const primeFinale = result.totalTTC || result.primeTotal || 0;
              setCalculatedPremium(primeFinale);
              setPremiumDetails(result);
            }
          } catch (error) {
            console.error("=== ERREUR CALCUL DYNAMIQUE SUCCESS PAGE ===");
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
        } else {
          console.log("Pas de formData disponible");
          setCalculationError("Aucune donnee de formulaire disponible");
        }
      } catch (error) {
        console.error("Erreur:", error);
      }
    };

    if (quote) {
      fetchQuoteAndCalculate();
    }
  }, [quote]);

  // Recalculer quand le mapping est chargé (identique à page.tsx)
  useEffect(() => {
    if (quote && Object.keys(parameterMapping).length > 0 && quote.formData) {
      try {
        console.log("Recalcul avec mapping chargé SUCCESS PAGE");
        const result = calculateWithMapping(quote);
        setCalculationResult(result);
        setCalculationError(null);

        // Utiliser la nouvelle structure de retour
        if (result.refus) {
          setCalculationError(result.refusReason || "Demande refusée");
          setCalculatedPremium(null);
          setPremiumDetails(result);
        } else {
          // Utiliser le total TTC directement depuis la nouvelle structure
          const primeFinale = result.totalTTC || result.primeTotal || 0;
          setCalculatedPremium(primeFinale);
          setPremiumDetails(result);
        }
      } catch (error) {
        console.error("Erreur recalcul SUCCESS PAGE:", error);
        setCalculationError(error instanceof Error ? error.message : "Erreur de calcul");
      }
    }
  }, [parameterMapping, quote]);

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
      <div className={`border rounded-lg p-6 ${
        premiumDetails?.refus 
          ? "bg-red-50 border-red-200" 
          : "bg-indigo-50 border-indigo-200"
      }`}>
        <h2 className={`text-xl font-semibold mb-4 ${
          premiumDetails?.refus 
            ? "text-red-900" 
            : "text-indigo-900"
        }`}>
          {premiumDetails?.refus 
            ? "Demande non acceptée" 
            : premiumDetails 
              ? "Calcul de prime RCD" 
              : "Estimation préliminaire"
          }
        </h2>

        {calculationError && (
          <div className="mb-4 p-3 bg-red-100 border border-red-300 rounded-md">
            <p className="text-sm text-red-800">
              <strong>Erreur de calcul :</strong> {calculationError}
            </p>
          </div>
        )}

        {premiumDetails?.refus ? (
          <div className="text-center">
            <div className="mb-4">
              <svg className="mx-auto h-12 w-12 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <p className="text-lg font-medium text-red-900 mb-2">
              Demande non acceptée
            </p>
            <p className="text-red-700">
              {premiumDetails.refusReason || "Votre demande ne peut pas être acceptée dans les conditions actuelles."}
            </p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className={`text-sm mb-1 ${
                  premiumDetails ? "text-indigo-700" : "text-indigo-700"
                }`}>
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

            {/* Détails du calcul si disponible */}
            {premiumDetails && !premiumDetails.refus && (
              <div className="mb-4 p-4 bg-white rounded-lg border border-indigo-200">
                <h3 className="text-sm font-medium text-indigo-900 mb-3">Détails du calcul :</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">CA calculé :</span>
                    <span className="ml-2 font-medium">{premiumDetails.caCalculee?.toLocaleString("fr-FR") || "0"} €</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Prime HT :</span>
                    <span className="ml-2 font-medium">{premiumDetails.primeTotal?.toLocaleString("fr-FR") || "0"} €</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Protection Juridique :</span>
                    <span className="ml-2 font-medium">{premiumDetails.protectionJuridique?.toLocaleString("fr-FR") || "0"} €</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Total TTC :</span>
                    <span className="ml-2 font-bold text-indigo-600">{premiumDetails.totalTTC?.toLocaleString("fr-FR") || "0"} €</span>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-4 p-3 bg-indigo-100 rounded-md">
              <p className="text-sm text-indigo-800">
                <strong>Information :</strong>{" "}
                {premiumDetails
                  ? "Ce calcul est basé sur les données saisies et les tarifs en vigueur. Le montant final pourra être ajusté après vérification des pièces justificatives."
                  : "Cette estimation est indicative et basée sur les informations fournies. Le montant définitif sera calculé après analyse complète de votre dossier par nos experts."}
              </p>
            </div>
          </>
        )}
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
