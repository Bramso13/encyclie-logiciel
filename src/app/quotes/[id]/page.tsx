"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { calculPrimeRCD } from "@/lib/tarificateurs/rcd";
import { authClient } from "@/lib/auth-client";

interface CompanyData {
  siret: string;
  address: string;
  legalForm: string;
  companyName: string;
  creationDate: string;
}

interface ActivityShare {
  code: string;
  caSharePercent: number;
}

interface FormData {
  siret: string;
  address: string;
  includePJ: boolean;
  legalForm: string;
  territory: string;
  activities: ActivityShare[];
  companyName: string;
  periodicity: string;
  nombreSalaries: string;
  tradingPercent: string;
  chiffreAffaires: string;
  experienceMetier: string;
  hasQualification: boolean;
  previousRcdStatus: string;
  dateEffetSouhaitee: string;
  companyCreationDate: string;
  subContractingPercent: string;
  previousResiliationDate?: string;
  lossHistory?: Array<{ year: number; numClaims: number; totalCost: number }>;
}

interface Quote {
  id: string;
  reference: string;
  status: string;
  companyData: CompanyData;
  formData: FormData;
  product: {
    name: string;
    code: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface CalculationResult {
  refus: boolean;
  returnTab: Array<{
    nomActivite: string;
    partCA: number;
    tauxBase: number;
    PrimeMiniAct: number;
    DegMax: number;
    Deg400k: number;
    PrimeRefAct: number;
    Prime100Ref: number;
    Prime100Min: number;
  }>;
  PminiHT: number;
  PrimeHT: number;
  majorations: {
    etp?: number;
    qualif: number;
    dateCreation: number;
    tempsSansActivite12mois: number;
    anneeExperience?: number;
    assureurDefaillant: number;
    nombreAnneeAssuranceContinue: number;
  };
}

export default function QuoteDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [activeTab, setActiveTab] = useState("form-data");
  const [calculationResult, setCalculationResult] =
    useState<CalculationResult | null>(null);
  const [calculationError, setCalculationError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const tabs = [
    {
      id: "form-data",
      label: "Donnees du formulaire",
      icon: (
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
      ),
    },
    {
      id: "calculation",
      label: "Calcul RCD",
      icon: (
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
          />
        </svg>
      ),
    },
  ];

  useEffect(() => {
    const fetchQuote = async () => {
      try {
        const response = await fetch(`/api/quotes/${params.id}`);
        if (response.ok) {
          const dataA = await response.json();
          const data = dataA.data;
          setQuote(data);
          console.log("quote", data);
          // Si c'est un devis RCD avec des donnees completes, faire le calcul
          if (data.formData) {
            try {
              console.log("=== DEBUG CALCUL RCD ===");
              console.log("FormData recu:", data.formData);
              console.log("CompanyData recu:", data.companyData);

              // Validation des donnees requises
              const validationErrors: string[] = [];

              if (!data.formData.chiffreAffaires) {
                validationErrors.push("chiffreAffaires manquant");
              } else {
                const ca = Number(data.formData.chiffreAffaires);
                if (isNaN(ca) || ca <= 0) {
                  validationErrors.push(
                    "chiffreAffaires invalide: " + data.formData.chiffreAffaires
                  );
                }
              }

              if (!data.formData.nombreSalaries) {
                validationErrors.push("nombreSalaries manquant");
              } else {
                const etp = Number(data.formData.nombreSalaries);
                if (isNaN(etp) || etp <= 0) {
                  validationErrors.push(
                    "nombreSalaries invalide: " + data.formData.nombreSalaries
                  );
                }
              }

              if (
                !data.formData.activities ||
                !Array.isArray(data.formData.activities)
              ) {
                validationErrors.push("activities manquant ou invalide");
              } else if (data.formData.activities.length === 0) {
                validationErrors.push("aucune activite selectionnee");
              }

              if (!data.formData.experienceMetier) {
                validationErrors.push("experienceMetier manquant");
              } else {
                const exp = Number(data.formData.experienceMetier);
                if (isNaN(exp) || exp < 0) {
                  validationErrors.push(
                    "experienceMetier invalide: " +
                      data.formData.experienceMetier
                  );
                }
              }

              // Validation des date de creation
              const creationDate =
                data.formData.companyCreationDate ||
                data.companyData.creationDate;
              if (!creationDate) {
                validationErrors.push("companyCreationDate manquante");
              }

              if (validationErrors.length > 0) {
                throw new Error(
                  "Donnees manquantes: " + validationErrors.join(", ")
                );
              }

              // Conversion des valeurs string en numbers
              const chiffreAffaires = Number(data.formData.chiffreAffaires);
              const nombreSalaries = Number(data.formData.nombreSalaries);
              const experienceMetier = Number(data.formData.experienceMetier);

              console.log("Valeurs converties:");
              console.log("- CA:", chiffreAffaires);
              console.log("- ETP:", nombreSalaries);
              console.log("- Exp:", experienceMetier);

              // Mapper les activités au format attendu par calculPrimeRCD
              const activitesFormatted = data.formData.activities.map(
                (activity: any) => ({
                  code: Number(activity.code),
                  caSharePercent: Number(activity.caSharePercent) / 100,
                })
              );

              const calculParams = {
                caDeclared: chiffreAffaires,
                etp: nombreSalaries,
                activites: activitesFormatted,
                dateCreation: new Date(creationDate || "2020-01-01"),
                tempsSansActivite12mois: Boolean(
                  data.formData.tempsSansActivite12mois
                ),
                anneeExperience: experienceMetier,
                assureurDefaillant: Boolean(data.formData.assureurDefaillant),
                nombreAnneeAssuranceContinue: Number(
                  data.formData.nombreAnneeAssuranceContinue || 0
                ),
                qualif: Boolean(data.formData.hasQualification),
                ancienneAssurance: data.formData.previousRcdStatus || "JAMAIS",
                activiteSansEtreAssure: Boolean(
                  data.formData.activiteSansEtreAssure
                ),
                experienceDirigeant: experienceMetier,
              };

              console.log("Parametres finaux:", calculParams);

              const result = calculPrimeRCD(calculParams);
              console.log("Resultat calcul:", result);
              setCalculationResult(result);
            } catch (error) {
              console.error("=== ERREUR CALCUL RCD ===");
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
        } else {
          console.error("Erreur recuperation devis");
        }
      } catch (error) {
        console.error("Erreur:", error);
      } finally {
        setLoading(false);
      }
    };

    if (params.id) {
      fetchQuote();
    }
  }, [params.id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          <span className="text-gray-600">Chargement...</span>
        </div>
      </div>
    );
  }

  if (!quote) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Devis introuvable
          </h1>
          <p className="text-gray-600 mb-4">
            Le devis demande n'existe pas ou a ete supprime.
          </p>
          <button
            onClick={() => router.push("/dashboard")}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            Retour au tableau de bord
          </button>
        </div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    const colors = {
      DRAFT: "bg-gray-100 text-gray-800",
      INCOMPLETE: "bg-yellow-100 text-yellow-800",
      SUBMITTED: "bg-blue-100 text-blue-800",
      IN_PROGRESS: "bg-blue-100 text-blue-800",
      OFFER_READY: "bg-green-100 text-green-800",
      ACCEPTED: "bg-green-100 text-green-800",
      REJECTED: "bg-red-100 text-red-800",
    };
    return colors[status as keyof typeof colors] || "bg-gray-100 text-gray-800";
  };

  const getStatusText = (status: string) => {
    const labels = {
      DRAFT: "Brouillon",
      INCOMPLETE: "Incomplet",
      SUBMITTED: "Soumis",
      IN_PROGRESS: "En cours",
      OFFER_READY: "Offre prete",
      ACCEPTED: "Accepte",
      REJECTED: "Rejete",
    };
    return labels[status as keyof typeof labels] || status;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <button
                  onClick={() => router.push("/dashboard")}
                  className="mr-4 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 19l-7-7 7-7"
                    />
                  </svg>
                </button>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    Devis {quote.reference}
                  </h1>
                  <div className="flex items-center space-x-4 mt-1">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                        quote.status
                      )}`}
                    >
                      {getStatusText(quote.status)}
                    </span>

                    <span className="text-sm text-gray-500">
                      Cree le{" "}
                      {new Date(quote.createdAt).toLocaleDateString("fr-FR")}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <button className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                  Exporter PDF
                </button>
                <button className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors">
                  Modifier
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Company Info Bar */}
      {/* <div className="bg-indigo-50 border-b border-indigo-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center space-x-6 text-sm">
            <div className="flex items-center">
              <svg
                className="w-4 h-4 text-indigo-500 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-4m-5 0H3m2 0h3M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                />
              </svg>
              <span className="font-medium text-indigo-900">
                {quote.companyData.companyName}
              </span>
            </div>
            <div className="text-indigo-700">
              SIRET: {quote.companyData.siret}
            </div>
            <div className="text-indigo-700">{quote.companyData.address}</div>
          </div>
        </div>
      </div> */}

      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8" aria-label="Tabs">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? "border-indigo-500 text-indigo-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                <div
                  className={`mr-2 transition-colors ${
                    activeTab === tab.id
                      ? "text-indigo-500"
                      : "text-gray-400 group-hover:text-gray-500"
                  }`}
                >
                  {tab.icon}
                </div>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === "form-data" && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                Donnees du formulaire
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Informations saisies lors de la creation du devis
              </p>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {quote.formData &&
                  Object.entries(quote.formData).map(([key, value]) => (
                    <div key={key} className="bg-gray-50 rounded-lg p-4">
                      <dt className="text-sm font-medium text-gray-500 mb-1">
                        {key}
                      </dt>
                      <dd className="text-sm text-gray-900">{String(value)}</dd>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === "calculation" && (
          <div className="space-y-6">
            {calculationError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex">
                  <svg
                    className="w-5 h-5 text-red-400 mt-0.5 mr-3"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <div>
                    <h3 className="text-sm font-medium text-red-800">
                      Erreur de calcul
                    </h3>
                    <p className="text-sm text-red-700 mt-1">
                      {calculationError}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {!calculationResult && !calculationError && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex">
                  <svg
                    className="w-5 h-5 text-blue-400 mt-0.5 mr-3"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <div>
                    <h3 className="text-sm font-medium text-blue-800">
                      Calcul non disponible
                    </h3>
                    <p className="text-sm text-blue-700 mt-1">
                      Le calcul automatique n'est disponible que pour les
                      produits RC Decennale (RCD).
                    </p>
                  </div>
                </div>
              </div>
            )}

            {calculationResult && (
              <div className="space-y-6">
                {/* Resume principal */}
                <div
                  className={`rounded-xl p-6 text-white ${
                    calculationResult.refus
                      ? "bg-gradient-to-r from-red-500 to-red-600"
                      : "bg-gradient-to-r from-indigo-500 to-purple-600"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-2xl font-bold mb-2">
                        {calculationResult.refus
                          ? "Demande Refusée"
                          : "Prime RCD Calculée"}
                      </h2>
                      <p
                        className={
                          calculationResult.refus
                            ? "text-red-100"
                            : "text-indigo-100"
                        }
                      >
                        {calculationResult.refus
                          ? "Le dossier ne peut pas être accepté"
                          : "Calcul basé sur les données du formulaire"}
                      </p>
                    </div>
                    <div className="text-right">
                      {!calculationResult.refus && (
                        <>
                          <div className="text-3xl font-bold">
                            {(
                              calculationResult.PrimeHT *
                              (1 +
                                Object.values(
                                  calculationResult.majorations
                                ).reduce((sum, val) => sum + (val || 0), 0))
                            ).toLocaleString("fr-FR")}{" "}
                            €
                          </div>
                          <div className="text-indigo-200 text-sm">
                            Prime HT calculée
                          </div>
                        </>
                      )}
                      {calculationResult.refus && (
                        <div className="text-2xl font-bold text-red-100">
                          ⚠️ REFUS
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {!calculationResult.refus &&
                  session?.user?.role === "ADMIN" && (
                    <>
                      {/* Grille des details */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Composition de la prime */}
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                          <div className="px-6 py-4 border-b border-gray-200">
                            <h3 className="text-lg font-semibold text-gray-900">
                              Composition de la prime
                            </h3>
                          </div>
                          <div className="p-6 space-y-4">
                            <div className="flex justify-between items-center">
                              <span className="text-gray-600">
                                Prime minimum HT
                              </span>
                              <span className="font-semibold">
                                {calculationResult.PminiHT.toLocaleString(
                                  "fr-FR"
                                )}{" "}
                                €
                              </span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-gray-600">
                                Prime au-delà
                              </span>
                              <span className="font-semibold">
                                {calculationResult.returnTab
                                  .reduce(
                                    (sum, act) => sum + act.Prime100Min,
                                    0
                                  )
                                  .toLocaleString("fr-FR")}{" "}
                                €
                              </span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-gray-600">Prime HT</span>
                              <span className="font-semibold">
                                {calculationResult.PrimeHT} €
                              </span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-gray-600">
                                Prime HT + majorations (
                                {Object.values(
                                  calculationResult.majorations
                                ).reduce((sum, val) => sum + (val || 0), 0) > 0
                                  ? "+"
                                  : ""}
                                {(
                                  Object.values(
                                    calculationResult.majorations
                                  ).reduce((sum, val) => sum + (val || 0), 0) *
                                  100
                                ).toFixed(1)}
                                %)
                              </span>
                              <span className="font-semibold">
                                {(
                                  calculationResult.PrimeHT *
                                  (1 +
                                    Object.values(
                                      calculationResult.majorations
                                    ).reduce((sum, val) => sum + (val || 0), 0))
                                ).toLocaleString("fr-FR")}{" "}
                                €
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Majorations appliquées */}
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                          <div className="px-6 py-4 border-b border-gray-200">
                            <h3 className="text-lg font-semibold text-gray-900">
                              Majorations appliquées
                            </h3>
                          </div>
                          <div className="p-6 space-y-4">
                            {Object.entries(calculationResult.majorations).map(
                              ([key, value]) => (
                                <div
                                  key={key}
                                  className="flex justify-between items-center"
                                >
                                  <span className="text-gray-600 capitalize">
                                    {key
                                      .replace(/([A-Z])/g, " $1")
                                      .replace(/^./, (str) =>
                                        str.toUpperCase()
                                      )}
                                  </span>
                                  <span
                                    className={`font-semibold ${
                                      value < 0
                                        ? "text-green-600"
                                        : value > 0
                                        ? "text-red-600"
                                        : "text-gray-600"
                                    }`}
                                  >
                                    {value > 0 ? "+" : ""}
                                    {(value * 100).toFixed(1)}%
                                  </span>
                                </div>
                              )
                            )}
                            <div className="border-t pt-4">
                              <div className="flex justify-between items-center font-bold">
                                <span className="text-gray-900">
                                  Total majorations
                                </span>
                                <span
                                  className={`text-lg ${
                                    Object.values(
                                      calculationResult.majorations
                                    ).reduce(
                                      (sum, val) => sum + (val || 0),
                                      0
                                    ) < 0
                                      ? "text-green-600"
                                      : Object.values(
                                          calculationResult.majorations
                                        ).reduce(
                                          (sum, val) => sum + (val || 0),
                                          0
                                        ) > 0
                                      ? "text-red-600"
                                      : "text-gray-600"
                                  }`}
                                >
                                  {Object.values(
                                    calculationResult.majorations
                                  ).reduce((sum, val) => sum + (val || 0), 0) >
                                  0
                                    ? "+"
                                    : ""}
                                  {(
                                    Object.values(
                                      calculationResult.majorations
                                    ).reduce(
                                      (sum, val) => sum + (val || 0),
                                      0
                                    ) * 100
                                  ).toFixed(1)}
                                  %
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                {/* Detail par activite */}
                {!calculationResult.refus &&
                  calculationResult.returnTab.length > 0 &&
                  session?.user?.role === "ADMIN" && (
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                      <div className="px-6 py-4 border-b border-gray-200">
                        <h3 className="text-lg font-semibold text-gray-900">
                          Détail par activité
                        </h3>
                      </div>
                      <div className="p-6">
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead>
                              <tr className="bg-gray-50">
                                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">
                                  Activité
                                </th>
                                <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">
                                  Part CA (%)
                                </th>
                                <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">
                                  Taux de base
                                </th>
                                <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">
                                  Prime Mini Act.
                                </th>
                                <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">
                                  Dégressivité
                                </th>
                                <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">
                                  Prime au-delà
                                </th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                              {calculationResult.returnTab.map(
                                (activity, index) => (
                                  <tr key={index} className="hover:bg-gray-50">
                                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                                      {activity.nomActivite}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-600 text-right">
                                      {activity.partCA.toFixed(1)}%
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-600 text-right">
                                      {(activity.tauxBase * 100).toFixed(3)}%
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-600 text-right">
                                      {activity.PrimeMiniAct.toLocaleString(
                                        "fr-FR"
                                      )}{" "}
                                      €
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-600 text-right">
                                      {activity.Deg400k > 0
                                        ? `${(activity.Deg400k * 100).toFixed(
                                            1
                                          )}%`
                                        : "-"}
                                    </td>
                                    <td className="px-4 py-3 text-sm font-medium text-gray-900 text-right">
                                      {activity.Prime100Min.toLocaleString(
                                        "fr-FR"
                                      )}{" "}
                                      €
                                    </td>
                                  </tr>
                                )
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
