import React, { useState } from "react";
import { CalculationResult } from "@/lib/types";
import { Quote } from "@/lib/types";
import { useCallback } from "react";
import { genererEcheancier } from "@/lib/tarificateurs/rcd";
import { getFieldLabel } from "../../tabs/CalculationTab";

const ModificationForm = React.memo(
    ({
      quote,
      calculationResult,
      onUpdate,
      originalCalculationResult,
      section,
    }: {
      quote: Quote;
      calculationResult: CalculationResult;
      onUpdate: (newResult: CalculationResult) => void;
      originalCalculationResult: CalculationResult | null;
      section: "majorations" | "fraisEtTaxes" | null;
    }) => {
      // État local pour les modifications temporaires
      const [localValues, setLocalValues] = useState<Record<string, any>>({});
  
      // Fonction pour obtenir une valeur dans un objet imbriqué
      const getNestedValue = useCallback((obj: any, path: string) => {
        return path.split(".").reduce((current, key) => current?.[key], obj);
      }, []);
  
      // Fonction pour définir une valeur dans un objet imbriqué via un chemin
      const setNestedValue = useCallback((obj: any, path: string, value: any) => {
        const keys = path.split(".");
        let current = obj;
  
        for (let i = 0; i < keys.length - 1; i++) {
          if (!current[keys[i]]) current[keys[i]] = {};
          current = current[keys[i]];
        }
  
        const finalKey = keys[keys.length - 1];
        current[finalKey] = value;
      }, []);
  
      // Filtrer les champs selon la section
      const getFieldsForSection = useCallback(() => {
        if (section === "majorations") {
          return [
            "majorations.absenceDeSinistreSurLes5DernieresAnnees",
            "majorations.anneeExperience",
            "majorations.assureurDefaillant",
            "majorations.dateCreation",
            "majorations.etp",
            "majorations.nombreAnneeAssuranceContinue",
            "majorations.nonFournitureBilanN_1",
            "majorations.qualif",
            "majorations.sansActiviteDepuisPlusDe12MoisSansFermeture",
            "majorations.tempsSansActivite",
          ];
        } else if (section === "fraisEtTaxes") {
          return [
            "protectionJuridique",
            "fraisGestion",
            "autres.taxeAssurance",
            "autres.fraisFractionnementPrimeHT",
          ];
        }
        return Object.keys(calculationResult);
      }, [section, calculationResult]);
  
      const fieldsToShow = getFieldsForSection();
  
      const reDoEcheancier = () => {
        console.log("quote///", quote.formData.dateDeffet);
        setNestedValue(
          calculationResult,
          "echeancier",
          genererEcheancier({
            dateDebut: new Date(quote.formData.dateDeffet),
            totalHT: calculationResult.primeTotal,
            taxe: calculationResult.autres.taxeAssurance,
            totalTTC: calculationResult.totalTTC,
            rcd: calculationResult.primeTotal,
            pj: calculationResult.autres.protectionJuridiqueTTC,
            frais: calculationResult.autres.fraisFractionnementPrimeHT,
            reprise: calculationResult.reprisePasseResult?.reprise,
            fraisGestion: calculationResult.fraisGestion,
            periodicite: quote.formData.periodicity as
              | "annuel"
              | "semestriel"
              | "trimestriel"
              | "mensuel",
          })
        );
      };
  
      // Fonction pour gérer les changements d'input
      const handleInputChange = useCallback(
        (path: string, value: string) => {
          console.log("path///", path);
          console.log("value///", value);
  
          const numValue = parseFloat(value) || 0;
          setLocalValues((prev) => ({ ...prev, [path]: numValue }));
  
          if (
            path === "autres.fraisFractionnementPrimeHT" ||
            path === "autres.taxeAssurance" ||
            path === "protectionJuridique"
          ) {
            setNestedValue(
              calculationResult,
              "autres.total",
              calculationResult.autres.taxeAssurance +
                calculationResult.autres.fraisFractionnementPrimeHT +
                calculationResult.protectionJuridique
            );
            if (path === "protectionJuridique")
              setNestedValue(
                calculationResult,
                "autres.protectionJuridiqueTTC",
                calculationResult.autres.protectionJuridique
              );
          }
          if (path.startsWith("majorations.")) {
            console.log(
              "pathMajorations///",
              path,
              numValue,
              getNestedValue(calculationResult, path)
            );
            setNestedValue(
              calculationResult,
              "totalMajorations",
              calculationResult.totalMajorations +
                numValue -
                getNestedValue(calculationResult, path)
            );
            setNestedValue(
              calculationResult,
              "primeTotal",
              calculationResult.PrimeHTSansMajorations *
                getNestedValue(calculationResult, "totalMajorations")
            );
          }
  
          if (path === "fraisGestion")
            setNestedValue(calculationResult, "fraisGestion", numValue);
  
          console.log(
            getNestedValue(calculationResult, "primeTotal"),
            "primeTotal///",
            getNestedValue(calculationResult, "autres.total"),
            getNestedValue(calculationResult, "fraisGestion"),
            "calculationResult///",
            getNestedValue(calculationResult, "primeTotal") +
              getNestedValue(calculationResult, "autres.total") +
              getNestedValue(calculationResult, "fraisGestion")
          );
  
          setNestedValue(
            calculationResult,
            "totalTTC",
            getNestedValue(calculationResult, "primeTotal") +
              getNestedValue(calculationResult, "autres.total") +
              getNestedValue(calculationResult, "fraisGestion")
          );
  
          reDoEcheancier();
  
          // Mettre à jour le calculationResult immédiatement
          const newResult = { ...calculationResult };
          setNestedValue(newResult, path, numValue);
  
          onUpdate(newResult);
        },
        [calculationResult]
      );
  
      return (
        <div className="space-y-6">
          {/* Formulaire de modification */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {fieldsToShow.map((path) => {
              const currentValue =
                localValues[path] !== undefined
                  ? localValues[path]
                  : getNestedValue(calculationResult, path);
              const originalValue = getNestedValue(
                originalCalculationResult,
                path
              );
              const label = getFieldLabel(path);
              const isModified = currentValue !== originalValue;
  
              return (
                <div
                  key={path}
                  className={`p-4 border rounded-lg ${
                    isModified ? "border-blue-300 bg-blue-50" : "border-gray-200"
                  }`}
                >
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {label}
                    {isModified && <span className="text-blue-600 ml-1">●</span>}
                  </label>
  
                  <input
                    type="number"
                    step="0.01"
                    value={currentValue || ""}
                    onChange={(e) => handleInputChange(path, e.target.value)}
                    className={`w-full px-3 py-2 border rounded-md text-sm ${
                      isModified
                        ? "border-blue-300 bg-blue-50 text-blue-900 font-medium"
                        : "border-gray-300"
                    }`}
                  />
  
                  {originalValue !== undefined &&
                    originalValue !== currentValue && (
                      <div className="mt-1 text-xs text-gray-500">
                        Original:{" "}
                        {typeof originalValue === "number"
                          ? originalValue.toLocaleString("fr-FR")
                          : originalValue}
                      </div>
                    )}
                </div>
              );
            })}
          </div>
  
          {/* Message d'aide */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <div className="flex items-start">
              <svg
                className="w-5 h-5 text-gray-400 mt-0.5 mr-3"
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
                <h4 className="font-medium text-gray-900">Instructions</h4>
                <p className="text-sm text-gray-600 mt-1">
                  Modifiez les valeurs ci-dessus. Les champs modifiés sont
                  surlignés en bleu. Les modifications sont appliquées en temps
                  réel et visibles dans l'interface.
                </p>
              </div>
            </div>
          </div>
        </div>
      );
    }
  );
  
  ModificationForm.displayName = "ModificationForm";

  export default ModificationForm;