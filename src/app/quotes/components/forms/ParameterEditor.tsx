"use client";

import React, { useState } from "react";
import { Quote, CalculationResult } from "@/lib/types";
import { recalculateWithParams } from "./recalculateUtils";
import { ChevronDown, ChevronRight, Edit2, Check, X, RotateCcw } from "lucide-react";

interface ParameterEditorProps {
  quote: Quote;
  calculationResult: CalculationResult;
  onUpdate: (newResult: CalculationResult) => void;
  onClose: () => void;
  parameterMapping: Record<string, string>;
  formFields: Record<string, any>;
}

// Définition des catégories et paramètres modifiables
const PARAMETER_CATEGORIES = {
  ca_activites: {
    label: "Chiffre d'affaires & Activités",
    icon: "📊",
    params: {
      caDeclared: {
        label: "Chiffre d'affaires déclaré",
        unit: "€",
        type: "number",
        min: 0,
      },
      etp: {
        label: "Nombre d'ETP",
        unit: "personnes",
        type: "number",
        min: 1,
        step: 1,
      },
    },
  },
  majorations: {
    label: "Majorations et réductions",
    icon: "📈",
    params: {
      qualif: {
        label: "Qualification professionnelle",
        type: "boolean",
        description: "Réduit la prime de 5%",
      },
      anneeExperience: {
        label: "Années d'expérience du dirigeant",
        unit: "ans",
        type: "number",
        min: 0,
        step: 1,
      },
      nombreAnneeAssuranceContinue: {
        label: "Années d'assurance continue",
        unit: "ans",
        type: "number",
        min: 0,
        step: 1,
      },
      assureurDefaillant: {
        label: "Assureur précédent défaillant",
        type: "boolean",
        description: "Majore la prime de 20%",
      },
      nonFournitureBilanN_1: {
        label: "Non fourniture du bilan N-1",
        type: "boolean",
        description: "Majore la prime de 50%",
      },
      tempsSansActivite: {
        label: "Temps sans activité",
        type: "select",
        options: [
          { value: "NON", label: "Non" },
          { value: "DE 6_A 12_MOIS", label: "De 6 à 12 mois" },
          { value: "PLUS_DE_12_MOIS", label: "Plus de 12 mois" },
          { value: "CREATION", label: "Création" },
        ],
      },
      sansActiviteDepuisPlusDe12MoisSansFermeture: {
        label: "Sans activité +12 mois sans fermeture",
        type: "select",
        options: [
          { value: "NON", label: "Non" },
          { value: "OUI", label: "Oui" },
          { value: "CREATION", label: "Création" },
        ],
      },
      absenceDeSinistreSurLes5DernieresAnnees: {
        label: "Absence de sinistre sur 5 ans",
        type: "select",
        options: [
          { value: "OUI", label: "Oui" },
          { value: "NON", label: "Non" },
          { value: "CREATION", label: "Création" },
          { value: "ASSUREUR_DEFAILLANT", label: "Assureur défaillant" },
          { value: "A_DEFINIR", label: "À définir" },
        ],
      },
    },
  },
  frais_taxes: {
    label: "Frais et taxes",
    icon: "💰",
    params: {
      txFraisGestion: {
        label: "Taux de frais de gestion",
        unit: "%",
        type: "percentage",
        min: 0,
        max: 100,
        step: 0.1,
      },
      protectionJuridique1an: {
        label: "Protection juridique (annuelle)",
        unit: "€",
        type: "number",
        min: 0,
      },
      taxeAssurance: {
        label: "Taux de taxe d'assurance",
        unit: "%",
        type: "percentage",
        min: 0,
        max: 100,
        step: 0.1,
      },
    },
  },
  fractionnement: {
    label: "Fractionnement de prime",
    icon: "📅",
    params: {
      fractionnementPrime: {
        label: "Périodicité de paiement",
        type: "select",
        options: [
          { value: "annuel", label: "Annuel" },
          { value: "semestriel", label: "Semestriel" },
          { value: "trimestriel", label: "Trimestriel" },
          { value: "mensuel", label: "Mensuel" },
        ],
      },
      fraisFractionnementPrime: {
        label: "Frais par échéance",
        unit: "€",
        type: "number",
        min: 0,
      },
    },
  },
};

