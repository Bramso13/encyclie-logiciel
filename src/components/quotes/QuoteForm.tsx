"use client";

import { useState, useEffect, useRef } from "react";
import useQuotesStore from "@/lib/stores/quotes-store";
import useProductsStore from "@/lib/stores/products-store";
import MultiSelect from "./MultiSelect";

// Composant pour la saisie des activités avec pourcentages
interface ActivityBreakdownFieldProps {
  options: Array<{ label: string; value: string }>;
  value: Array<{ code: string; caSharePercent: number }>;
  onChange: (value: Array<{ code: string; caSharePercent: number }>) => void;
  error?: string;
}

function ActivityBreakdownField({
  options,
  value,
  onChange,
  error,
}: ActivityBreakdownFieldProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedActivities, setSelectedActivities] = useState<string[]>([]);

  // Initialiser les activités sélectionnées quand on ouvre le modal
  const openModal = () => {
    setSelectedActivities(value.map((activity) => activity.code));
    setIsModalOpen(true);
  };

  const handleActivityToggle = (activityCode: string) => {
    setSelectedActivities((prev) =>
      prev.includes(activityCode)
        ? prev.filter((code) => code !== activityCode)
        : [...prev, activityCode]
    );
  };

  const handleConfirmSelection = () => {
    // Créer les nouvelles activités avec les pourcentages existants ou 0
    const newActivities = selectedActivities.map((code) => {
      const existing = value.find((activity) => activity.code === code);
      return existing || { code, caSharePercent: 0 };
    });
    onChange(newActivities);
    setIsModalOpen(false);
    setSearchTerm("");
  };

  const handlePercentageChange = (code: string, percent: number) => {
    onChange(
      value.map((v) =>
        v.code === code ? { ...v, caSharePercent: percent } : v
      )
    );
  };

  const handleRemoveActivity = (codeToRemove: string) => {
    onChange(value.filter((activity) => activity.code !== codeToRemove));
  };

  // Vérifie si les 8 premières activités représentent au moins 50% du total
  const checkMainActivitiesShare = (
    activities: Array<{ code: string; caSharePercent: number }>
  ) => {
    const mainActivitiesPercent = activities
      .filter((a) => parseInt(a.code) <= 8)
      .reduce((sum, act) => sum + act.caSharePercent, 0);

    return mainActivitiesPercent >= 50;
  };

  const totalPercent = value.reduce((sum, v) => sum + v.caSharePercent, 0);

  const filteredOptions = options.filter((option) =>
    option.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* Bouton principal pour ouvrir le modal */}
      <button
        type="button"
        onClick={openModal}
        className="w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-indigo-400 hover:bg-indigo-50 transition-colors text-left"
      >
        <div className="flex items-center justify-between">
          <span className="text-gray-600">
            {value.length > 0
              ? `${value.length} activité${
                  value.length > 1 ? "s" : ""
                } sélectionnée${value.length > 1 ? "s" : ""}`
              : "Sélectionner les activités"}
          </span>
          <svg
            className="w-5 h-5 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 6v6m0 0v6m0-6h6m-6 0H6"
            />
          </svg>
        </div>
      </button>

      {/* Liste des activités sélectionnées avec pourcentages */}
      {value.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-gray-700">
              Répartition du chiffre d'affaires
            </h4>
            <div
              className={`text-sm font-medium px-2 py-1 rounded ${
                totalPercent === 100 && checkMainActivitiesShare(value)
                  ? "bg-green-100 text-green-700"
                  : totalPercent > 100
                  ? "bg-red-100 text-red-700"
                  : "bg-orange-100 text-orange-700"
              }`}
            >
              Total: {totalPercent}%
            </div>
          </div>

          <div className="space-y-2">
            {value.map((activity) => {
              const option = options.find((o) => o.value === activity.code);
              return option ? (
                <div
                  key={activity.code}
                  className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg shadow-sm"
                >
                  <div className="flex-1">
                    <span className="text-sm font-medium text-black">
                      {option.label}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={activity.caSharePercent || ""}
                      onChange={(e) => {
                        const value = parseFloat(e.target.value) || 0;
                        handlePercentageChange(
                          activity.code,
                          Math.min(100, Math.max(0, value))
                        );
                      }}
                      className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="0"
                    />
                    <span className="text-sm text-gray-500">%</span>
                  </div>

                  <button
                    type="button"
                    className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                    onClick={() => handleRemoveActivity(activity.code)}
                    title="Supprimer cette activité"
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
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
              ) : null;
            })}
          </div>

          {/* Validation du total et des règles */}
          <div
            className={`text-sm p-3 rounded-lg border ${
              totalPercent === 100 && checkMainActivitiesShare(value)
                ? "bg-green-50 text-green-700 border-green-200"
                : totalPercent > 100
                ? "bg-red-50 text-red-700 border-red-200"
                : "bg-amber-50 text-amber-700 border-amber-200"
            }`}
          >
            <div className="flex items-center gap-2">
              {totalPercent === 100 && checkMainActivitiesShare(value) ? (
                <svg
                  className="w-4 h-4 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              ) : (
                <svg
                  className="w-4 h-4 text-amber-600"
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
              )}
              <span>
                <strong>Total: {totalPercent}%</strong>{" "}
                {totalPercent === 100 && checkMainActivitiesShare(value)
                  ? "✓ Répartition valide"
                  : totalPercent > 100
                  ? "La somme des pourcentages ne peut pas dépasser 100%"
                  : totalPercent < 100
                  ? "La somme des pourcentages doit atteindre 100%"
                  : !checkMainActivitiesShare(value)
                  ? "Les activités 1 à 8 doivent représenter au moins 50% du total"
                  : ""}
              </span>
            </div>
          </div>
        </div>
      )}

      {error && <p className="text-sm text-red-600 mt-2">{error}</p>}

      {/* Modal de sélection des activités */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
            {/* Header du modal */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                Sélectionner les activités
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg
                  className="w-5 h-5 text-gray-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Barre de recherche */}
            <div className="p-6 border-b border-gray-200">
              <input
                type="text"
                placeholder="Rechercher une activité..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Liste des activités */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-2">
                {filteredOptions.map((option) => (
                  <label
                    key={option.value}
                    className="flex items-center p-3 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={selectedActivities.includes(option.value)}
                      onChange={() => handleActivityToggle(option.value)}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                    <span className="ml-3 text-sm text-gray-900 flex-1">
                      {option.label}
                    </span>
                  </label>
                ))}

                {filteredOptions.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <svg
                      className="w-12 h-12 mx-auto mb-4 text-gray-300"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                    <p>Aucune activité trouvée</p>
                  </div>
                )}
              </div>
            </div>

            {/* Footer du modal */}
            <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50 rounded-b-xl">
              <div className="text-sm text-gray-600">
                {selectedActivities.length} activité
                {selectedActivities.length > 1 ? "s" : ""} sélectionnée
                {selectedActivities.length > 1 ? "s" : ""}
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={handleConfirmSelection}
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  Confirmer la sélection
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Composant pour l'historique des sinistres
interface LossHistoryFieldProps {
  fields: Array<{
    name: string;
    label: string;
    type: string;
    min?: number;
    max?: number;
  }>;
  maxEntries?: number;
  value: Array<{ year: number; numClaims: number; totalCost: number }>;
  onChange: (
    value: Array<{ year: number; numClaims: number; totalCost: number }>
  ) => void;
}

function LossHistoryField({
  fields,
  maxEntries = 5,
  value,
  onChange,
}: LossHistoryFieldProps) {
  const addEntry = () => {
    if (value.length < maxEntries) {
      onChange([
        ...value,
        { year: new Date().getFullYear(), numClaims: 1, totalCost: 0 },
      ]);
    }
  };

  const removeEntry = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  const updateEntry = (index: number, field: string, newValue: number) => {
    onChange(
      value.map((entry, i) =>
        i === index ? { ...entry, [field]: newValue } : entry
      )
    );
  };

  return (
    <div className="space-y-3">
      {value.map((entry, index) => (
        <div
          key={index}
          className="flex items-center space-x-3 p-3 border rounded-lg bg-gray-50"
        >
          <div className="flex-1 grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Année</label>
              <input
                type="number"
                min="2020"
                max="2025"
                value={entry.year}
                onChange={(e) =>
                  updateEntry(index, "year", Number(e.target.value))
                }
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Nombre</label>
              <input
                type="number"
                min="1"
                max="10"
                value={entry.numClaims}
                onChange={(e) =>
                  updateEntry(index, "numClaims", Number(e.target.value))
                }
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">
                Coût (€)
              </label>
              <input
                type="number"
                min="0"
                value={entry.totalCost}
                onChange={(e) =>
                  updateEntry(index, "totalCost", Number(e.target.value))
                }
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </div>
          <button
            type="button"
            onClick={() => removeEntry(index)}
            className="px-2 py-1 text-xs text-red-600 hover:text-red-800 hover:bg-red-50 rounded"
          >
            Suppr.
          </button>
        </div>
      ))}
      {value.length < maxEntries && (
        <button
          type="button"
          onClick={addEntry}
          className="w-full px-3 py-2 text-sm text-indigo-600 border border-indigo-600 rounded-lg hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          + Ajouter un sinistre
        </button>
      )}
      {value.length === 0 && (
        <p className="text-sm text-gray-500 italic">Aucun sinistre déclaré</p>
      )}
    </div>
  );
}

interface QuoteFormProps {
  onSuccess?: (quote: any) => void;
  onCancel?: () => void;
}

export default function QuoteForm({ onSuccess, onCancel }: QuoteFormProps) {
  const { createQuote, saveDraft, loading } = useQuotesStore();
  const { activeProducts, fetchActiveProducts } = useProductsStore();

  const [selectedProductId, setSelectedProductId] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [companyData, setCompanyData] = useState({
    companyName: "",
    siret: "",
    address: "",
    legalForm: "",
    creationDate: "",
    directorName: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchActiveProducts();
  }, [fetchActiveProducts]);

  useEffect(() => {
    if (selectedProductId) {
      const product = activeProducts.find((p) => p.id === selectedProductId);
      setSelectedProduct(product);
      // Reset form data and steps when product changes
      setFormData({});
      setCurrentStep(0);
      setCompletedSteps(new Set());
    }
  }, [selectedProductId, activeProducts]);

  const handleCompanyDataChange = (field: string, value: string) => {
    setCompanyData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
      console.log("errors company", errors);
    }
  };

  const handleFormDataChange = (fieldName: string, value: any) => {
    setFormData((prev) => ({ ...prev, [fieldName]: value }));
    if (errors[fieldName]) {
      setErrors((prev) => ({ ...prev, [fieldName]: "" }));
      console.log("errors form", errors);
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    console.log("formData", formData);

    // Validate product selection
    if (!selectedProductId) {
      console.log("selectedProductId", selectedProductId);
      newErrors.product = "Veuillez sélectionner un produit d'assurance";
    }

    // Validate company data
    if (!companyData.companyName.trim()) {
      console.log("companyData.companyName", companyData.companyName);
      newErrors.companyName = "Raison sociale requise";
    }
    if (!companyData.siret.trim()) {
      console.log("companyData.siret", companyData.siret);
      newErrors.siret = "SIRET requis";
    } else if (companyData.siret.length !== 14) {
      console.log("companyData.siret.length", companyData.siret.length);
      newErrors.siret = "SIRET doit contenir 14 chiffres";
    }
    if (!companyData.address.trim()) {
      console.log("companyData.address", companyData.address);
      newErrors.address = "Adresse requise";
    }

    // Validate dynamic form fields based on product configuration
    if (selectedProduct?.formFields) {
      Object.entries(selectedProduct.formFields).forEach(
        ([fieldName, fieldConfig]: [string, any]) => {
          if (fieldConfig.required && !formData[fieldName]) {
            console.log("fieldName", fieldName);
            console.log("fieldConfig.required", fieldConfig.required);
            console.log("formData[fieldName]", formData[fieldName]);
            newErrors[fieldName] = `${
              fieldConfig.label || fieldName
            } est requis`;
          }

          // Validate specific field types
          if (formData[fieldName]) {
            if (
              fieldConfig.type === "number" &&
              isNaN(Number(formData[fieldName]))
            ) {
              console.log("fieldConfig.type", fieldConfig.type);
              console.log("formData[fieldName]", formData[fieldName]);
              newErrors[fieldName] = `${
                fieldConfig.label || fieldName
              } doit être un nombre`;
            }
            if (
              fieldConfig.type === "email" &&
              !/\S+@\S+\.\S+/.test(formData[fieldName])
            ) {
              console.log("fieldConfig.type", fieldConfig.type);
              console.log("formData[fieldName]", formData[fieldName]);
              newErrors[fieldName] = `${
                fieldConfig.label || fieldName
              } doit être un email valide`;
            }

            // Validate activity_breakdown
            if (fieldConfig.type === "activity_breakdown") {
              const activities = formData[fieldName] as Array<{
                code: string;
                caSharePercent: number;
              }>;
              if (Array.isArray(activities)) {
                if (activities.length === 0) {
                  newErrors[fieldName] =
                    "Vous devez sélectionner au moins une activité";
                } else {
                  const totalPercent = activities.reduce(
                    (sum, activity) => sum + activity.caSharePercent,
                    0
                  );
                  if (totalPercent !== 100) {
                    newErrors[
                      fieldName
                    ] = `La somme des pourcentages doit être égale à 100% (actuellement ${totalPercent}%)`;
                  }
                  // Check individual activity percentages
                  activities.forEach((activity, index) => {
                    if (activity.caSharePercent <= 0) {
                      newErrors[fieldName] =
                        "Tous les pourcentages doivent être supérieurs à 0%";
                    }
                  });
                }
              }
            }

            // Validate creationDate
            if (fieldConfig.type === "date") {
              const creationDate = formData[fieldName];
              // if (creationDate > new Date().toISOString().split("T")[0]) {
              //   newErrors[fieldName] =
              //     "La date de création ne peut pas être dans le futur";
              // }
            }
            // Validate loss_history
            if (fieldConfig.type === "loss_history") {
              const lossHistory = formData[fieldName] as Array<{
                year: number;
                numClaims: number;
                totalCost: number;
              }>;
              if (Array.isArray(lossHistory) && lossHistory.length > 0) {
                lossHistory.forEach((entry, index) => {
                  if (entry.year < 2020 || entry.year > 2025) {
                    newErrors[fieldName] =
                      "Les années doivent être comprises entre 2020 et 2025";
                  }
                  if (entry.numClaims < 1) {
                    newErrors[fieldName] =
                      "Le nombre de sinistres doit être au minimum de 1";
                  }
                  if (entry.totalCost < 0) {
                    newErrors[fieldName] =
                      "Le coût total ne peut pas être négatif";
                  }
                });
              }
            }
          }
        }
      );
    }

    setErrors(newErrors);
    console.log("errors validateForm", errors);
    return Object.keys(newErrors).length === 0;
  };

  const validateCurrentStep = () => {
    const newErrors: Record<string, string> = {};
    const steps = selectedProduct?.stepConfig?.steps || [];

    if (steps.length === 0) {
      return validateForm(); // Fallback to full validation if no steps
    }

    const currentStepConfig = steps[currentStep];
    if (!currentStepConfig) return true;

    // Validate fields for current step
    if (currentStepConfig.fields) {
      currentStepConfig.fields.forEach((fieldName: string) => {
        const fieldConfig = selectedProduct?.formFields?.[fieldName];
        if (fieldConfig?.required && !formData[fieldName]) {
          newErrors[fieldName] = `${fieldConfig.label || fieldName} est requis`;
        }

        // Validate specific field types for current step
        if (formData[fieldName] && fieldConfig) {
          // Validate activity_breakdown
          if (fieldConfig.type === "activity_breakdown") {
            const activities = formData[fieldName] as Array<{
              code: string;
              caSharePercent: number;
            }>;
            if (Array.isArray(activities)) {
              if (activities.length === 0) {
                newErrors[fieldName] =
                  "Vous devez sélectionner au moins une activité";
              } else {
                const totalPercent = activities.reduce(
                  (sum, activity) => sum + activity.caSharePercent,
                  0
                );
                if (totalPercent !== 100) {
                  newErrors[
                    fieldName
                  ] = `La somme des pourcentages doit être égale à 100% (actuellement ${totalPercent}%)`;
                }
                // Check individual activity percentages
                activities.forEach((activity, index) => {
                  if (activity.caSharePercent <= 0) {
                    newErrors[fieldName] =
                      "Tous les pourcentages doivent être supérieurs à 0%";
                  }
                });
              }
            }
          }

          // Validate loss_history
          if (fieldConfig.type === "loss_history") {
            const lossHistory = formData[fieldName] as Array<{
              year: number;
              numClaims: number;
              totalCost: number;
            }>;
            if (Array.isArray(lossHistory) && lossHistory.length > 0) {
              lossHistory.forEach((entry, index) => {
                if (entry.year < 2020 || entry.year > 2025) {
                  newErrors[fieldName] =
                    "Les années doivent être comprises entre 2020 et 2025";
                }
                if (entry.numClaims < 1) {
                  newErrors[fieldName] =
                    "Le nombre de sinistres doit être au minimum de 1";
                }
                if (entry.totalCost < 0) {
                  newErrors[fieldName] =
                    "Le coût total ne peut pas être négatif";
                }
              });
            }
          }
        }
      });
    }

    // Validate company data if it's part of current step
    if (currentStepConfig.includeCompanyInfo) {
      if (!companyData.companyName.trim()) {
        newErrors.companyName = "Raison sociale requise";
      }
      if (!companyData.siret.trim()) {
        newErrors.siret = "SIRET requis";
      } else if (companyData.siret.length !== 14) {
        newErrors.siret = "SIRET doit contenir 14 chiffres";
      }
      if (!companyData.address.trim()) {
        newErrors.address = "Adresse requise";
      }
    }

    setErrors(newErrors);
    console.log("errors validateCurrentStep", errors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNextStep = () => {
    if (validateCurrentStep()) {
      setCompletedSteps((prev) => new Set([...prev, currentStep]));
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handlePreviousStep = () => {
    setCurrentStep((prev) => Math.max(0, prev - 1));
  };

  const handleStepClick = (stepIndex: number) => {
    if (completedSteps.has(stepIndex) || stepIndex <= currentStep) {
      setCurrentStep(stepIndex);
    }
  };

  const handleSaveDraft = async () => {
    try {
      const quote = await saveDraft({
        productId: selectedProductId,
        companyData,
        formData,
      });

      if (quote) {
        onSuccess?.(quote);
      }
    } catch (error) {
      console.error("Error saving draft:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    const status = "INCOMPLETE"; // INCOMPLETE si complet mais docs manquants

    try {
      const quote = await createQuote({
        productId: selectedProductId,
        companyData,
        formData,
        status,
      });

      if (quote) {
        onSuccess?.(quote);
      }
    } catch (error) {
      console.error("Error creating quote:", error);
    }
  };

  const renderDynamicField = (fieldName: string, fieldConfig: any) => {
    const commonProps = {
      id: fieldName,
      value: formData[fieldName] || "",
      onChange: (
        e: React.ChangeEvent<
          HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
        >
      ) => handleFormDataChange(fieldName, e.target.value),
      className: `mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm ${
        errors[fieldName] ? "border-red-300" : "border-gray-300"
      }`,
    };

    switch (fieldConfig.type) {
      case "select":
        return (
          <select {...commonProps}>
            <option value="">Sélectionnez...</option>
            {fieldConfig.options?.map((option: any) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );

      case "textarea":
        return (
          <textarea
            {...commonProps}
            rows={fieldConfig.rows || 3}
            placeholder={fieldConfig.placeholder}
            value={formData[fieldName] || ""}
            onChange={(e) => handleFormDataChange(fieldName, e.target.value)}
          />
        );

      case "number":
        return (
          <input
            {...commonProps}
            type="number"
            min={fieldConfig.min}
            max={fieldConfig.max}
            step={fieldConfig.step}
            placeholder={fieldConfig.placeholder}
            value={formData[fieldName] || ""}
            onChange={(e) => handleFormDataChange(fieldName, e.target.value)}
          />
        );

      case "date":
        return (
          <input
            {...commonProps}
            type="date"
            min={fieldConfig.min}
            max={fieldConfig.max}
            value={formData[fieldName] || ""}
            onChange={(e) => handleFormDataChange(fieldName, e.target.value)}
          />
        );

      case "checkbox":
        return (
          <input
            type="checkbox"
            id={fieldName}
            checked={formData[fieldName] || false}
            onChange={(e) => handleFormDataChange(fieldName, e.target.checked)}
            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
          />
        );

      case "multiselect":
        return (
          <MultiSelect
            options={fieldConfig.options}
            value={formData[fieldName] || []}
            onChange={(newValues) => handleFormDataChange(fieldName, newValues)}
          />
        );

      case "activity_breakdown":
        return (
          <ActivityBreakdownField
            options={fieldConfig.options}
            value={formData[fieldName] || []}
            onChange={(newValues) => handleFormDataChange(fieldName, newValues)}
            error={errors[fieldName]}
          />
        );

      case "loss_history":
        return (
          <LossHistoryField
            fields={fieldConfig.fields}
            maxEntries={fieldConfig.maxEntries}
            value={formData[fieldName] || []}
            onChange={(newValues) => handleFormDataChange(fieldName, newValues)}
          />
        );

      default:
        return (
          <input
            {...commonProps}
            type={fieldConfig.type || "text"}
            placeholder={fieldConfig.placeholder}
          />
        );
    }
  };

  const steps = selectedProduct?.stepConfig?.steps || [];
  const isStepBasedForm = steps.length > 0;
  const isLastStep = currentStep === steps.length - 1;

  const renderStepIndicator = () => {
    if (!isStepBasedForm) return null;

    return (
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {steps.map((step: any, index: number) => (
            <div key={index} className="flex items-center">
              <button
                type="button"
                onClick={() => handleStepClick(index)}
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                  index === currentStep
                    ? "bg-indigo-600 text-white"
                    : completedSteps.has(index)
                    ? "bg-green-600 text-white cursor-pointer"
                    : index < currentStep
                    ? "bg-gray-300 text-gray-600 cursor-pointer"
                    : "bg-gray-200 text-gray-400"
                }`}
              >
                {completedSteps.has(index) ? "✓" : index + 1}
              </button>
              <span
                className={`ml-2 text-sm ${
                  index === currentStep
                    ? "text-indigo-600 font-medium"
                    : "text-gray-500"
                }`}
              >
                {step.title}
              </span>
              {index < steps.length - 1 && (
                <div
                  className={`flex-1 h-0.5 mx-4 ${
                    completedSteps.has(index) ? "bg-green-600" : "bg-gray-200"
                  }`}
                />
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderCurrentStepContent = () => {
    if (!isStepBasedForm) {
      return renderAllFields();
    }

    const currentStepConfig = steps[currentStep];
    if (!currentStepConfig) return null;

    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            {currentStepConfig.title}
          </h3>
          {currentStepConfig.description && (
            <p className="text-sm text-gray-600 mb-4">
              {currentStepConfig.description}
            </p>
          )}
        </div>

        {/* Company info for current step */}
        {currentStepConfig.includeCompanyInfo && renderCompanyInfo()}

        {/* Fields for current step */}
        {currentStepConfig.fields && (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            {currentStepConfig.fields.map((fieldName: string) => {
              const fieldConfig = selectedProduct?.formFields?.[fieldName];
              if (!fieldConfig) return null;

              return (
                <div
                  key={fieldName}
                  className={
                    fieldConfig.type === "textarea" ? "sm:col-span-2" : ""
                  }
                >
                  <label
                    htmlFor={fieldName}
                    className="block text-sm font-medium text-gray-700"
                  >
                    {fieldConfig.label || fieldName}
                    {fieldConfig.required && " *"}
                  </label>
                  {fieldConfig.type === "checkbox" ? (
                    <div className="mt-1">
                      <div className="flex items-center">
                        {renderDynamicField(fieldName, fieldConfig)}
                        <span className="ml-2 text-sm text-gray-600">
                          {fieldConfig.label}
                        </span>
                      </div>
                    </div>
                  ) : (
                    renderDynamicField(fieldName, fieldConfig)
                  )}
                  {fieldConfig.help && (
                    <p className="mt-1 text-sm text-gray-500">
                      {fieldConfig.help}
                    </p>
                  )}
                  {errors[fieldName] && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors[fieldName]}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const renderAllFields = () => (
    <>
      {renderCompanyInfo()}
      {/* Dynamic Product Fields */}
      {selectedProduct?.formFields && (
        <div className="border-t pt-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Informations spécifiques - {selectedProduct.name}
          </h3>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            {Object.entries(selectedProduct.formFields).map(
              ([fieldName, fieldConfig]: [string, any]) => (
                <div
                  key={fieldName}
                  className={
                    fieldConfig.type === "textarea" ? "sm:col-span-2" : ""
                  }
                >
                  <label
                    htmlFor={fieldName}
                    className="block text-sm font-medium text-gray-700"
                  >
                    {fieldConfig.label || fieldName}
                    {fieldConfig.required && " *"}
                  </label>
                  {fieldConfig.type === "checkbox" ? (
                    <div className="mt-1">
                      <div className="flex items-center">
                        {renderDynamicField(fieldName, fieldConfig)}
                        <span className="ml-2 text-sm text-gray-600">
                          {fieldConfig.label}
                        </span>
                      </div>
                    </div>
                  ) : (
                    renderDynamicField(fieldName, fieldConfig)
                  )}
                  {fieldConfig.help && (
                    <p className="mt-1 text-sm text-gray-500">
                      {fieldConfig.help}
                    </p>
                  )}
                  {errors[fieldName] && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors[fieldName]}
                    </p>
                  )}
                </div>
              )
            )}
          </div>
        </div>
      )}
    </>
  );

  const renderCompanyInfo = () => (
    <div className="border-t pt-6">
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div>
          <label
            htmlFor="companyName"
            className="block text-sm font-medium text-gray-700"
          >
            Raison sociale *
          </label>
          <input
            type="text"
            id="companyName"
            value={companyData.companyName}
            onChange={(e) => {
              handleCompanyDataChange("companyName", e.target.value);
              handleFormDataChange("companyName", e.target.value);
            }}
            className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm ${
              errors.companyName ? "border-red-300" : "border-gray-300"
            }`}
          />
          {errors.companyName && (
            <p className="mt-1 text-sm text-red-600">{errors.companyName}</p>
          )}
        </div>

        <div>
          <label
            htmlFor="companyName"
            className="block text-sm font-medium text-gray-700"
          >
            Nom du dirigeant *
          </label>
          <input
            type="text"
            id="directorName"
            value={companyData.directorName}
            onChange={(e) => {
              handleCompanyDataChange("directorName", e.target.value);
              handleFormDataChange("directorName", e.target.value);
            }}
            className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm ${
              errors.directorName ? "border-red-300" : "border-gray-300"
            }`}
          />
          {errors.directorName && (
            <p className="mt-1 text-sm text-red-600">{errors.directorName}</p>
          )}
        </div>

        <div>
          <label
            htmlFor="siret"
            className="block text-sm font-medium text-gray-700"
          >
            SIRET *
          </label>
          <input
            type="text"
            id="siret"
            value={companyData.siret}
            onChange={(e) => {
              handleCompanyDataChange(
                "siret",
                e.target.value.replace(/\D/g, "")
              );
              handleFormDataChange("siret", e.target.value.replace(/\D/g, ""));
            }}
            maxLength={14}
            className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm ${
              errors.siret ? "border-red-300" : "border-gray-300"
            }`}
          />
          {errors.siret && (
            <p className="mt-1 text-sm text-red-600">{errors.siret}</p>
          )}
        </div>

        <div className="sm:col-span-2">
          <label
            htmlFor="address"
            className="block text-sm font-medium text-gray-700"
          >
            Adresse *
          </label>
          <input
            type="text"
            id="address"
            value={companyData.address}
            onChange={(e) => {
              handleCompanyDataChange("address", e.target.value);
              handleFormDataChange("address", e.target.value);
            }}
            className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm ${
              errors.address ? "border-red-300" : "border-gray-300"
            }`}
          />
          {errors.address && (
            <p className="mt-1 text-sm text-red-600">{errors.address}</p>
          )}
        </div>

        <div>
          <label
            htmlFor="legalForm"
            className="block text-sm font-medium text-gray-700"
          >
            Forme juridique
          </label>
          <select
            id="legalForm"
            value={companyData.legalForm}
            onChange={(e) => {
              handleCompanyDataChange("legalForm", e.target.value);
              handleFormDataChange("legalForm", e.target.value);
            }}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          >
            <option value="">Sélectionnez...</option>
            <option value="SARL">SARL</option>
            <option value="SAS">SAS</option>
            <option value="SA">SA</option>
            <option value="EURL">EURL</option>
            <option value="SNC">SNC</option>
            <option value="AUTO_ENTREPRENEUR">Auto-entrepreneur</option>
            <option value="EXPL_INDIVIDUELLE">Exploitation individuelle</option>
          </select>
        </div>

        <div>
          <label
            htmlFor="creationDate"
            className="block text-sm font-medium text-gray-700"
          >
            Date de création
          </label>
          <input
            type="date"
            id="creationDate"
            value={companyData.creationDate}
            onChange={(e) => {
              handleCompanyDataChange("creationDate", e.target.value);
              handleFormDataChange("creationDate", e.target.value);
            }}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          />
        </div>
      </div>
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Error Display */}
      {errors &&
        Object.keys(errors).length > 0 &&
        Object.values(errors).some((error) => error !== "") && (
          <div className="rounded-md bg-red-50 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-red-400"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">
                  Veuillez corriger les erreurs suivantes :
                </h3>
                <div className="mt-2 text-sm text-red-700">
                  <ul className="list-disc pl-5 space-y-1">
                    {Object.entries(errors).map(([field, error]) => (
                      <li key={field}>{error}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

      {/* Product Selection */}
      <div>
        <label
          htmlFor="product"
          className="block text-sm font-medium text-gray-700"
        >
          Produit d'assurance *
        </label>
        <select
          id="product"
          value={selectedProductId}
          onChange={(e) => setSelectedProductId(e.target.value)}
          className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm ${
            errors.product ? "border-red-300" : "border-gray-300"
          }`}
        >
          <option value="">Sélectionnez un produit...</option>
          {activeProducts.map((product) => (
            <option key={product.id} value={product.id}>
              {product.name} ({product.code})
            </option>
          ))}
        </select>
        {errors.product && (
          <p className="mt-1 text-sm text-red-600">{errors.product}</p>
        )}
      </div>

      {/* Step Indicator */}
      {selectedProduct && renderStepIndicator()}

      {/* Form Content */}
      {selectedProduct && renderCurrentStepContent()}

      {/* Form Actions */}
      <div className="flex justify-between pt-6 border-t">
        <div className="flex space-x-3">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Annuler
            </button>
          )}
          {isStepBasedForm && currentStep > 0 && (
            <button
              type="button"
              onClick={handlePreviousStep}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Précédent
            </button>
          )}
        </div>

        <div className="flex space-x-3">
          <button
            type="button"
            onClick={handleSaveDraft}
            disabled={loading || !selectedProductId}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Sauvegarde..." : "Sauvegarder brouillon"}
          </button>
          {isStepBasedForm && !isLastStep ? (
            <button
              type="button"
              onClick={handleNextStep}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Suivant
            </button>
          ) : (
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Création..." : "Créer le devis"}
            </button>
          )}
        </div>
      </div>
    </form>
  );
}
