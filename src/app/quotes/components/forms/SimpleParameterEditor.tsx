"use client";

import React, { useState } from "react";
import { Quote, CalculationResult } from "@/lib/types";
import { ChevronDown, ChevronRight, Edit2, Check, X, RotateCcw } from "lucide-react";
import { genererEcheancier, getTaxeByRegion } from "@/lib/tarificateurs/rcd";

interface SimpleParameterEditorProps {
  quote: Quote;
  calculationResult: CalculationResult;
  originalCalculationResult: CalculationResult | null;
  onUpdate: (newResult: CalculationResult) => void;
  onClose: () => void;
}

// Structure pour organiser les champs modifiables
const EDITABLE_SECTIONS = {
  majorations: {
    label: "Majorations et coefficients",
    icon: "📈",
    description: "Modifiez les majorations qui impactent le calcul de la prime",
    getValue: (calc: CalculationResult) => calc.majorations,
    fields: {
      etp: { label: "ETP", format: "percentage" },
      qualif: { label: "Qualification", format: "percentage" },
      dateCreation: { label: "Ancienneté", format: "percentage" },
      tempsSansActivite: { label: "Temps sans activité", format: "percentage" },
      anneeExperience: { label: "Expérience", format: "percentage" },
      assureurDefaillant: { label: "Assureur défaillant", format: "percentage" },
      nombreAnneeAssuranceContinue: { label: "Années assurance continue", format: "percentage" },
      nonFournitureBilanN_1: { label: "Non fourniture bilan N-1", format: "percentage" },
      sansActiviteDepuisPlusDe12MoisSansFermeture: { label: "Sans activité +12 mois", format: "percentage" },
      absenceDeSinistreSurLes5DernieresAnnees: { label: "Absence sinistre 5 ans", format: "percentage" },
    },
  },
  frais_taxes: {
    label: "Frais et taxes",
    icon: "💰",
    description: "Modifiez les frais de gestion et taxes",
    getValue: (calc: CalculationResult) => ({
      fraisGestion: calc.fraisGestion,
      taxeAssurance: calc.autres.taxeAssurance,
      protectionJuridique: calc.autres.protectionJuridiqueTTC,
      fraisFractionnement: calc.autres.fraisFractionnementPrimeHT,
    }),
    fields: {
      fraisGestion: { label: "Frais de gestion", format: "currency" },
      taxeAssurance: { label: "Taxe d'assurance", format: "currency" },
      protectionJuridique: { label: "Protection juridique TTC", format: "currency" },
      fraisFractionnement: { label: "Frais de fractionnement", format: "currency" },
    },
  },
};

