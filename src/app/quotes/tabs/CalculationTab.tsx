import { Quote, CalculationResult } from "@/lib/types";

export const getFieldLabel = (path: string): string => {
  const labels: Record<string, string> = {
    primeTotal: "Prime HT Total",
    totalTTC: "Total TTC",
    caCalculee: "CA Calculé",
    PminiHT: "Prime Minimum HT",
    primeAuDela: "Prime Au-delà",
    PrimeHTSansMajorations: "Prime HT Sans Majorations",
    totalMajorations: "Total Majorations",
    protectionJuridique: "Protection Juridique",
    fraisGestion: "Frais de Gestion",
    "autres.taxeAssurance": "Taxe Assurance",
    "autres.fraisFractionnementPrimeHT": "Frais Fractionnement",
    primeAggravationBilanN_1NonFourni: "Prime Aggravation Bilan N-1",
    "reprisePasseResult.ratioSP": "Ratio S/P",
    "reprisePasseResult.frequenceSinistres": "Fréquence Sinistres",
    "reprisePasseResult.categorieAnciennete": "Catégorie Ancienneté",
    "reprisePasseResult.categorieSinistralite": "Catégorie Sinistralité",
    "reprisePasseResult.majoration": "Majoration Reprise du Passé",
  };

  // Gestion des majorations dynamiques
  if (path.startsWith("majorations.")) {
    const majKey = path.replace("majorations.", "");
    return `Majoration ${majKey.charAt(0).toUpperCase() + majKey.slice(1)}`;
  }

  return labels[path] || path;
};

