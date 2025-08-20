"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import useQuotesStore, { QuoteDocument } from "@/lib/stores/quotes-store";
import useProductsStore, {
  InsuranceProduct,
} from "@/lib/stores/products-store";

export default function EditQuotePage() {
  const params = useParams();
  const router = useRouter();
  const quoteId = params.id as string;

  const { currentQuote, fetchQuote, updateQuote, loading, error } =
    useQuotesStore();
  const { activeProducts, fetchActiveProducts } = useProductsStore();

  const [formData, setFormData] = useState<Record<string, any>>({});
  const [companyData, setCompanyData] = useState({
    companyName: "",
    siret: "",
    address: "",
    legalForm: "",
    creationDate: "",
  });
  const [selectedProduct, setSelectedProduct] =
    useState<InsuranceProduct | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState(false);
  const [documents, setDocuments] = useState<QuoteDocument[]>([]);

  useEffect(() => {
    fetchQuote(quoteId);
    fetchActiveProducts();
  }, [quoteId, fetchQuote, fetchActiveProducts]);

  useEffect(() => {
    if (currentQuote) {
      // Check if quote can be edited
      if (!["DRAFT", "INCOMPLETE"].includes(currentQuote.status)) {
        router.push(`/quotes/${quoteId}`);
        return;
      }

      // Initialize form data
      setFormData(currentQuote.formData || {});
      const defaultCompanyData = {
        companyName: "",
        siret: "",
        address: "",
        legalForm: "",
        creationDate: "",
      };
      setCompanyData({ ...defaultCompanyData, ...currentQuote.companyData });
      setDocuments(currentQuote.documents || []);

      // Find the selected product
      const product = activeProducts.find(
        (p) => p.id === currentQuote.productId
      );
      if (product) {
        setSelectedProduct(product);
      }
    }
  }, [currentQuote, activeProducts, quoteId, router]);

  const handleFormDataChange = (fieldName: string, value: any) => {
    setFormData((prev) => ({ ...prev, [fieldName]: value }));
    if (errors[fieldName]) {
      setErrors((prev) => ({ ...prev, [fieldName]: "" }));
    }
  };

  const handleCompanyDataChange = (field: string, value: string) => {
    setCompanyData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const handleFileUpload = async (file: File, documentType: string) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append(
        "fileName",
        `${quoteId}_${documentType}_${Date.now()}.${file.name.split(".").pop()}`
      );

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error);
      }

      // Add document to quote
      const docResponse = await fetch(`/api/quotes/${quoteId}/documents`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fileName: result.data.fileName,
          originalName: result.data.originalName,
          filePath: result.data.filePath,
          fileSize: result.data.fileSize,
          fileType: result.data.fileType,
          documentType: documentType,
        }),
      });

      const docResult = await docResponse.json();

      if (docResult.success) {
        setDocuments((prev) => [...prev, docResult.data]);
      }
    } catch (error) {
      console.error("Upload error:", error);
      setErrors((prev) => ({
        ...prev,
        upload: "Erreur lors de l'upload du fichier",
      }));
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveDocument = async (documentId: string) => {
    try {
      const response = await fetch(
        `/api/quotes/${quoteId}/documents/${documentId}`,
        {
          method: "DELETE",
        }
      );

      const result = await response.json();

      if (result.success) {
        setDocuments((prev) => prev.filter((doc) => doc.id !== documentId));
      }
    } catch (error) {
      console.error("Delete document error:", error);
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

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

    // Validate dynamic form fields
    if (selectedProduct?.formFields) {
      Object.entries(selectedProduct.formFields).forEach(
        ([fieldName, fieldConfig]: [string, any]) => {
          if (fieldConfig.required && !formData[fieldName]) {
            newErrors[fieldName] = `${
              fieldConfig.label || fieldName
            } est requis`;
          }
        }
      );
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (status: "DRAFT" | "INCOMPLETE") => {
    if (status !== "DRAFT" && !validateForm()) {
      return;
    }

    try {
      const updateData = {
        companyData,
        formData,
        status,
      };

      await updateQuote(quoteId, updateData);
      router.push(`/quotes/${quoteId}`);
    } catch (error) {
      console.error("Update error:", error);
      setErrors((prev) => ({
        ...prev,
        submit: "Erreur lors de la mise à jour",
      }));
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

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error || !currentQuote) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Erreur</h1>
          <p className="text-gray-600 mb-6">{error || "Devis non trouvé"}</p>
          <button
            onClick={() => router.push("/dashboard")}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
          >
            Retour au tableau de bord
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-6">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow-sm rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h1 className="text-2xl font-bold text-gray-900">
              Modifier le devis #{currentQuote.reference}
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              Produit: {selectedProduct?.name} ({selectedProduct?.code})
            </p>
          </div>

          <div className="p-6">
            {/* Error Display */}
            {Object.keys(errors).length > 0 && (
              <div className="rounded-md bg-red-50 p-4 mb-6">
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

            <div className="space-y-8">
              {/* Company Information */}
              <div>
                <h2 className="text-lg font-medium text-gray-900 mb-4">
                  Informations de l'entreprise
                </h2>
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
                      onChange={(e) =>
                        handleCompanyDataChange("companyName", e.target.value)
                      }
                      className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm ${
                        errors.companyName
                          ? "border-red-300"
                          : "border-gray-300"
                      }`}
                    />
                    {errors.companyName && (
                      <p className="mt-1 text-sm text-red-600">
                        {errors.companyName}
                      </p>
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
                      onChange={(e) =>
                        handleCompanyDataChange(
                          "siret",
                          e.target.value.replace(/\D/g, "")
                        )
                      }
                      maxLength={14}
                      className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm ${
                        errors.siret ? "border-red-300" : "border-gray-300"
                      }`}
                    />
                    {errors.siret && (
                      <p className="mt-1 text-sm text-red-600">
                        {errors.siret}
                      </p>
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
                      onChange={(e) =>
                        handleCompanyDataChange("address", e.target.value)
                      }
                      className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm ${
                        errors.address ? "border-red-300" : "border-gray-300"
                      }`}
                    />
                    {errors.address && (
                      <p className="mt-1 text-sm text-red-600">
                        {errors.address}
                      </p>
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
                      onChange={(e) =>
                        handleCompanyDataChange("legalForm", e.target.value)
                      }
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    >
                      <option value="">Sélectionnez...</option>
                      <option value="SARL">SARL</option>
                      <option value="SAS">SAS</option>
                      <option value="SA">SA</option>
                      <option value="EURL">EURL</option>
                      <option value="SNC">SNC</option>
                      <option value="AUTO_ENTREPRENEUR">
                        Auto-entrepreneur
                      </option>
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
                      onChange={(e) =>
                        handleCompanyDataChange("creationDate", e.target.value)
                      }
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Product Specific Fields */}
              {selectedProduct?.formFields && (
                <div>
                  <h2 className="text-lg font-medium text-gray-900 mb-4">
                    Informations spécifiques - {selectedProduct.name}
                  </h2>
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                    {Object.entries(selectedProduct.formFields).map(
                      ([fieldName, fieldConfig]: [string, any]) => (
                        <div
                          key={fieldName}
                          className={
                            fieldConfig.type === "textarea"
                              ? "sm:col-span-2"
                              : ""
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

              {/* Documents */}
              <div>
                <h2 className="text-lg font-medium text-gray-900 mb-4">
                  Documents
                </h2>

                {/* Required Documents */}
                {selectedProduct?.requiredDocs && (
                  <div className="space-y-4">
                    {selectedProduct.requiredDocs.map(
                      (docType: string, index: number) => (
                        <div
                          key={index}
                          className="border border-gray-200 rounded-lg p-4"
                        >
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <h3 className="font-medium text-gray-900">
                                {docType}
                              </h3>
                            </div>
                          </div>

                          {/* Existing documents for this type */}
                          <div className="mb-3">
                            {documents
                              .filter((doc) => doc.documentType === docType)
                              .map((doc: QuoteDocument) => {
                                console.log(doc);
                                return (
                                  <div
                                    key={doc.id}
                                    className="flex items-center justify-between bg-gray-50 rounded p-2 mb-2"
                                  >
                                    <div className="flex items-center">
                                      <svg
                                        className="h-5 w-5 text-gray-400 mr-2"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                      >
                                        <path
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          strokeWidth={2}
                                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                        />
                                      </svg>
                                      <span className="text-sm text-gray-900">
                                        {doc.originalName}
                                      </span>
                                      <span className="text-xs text-gray-500 ml-2">
                                        ({Math.round(doc.fileSize / 1024)} KB)
                                      </span>
                                      <span
                                        className={`text-xs ml-2 ${
                                          doc.isVerified
                                            ? "text-green-600"
                                            : "text-orange-500"
                                        }`}
                                      >
                                        {doc.isVerified
                                          ? "Vérifié"
                                          : "Non vérifié"}
                                      </span>
                                    </div>
                                    <button
                                      onClick={() =>
                                        handleRemoveDocument(doc.id)
                                      }
                                      className="text-red-600 hover:text-red-800 text-sm"
                                    >
                                      Supprimer
                                    </button>
                                  </div>
                                );
                              })}
                          </div>

                          {/* Upload button */}
                          <div>
                            <input
                              type="file"
                              id={`upload-${docType}`}
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  handleFileUpload(file, docType);
                                }
                              }}
                              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                            />
                            <label
                              htmlFor={`upload-${docType}`}
                              className="cursor-pointer inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                            >
                              <svg
                                className="h-4 w-4 mr-2"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                                />
                              </svg>
                              {uploading
                                ? "Upload en cours..."
                                : "Ajouter un fichier"}
                            </label>
                          </div>
                        </div>
                      )
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="pt-8 border-t border-gray-200">
              <div className="flex justify-between">
                <button
                  type="button"
                  onClick={() => router.push(`/dashboard`)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Annuler
                </button>

                <div className="flex space-x-3">
                  <button
                    type="button"
                    onClick={() => handleSubmit("DRAFT")}
                    disabled={loading}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? "Sauvegarde..." : "Sauvegarder brouillon"}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSubmit("INCOMPLETE")}
                    disabled={loading}
                    className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? "Mise à jour..." : "Mettre à jour le devis"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
