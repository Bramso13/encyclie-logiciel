"use client";

import { Quote } from "@/lib/types";
import { useState } from "react";
import { Pencil, Check, X, Save } from "lucide-react";
import ActivityBreakdownField from "@/components/quotes/ActivityBreakdown";

function formatFieldValue(value: any, fieldType: string): string {
  if (value === null || value === undefined) return "Non renseigné";

  switch (fieldType) {
    case "checkbox":
      return value ? "Oui" : "Non";
    case "date":
      return new Date(value).toLocaleDateString("fr-FR");
    case "number":
      return typeof value === "number" ? value.toLocaleString("fr-FR") : String(value);
    case "activity_breakdown":
      if (typeof value === "object" && value !== null) {
        return Object.entries(value).map(([code, percent]) => `Code ${code}: ${percent}%`).join(", ");
      }
      return String(value);
    case "loss_history":
      if (Array.isArray(value)) {
        return value.map(entry => `${entry.year}: ${entry.numClaims} sinistre(s), ${entry.totalCost}€`).join(" | ");
      }
      return String(value);
    default:
      return String(value);
  }
}

export default function FormDataTab({ quote }: { quote: Quote }) {
  const [activeTab, setActiveTab] = useState(0);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<any>(null);
  const [tempFormData, setTempFormData] = useState<any>(quote.formData || {});
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Récupérer la configuration depuis quote.product
  const stepConfig = quote.product?.stepConfig as any;
  const formFieldsConfig = quote.product?.formFields as any;

  const startEditing = (fieldKey: string, currentValue: any) => {
    setEditingField(fieldKey);
    setEditValue(currentValue);
  };

  const cancelEditing = () => {
    setEditingField(null);
    setEditValue(null);
  };

  const saveField = (fieldKey: string) => {
    // Mettre à jour le formData temporaire
    setTempFormData({
      ...tempFormData,
      [fieldKey]: editValue
    });
    setHasChanges(true);
    setEditingField(null);
    setEditValue(null);
  };

  const updateQuote = async () => {
    setIsSaving(true);
    try {
      const response = await fetch(`/api/quotes/${quote.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          formData: tempFormData,
          companyData: quote.companyData,
        }),
      });

      if (response.ok) {
        setHasChanges(false);
        alert('Devis mis à jour !');
      } else {
        alert('Erreur lors de la sauvegarde');
      }
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur réseau');
    } finally {
      setIsSaving(false);
    }
  };

  const renderEditableField = (key: string, value: any, fieldConfig: any) => {
    const isEditing = editingField === key;

    if (isEditing) {
      return renderEditInput(key, fieldConfig);
    }

    // Utiliser tempFormData pour l'affichage
    const displayValue = tempFormData[key] !== undefined ? tempFormData[key] : value;

    return (
      <div className="flex items-center justify-between">
        <dd className="text-sm text-gray-900 flex-1">
          {formatFieldValue(displayValue, fieldConfig?.type || "text")}
        </dd>
        <button
          onClick={() => startEditing(key, displayValue)}
          className="ml-2 p-1 text-gray-400 hover:text-gray-600 transition-colors"
          title="Modifier ce champ"
        >
          <Pencil className="h-4 w-4" />
        </button>
      </div>
    );
  };

  const renderEditInput = (key: string, fieldConfig: any) => {
    const fieldType = fieldConfig?.type || "text";

    const renderInput = () => {
      switch (fieldType) {
        case "checkbox":
          return (
            <input
              type="checkbox"
              checked={editValue || false}
              onChange={(e) => setEditValue(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
          );
        case "date":
          return (
            <input
              type="date"
              value={editValue || ""}
              onChange={(e) => setEditValue(e.target.value)}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            />
          );
        case "number":
          return (
            <input
              type="number"
              value={editValue || ""}
              onChange={(e) => setEditValue(e.target.value)}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            />
          );
        case "select":
          return (
            <select
              value={editValue || ""}
              onChange={(e) => setEditValue(e.target.value)}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            >
              <option value="">Sélectionner...</option>
              {fieldConfig?.options?.map((option: any) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          );
        case "activity_breakdown":
          return (
            <ActivityBreakdownField
              options={fieldConfig?.options || []}
              value={editValue || []}
              onChange={setEditValue}
            />
          );
        default:
          return (
            <input
              type="text"
              value={editValue || ""}
              onChange={(e) => setEditValue(e.target.value)}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            />
          );
      }
    };

    return (
      <div className="space-y-2">
        {renderInput()}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => saveField(key)}
            className="inline-flex items-center px-2 py-1 border border-transparent text-xs font-medium rounded text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
          >
            <Check className="h-3 w-3 mr-1" />
            Sauvegarder
          </button>
          <button
            onClick={cancelEditing}
            className="inline-flex items-center px-2 py-1 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <X className="h-3 w-3 mr-1" />
            Annuler
          </button>
        </div>
      </div>
    );
  };

  if (!stepConfig?.steps || !formFieldsConfig) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Données du formulaire
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Configuration non disponible
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
    );
  }

  // Fonction pour obtenir les champs d'une étape
  const getStepFields = (step: any) => {
    const fields: { [key: string]: any } = {};

    // Ajouter les informations d'entreprise si includeCompanyInfo est true
    if (step.includeCompanyInfo && quote.companyData) {
      Object.entries(quote.companyData).forEach(([key, value]) => {
        fields[key] = value;
      });
    }

    // Ajouter les champs spécifiques de l'étape depuis tempFormData
    step.fields?.forEach((fieldName: string) => {
      if (tempFormData && tempFormData[fieldName] !== undefined) {
        fields[fieldName] = tempFormData[fieldName];
      }
    });

    return fields;
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
            Formulaire de souscription
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Informations saisies lors de la création du devis
            </p>
          </div>
          {hasChanges && (
            <button
              onClick={updateQuote}
              disabled={isSaving}
              className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white transition-colors ${
                isSaving
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              }`}
            >
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? "Sauvegarde..." : "Mettre à jour le devis"}
            </button>
          )}
        </div>
      </div>

      {/* Navigation des onglets */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8 px-6" aria-label="Tabs">
          {stepConfig.steps.map((step: any, index: number) => (
            <button
              key={index}
              onClick={() => setActiveTab(index)}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === index
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              {step.title}
            </button>
          ))}
        </nav>
      </div>

      {/* Contenu des onglets */}
      <div className="p-6">
        {stepConfig.steps.map((step: any, index: number) => (
          <div
            key={index}
            className={activeTab === index ? "block" : "hidden"}
          >
            <div className="mb-4">
              <h3 className="text-lg font-medium text-gray-900">{step.title}</h3>
              <p className="text-sm text-gray-600 mt-1">{step.description}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Object.entries(getStepFields(step)).map(([key, value]) => {
                const fieldConfig = formFieldsConfig[key];
                const label = fieldConfig?.label || key;

                return (
                  <div key={key} className="bg-gray-50 rounded-lg p-4">
                    <dt className="text-sm font-medium text-gray-500 mb-1">
                      {label}
                    </dt>
                    {renderEditableField(key, value, fieldConfig)}
                  </div>
                );
              })}
            </div>

            {Object.keys(getStepFields(step)).length === 0 && (
              <div className="text-center py-8 text-gray-500">
                Aucune donnée disponible pour cette étape
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}