export default function CalculationTab({
  quote,
  calculationResult,
  calculationError,
  originalCalculationResult,
  setEditingSections,
  setCalculationResult,
  setOriginalCalculationResult,
  reprisePasseEnabled,
  handleReprisePasseChange,
  nonFournitureBilanEnabled,
  handleNonFournitureBilanChange,
  saveCalculationToDatabase,
  recalculating,
  handleRecalculate,
  session,
  setCurrentEditingSection,
  setShowModificationPopup,
}: {
  quote: Quote;
  calculationResult: any;
  calculationError: string | null;
  originalCalculationResult: any | null;
  setEditingSections: (sections: {
    majorations: boolean;
    fraisEtTaxes: boolean;
  }) => void;
  setCalculationResult: (result: CalculationResult) => void;
  setOriginalCalculationResult: (result: CalculationResult | null) => void;
  reprisePasseEnabled: boolean;
  handleReprisePasseChange: (enabled: boolean) => void;
  nonFournitureBilanEnabled: boolean;
  handleNonFournitureBilanChange: (enabled: boolean) => void;
  saveCalculationToDatabase: () => void;
  recalculating: boolean;
  handleRecalculate: () => void;
  session: any;
  setCurrentEditingSection: (
    section: "majorations" | "fraisEtTaxes" | null
  ) => void;
  setShowModificationPopup: (show: boolean) => void;
}) {
  // Fonction pour obtenir des labels lisibles pour les champs

  // Fonctions pour la gestion de la modification des calculs
  const resetCalculationEditing = () => {
    setEditingSections({ majorations: false, fraisEtTaxes: false });
    if (originalCalculationResult) {
      setCalculationResult(originalCalculationResult);
      setOriginalCalculationResult(null);
    }
  };

  const isValueModified = (originalValue: any, currentValue: any) => {
    return JSON.stringify(originalValue) !== JSON.stringify(currentValue);
  };

  // Fonction pour détecter toutes les différences dans calculationResult
  const getAllDifferences = (
    original: CalculationResult | null,
    current: CalculationResult | null
  ) => {
    if (!original || !current) return [];

    const differences: Array<{
      path: string;
      label: string;
      originalValue: any;
      currentValue: any;
      isModified: boolean;
    }> = [];

    const compareValues = (
      origObj: any,
      currObj: any,
      path: string = "",
      parentLabel: string = ""
    ) => {
      if (
        origObj === null ||
        origObj === undefined ||
        currObj === null ||
        currObj === undefined
      ) {
        if (origObj !== currObj) {
          differences.push({
            path,
            label: parentLabel,
            originalValue: origObj,
            currentValue: currObj,
            isModified: true,
          });
        }
        return;
      }

      if (typeof origObj === "object" && typeof currObj === "object") {
        const allKeys = new Set([
          ...Object.keys(origObj),
          ...Object.keys(currObj),
        ]);
        allKeys.forEach((key) => {
          const newPath = path ? `${path}.${key}` : key;
          const label = getFieldLabel(newPath);
          compareValues(origObj[key], currObj[key], newPath, label);
        });
      } else {
        const isModified = origObj !== currObj;
        differences.push({
          path,
          label: parentLabel,
          originalValue: origObj,
          currentValue: currObj,
          isModified,
        });
      }
    };

    compareValues(original, current);
    return differences.filter((diff) => diff.isModified);
  };

  const getValueWithModificationIndicator = (
    originalValue: any,
    currentValue: any,
    formatFn?: (val: any) => string
  ) => {
    const isModified =
      originalCalculationResult && isValueModified(originalValue, currentValue);
    const displayValue = formatFn ? formatFn(currentValue) : currentValue;

    return {
      value: displayValue,
      isModified,
      originalValue: formatFn ? formatFn(originalValue) : originalValue,
    };
  };

  // Composant pour afficher une valeur modifiable avec indicateur
  const ModifiableValue = ({
    originalValue,
    currentValue,
    formatFn = (val) => val?.toLocaleString?.("fr-FR") || "0",
    suffix = " €",
    className = "",
  }: {
    originalValue: any;
    currentValue: any;
    formatFn?: (val: any) => string;
    suffix?: string;
    className?: string;
  }) => {
    const {
      value,
      isModified,
      originalValue: formattedOriginal,
    } = getValueWithModificationIndicator(
      originalValue,
      currentValue,
      formatFn
    );

    if (!isModified) {
      return (
        <span className={className}>
          {value}
          {suffix}
        </span>
      );
    }

    return (
      <div className="relative">
        <span
          className={`${className} ${
            isModified ? "text-blue-600 font-bold" : ""
          }`}
        >
          {value}
          {suffix}
        </span>
        {isModified && (
          <div className="flex items-center mt-1 text-xs text-gray-500">
            <svg
              className="w-3 h-3 mr-1 text-blue-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span className="line-through">
              Original: {formattedOriginal}
              {suffix}
            </span>
          </div>
        )}
      </div>
    );
  };
  return (
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
              <p className="text-sm text-red-700 mt-1">{calculationError}</p>
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
                Le calcul automatique n'est disponible que pour les produits RC
                Decennale (RCD).
              </p>
            </div>
          </div>
        </div>
      )}

      {calculationResult && (
        <div className="space-y-8">
          {/* Notification de modification */}
          {originalCalculationResult && (
            <div className="bg-amber-50 border-l-4 border-amber-400 p-4 rounded-lg">
              <div className="flex">
                <svg
                  className="w-5 h-5 text-amber-400 mt-0.5 mr-3"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
                <div>
                  <h3 className="text-sm font-medium text-amber-800">
                    Mode modification activé
                  </h3>
                  <p className="text-sm text-amber-700 mt-1">
                    Vous visualisez une version modifiée des calculs. Les
                    valeurs changées sont indiquées visuellement. Utilisez
                    "Version originale" pour revenir aux calculs d'origine.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Header principal avec statut */}
          <div
            className={`rounded-2xl p-8 text-white shadow-xl ${
              calculationResult.refus
                ? "bg-gradient-to-br from-red-500 via-red-600 to-red-700"
                : "bg-gradient-to-br from-indigo-500 via-purple-600 to-blue-700"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div
                  className={`p-3 rounded-full ${
                    calculationResult.refus ? "bg-red-400/20" : "bg-white/20"
                  }`}
                >
                  {calculationResult.refus ? (
                    <svg
                      className="w-8 h-8"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                        clipRule="evenodd"
                      />
                    </svg>
                  ) : (
                    <svg
                      className="w-8 h-8"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </div>
                <div>
                  <h2 className="text-3xl font-bold mb-2">
                    {calculationResult.refus
                      ? "Demande Refusée"
                      : "Prime RCD Annuelle"}
                  </h2>
                  <p
                    className={`text-lg ${
                      calculationResult.refus
                        ? "text-red-100"
                        : "text-indigo-100"
                    }`}
                  >
                    {calculationResult.refus
                      ? calculationResult.refusReason ||
                        "Le dossier ne peut pas être accepté"
                      : "Calcul basé sur les données du formulaire"}
                  </p>
                </div>
              </div>
              <div className="text-right">
                {!calculationResult.refus && (
                  <>
                    <div className="text-4xl font-bold mb-1">
                      {calculationResult.totalTTC?.toLocaleString("fr-FR") ||
                        calculationResult.primeTotal?.toLocaleString("fr-FR") ||
                        "0"}{" "}
                      €
                    </div>
                    <div className="text-indigo-200 text-sm">Total TTC</div>
                  </>
                )}
                {calculationResult.refus && (
                  <div className="text-3xl font-bold text-red-100">
                    ⚠️ REFUS
                  </div>
                )}
              </div>
            </div>
          </div>

          {!calculationResult.refus && session?.user?.role === "ADMIN" && (
            <>
              {/* Options de calcul et boutons pour admin */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-4 sm:space-y-0">
                  {/* Switches de configuration */}
                  <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-6">
                    <div className="flex items-center space-x-3">
                      <div className="relative inline-block w-10 mr-2 align-middle select-none">
                        <input
                          type="checkbox"
                          id="reprisePasseSwitch"
                          checked={reprisePasseEnabled}
                          onChange={(e) =>
                            handleReprisePasseChange(e.target.checked)
                          }
                          className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer"
                        />
                        <label
                          htmlFor="reprisePasseSwitch"
                          className={`toggle-label block overflow-hidden h-6 rounded-full cursor-pointer ${
                            reprisePasseEnabled ? "bg-green-400" : "bg-gray-300"
                          }`}
                        ></label>
                      </div>
                      <label
                        htmlFor="reprisePasseSwitch"
                        className="text-sm font-medium text-gray-700 cursor-pointer"
                      >
                        Reprise du passé
                      </label>
                    </div>

                    <div className="flex items-center space-x-3">
                      <div className="relative inline-block w-10 mr-2 align-middle select-none">
                        <input
                          type="checkbox"
                          id="nonFournitureBilanSwitch"
                          checked={nonFournitureBilanEnabled}
                          onChange={(e) =>
                            handleNonFournitureBilanChange(e.target.checked)
                          }
                          className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer"
                        />
                        <label
                          htmlFor="nonFournitureBilanSwitch"
                          className={`toggle-label block overflow-hidden h-6 rounded-full cursor-pointer ${
                            nonFournitureBilanEnabled
                              ? "bg-red-400"
                              : "bg-gray-300"
                          }`}
                        ></label>
                      </div>
                      <label
                        htmlFor="nonFournitureBilanSwitch"
                        className="text-sm font-medium text-gray-700 cursor-pointer"
                      >
                        Non fourniture bilan N-1
                      </label>
                    </div>
                  </div>

                  {/* Boutons d'action */}
                  <div className="flex space-x-3">
                    <button
                      onClick={handleRecalculate}
                      disabled={recalculating}
                      className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
                    >
                      {recalculating ? (
                        <>
                          <svg
                            className="animate-spin w-4 h-4"
                            fill="none"
                            viewBox="0 0 24 24"
                          >
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                            ></circle>
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            ></path>
                          </svg>
                          <span>Recalcul...</span>
                        </>
                      ) : (
                        <>
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                            />
                          </svg>
                          <span>Recalculer</span>
                        </>
                      )}
                    </button>

                    {originalCalculationResult && (
                      <button
                        onClick={resetCalculationEditing}
                        className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
                          />
                        </svg>
                        <span>Version originale</span>
                      </button>
                    )}

                    <button
                      onClick={saveCalculationToDatabase}
                      disabled={recalculating}
                      className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
                    >
                      {recalculating ? (
                        <>
                          <svg
                            className="animate-spin w-4 h-4"
                            fill="none"
                            viewBox="0 0 24 24"
                          >
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                            ></circle>
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            ></path>
                          </svg>
                          <span>Sauvegarde...</span>
                        </>
                      ) : (
                        <>
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3-3m0 0l-3 3m3-3v12"
                            />
                          </svg>
                          <span>Sauvegarder le calcul</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Résumé financier */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* CA Calculé */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">
                        CA Calculé
                      </p>
                      <div className="text-2xl font-bold text-gray-900">
                        <ModifiableValue
                          originalValue={originalCalculationResult?.caCalculee}
                          currentValue={calculationResult.caCalculee}
                          className="text-2xl font-bold text-gray-900"
                        />
                      </div>
                    </div>
                    <div className="p-3 bg-blue-100 rounded-full">
                      <svg
                        className="w-6 h-6 text-blue-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                        />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Prime HT */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">
                        Prime HT
                      </p>
                      <div className="text-2xl font-bold text-gray-900">
                        <ModifiableValue
                          originalValue={originalCalculationResult?.primeTotal}
                          currentValue={calculationResult.primeTotal}
                          className="text-2xl font-bold text-gray-900"
                        />
                      </div>
                    </div>
                    <div className="p-3 bg-green-100 rounded-full">
                      <svg
                        className="w-6 h-6 text-green-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
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

                {/* Total TTC */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">
                        Total TTC
                      </p>
                      <div className="text-2xl font-bold text-indigo-600">
                        <ModifiableValue
                          originalValue={originalCalculationResult?.totalTTC}
                          currentValue={calculationResult.totalTTC}
                          className="text-2xl font-bold text-indigo-600"
                        />
                      </div>
                    </div>
                    <div className="p-3 bg-indigo-100 rounded-full">
                      <svg
                        className="w-6 h-6 text-indigo-600"
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
                    </div>
                  </div>
                </div>
              </div>

              {/* Composition détaillée */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Composition de la prime */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                  <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 rounded-t-xl">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                      <svg
                        className="w-5 h-5 mr-2 text-indigo-600"
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
                      Composition de la prime
                    </h3>
                  </div>
                  <div className="p-6 space-y-4">
                    <div className="flex justify-between items-center py-2 border-b border-gray-100">
                      <span className="text-gray-600">Prime minimum HT</span>
                      <span className="font-semibold text-gray-900">
                        <ModifiableValue
                          originalValue={originalCalculationResult?.PminiHT}
                          currentValue={calculationResult.PminiHT}
                        />
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-gray-100">
                      <span className="text-gray-600">Prime au-delà</span>
                      <span className="font-semibold text-gray-900">
                        <ModifiableValue
                          originalValue={originalCalculationResult?.primeAuDela}
                          currentValue={calculationResult.primeAuDela}
                        />
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-gray-100">
                      <span className="text-gray-600">
                        Prime HT sans majorations
                      </span>
                      <span className="font-semibold text-gray-900">
                        <ModifiableValue
                          originalValue={
                            originalCalculationResult?.PrimeHTSansMajorations
                          }
                          currentValue={
                            calculationResult.PrimeHTSansMajorations
                          }
                        />
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-gray-100">
                      <span className="text-gray-600">Total majorations</span>
                      <span
                        className={`font-semibold ${
                          calculationResult.totalMajorations > 0
                            ? "text-red-600"
                            : calculationResult.totalMajorations < 0
                            ? "text-green-600"
                            : "text-gray-600"
                        }`}
                      >
                        {calculationResult.totalMajorations > 0 ? "+" : ""}
                        {(
                          (calculationResult.totalMajorations - 1) *
                          100
                        ).toFixed(1)}
                        %
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-3 bg-gray-50 rounded-lg px-4">
                      <span className="text-gray-900 font-medium">
                        Prime HT finale
                      </span>
                      <span className="font-bold text-lg text-indigo-600">
                        <ModifiableValue
                          originalValue={originalCalculationResult?.primeTotal}
                          currentValue={calculationResult.primeTotal}
                        />
                      </span>
                    </div>
                  </div>
                </div>

                {/* Majorations appliquées */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                  <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 rounded-t-xl">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                        <svg
                          className="w-5 h-5 mr-2 text-orange-600"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                          />
                        </svg>
                        Majorations appliquées
                      </h3>
                      {session?.user?.role === "ADMIN" && (
                        <button
                          onClick={() => {
                            if (!originalCalculationResult) {
                              setOriginalCalculationResult(calculationResult);
                            }
                            setCurrentEditingSection("majorations");
                            setShowModificationPopup(true);
                          }}
                          className="flex items-center px-3 py-1.5 text-sm bg-orange-100 text-orange-700 hover:bg-orange-200 rounded-md transition-colors"
                        >
                          <svg
                            className="w-4 h-4 mr-1"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                            />
                          </svg>
                          Modifier
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="p-6 space-y-3">
                    {calculationResult.majorations &&
                      Object.entries(calculationResult.majorations).map(
                        ([key, value]: [string, any]) => (
                          <div
                            key={key}
                            className="flex justify-between items-center py-2 px-3 rounded-lg hover:bg-gray-50"
                          >
                            <span className="text-gray-600 capitalize">
                              {key
                                .replace(/([A-Z])/g, " $1")
                                .replace(/^./, (str) => str.toUpperCase())
                                .replace(/_/g, " ")}
                            </span>
                            <span
                              className={`font-semibold px-2 py-1 rounded-full text-sm ${
                                value < 0
                                  ? "text-green-700 bg-green-100"
                                  : value > 0
                                  ? "text-red-700 bg-red-100"
                                  : "text-gray-600 bg-gray-100"
                              }`}
                            >
                              {value > 0 ? "+" : ""}
                              {(value * 100).toFixed(1)}%
                            </span>
                          </div>
                        )
                      )}
                  </div>
                </div>
              </div>

              {/* Frais et taxes */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 rounded-t-xl">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                      <svg
                        className="w-5 h-5 mr-2 text-purple-600"
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
                      Frais et taxes
                    </h3>
                    {session?.user?.role === "ADMIN" && (
                      <button
                        onClick={() => {
                          if (!originalCalculationResult) {
                            setOriginalCalculationResult(calculationResult);
                          }
                          setCurrentEditingSection("fraisEtTaxes");
                          setShowModificationPopup(true);
                        }}
                        className="flex items-center px-3 py-1.5 text-sm bg-purple-100 text-purple-700 hover:bg-purple-200 rounded-md transition-colors"
                      >
                        <svg
                          className="w-4 h-4 mr-1"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                          />
                        </svg>
                        Modifier
                      </button>
                    )}
                  </div>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <p className="text-sm text-blue-600 font-medium">
                        Protection Juridique
                      </p>
                      <div className="text-xl font-bold text-blue-900">
                        <ModifiableValue
                          originalValue={
                            originalCalculationResult?.protectionJuridique
                          }
                          currentValue={calculationResult.protectionJuridique}
                          className="text-xl font-bold text-blue-900"
                        />
                      </div>
                    </div>
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <p className="text-sm text-green-600 font-medium">
                        Frais de gestion
                      </p>
                      <div className="text-xl font-bold text-green-900">
                        <ModifiableValue
                          originalValue={
                            originalCalculationResult?.fraisGestion
                          }
                          currentValue={calculationResult.fraisGestion}
                          className="text-xl font-bold text-green-900"
                        />
                      </div>
                    </div>
                    <div className="text-center p-4 bg-orange-50 rounded-lg">
                      <p className="text-sm text-orange-600 font-medium">
                        Taxe assurance
                      </p>
                      <div className="text-xl font-bold text-orange-900">
                        <ModifiableValue
                          originalValue={
                            originalCalculationResult?.autres?.taxeAssurance
                          }
                          currentValue={calculationResult.autres?.taxeAssurance}
                          className="text-xl font-bold text-orange-900"
                        />
                      </div>
                    </div>
                    <div className="text-center p-4 bg-purple-50 rounded-lg">
                      <p className="text-sm text-purple-600 font-medium">
                        Frais fractionnement
                      </p>
                      <div className="text-xl font-bold text-purple-900">
                        <ModifiableValue
                          originalValue={
                            originalCalculationResult?.autres
                              ?.fraisFractionnementPrimeHT
                          }
                          currentValue={
                            calculationResult.autres?.fraisFractionnementPrimeHT
                          }
                          className="text-xl font-bold text-purple-900"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Prime d'aggravation Bilan N-1 non fourni */}
              {calculationResult.primeAggravationBilanN_1NonFourni &&
                calculationResult.primeAggravationBilanN_1NonFourni > 0 && (
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                    <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 rounded-t-xl">
                      <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                        <svg
                          className="w-5 h-5 mr-2 text-red-600"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                          />
                        </svg>
                        Prime d'aggravation - Bilan N-1 non fourni
                      </h3>
                    </div>
                    <div className="p-6">
                      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="text-lg font-semibold text-red-900 mb-2">
                              Majoration appliquée
                            </h4>
                            <p className="text-red-700 text-sm">
                              Une majoration a été appliquée car le bilan N-1
                              n'a pas été fourni. Cette prime supplémentaire
                              s'ajoute au montant de base.
                            </p>
                          </div>
                          <div className="text-right">
                            <div className="text-3xl font-bold text-red-600">
                              {calculationResult.primeAggravationBilanN_1NonFourni.toLocaleString(
                                "fr-FR"
                              )}{" "}
                              €
                            </div>
                            <div className="text-sm text-red-500">
                              Prime d'aggravation
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

              {/* Reprise du passé */}
              {calculationResult.reprisePasseResult && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                  <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 rounded-t-xl">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                      <svg
                        className="w-5 h-5 mr-2 text-amber-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      Reprise du passé
                    </h3>
                  </div>
                  <div className="p-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <h4 className="font-semibold text-gray-900">
                          Analyse sinistralité
                        </h4>
                        <div className="space-y-3">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Ratio S/P</span>
                            <span className="font-medium">
                              {calculationResult.reprisePasseResult.ratioSP?.toFixed(
                                3
                              ) || "0"}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">
                              Fréquence sinistres
                            </span>
                            <span className="font-medium">
                              {calculationResult.reprisePasseResult.frequenceSinistres?.toFixed(
                                2
                              ) || "0"}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="space-y-4">
                        <h4 className="font-semibold text-gray-900">
                          Classification
                        </h4>
                        <div className="space-y-3">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Ancienneté</span>
                            <span className="font-medium">
                              {calculationResult.reprisePasseResult
                                .categorieAnciennete || "-"}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Fréquence</span>
                            <span className="font-medium">
                              {calculationResult.reprisePasseResult
                                .categorieFrequence || "-"}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Ratio S/P</span>
                            <span className="font-medium">
                              {calculationResult.reprisePasseResult
                                .categorieRatioSP || "-"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Résumé des calculs */}
                    <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="bg-blue-50 rounded-lg p-4">
                        <h4 className="font-semibold text-blue-900 mb-2">
                          Taux de majoration
                        </h4>
                        <div className="text-2xl font-bold text-blue-800">
                          {(
                            calculationResult.reprisePasseResult
                              .tauxMajoration * 100
                          )?.toFixed(1) || "0"}
                          %
                        </div>
                        <p className="text-sm text-blue-700 mt-1">
                          Coefficient appliqué selon l'analyse sinistralité
                        </p>
                      </div>
                      <div className="bg-green-50 rounded-lg p-4">
                        <h4 className="font-semibold text-green-900 mb-2">
                          Prime après sinistralité
                        </h4>
                        <div className="text-2xl font-bold text-green-800">
                          {calculationResult.reprisePasseResult.primeApresSinistralite?.toLocaleString(
                            "fr-FR"
                          ) || "0"}{" "}
                          €
                        </div>
                        <p className="text-sm text-green-700 mt-1">
                          Prime HT × Taux de majoration
                        </p>
                      </div>
                    </div>

                    {/* Tableau des années */}
                    {calculationResult.reprisePasseResult.tableauAnnees &&
                      calculationResult.reprisePasseResult.tableauAnnees
                        .length > 0 && (
                        <div className="mt-6">
                          <h4 className="font-semibold text-gray-900 mb-4">
                            Détail par année
                          </h4>
                          <div className="overflow-x-auto">
                            <table className="w-full border-collapse border border-gray-300">
                              <thead>
                                <tr className="bg-amber-100">
                                  <th className="border border-gray-300 px-4 py-3 text-left text-sm font-medium text-gray-700">
                                    Année
                                  </th>
                                  <th className="border border-gray-300 px-4 py-3 text-right text-sm font-medium text-gray-700">
                                    Taux TI
                                  </th>
                                  <th className="border border-gray-300 px-4 py-3 text-right text-sm font-medium text-gray-700">
                                    % Année
                                  </th>
                                  <th className="border border-gray-300 px-4 py-3 text-right text-sm font-medium text-gray-700">
                                    Prime Reprise
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {calculationResult.reprisePasseResult.tableauAnnees.map(
                                  (annee: any, index: number) => (
                                    <tr
                                      key={index}
                                      className="hover:bg-gray-50"
                                    >
                                      <td className="border border-gray-300 px-4 py-3 text-sm font-medium text-gray-900">
                                        {annee.annee}
                                      </td>
                                      <td className="border border-gray-300 px-4 py-3 text-sm text-gray-600 text-right">
                                        {(annee.tauxTI * 100)?.toFixed(2) ||
                                          "0"}
                                        %
                                      </td>
                                      <td className="border border-gray-300 px-4 py-3 text-sm text-gray-600 text-right">
                                        {annee.pourcentageAnnee?.toFixed(1) ||
                                          "0"}
                                        %
                                      </td>
                                      <td className="border border-gray-300 px-4 py-3 text-sm font-medium text-gray-900 text-right">
                                        {annee.primeRepriseAnnee?.toLocaleString(
                                          "fr-FR"
                                        ) || "0"}{" "}
                                        €
                                      </td>
                                    </tr>
                                  )
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                    <div className="mt-6 p-4 bg-amber-50 rounded-lg">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-semibold text-amber-900">
                            Prime reprise du passé TTC
                          </p>
                          <p className="text-sm text-amber-700">
                            Taux de majoration:{" "}
                            {(
                              calculationResult.reprisePasseResult
                                .tauxMajoration * 100
                            )?.toFixed(1) || "0"}
                            %
                          </p>
                          <p className="text-sm text-amber-700">
                            Calculée sur{" "}
                            {calculationResult.reprisePasseResult.tableauAnnees
                              ?.length || 0}{" "}
                            année(s)
                          </p>
                        </div>
                        <span className="text-2xl font-bold text-amber-900">
                          {calculationResult.reprisePasseResult.primeReprisePasseTTC?.toLocaleString(
                            "fr-FR"
                          ) || "0"}{" "}
                          €
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Échéancier - Visible pour tous les utilisateurs */}
          {!calculationResult.refus &&
            calculationResult.echeancier &&
            calculationResult.echeancier.echeances &&
            calculationResult.echeancier.echeances.length > 0 && (
              <div className="space-y-6">
                {/* Résumé des primes par année */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {(() => {
                    // Calculer la prime pour l'année en cours et N+1
                    const currentYear = new Date().getFullYear().toString();
                    const nextYear = (new Date().getFullYear() + 1).toString();

                    const primeAnneeEnCours =
                      calculationResult.echeancier.echeances
                        .filter((echeance: any) =>
                          echeance.date.startsWith(currentYear)
                        )
                        .reduce(
                          (sum: number, echeance: any) =>
                            sum + (echeance.totalTTC || 0),
                          0
                        );

                    const primeAnneeN1 = calculationResult.echeancier.echeances
                      .filter((echeance: any) =>
                        echeance.date.startsWith(nextYear)
                      )
                      .reduce(
                        (sum: number, echeance: any) =>
                          sum + (echeance.totalTTC || 0),
                        0
                      );

                    return (
                      <>
                        {/* Prime année en cours */}
                        <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl shadow-lg p-6 text-white">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-emerald-100 text-sm font-medium mb-2">
                                Prime {currentYear}
                              </p>
                              <div className="text-3xl font-bold mb-1">
                                {primeAnneeEnCours.toLocaleString("fr-FR")} €
                              </div>
                              <p className="text-emerald-100 text-xs">
                                {
                                  calculationResult.echeancier.echeances.filter(
                                    (e: any) => e.date.startsWith(currentYear)
                                  ).length
                                }{" "}
                                échéance(s)
                              </p>
                            </div>
                            <div className="p-4 bg-white/20 rounded-full">
                              <svg
                                className="w-8 h-8"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                                />
                              </svg>
                            </div>
                          </div>
                        </div>

                        {/* Prime année N+1 */}
                        <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg p-6 text-white">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-blue-100 text-sm font-medium mb-2">
                                Prime {nextYear}
                              </p>
                              <div className="text-3xl font-bold mb-1">
                                {primeAnneeN1.toLocaleString("fr-FR")} €
                              </div>
                              <p className="text-blue-100 text-xs">
                                {
                                  calculationResult.echeancier.echeances.filter(
                                    (e: any) => e.date.startsWith(nextYear)
                                  ).length
                                }{" "}
                                échéance(s)
                              </p>
                            </div>
                            <div className="p-4 bg-white/20 rounded-full">
                              <svg
                                className="w-8 h-8"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                                />
                              </svg>
                            </div>
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>

                {/* Échéancier détaillé */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                  <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 rounded-t-xl">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                      <svg
                        className="w-5 h-5 mr-2 text-emerald-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                      Échéancier de paiement détaillé
                    </h3>
                  </div>
                  <div className="p-6">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="bg-gray-50">
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">
                              Date échéance
                            </th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">
                              Début période
                            </th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">
                              Fin période
                            </th>
                            <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">
                              RCD HT
                            </th>
                            <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">
                              PJ HT
                            </th>
                            <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">
                              Frais HT
                            </th>
                            <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">
                              Frais Gestion HT
                            </th>
                            <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">
                              Reprise HT
                            </th>
                            <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">
                              Total HT
                            </th>
                            <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">
                              Taxe
                            </th>
                            <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">
                              Total TTC
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {calculationResult.echeancier.echeances.map(
                            (echeance: any, index: number) => (
                              <tr key={index} className="hover:bg-gray-50">
                                <td className="px-4 py-3 text-sm font-medium text-gray-900">
                                  {echeance.date}
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-600">
                                  {echeance.debutPeriode}
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-600">
                                  {echeance.finPeriode}
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-600 text-right">
                                  {echeance.rcd?.toLocaleString("fr-FR") || "0"}{" "}
                                  €
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-600 text-right">
                                  {echeance.pj?.toLocaleString("fr-FR") || "0"}{" "}
                                  €
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-600 text-right">
                                  {echeance.frais?.toLocaleString("fr-FR") ||
                                    "0"}{" "}
                                  €
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-600 text-right">
                                  {echeance.fraisGestion?.toLocaleString(
                                    "fr-FR"
                                  ) || "0"}{" "}
                                  €
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-600 text-right">
                                  {echeance.reprise?.toLocaleString("fr-FR") ||
                                    "0"}{" "}
                                  €
                                </td>
                                <td className="px-4 py-3 text-sm font-medium text-gray-900 text-right">
                                  {echeance.totalHT?.toLocaleString("fr-FR") ||
                                    "0"}{" "}
                                  €
                                </td>
                                <td className="px-4 py-3 text-sm text-orange-600 text-right">
                                  {echeance.taxe?.toLocaleString("fr-FR") ||
                                    "0"}{" "}
                                  €
                                </td>
                                <td className="px-4 py-3 text-sm font-bold text-indigo-600 text-right">
                                  {echeance.totalTTC?.toLocaleString("fr-FR") ||
                                    "0"}{" "}
                                  €
                                </td>
                              </tr>
                            )
                          )}
                        </tbody>
                        {/* Ligne de totaux */}
                        <tfoot>
                          <tr className="bg-gray-100 font-semibold">
                            <td
                              className="px-4 py-3 text-sm font-medium text-gray-900"
                              colSpan={3}
                            >
                              TOTAUX
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900 text-right">
                              {calculationResult.echeancier.echeances
                                .reduce(
                                  (sum: number, echeance: any) =>
                                    sum + (echeance.rcd || 0),
                                  0
                                )
                                .toLocaleString("fr-FR")}{" "}
                              €
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900 text-right">
                              {calculationResult.echeancier.echeances
                                .reduce(
                                  (sum: number, echeance: any) =>
                                    sum + (echeance.pj || 0),
                                  0
                                )
                                .toLocaleString("fr-FR")}{" "}
                              €
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900 text-right">
                              {calculationResult.echeancier.echeances
                                .reduce(
                                  (sum: number, echeance: any) =>
                                    sum + (echeance.frais || 0),
                                  0
                                )
                                .toLocaleString("fr-FR")}{" "}
                              €
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900 text-right">
                              {calculationResult.echeancier.echeances
                                .reduce(
                                  (sum: number, echeance: any) =>
                                    sum + (echeance.fraisGestion || 0),
                                  0
                                )
                                .toLocaleString("fr-FR")}{" "}
                              €
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900 text-right">
                              {calculationResult.echeancier.echeances
                                .reduce(
                                  (sum: number, echeance: any) =>
                                    sum + (echeance.reprise || 0),
                                  0
                                )
                                .toLocaleString("fr-FR")}{" "}
                              €
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900 text-right">
                              {calculationResult.echeancier.echeances
                                .reduce(
                                  (sum: number, echeance: any) =>
                                    sum + (echeance.totalHT || 0),
                                  0
                                )
                                .toLocaleString("fr-FR")}{" "}
                              €
                            </td>
                            <td className="px-4 py-3 text-sm text-orange-600 text-right">
                              {calculationResult.echeancier.echeances
                                .reduce(
                                  (sum: number, echeance: any) =>
                                    sum + (echeance.taxe || 0),
                                  0
                                )
                                .toLocaleString("fr-FR")}{" "}
                              €
                            </td>
                            <td className="px-4 py-3 text-sm font-bold text-indigo-600 text-right">
                              {calculationResult.echeancier.echeances
                                .reduce(
                                  (sum: number, echeance: any) =>
                                    sum + (echeance.totalTTC || 0),
                                  0
                                )
                                .toLocaleString("fr-FR")}{" "}
                              €
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                </div>

                {/* Échéancier regroupé par année */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                  <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 rounded-t-xl">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                      <svg
                        className="w-5 h-5 mr-2 text-blue-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                        />
                      </svg>
                      Échéancier par année
                    </h3>
                  </div>
                  <div className="p-6">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="bg-gray-50">
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">
                              Année
                            </th>
                            <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">
                              RCD
                            </th>
                            <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">
                              RCD HT
                            </th>
                            <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">
                              Taxe
                            </th>
                            <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">
                              PJ
                            </th>
                            <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">
                              Frais
                            </th>
                            <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">
                              Frais Gestion
                            </th>
                            <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">
                              Reprise
                            </th>
                            <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">
                              Total TTC
                            </th>
                            <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">
                              Nb échéances
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {(() => {
                            // Grouper les échéances par année
                            const echeancesParAnnee =
                              calculationResult.echeancier.echeances.reduce(
                                (acc: any, echeance: any) => {
                                  const annee = echeance.date.split("/")[0];
                                  if (!acc[annee]) {
                                    acc[annee] = {
                                      annee,
                                      rcd: 0,
                                      rcdHT: 0,
                                      taxe: 0,
                                      pj: 0,
                                      frais: 0,
                                      fraisGestion: 0,
                                      reprise: 0,
                                      totalTTC: 0,
                                      nbEcheances: 0,
                                    };
                                  }
                                  acc[annee].rcd += echeance.rcd || 0;
                                  acc[annee].pj += echeance.pj || 0;
                                  acc[annee].frais += echeance.frais || 0;
                                  acc[annee].fraisGestion +=
                                    echeance.fraisGestion || 0;
                                  acc[annee].reprise += echeance.reprise || 0;
                                  acc[annee].taxe += echeance.taxe || 0;
                                  acc[annee].rcdHT +=
                                    (echeance.rcd || 0) - (echeance.taxe || 0);
                                  acc[annee].totalTTC += echeance.totalTTC || 0;
                                  acc[annee].nbEcheances += 1;
                                  return acc;
                                },
                                {}
                              );

                            return Object.values(echeancesParAnnee)
                              .sort((a: any, b: any) =>
                                a.annee.localeCompare(b.annee)
                              )
                              .map((annee: any, index: number) => (
                                <tr key={index} className="hover:bg-gray-50">
                                  <td className="px-4 py-3 text-sm font-medium text-gray-900">
                                    {annee.annee}
                                  </td>
                                  <td className="px-4 py-3 text-sm text-gray-600 text-right">
                                    {annee.rcd.toLocaleString("fr-FR")} €
                                  </td>
                                  <td className="px-4 py-3 text-sm text-gray-600 text-right">
                                    {annee.rcdHT.toLocaleString("fr-FR")} €
                                  </td>
                                  <td className="px-4 py-3 text-sm text-gray-600 text-right">
                                    {annee.taxe.toLocaleString("fr-FR")} €
                                  </td>
                                  <td className="px-4 py-3 text-sm text-gray-600 text-right">
                                    {annee.pj.toLocaleString("fr-FR")} €
                                  </td>
                                  <td className="px-4 py-3 text-sm text-gray-600 text-right">
                                    {annee.frais.toLocaleString("fr-FR")} €
                                  </td>
                                  <td className="px-4 py-3 text-sm text-gray-600 text-right">
                                    {annee.fraisGestion.toLocaleString("fr-FR")}{" "}
                                    €
                                  </td>
                                  <td className="px-4 py-3 text-sm text-gray-600 text-right">
                                    {annee.reprise.toLocaleString("fr-FR")} €
                                  </td>
                                  <td className="px-4 py-3 text-sm font-medium text-gray-900 text-right">
                                    {annee.totalTTC.toLocaleString("fr-FR")} €
                                  </td>
                                  <td className="px-4 py-3 text-sm text-gray-600 text-right">
                                    {annee.nbEcheances}
                                  </td>
                                </tr>
                              ));
                          })()}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* Tableau croisé Postes vs Types */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                  <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 rounded-t-xl">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                      <svg
                        className="w-5 h-5 mr-2 text-purple-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M8 5a2 2 0 012-2h4a2 2 0 012 2v2H8V5z"
                        />
                      </svg>
                      Répartition par postes et types
                    </h3>
                  </div>
                  <div className="p-6">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="bg-gray-50">
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">
                              Type
                            </th>
                            <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">
                              RCD
                            </th>
                            <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">
                              PJ
                            </th>
                            <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">
                              Frais
                            </th>
                            <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">
                              Frais Gestion
                            </th>
                            <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">
                              Reprise
                            </th>
                            <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">
                              Total
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {(() => {
                            // Calculer les totaux par type
                            const totaux =
                              calculationResult.echeancier.echeances.reduce(
                                (acc: any, echeance: any) => {
                                  acc.rcd += echeance.rcd || 0;
                                  acc.pj += echeance.pj || 0;
                                  acc.frais += echeance.frais || 0;
                                  acc.fraisGestion +=
                                    echeance.fraisGestion || 0;
                                  acc.reprise += echeance.reprise || 0;
                                  acc.totalHT += echeance.totalHT || 0;
                                  acc.totalTTC += echeance.totalTTC || 0;
                                  acc.taxe += echeance.taxe || 0;
                                  return acc;
                                },
                                {
                                  rcd: 0,
                                  pj: 0,
                                  frais: 0,
                                  fraisGestion: 0,
                                  reprise: 0,
                                  totalHT: 0,
                                  totalTTC: 0,
                                  taxe: 0,
                                }
                              );

                            return [
                              {
                                type: "HT",
                                rcd: totaux.rcd,
                                pj: totaux.pj,
                                frais: totaux.frais,
                                fraisGestion: totaux.fraisGestion,
                                reprise: totaux.reprise,
                                total: totaux.totalHT,
                                className: "text-gray-600",
                              },
                              {
                                type: "Taxe",
                                rcd: 0,
                                pj: 0,
                                frais: 0,
                                fraisGestion: 0,
                                reprise: 0,
                                total: totaux.taxe,
                                className: "text-orange-600",
                              },
                              {
                                type: "TTC",
                                rcd: totaux.rcd,
                                pj: totaux.pj,
                                frais: totaux.frais,
                                fraisGestion: totaux.fraisGestion,
                                reprise: totaux.reprise,
                                total: totaux.totalTTC,
                                className: "text-indigo-600 font-semibold",
                              },
                            ].map((row: any, index: number) => (
                              <tr key={index} className="hover:bg-gray-50">
                                <td
                                  className={`px-4 py-3 text-sm font-medium ${row.className}`}
                                >
                                  {row.type}
                                </td>
                                <td className="px-4 py-3 text-sm text-right">
                                  <span className={row.className}>
                                    {row.rcd.toLocaleString("fr-FR")} €
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-sm text-right">
                                  <span className={row.className}>
                                    {row.pj.toLocaleString("fr-FR")} €
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-sm text-right">
                                  <span className={row.className}>
                                    {row.frais.toLocaleString("fr-FR")} €
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-sm text-right">
                                  <span className={row.className}>
                                    {row.fraisGestion.toLocaleString("fr-FR")} €
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-sm text-right">
                                  <span className={row.className}>
                                    {row.reprise.toLocaleString("fr-FR")} €
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-sm text-right">
                                  <span
                                    className={`font-semibold ${row.className}`}
                                  >
                                    {row.total.toLocaleString("fr-FR")} €
                                  </span>
                                </td>
                              </tr>
                            ));
                          })()}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            )}

          {/* Détail par activité - Visible pour ADMIN seulement */}
          {!calculationResult.refus &&
            session?.user?.role === "ADMIN" &&
            calculationResult.returnTab &&
            calculationResult.returnTab.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 rounded-t-xl">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                    <svg
                      className="w-5 h-5 mr-2 text-indigo-600"
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
                          (activity: any, index: number) => (
                            <tr key={index} className="hover:bg-gray-50">
                              <td className="px-4 py-3 text-sm font-medium text-gray-900">
                                {activity.nomActivite}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-600 text-right">
                                {(activity.partCA * 100).toFixed(1) || "0"}%
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-600 text-right">
                                {(activity.tauxBase * 100)?.toFixed(3) || "0"}%
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-600 text-right">
                                {activity.PrimeMiniAct?.toLocaleString(
                                  "fr-FR"
                                ) || "0"}{" "}
                                €
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-600 text-right">
                                {activity.Deg400k > 0
                                  ? `${
                                      (activity.Deg400k * 100)?.toFixed(1) ||
                                      "0"
                                    }%`
                                  : "-"}
                              </td>
                              <td className="px-4 py-3 text-sm font-medium text-gray-900 text-right">
                                {activity.Prime100Min?.toLocaleString(
                                  "fr-FR"
                                ) || "0"}{" "}
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
  );
}
