"use client";

import { useState, useEffect, useRef } from "react";
import useQuotesStore from "@/lib/stores/quotes-store";
import useProductsStore from "@/lib/stores/products-store";
import MultiSelect from "./MultiSelect";
import ActivityBreakdownField from "./ActivityBreakdown";
import LossHistoryField from "./LossHistoryField";
import LetterOfIntentPDF from "@/components/pdf/LetterOfIntentPDF";
import { pdf } from "@react-pdf/renderer";
import { useSession } from "@/lib/auth-client";
import { fetchCompanyBySiret } from "@/lib/api/pappers";

interface QuoteFormProps {
  onSuccess?: (quote: any) => void;
  onCancel?: () => void;
}

export default function QuoteForm({ onSuccess, onCancel }: QuoteFormProps) {
  const { createQuote, saveDraft, loading } = useQuotesStore();
  const { activeProducts, fetchActiveProducts } = useProductsStore();
  const { data: session } = useSession();

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
    city: "",
    postalCode: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isFetchingPappers, setIsFetchingPappers] = useState(false);
  const [pappersError, setPappersError] = useState<string>("");

  useEffect(() => {
    fetchActiveProducts();
  }, [fetchActiveProducts]);

  useEffect(() => {
    if (selectedProductId) {
      const product = activeProducts.find((p) => p.id === selectedProductId);
      setSelectedProduct(product);
      if (product) {
        console.log("formData useEffect validate", product?.formFields);
      }
      // Reset form data and steps when product changes
      setFormData({});
      setCurrentStep(0);
      setCompletedSteps(new Set());
    }
  }, [selectedProductId, activeProducts]);

  // Recherche Pappers via clic bouton
  const handleFetchPappers = async () => {
    const siret = companyData.siret.replace(/\D/g, "");
    if (siret.length !== 14) {
      setPappersError("Le SIRET doit contenir 14 chiffres");
      return;
    }
    try {
      setIsFetchingPappers(true);
      setPappersError("");
      const data = await fetchCompanyBySiret(siret);
      console.log("data fetchPappers", data);
      setCompanyData((prev) => ({
        ...prev,
        companyName: data.companyName || prev.companyName,
        address: data.address || prev.address,
        legalForm: data.legalForm || prev.legalForm,
        creationDate: (data.creationDate || prev.creationDate || "").slice(
          0,
          10
        ),
        directorName: data.directorName || prev.directorName,
        city: (data as any).city || prev.city,
        postalCode: (data as any).postalCode || prev.postalCode,
      }));
      setFormData((prev) => ({
        ...prev,
        companyName: data.companyName || prev.companyName,
        address: data.address || prev.address,
        legalForm: data.legalForm || prev.legalForm,
        creationDate: (data.creationDate || prev.creationDate || "").slice(
          0,
          10
        ),
        directorName: data.directorName || prev.directorName,
        city: (data as any).city || prev.city,
        postalCode: (data as any).postalCode || prev.postalCode,
        enCreation: false,
        nombreAnneeAssuranceContinue: 0,
      }));
    } catch (e: any) {
      setPappersError(e?.message || "Entreprise non trouvée");
    } finally {
      setIsFetchingPappers(false);
    }
  };

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

    console.log("formData validateForm", formData);

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
            console.log("fieldConfig", fieldConfig);
            console.log("formData[fieldName]", formData[fieldName]);
            if (
              !(
                formData["enCreation"] &&
                (fieldConfig.label === "Périodicité de paiement" ||
                  fieldConfig.label === "Antécédents RC Décennale" ||
                  fieldConfig.label ===
                    "L'entreprise existe-t-elle depuis + de 6 mois sans être assurée et sans activité?" ||
                  fieldConfig.label ===
                    "Absence de sinistre sur les 5 dernieres années" ||
                  fieldConfig.label ===
                    "Sans activité depuis plus de 12 mois sans fermeture ?")
              )
            ) {
              newErrors[fieldName] = `${
                fieldConfig.label || fieldName
              } est requis`;
              formData["sansActiviteDepuisPlusDe12MoisSansFermeture"] =
                "CREATION";
              formData["absenceDeSinistreSurLes5DernieresAnnees"] = "CREATION";
              formData["tempsSansActivite"] = "NON";
            }
          }

          // Validate specific field types
          if (formData[fieldName]) {
            if (fieldName === "territory") {
              if (
                (formData[fieldName] as string).toLowerCase() === "mayotte" && session &&
                session.user.email.toLowerCase().trim() !== "dg@dgac.re"
              ) {
                newErrors[
                  fieldName
                ] = `Ce territoire n'est pas disponible, veuillez contacter l'admin pour faire le calcul`;
              }
            }
            if (
              fieldName === "sansActiviteDepuisPlusDe12MoisSansFermeture" ||
              fieldName === "absenceDeSinistreSurLes5DernieresAnnees" ||
              fieldName === "tempsSansActivite"
            ) {
              if (
                formData.enCreation &&
                formData[fieldName].toLowerCase() !== "creation"
              ) {
                newErrors[fieldName] =
                  "Ce champ doit etre rempli par 'création' car entreprise en création";
              }
            }
            if (fieldName === "nombreAnneeAssuranceContinue") {
              if (formData.enCreation && Number(formData[fieldName]) !== 0) {
                newErrors[fieldName] =
                  "Ce champ doit etre rempli par '0' car entreprise en création";
              }
            }
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
      console.log("currentStepConfig.fields", currentStepConfig.fields);
      currentStepConfig.fields.forEach((fieldName: string) => {
        console.log("fieldName", fieldName);
        const fieldConfig = selectedProduct?.formFields?.[fieldName];
        console.log("fieldConfig", fieldConfig);
        if (fieldConfig?.required && !formData[fieldName]) {
          newErrors[fieldName] = `${fieldConfig.label || fieldName} est requis`;
        }

        // Validate specific field types for current step
        if (formData[fieldName] && fieldConfig) {
          // Validate territory
          if (fieldName === "territory") {
            if ((formData[fieldName] as string).toLowerCase() === "mayotte") {
              newErrors[
                fieldName
              ] = `Ce territoire n'est pas disponible, veuillez contacter l'admin pour faire le calcul`;
            }
          }
          if (
            fieldName === "sansActiviteDepuisPlusDe12MoisSansFermeture" ||
            fieldName === "absenceDeSinistreSurLes5DernieresAnnees" ||
            fieldName === "tempsSansActivite" ||
            fieldName === "nombreAnneeAssuranceContinue"
          ) {
            if (formData.enCreation) {
              newErrors[fieldName] =
                "Ce champ doit etre rempli par 'création' car entreprise en création";
            }
          }
          if (fieldConfig.type === "date") {
            // Ici, on vérifie que la date saisie est bien comprise entre aujourd'hui - min jours et aujourd'hui + max jours.
            // Si min ou max vaut -1, on ne prend pas la contrainte en compte.
            if (formData[fieldName]) {
              const valeurDate = new Date(formData[fieldName]);
              const aujourdHui = new Date();
              aujourdHui.setHours(0, 0, 0, 0);

              // Calcul des bornes min et max si elles existent et sont différentes de -1
              let dateMin: Date | null = null;
              let dateMax: Date | null = null;

              if (
                typeof fieldConfig.min === "number" &&
                fieldConfig.min !== -1
              ) {
                dateMin = new Date(aujourdHui);
                dateMin.setDate(aujourdHui.getDate() - fieldConfig.min);
              }
              if (
                typeof fieldConfig.max === "number" &&
                fieldConfig.max !== -1
              ) {
                dateMax = new Date(aujourdHui);
                dateMax.setDate(aujourdHui.getDate() + fieldConfig.max);
              }

              if (dateMin && valeurDate < dateMin) {
                newErrors[fieldName] = `${
                  fieldConfig.label || fieldName
                } doit être postérieur au ${dateMin.toLocaleDateString()}`;
              }
              if (dateMax && valeurDate > dateMax) {
                newErrors[fieldName] = `${
                  fieldConfig.label || fieldName
                } doit être antérieur au ${dateMax.toLocaleDateString()}`;
              }
            }
          }
          // Validate number
          if (fieldConfig.type === "number") {
            if (formData[fieldName] < fieldConfig.min) {
              newErrors[fieldName] = `${
                fieldConfig.label || fieldName
              } doit être supérieur à ${fieldConfig.min}`;
            }
            if (formData[fieldName] > fieldConfig.max) {
              newErrors[fieldName] = `${
                fieldConfig.label || fieldName
              } doit être inférieur à ${fieldConfig.max}`;
            }
          }

          // Validate date
          if (
            formData[fieldName].type === "date" &&
            formData[fieldName].min &&
            formData[fieldName].max
          ) {
            // On vérifie les dates en utilisant des objets Date, car min et max sont des chaînes ISO
            const valueDate = new Date(formData[fieldName].value);
            const minDate = new Date(formData[fieldName].min);
            const maxDate = new Date(formData[fieldName].max);

            if (valueDate < minDate) {
              newErrors[fieldName] = `${
                fieldConfig.label || fieldName
              } doit être postérieur au ${formData[fieldName].min}`;
            }
            if (valueDate > maxDate) {
              newErrors[fieldName] = `${
                fieldConfig.label || fieldName
              } doit être antérieur au ${formData[fieldName].max}`;
            }
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
      if (!companyData.postalCode.trim()) {
        newErrors.postalCode = "Code postal requis";
      }
      if (!companyData.city.trim()) {
        newErrors.city = "Ville requise";
      }
      if (!companyData.legalForm.trim()) {
        newErrors.legalForm = "Forme juridique requise";
      }
      if (!companyData.creationDate.trim()) {
        newErrors.creationDate = "Date de création requise";
      }
      if (!companyData.directorName.trim()) {
        newErrors.directorName = "Nom du dirigeant requise";
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
        // Envoyer automatiquement la lettre d'intention au courtier
        // Note: calculationResult pourrait être récupéré via une API call si nécessaire

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
    const booleanEnCreation =
      formData["enCreation"] &&
      currentStepConfig.title === "Historique et garanties";

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

        {booleanEnCreation && (
          <div className="p-6 bg-blue-50 rounded border border-blue-300 text-center text-lg text-blue-700">
            Vous avez une entreprise en création, cette partie ne vous concerne
            pas.
          </div>
        )}

        {/* Fields for current step */}
        {currentStepConfig.fields && !booleanEnCreation && (
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
            htmlFor="siret"
            className="block text-sm font-medium text-gray-700"
          >
            SIRET *
          </label>
          <div className="mt-1 flex gap-2">
            <input
              type="text"
              id="siret"
              value={companyData.siret}
              onChange={(e) => {
                handleCompanyDataChange(
                  "siret",
                  e.target.value.replace(/\D/g, "")
                );
                handleFormDataChange(
                  "siret",
                  e.target.value.replace(/\D/g, "")
                );
              }}
              maxLength={14}
              className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm ${
                errors.siret ? "border-red-300" : "border-gray-300"
              }`}
            />
            <button
              type="button"
              onClick={handleFetchPappers}
              disabled={
                isFetchingPappers ||
                companyData.siret.replace(/\D/g, "").length !== 14
              }
              className="px-3 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isFetchingPappers ? "Recherche…" : "Rechercher"}
            </button>
          </div>
          {isFetchingPappers && (
            <p className="mt-1 text-sm text-gray-500">Recherche Pappers…</p>
          )}
          {errors.siret && (
            <p className="mt-1 text-sm text-red-600">{errors.siret}</p>
          )}
          {pappersError && (
            <p className="mt-1 text-sm text-red-600">{pappersError}</p>
          )}
        </div>
        <div>
          <label
            htmlFor="companyName"
            className="block text-sm font-medium text-gray-700"
          >
            Raison sociale
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
            htmlFor="postalCode"
            className="block text-sm font-medium text-gray-700"
          >
            Code postal
          </label>
          <input
            type="text"
            id="postalCode"
            value={companyData.postalCode}
            onChange={(e) => {
              handleCompanyDataChange("postalCode", e.target.value);
              handleFormDataChange("postalCode", e.target.value);
            }}
            className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm ${
              errors.postalCode ? "border-red-300" : "border-gray-300"
            }`}
          />
          {errors.postalCode && (
            <p className="mt-1 text-sm text-red-600">{errors.postalCode}</p>
          )}
        </div>

        <div>
          <label
            htmlFor="city"
            className="block text-sm font-medium text-gray-700"
          >
            Ville
          </label>
          <input
            type="text"
            id="city"
            value={companyData.city}
            onChange={(e) => {
              handleCompanyDataChange("city", e.target.value);
              handleFormDataChange("city", e.target.value);
            }}
            className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm ${
              errors.city ? "border-red-300" : "border-gray-300"
            }`}
          />
          {errors.city && (
            <p className="mt-1 text-sm text-red-600">{errors.city}</p>
          )}
        </div>

        <div>
          <label
            htmlFor="legalForm"
            className="block text-sm font-medium text-gray-700"
          >
            Forme juridique *
          </label>
          <input
            type="text"
            id="legalForm"
            value={companyData.legalForm}
            onChange={(e) => {
              handleCompanyDataChange("legalForm", e.target.value);
              handleFormDataChange("legalForm", e.target.value);
            }}
            className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm ${
              errors.legalForm ? "border-red-300" : "border-gray-300"
            }`}
            required
          />
          {errors.legalForm && (
            <p className="mt-1 text-sm text-red-600">{errors.legalForm}</p>
          )}
        </div>

        <div>
          <label
            htmlFor="creationDate"
            className="block text-sm font-medium text-gray-700"
          >
            Date de création *
          </label>
          <input
            type="date"
            id="creationDate"
            value={companyData.creationDate}
            onChange={(e) => {
              handleCompanyDataChange("creationDate", e.target.value);
              handleFormDataChange("creationDate", e.target.value);
            }}
            className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm ${
              errors.creationDate ? "border-red-300" : "border-gray-300"
            }`}
            required
          />
          {errors.creationDate && (
            <p className="mt-1 text-sm text-red-600">{errors.creationDate}</p>
          )}
        </div>

        <div>
          <label
            htmlFor="directorName"
            className="block text-sm font-medium text-gray-700"
          >
            Nom du dirigeant
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
