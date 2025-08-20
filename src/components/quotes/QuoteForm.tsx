"use client";

import { useState, useEffect, useRef } from "react";
import useQuotesStore from "@/lib/stores/quotes-store";
import useProductsStore from "@/lib/stores/products-store";
import MultiSelect from "./MultiSelect";

// Composant pour la saisie des activités avec pourcentages
interface ActivityBreakdownFieldProps {
  options: Array<{label: string; value: string}>;
  value: Array<{code: string; caSharePercent: number}>;
  onChange: (value: Array<{code: string; caSharePercent: number}>) => void;
  error?: string;
}

function ActivityBreakdownField({ options, value, onChange, error }: ActivityBreakdownFieldProps) {
  const handleActivityToggle = (code: string) => {
    const exists = value.find(v => v.code === code);
    if (exists) {
      onChange(value.filter(v => v.code !== code));
    } else {
      onChange([...value, { code, caSharePercent: 0 }]);
    }
  };

  const handlePercentageChange = (code: string, percent: number) => {
    onChange(value.map(v => 
      v.code === code ? { ...v, caSharePercent: percent } : v
    ));
  };

  const totalPercent = value.reduce((sum, v) => sum + v.caSharePercent, 0);

  return (
    <div className="space-y-3">
      {options.map(option => {
        const selected = value.find(v => v.code === option.value);
        return (
          <div key={option.value} className="flex items-center space-x-3 p-3 border rounded-lg">
            <input
              type="checkbox"
              checked={!!selected}
              onChange={() => handleActivityToggle(option.value)}
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
            />
            <div className="flex-1">
              <span className="text-sm font-medium">{option.label}</span>
            </div>
            {selected && (
              <div className="flex items-center space-x-2">
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={selected.caSharePercent || ''}
                  onChange={(e) => handlePercentageChange(option.value, Number(e.target.value))}
                  className="w-16 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="0"
                />
                <span className="text-sm text-gray-500">%</span>
              </div>
            )}
          </div>
        );
      })}
      <div className={`text-sm p-2 rounded ${
        totalPercent === 100 ? 'bg-green-50 text-green-700' : 
        totalPercent > 100 ? 'bg-red-50 text-red-700' : 
        'bg-yellow-50 text-yellow-700'
      }`}>
        Total: {totalPercent}% {totalPercent === 100 ? '✓' : 
        totalPercent > 100 ? '(Dépasse 100%)' : 
        '(Doit égaler 100%)'}
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}

// Composant pour l'historique des sinistres
interface LossHistoryFieldProps {
  fields: Array<{name: string; label: string; type: string; min?: number; max?: number}>;
  maxEntries?: number;
  value: Array<{year: number; numClaims: number; totalCost: number}>;
  onChange: (value: Array<{year: number; numClaims: number; totalCost: number}>) => void;
}

function LossHistoryField({ fields, maxEntries = 5, value, onChange }: LossHistoryFieldProps) {
  const addEntry = () => {
    if (value.length < maxEntries) {
      onChange([...value, { year: new Date().getFullYear(), numClaims: 1, totalCost: 0 }]);
    }
  };

  const removeEntry = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  const updateEntry = (index: number, field: string, newValue: number) => {
    onChange(value.map((entry, i) => 
      i === index ? { ...entry, [field]: newValue } : entry
    ));
  };

  return (
    <div className="space-y-3">
      {value.map((entry, index) => (
        <div key={index} className="flex items-center space-x-3 p-3 border rounded-lg bg-gray-50">
          <div className="flex-1 grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Année</label>
              <input
                type="number"
                min="2020"
                max="2025"
                value={entry.year}
                onChange={(e) => updateEntry(index, 'year', Number(e.target.value))}
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
                onChange={(e) => updateEntry(index, 'numClaims', Number(e.target.value))}
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Coût (€)</label>
              <input
                type="number"
                min="0"
                value={entry.totalCost}
                onChange={(e) => updateEntry(index, 'totalCost', Number(e.target.value))}
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
    }
  };

  const handleFormDataChange = (fieldName: string, value: any) => {
    setFormData((prev) => ({ ...prev, [fieldName]: value }));
    if (errors[fieldName]) {
      setErrors((prev) => ({ ...prev, [fieldName]: "" }));
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
              const activities = formData[fieldName] as Array<{code: string; caSharePercent: number}>;
              if (Array.isArray(activities)) {
                if (activities.length === 0) {
                  newErrors[fieldName] = "Vous devez sélectionner au moins une activité";
                } else {
                  const totalPercent = activities.reduce((sum, activity) => sum + activity.caSharePercent, 0);
                  if (totalPercent !== 100) {
                    newErrors[fieldName] = `La somme des pourcentages doit être égale à 100% (actuellement ${totalPercent}%)`;
                  }
                  // Check individual activity percentages
                  activities.forEach((activity, index) => {
                    if (activity.caSharePercent <= 0) {
                      newErrors[fieldName] = "Tous les pourcentages doivent être supérieurs à 0%";
                    }
                  });
                }
              }
            }

            // Validate loss_history
            if (fieldConfig.type === "loss_history") {
              const lossHistory = formData[fieldName] as Array<{year: number; numClaims: number; totalCost: number}>;
              if (Array.isArray(lossHistory) && lossHistory.length > 0) {
                lossHistory.forEach((entry, index) => {
                  if (entry.year < 2020 || entry.year > 2025) {
                    newErrors[fieldName] = "Les années doivent être comprises entre 2020 et 2025";
                  }
                  if (entry.numClaims < 1) {
                    newErrors[fieldName] = "Le nombre de sinistres doit être au minimum de 1";
                  }
                  if (entry.totalCost < 0) {
                    newErrors[fieldName] = "Le coût total ne peut pas être négatif";
                  }
                });
              }
            }
          }
        }
      );
    }

    setErrors(newErrors);
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
            const activities = formData[fieldName] as Array<{code: string; caSharePercent: number}>;
            if (Array.isArray(activities)) {
              if (activities.length === 0) {
                newErrors[fieldName] = "Vous devez sélectionner au moins une activité";
              } else {
                const totalPercent = activities.reduce((sum, activity) => sum + activity.caSharePercent, 0);
                if (totalPercent !== 100) {
                  newErrors[fieldName] = `La somme des pourcentages doit être égale à 100% (actuellement ${totalPercent}%)`;
                }
                // Check individual activity percentages
                activities.forEach((activity, index) => {
                  if (activity.caSharePercent <= 0) {
                    newErrors[fieldName] = "Tous les pourcentages doivent être supérieurs à 0%";
                  }
                });
              }
            }
          }

          // Validate loss_history
          if (fieldConfig.type === "loss_history") {
            const lossHistory = formData[fieldName] as Array<{year: number; numClaims: number; totalCost: number}>;
            if (Array.isArray(lossHistory) && lossHistory.length > 0) {
              lossHistory.forEach((entry, index) => {
                if (entry.year < 2020 || entry.year > 2025) {
                  newErrors[fieldName] = "Les années doivent être comprises entre 2020 et 2025";
                }
                if (entry.numClaims < 1) {
                  newErrors[fieldName] = "Le nombre de sinistres doit être au minimum de 1";
                }
                if (entry.totalCost < 0) {
                  newErrors[fieldName] = "Le coût total ne peut pas être négatif";
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

  const isFormComplete = () => {
    // Validate product selection
    if (!selectedProductId) return false;

    // Validate company data
    if (
      !companyData.companyName.trim() ||
      !companyData.siret.trim() ||
      !companyData.address.trim()
    ) {
      return false;
    }

    // Validate SIRET length
    if (companyData.siret.length !== 14) return false;

    // Validate dynamic form fields based on product configuration
    if (selectedProduct?.formFields) {
      const hasRequiredFields = Object.entries(
        selectedProduct.formFields
      ).every(([fieldName, fieldConfig]: [string, any]) => {
        if (fieldConfig.required) {
          const fieldValue = formData[fieldName];
          
          // Basic required field check
          if (!fieldValue || fieldValue === "") return false;
          
          // Special validation for activity_breakdown
          if (fieldConfig.type === "activity_breakdown") {
            const activities = fieldValue as Array<{code: string; caSharePercent: number}>;
            if (!Array.isArray(activities) || activities.length === 0) return false;
            const totalPercent = activities.reduce((sum, activity) => sum + activity.caSharePercent, 0);
            if (totalPercent !== 100) return false;
            // Check all percentages are > 0
            if (activities.some(activity => activity.caSharePercent <= 0)) return false;
          }
          
          // Special validation for loss_history (if required)
          if (fieldConfig.type === "loss_history") {
            const lossHistory = fieldValue as Array<{year: number; numClaims: number; totalCost: number}>;
            if (Array.isArray(lossHistory) && lossHistory.length > 0) {
              // Validate each entry
              const hasInvalidEntry = lossHistory.some(entry => 
                entry.year < 2020 || entry.year > 2025 || 
                entry.numClaims < 1 || 
                entry.totalCost < 0
              );
              if (hasInvalidEntry) return false;
            }
          }
        }
        return true;
      });
      if (!hasRequiredFields) return false;
    }

    return true;
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
          />
        );

      case "date":
        return (
          <input
            {...commonProps}
            type="date"
            min={fieldConfig.min}
            max={fieldConfig.max}
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
              handleCompanyDataChange("companyCreationDate", e.target.value);
              handleFormDataChange("companyCreationDate", e.target.value);
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