export default function ParameterEditor({
  quote,
  calculationResult,
  onUpdate,
  onClose,
  parameterMapping,
  formFields,
}: ParameterEditorProps) {
  const [expandedCategory, setExpandedCategory] = useState<string | null>("ca_activites");
  const [editingParam, setEditingParam] = useState<string | null>(null);
  const [modifiedParams, setModifiedParams] = useState<Record<string, any>>({});
  const [tempValue, setTempValue] = useState<any>(null);
  const [isRecalculating, setIsRecalculating] = useState(false);

  // Mapper les clés de paramètres vers les clés de formData
  const getFormDataKey = (paramKey: string): string => {
    const mapping: Record<string, string> = {
      caDeclared: "turnover",
      etp: "fullTimeEmployees",
      qualif: "professionalQualification",
      anneeExperience: "yearsOfExperience",
      nombreAnneeAssuranceContinue: "yearsOfContinuousInsurance",
      assureurDefaillant: "defaultInsurer",
      nonFournitureBilanN_1: "nonProvisionOfBalanceSheetN_1",
      tempsSansActivite: "timeWithoutActivity",
      sansActiviteDepuisPlusDe12MoisSansFermeture: "noActivityForOver12MonthsWithoutClosure",
      absenceDeSinistreSurLes5DernieresAnnees: "noClaimsInLast5Years",
      txFraisGestion: "managementFeeRate",
      protectionJuridique1an: "legalProtectionAnnual",
      taxeAssurance: "insuranceTaxRate",
      fractionnementPrime: "periodicity",
      fraisFractionnementPrime: "installmentFees",
    };
    return mapping[paramKey] || paramKey;
  };

  // Obtenir la valeur actuelle d'un paramètre (modifiée ou originale)
  const getCurrentValue = (paramKey: string) => {
    if (modifiedParams[paramKey] !== undefined) {
      return modifiedParams[paramKey];
    }
    // Valeur depuis quote.formData
    const formDataKey = getFormDataKey(paramKey);
    const formData = quote.formData as any;
    return formData[formDataKey] ?? null;
  };

  // Commencer l'édition d'un paramètre
  const startEditing = (paramKey: string) => {
    setEditingParam(paramKey);
    setTempValue(getCurrentValue(paramKey));
  };

  // Annuler l'édition en cours
  const cancelEditing = () => {
    setEditingParam(null);
    setTempValue(null);
  };

  // Appliquer la modification d'un paramètre
  const applyChange = (paramKey: string) => {
    setIsRecalculating(true);

    try {
      const newParams = {
        ...modifiedParams,
        [paramKey]: tempValue,
      };

      setModifiedParams(newParams);

      // Recalculer avec les nouveaux paramètres en utilisant calculateWithMapping
      const newResult = recalculateWithParams(
        quote,
        newParams,
        parameterMapping,
        formFields
      );

      onUpdate(newResult);
      setEditingParam(null);
      setTempValue(null);
    } catch (error) {
      console.error("Erreur lors du recalcul:", error);
      alert("Erreur lors du recalcul. Vérifiez les valeurs saisies.");
    } finally {
      setIsRecalculating(false);
    }
  };

  // Restaurer toutes les valeurs originales
  const restoreOriginal = () => {
    if (!confirm("Voulez-vous vraiment restaurer toutes les valeurs originales ?")) {
      return;
    }

    setIsRecalculating(true);

    try {
      setModifiedParams({});
      const newResult = recalculateWithParams(quote, {}, parameterMapping, formFields);
      onUpdate(newResult);
    } catch (error) {
      console.error("Erreur lors de la restauration:", error);
    } finally {
      setIsRecalculating(false);
    }
  };

  // Rendu d'un champ d'édition selon le type
  const renderEditField = (paramKey: string, paramConfig: any) => {
    if (paramConfig.type === "boolean") {
      return (
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setTempValue(true)}
            className={`px-4 py-2 rounded-lg border-2 transition-all ${
              tempValue === true
                ? "border-green-500 bg-green-50 text-green-700 font-medium"
                : "border-gray-300 bg-white text-gray-700 hover:border-green-300"
            }`}
          >
            Oui
          </button>
          <button
            onClick={() => setTempValue(false)}
            className={`px-4 py-2 rounded-lg border-2 transition-all ${
              tempValue === false
                ? "border-red-500 bg-red-50 text-red-700 font-medium"
                : "border-gray-300 bg-white text-gray-700 hover:border-red-300"
            }`}
          >
            Non
          </button>
        </div>
      );
    }

    if (paramConfig.type === "select") {
      return (
        <select
          value={tempValue || ""}
          onChange={(e) => setTempValue(e.target.value)}
          className="w-full px-4 py-2 border-2 border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {paramConfig.options.map((opt: any) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      );
    }

    // Type number ou percentage
    const inputValue = paramConfig.type === "percentage"
      ? (tempValue * 100).toFixed(2)
      : tempValue;

    return (
      <div className="flex items-center space-x-2">
        <input
          type="number"
          value={inputValue || ""}
          onChange={(e) => {
            const val = parseFloat(e.target.value) || 0;
            setTempValue(paramConfig.type === "percentage" ? val / 100 : val);
          }}
          min={paramConfig.min}
          max={paramConfig.max}
          step={paramConfig.step || 0.01}
          className="flex-1 px-4 py-2 border-2 border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {paramConfig.unit && (
          <span className="text-gray-600 font-medium">{paramConfig.unit}</span>
        )}
      </div>
    );
  };

  // Formater la valeur pour l'affichage
  const formatValue = (value: any, paramConfig: any) => {
    if (value === null || value === undefined) return "-";

    if (paramConfig.type === "boolean") {
      return value ? "Oui" : "Non";
    }

    if (paramConfig.type === "select") {
      const option = paramConfig.options.find((opt: any) => opt.value === value);
      return option?.label || value;
    }

    if (paramConfig.type === "percentage") {
      return `${(value * 100).toFixed(2)} %`;
    }

    if (paramConfig.unit === "€") {
      return `${value.toLocaleString("fr-FR")} €`;
    }

    return `${value} ${paramConfig.unit || ""}`;
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-gray-900">
              Modification des paramètres
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Modifiez les paramètres un par un pour voir l'impact sur le tarif
            </p>
          </div>
          <button
            onClick={restoreOriginal}
            disabled={isRecalculating || Object.keys(modifiedParams).length === 0}
            className="flex items-center space-x-2 px-4 py-2 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Restaurer l'original</span>
          </button>
        </div>

        {Object.keys(modifiedParams).length > 0 && (
          <div className="mt-3 flex items-center space-x-2 text-sm">
            <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full font-medium">
              {Object.keys(modifiedParams).length} paramètre(s) modifié(s)
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        <div className="space-y-3">
          {Object.entries(PARAMETER_CATEGORIES).map(([categoryKey, category]) => (
            <div
              key={categoryKey}
              className="border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm"
            >
              {/* Category header */}
              <button
                onClick={() =>
                  setExpandedCategory(
                    expandedCategory === categoryKey ? null : categoryKey
                  )
                }
                className="w-full px-4 py-3 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">{category.icon}</span>
                  <span className="font-semibold text-gray-900">
                    {category.label}
                  </span>
                </div>
                {expandedCategory === categoryKey ? (
                  <ChevronDown className="w-5 h-5 text-gray-500" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-gray-500" />
                )}
              </button>

              {/* Category params */}
              {expandedCategory === categoryKey && (
                <div className="divide-y divide-gray-100">
                  {Object.entries(category.params).map(([paramKey, paramConfig]: [string, any]) => {
                    const currentValue = getCurrentValue(paramKey);
                    const isModified = modifiedParams[paramKey] !== undefined;
                    const isEditing = editingParam === paramKey;

                    return (
                      <div
                        key={paramKey}
                        className={`px-4 py-3 ${
                          isModified ? "bg-blue-50" : "bg-white"
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <label className="font-medium text-gray-900">
                                {paramConfig.label}
                              </label>
                              {isModified && (
                                <span className="px-2 py-0.5 bg-blue-500 text-white text-xs rounded-full">
                                  Modifié
                                </span>
                              )}
                            </div>

                            {paramConfig.description && (
                              <p className="text-xs text-gray-500 mt-1">
                                {paramConfig.description}
                              </p>
                            )}

                            {isEditing ? (
                              <div className="mt-3 space-y-3">
                                {renderEditField(paramKey, paramConfig)}

                                <div className="flex items-center space-x-2">
                                  <button
                                    onClick={() => applyChange(paramKey)}
                                    disabled={isRecalculating}
                                    className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                                  >
                                    <Check className="w-4 h-4" />
                                    <span>Appliquer</span>
                                  </button>
                                  <button
                                    onClick={cancelEditing}
                                    disabled={isRecalculating}
                                    className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
                                  >
                                    <X className="w-4 h-4" />
                                    <span>Annuler</span>
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="mt-2 flex items-center justify-between">
                                <span className="text-lg font-semibold text-gray-900">
                                  {formatValue(currentValue, paramConfig)}
                                </span>
                                <button
                                  onClick={() => startEditing(paramKey)}
                                  disabled={isRecalculating}
                                  className="flex items-center space-x-1 px-3 py-1.5 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors disabled:opacity-50"
                                >
                                  <Edit2 className="w-3 h-3" />
                                  <span>Modifier</span>
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-between items-center">
        <div className="text-sm text-gray-600">
          {isRecalculating && (
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              <span>Recalcul en cours...</span>
            </div>
          )}
        </div>

        <button
          onClick={onClose}
          className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
        >
          Fermer
        </button>
      </div>
    </div>
  );
}