export default function SimpleParameterEditor({
  quote,
  calculationResult,
  originalCalculationResult,
  onUpdate,
  onClose,
}: SimpleParameterEditorProps) {
  const [expandedSection, setExpandedSection] = useState<string | null>("majorations");
  const [editingField, setEditingField] = useState<string | null>(null);
  const [tempValue, setTempValue] = useState<number | null>(null);
  const [localResult, setLocalResult] = useState<CalculationResult>(calculationResult);

  // Obtenir la valeur actuelle d'un champ
  const getCurrentValue = (sectionKey: string, fieldKey: string): number => {
    const section = EDITABLE_SECTIONS[sectionKey as keyof typeof EDITABLE_SECTIONS];
    const values = section.getValue(localResult);
    return values[fieldKey] ?? 0;
  };

  // Commencer l'édition
  const startEditing = (sectionKey: string, fieldKey: string) => {
    setEditingField(`${sectionKey}.${fieldKey}`);
    setTempValue(getCurrentValue(sectionKey, fieldKey));
  };

  // Annuler l'édition
  const cancelEditing = () => {
    setEditingField(null);
    setTempValue(null);
  };

  // Recalculer l'échéancier avec les nouvelles valeurs
  const recalculateEcheancier = (result: CalculationResult) => {
    try {
      const echeancier = genererEcheancier({
        dateDebut: new Date(quote.formData.dateDeffet),
        totalHT: result.primeTotal,
        tauxTaxe: getTaxeByRegion(quote.formData.territory),
        taxe: result.autres.taxeAssurance,
        totalTTC: result.totalTTC,
        rcd: result.primeTotal,
        pj: result.autres.protectionJuridiqueTTC,
        frais: result.autres.fraisFractionnementPrimeHT,
        reprise: result.reprisePasseResult?.primeReprisePasseTTC ?? 0,
        fraisGestion: result.fraisGestion,
        periodicite: quote.formData.periodicity as "annuel" | "semestriel" | "trimestriel" | "mensuel",
        // Données pour l'année N+1
        totalHTN1: result.primeTotalN1,
        taxeN1: result.autresN1.taxeAssurance,
        totalTTCN1: result.totalTTCN1,
        rcdN1: result.primeTotalN1,
        pjN1: result.autresN1.protectionJuridiqueTTC,
        fraisN1: result.autresN1.fraisFractionnementPrimeHT,
        fraisGestionN1: result.fraisGestionN1,
      });

      return echeancier;
    } catch (error) {
      console.error("Erreur lors du recalcul de l'échéancier:", error);
      return result.echeancier;
    }
  };

  // Appliquer la modification
  const applyChange = (sectionKey: string, fieldKey: string) => {
    if (tempValue === null) return;

    const newResult = { ...localResult };

    // Appliquer la modification selon la section
    if (sectionKey === "majorations") {
      newResult.majorations = {
        ...newResult.majorations,
        [fieldKey]: tempValue,
      };

      // Recalculer le total des majorations
      const totalMaj = Object.entries(newResult.majorations)
        .filter(([key]) => key !== "nonFournitureBilanN_1")
        .reduce((sum, [, val]) => sum + (val as number), 1);

      newResult.totalMajorations = totalMaj;
      newResult.primeTotal = newResult.PrimeHTSansMajorations * totalMaj;

      // Obtenir le taux de frais de gestion (default 10%)
      const txFraisGestion = 0.1;
      newResult.fraisGestion = newResult.primeTotal * txFraisGestion;

      // Recalculer aussi pour l'année N+1
      newResult.primeTotalN1 = newResult.PrimeHTSansMajorationsN1 * totalMaj;
      newResult.fraisGestionN1 = newResult.primeTotalN1 * txFraisGestion;

      // Recalculer le total autres
      newResult.autres.total =
        newResult.autres.taxeAssurance +
        newResult.autres.protectionJuridiqueTTC +
        newResult.autres.fraisFractionnementPrimeHT;

      // Recalculer les totaux
      newResult.totalTTC =
        newResult.primeTotal +
        newResult.fraisGestion +
        newResult.autres.total;

      // Total pour N+1
      newResult.totalTTCN1 =
        newResult.primeTotalN1 +
        newResult.fraisGestionN1 +
        newResult.autresN1.total;
    } else if (sectionKey === "frais_taxes") {
      if (fieldKey === "fraisGestion") {
        newResult.fraisGestion = tempValue;
      } else if (fieldKey === "taxeAssurance") {
        newResult.autres.taxeAssurance = tempValue;
      } else if (fieldKey === "protectionJuridique") {
        newResult.autres.protectionJuridiqueTTC = tempValue;
      } else if (fieldKey === "fraisFractionnement") {
        newResult.autres.fraisFractionnementPrimeHT = tempValue;
      }

      // Recalculer le total autres
      newResult.autres.total =
        newResult.autres.taxeAssurance +
        newResult.autres.protectionJuridiqueTTC +
        newResult.autres.fraisFractionnementPrimeHT;

      // Recalculer le total TTC
      newResult.totalTTC =
        newResult.primeTotal + newResult.fraisGestion + newResult.autres.total;
    }

    // Recalculer l'échéancier avec les nouvelles valeurs
    newResult.echeancier = recalculateEcheancier(newResult);

    setLocalResult(newResult);
    onUpdate(newResult);
    setEditingField(null);
    setTempValue(null);
  };

  // Restaurer l'original
  const restoreOriginal = () => {
    if (!originalCalculationResult) return;
    if (!confirm("Voulez-vous vraiment restaurer les valeurs originales ?")) return;

    setLocalResult(originalCalculationResult);
    onUpdate(originalCalculationResult);
  };

  // Formater une valeur pour l'affichage
  const formatValue = (value: number, format: string): string => {
    if (format === "percentage") {
      return `${(value * 100).toFixed(2)} %`;
    }
    if (format === "currency") {
      return `${value.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €`;
    }
    return value.toString();
  };

  // Vérifier si une valeur est modifiée
  const isModified = (sectionKey: string, fieldKey: string): boolean => {
    if (!originalCalculationResult) return false;

    const section = EDITABLE_SECTIONS[sectionKey as keyof typeof EDITABLE_SECTIONS];
    const currentValues = section.getValue(localResult);
    const originalValues = section.getValue(originalCalculationResult);

    return currentValues[fieldKey] !== originalValues[fieldKey];
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-gray-900">
              Modification des calculs
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Modifiez directement les valeurs calculées
            </p>
          </div>
          {originalCalculationResult && (
            <button
              onClick={restoreOriginal}
              className="flex items-center space-x-2 px-4 py-2 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Restaurer l'original</span>
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        <div className="space-y-3">
          {Object.entries(EDITABLE_SECTIONS).map(([sectionKey, section]) => (
            <div
              key={sectionKey}
              className="border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm"
            >
              {/* Section header */}
              <button
                onClick={() =>
                  setExpandedSection(
                    expandedSection === sectionKey ? null : sectionKey
                  )
                }
                className="w-full px-4 py-3 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">{section.icon}</span>
                  <div className="text-left">
                    <span className="font-semibold text-gray-900 block">
                      {section.label}
                    </span>
                    <span className="text-xs text-gray-500">
                      {section.description}
                    </span>
                  </div>
                </div>
                {expandedSection === sectionKey ? (
                  <ChevronDown className="w-5 h-5 text-gray-500" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-gray-500" />
                )}
              </button>

              {/* Section fields */}
              {expandedSection === sectionKey && (
                <div className="divide-y divide-gray-100">
                  {Object.entries(section.fields).map(([fieldKey, field]) => {
                    const currentValue = getCurrentValue(sectionKey, fieldKey);
                    const isEditing = editingField === `${sectionKey}.${fieldKey}`;
                    const modified = isModified(sectionKey, fieldKey);

                    return (
                      <div
                        key={fieldKey}
                        className={`px-4 py-3 ${
                          modified ? "bg-blue-50" : "bg-white"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <label className="font-medium text-gray-900 text-sm">
                                {field.label}
                              </label>
                              {modified && (
                                <span className="px-2 py-0.5 bg-blue-500 text-white text-xs rounded-full">
                                  Modifié
                                </span>
                              )}
                            </div>

                            {isEditing ? (
                              <div className="mt-2 space-y-2">
                                <input
                                  type="number"
                                  value={tempValue ?? ""}
                                  onChange={(e) =>
                                    setTempValue(parseFloat(e.target.value) || 0)
                                  }
                                  step={field.format === "percentage" ? "0.01" : "0.01"}
                                  className="w-full px-3 py-2 border-2 border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />

                                <div className="flex items-center space-x-2">
                                  <button
                                    onClick={() => applyChange(sectionKey, fieldKey)}
                                    className="flex items-center space-x-1 px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                                  >
                                    <Check className="w-3 h-3" />
                                    <span>Appliquer</span>
                                  </button>
                                  <button
                                    onClick={cancelEditing}
                                    className="flex items-center space-x-1 px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                                  >
                                    <X className="w-3 h-3" />
                                    <span>Annuler</span>
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="mt-1 flex items-center justify-between">
                                <span className="text-lg font-semibold text-gray-900">
                                  {formatValue(currentValue, field.format)}
                                </span>
                                <button
                                  onClick={() => startEditing(sectionKey, fieldKey)}
                                  className="flex items-center space-x-1 px-3 py-1.5 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
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
      <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end">
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
