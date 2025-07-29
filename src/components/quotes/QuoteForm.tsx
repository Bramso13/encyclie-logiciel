"use client";

import { useState, useEffect } from "react";
import useQuotesStore from "@/lib/stores/quotes-store";
import useProductsStore from "@/lib/stores/products-store";

interface QuoteFormProps {
  onSuccess?: (quote: any) => void;
  onCancel?: () => void;
}

export default function QuoteForm({ onSuccess, onCancel }: QuoteFormProps) {
  const { createQuote, loading } = useQuotesStore();
  const { activeProducts, fetchActiveProducts } = useProductsStore();
  
  const [selectedProductId, setSelectedProductId] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
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
      const product = activeProducts.find(p => p.id === selectedProductId);
      setSelectedProduct(product);
      // Reset form data when product changes
      setFormData({});
    }
  }, [selectedProductId, activeProducts]);

  const handleCompanyDataChange = (field: string, value: string) => {
    setCompanyData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: "" }));
    }
  };

  const handleFormDataChange = (fieldName: string, value: any) => {
    setFormData(prev => ({ ...prev, [fieldName]: value }));
    if (errors[fieldName]) {
      setErrors(prev => ({ ...prev, [fieldName]: "" }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    // Validate product selection
    if (!selectedProductId) {
      newErrors.product = "Veuillez sélectionner un produit d'assurance";
    }

    // Validate company data
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

    // Validate dynamic form fields based on product configuration
    if (selectedProduct?.formFields) {
      Object.entries(selectedProduct.formFields).forEach(([fieldName, fieldConfig]: [string, any]) => {
        if (fieldConfig.required && !formData[fieldName]) {
          newErrors[fieldName] = `${fieldConfig.label || fieldName} est requis`;
        }

        // Validate specific field types
        if (formData[fieldName]) {
          if (fieldConfig.type === 'number' && isNaN(Number(formData[fieldName]))) {
            newErrors[fieldName] = `${fieldConfig.label || fieldName} doit être un nombre`;
          }
          if (fieldConfig.type === 'email' && !/\S+@\S+\.\S+/.test(formData[fieldName])) {
            newErrors[fieldName] = `${fieldConfig.label || fieldName} doit être un email valide`;
          }
        }
      });
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      const quote = await createQuote({
        productId: selectedProductId,
        companyData,
        formData,
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
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => 
        handleFormDataChange(fieldName, e.target.value),
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

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Product Selection */}
      <div>
        <label htmlFor="product" className="block text-sm font-medium text-gray-700">
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
        {errors.product && <p className="mt-1 text-sm text-red-600">{errors.product}</p>}
      </div>

      {/* Company Information */}
      <div className="border-t pt-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Informations sur l'entreprise
        </h3>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <label htmlFor="companyName" className="block text-sm font-medium text-gray-700">
              Raison sociale *
            </label>
            <input
              type="text"
              id="companyName"
              value={companyData.companyName}
              onChange={(e) => handleCompanyDataChange("companyName", e.target.value)}
              className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm ${
                errors.companyName ? "border-red-300" : "border-gray-300"
              }`}
            />
            {errors.companyName && <p className="mt-1 text-sm text-red-600">{errors.companyName}</p>}
          </div>

          <div>
            <label htmlFor="siret" className="block text-sm font-medium text-gray-700">
              SIRET *
            </label>
            <input
              type="text"
              id="siret"
              value={companyData.siret}
              onChange={(e) => handleCompanyDataChange("siret", e.target.value.replace(/\D/g, ""))}
              maxLength={14}
              className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm ${
                errors.siret ? "border-red-300" : "border-gray-300"
              }`}
            />
            {errors.siret && <p className="mt-1 text-sm text-red-600">{errors.siret}</p>}
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="address" className="block text-sm font-medium text-gray-700">
              Adresse *
            </label>
            <input
              type="text"
              id="address"
              value={companyData.address}
              onChange={(e) => handleCompanyDataChange("address", e.target.value)}
              className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm ${
                errors.address ? "border-red-300" : "border-gray-300"
              }`}
            />
            {errors.address && <p className="mt-1 text-sm text-red-600">{errors.address}</p>}
          </div>

          <div>
            <label htmlFor="legalForm" className="block text-sm font-medium text-gray-700">
              Forme juridique
            </label>
            <select
              id="legalForm"
              value={companyData.legalForm}
              onChange={(e) => handleCompanyDataChange("legalForm", e.target.value)}
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
            <label htmlFor="creationDate" className="block text-sm font-medium text-gray-700">
              Date de création
            </label>
            <input
              type="date"
              id="creationDate"
              value={companyData.creationDate}
              onChange={(e) => handleCompanyDataChange("creationDate", e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>
        </div>
      </div>

      {/* Dynamic Product Fields */}
      {selectedProduct?.formFields && (
        <div className="border-t pt-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Informations spécifiques - {selectedProduct.name}
          </h3>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            {Object.entries(selectedProduct.formFields).map(([fieldName, fieldConfig]: [string, any]) => (
              <div key={fieldName} className={fieldConfig.type === 'textarea' ? 'sm:col-span-2' : ''}>
                <label htmlFor={fieldName} className="block text-sm font-medium text-gray-700">
                  {fieldConfig.label || fieldName}
                  {fieldConfig.required && ' *'}
                </label>
                {fieldConfig.type === 'checkbox' ? (
                  <div className="mt-1">
                    <div className="flex items-center">
                      {renderDynamicField(fieldName, fieldConfig)}
                      <span className="ml-2 text-sm text-gray-600">{fieldConfig.label}</span>
                    </div>
                  </div>
                ) : (
                  renderDynamicField(fieldName, fieldConfig)
                )}
                {fieldConfig.help && (
                  <p className="mt-1 text-sm text-gray-500">{fieldConfig.help}</p>
                )}
                {errors[fieldName] && (
                  <p className="mt-1 text-sm text-red-600">{errors[fieldName]}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Form Actions */}
      <div className="flex justify-end space-x-3 pt-6 border-t">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Annuler
          </button>
        )}
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Création..." : "Créer le devis"}
        </button>
      </div>
    </form>
  );
}