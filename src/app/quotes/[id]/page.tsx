"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { calculPrimeRCD } from "@/lib/tarificateurs/rcd";
import { authClient } from "@/lib/auth-client";
import useQuotesStore, { QuoteDocument } from "@/lib/stores/quotes-store";
import useProductsStore, {
  InsuranceProduct,
} from "@/lib/stores/products-store";
import MultiSelect from "@/components/quotes/MultiSelect";
import ActivityBreakdownField from "@/components/quotes/ActivityBreakdown";
import LossHistoryField from "@/components/quotes/LossHistoryField";

interface CompanyData {
  siret: string;
  address: string;
  legalForm: string;
  companyName: string;
  creationDate: string;
  directorName: string;
}

interface ActivityShare {
  code: string;
  caSharePercent: number;
}

interface FormData {
  siret: string;
  address: string;
  includePJ: boolean;
  legalForm: string;
  territory: string;
  activities: ActivityShare[];
  companyName: string;
  periodicity: string;
  nombreSalaries: string;
  tradingPercent: string;
  chiffreAffaires: string;
  experienceMetier: string;
  hasQualification: boolean;
  previousRcdStatus: string;
  dateEffetSouhaitee: string;
  companyCreationDate: string;
  subContractingPercent: string;
  previousResiliationDate?: string;
  lossHistory?: Array<{ year: number; numClaims: number; totalCost: number }>;
}

interface Quote {
  id: string;
  reference: string;
  status: string;
  companyData: CompanyData;
  formData: FormData;
  product: {
    name: string;
    code: string;
  };
  createdAt: string;
  updatedAt: string;
}

// Interface simplifiée pour éviter les conflits de types
type CalculationResult = any;

export default function QuoteDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [activeTab, setActiveTab] = useState("form-data");
  const [calculationResult, setCalculationResult] =
    useState<CalculationResult | null>(null);
  const [calculationError, setCalculationError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // États pour l'édition
  const { updateQuote } = useQuotesStore();
  const { activeProducts, fetchActiveProducts } = useProductsStore();
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [companyData, setCompanyData] = useState({
    companyName: "",
    siret: "",
    address: "",
    legalForm: "",
    creationDate: "",
    directorName: "",
  });
  const [selectedProduct, setSelectedProduct] =
    useState<InsuranceProduct | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState(false);
  const [documents, setDocuments] = useState<QuoteDocument[]>([]);

  // États pour le mapping dynamique
  const [parameterMapping, setParameterMapping] = useState<Record<string, string>>({});
  const [formFields, setFormFields] = useState<Record<string, any>>({});

  // États pour les PDFs
  const [generatingLetterPDF, setGeneratingLetterPDF] = useState(false);
  const [generatingPremiumCallPDF, setGeneratingPremiumCallPDF] = useState(false);

  const tabs = [
    {
      id: "form-data",
      label: "Donnees du formulaire",
      icon: (
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
      ),
    },
    {
      id: "calculation",
      label: "Calcul RCD",
      icon: (
        <svg
          className="w-5 h-5"
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
      ),
    },
    {
      id: "letter",
      label: "Lettre d'intention",
      icon: (
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
          />
        </svg>
      ),
    },
    {
      id: "premium-call",
      label: "Appel de prime",
      icon: (
        <svg
          className="w-5 h-5"
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
      ),
    },
    {
      id: "edit",
      label: "Édition",
      icon: (
        <svg
          className="w-5 h-5"
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
      ),
    },
  ];

  useEffect(() => {
    fetchActiveProducts();
  }, [fetchActiveProducts]);

  // Fonction pour charger le mapping et les formFields du produit
  const loadProductMapping = async (productId: string) => {
    try {
      const response = await fetch(`/api/products/${productId}`);
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          const product = result.data;
          setFormFields(product.formFields || {});
          setParameterMapping(product.mappingFields || {});
        }
      }
    } catch (error) {
      console.error('Erreur lors du chargement du mapping:', error);
    }
  };

  // Fonction de calcul dynamique basée sur le mapping
  const calculateWithMapping = (quoteData: any) => {
    try {
      console.log("=== CALCUL DYNAMIQUE AVEC MAPPING ===");
      console.log("FormData:", quoteData.formData);
      console.log("CompanyData:", quoteData.companyData);
      console.log("ParameterMapping:", parameterMapping);
      console.log("FormFields:", formFields);

      // Construire les paramètres à partir du mapping
      const mappedParams: any = {};
      
      Object.entries(parameterMapping).forEach(([paramKey, fieldKey]) => {
        if (fieldKey && formFields[fieldKey]) {
          const field = formFields[fieldKey];
          const value = quoteData.formData[fieldKey] || field.default;
          
          // Conversion selon le type de champ et le paramètre
          switch (paramKey) {
            case 'caDeclared':
            case 'etp':
            case 'anneeExperience':
            case 'nombreAnneeAssuranceContinue':
            case 'partSoutraitance':
            case 'partNegoce':
              if (field.type === 'number') {
                mappedParams[paramKey] = Number(value) || 0;
              }
              break;
              
            case 'dateCreation':
            case 'dateEffet':
              if (field.type === 'date') {
                mappedParams[paramKey] = value ? new Date(value) : new Date();
              }
              break;
              
            case 'tempsSansActivite':
            case 'sansActiviteDepuisPlusDe12MoisSansFermeture':
            case 'absenceDeSinistreSurLes5DernieresAnnees':
            case 'fractionnementPrime':
              mappedParams[paramKey] = value;
              break;
              
            case 'qualif':
            case 'assureurDefaillant':
            case 'protectionJuridique':
            case 'nonFournitureBilanN_1':
            case 'reprisePasse':
              if (field.type === 'checkbox') {
                mappedParams[paramKey] = Boolean(value);
              }
              break;
              
            case 'nomDeLAsurreur':
              if (field.type === 'text' || field.type === 'select') {
                mappedParams[paramKey] = value || "";
              }
              break;
              
            case 'dateFinCouverturePrecedente':
              if (field.type === 'date') {
                mappedParams[paramKey] = value ? new Date(value) : new Date();
              }
              break;
              
            case 'activites':
              // Pour les activités, utiliser les données du formulaire
              if (quoteData.formData.activities && Array.isArray(quoteData.formData.activities)) {
                mappedParams[paramKey] = quoteData.formData.activities.map((a: any) => ({
                  code: parseInt(a.code),
                  caSharePercent: Number(a.caSharePercent)
                }));
              } else {
                mappedParams[paramKey] = [];
              }
              break;
              
            case 'sinistresPrecedents':
              // Pour les sinistres, utiliser les données du formulaire
              mappedParams[paramKey] = quoteData.formData.lossHistory || [];
              break;
          }
        }
      });
      
      // Vérifier que tous les paramètres obligatoires sont présents
      const requiredParams = ['caDeclared', 'etp', 'activites'];
      const missingParams = requiredParams.filter(param => !mappedParams[param]);
      
      if (missingParams.length > 0) {
        throw new Error(`Paramètres obligatoires manquants : ${missingParams.join(', ')}`);
      }

      console.log("Paramètres mappés:", mappedParams);
      
      // Utiliser les valeurs par défaut pour les paramètres non mappés
      const finalParams = {
        // Valeurs par défaut
        caDeclared: 500000,
        etp: 3,
        activites: [],
        dateCreation: new Date(),
        tempsSansActivite: "NON" as any,
        anneeExperience: 5,
        assureurDefaillant: false,
        nombreAnneeAssuranceContinue: 3,
        qualif: false,
        nomDeLAsurreur: "AXA",
        dateEffet: new Date(),
        sinistresPrecedents: [],
        sansActiviteDepuisPlusDe12MoisSansFermeture: "NON" as "OUI" | "NON" | "CREATION",
        absenceDeSinistreSurLes5DernieresAnnees: "OUI" as "OUI" | "NON" | "CREATION" | "ASSUREUR_DEFAILLANT" | "A_DEFINIR",
        protectionJuridique: true,
        fractionnementPrime: "annuel" as "annuel" | "mensuel" | "trimestriel" | "semestriel",
        partSoutraitance: 0,
        partNegoce: 0,
        nonFournitureBilanN_1: false,
        reprisePasse: false,
        // Remplacer par les valeurs mappées
        ...mappedParams
      };

      console.log("Paramètres finaux:", finalParams);
      
      const result = calculPrimeRCD(finalParams);
      console.log("Résultat calcul:", result);
      return result;
    } catch (error) {
      console.error("Erreur calcul dynamique:", error);
      throw error;
    }
  };

  useEffect(() => {
    const fetchQuote = async () => {
      try {
        const response = await fetch(`/api/quotes/${params.id}`);
        if (response.ok) {
          const dataA = await response.json();
          const data = dataA.data;
          setQuote(data);
          console.log("quote", data);

          // Initialiser les données d'édition
          setFormData(data.formData || {});
          const defaultCompanyData = {
            companyName: "",
            siret: "",
            address: "",
            legalForm: "",
            creationDate: "",
            directorName: "",
          };
          setCompanyData({ ...defaultCompanyData, ...data.companyData });
          setDocuments(data.documents || []);

          // Trouver le produit sélectionné
          const product = activeProducts.find((p) => p.id === data.productId);
          if (product) {
            setSelectedProduct(product);
            // Charger le mapping du produit
            await loadProductMapping(data.productId);
          }
          // Si c'est un devis avec des donnees completes, faire le calcul
          if (data.formData) {
            try {
              console.log("=== CALCUL AVEC MAPPING DYNAMIQUE ===");
              console.log("FormData recu:", data.formData);
              console.log("CompanyData recu:", data.companyData);

              // Attendre que le mapping soit chargé avant de calculer
              if (Object.keys(parameterMapping).length === 0) {
                console.log("Mapping non encore chargé, calcul différé");
                // Le calcul sera refait quand le mapping sera chargé
                return;
              }

              const result = calculateWithMapping(data);
              setCalculationResult(result);
              setCalculationError(null);
            } catch (error) {
              console.error("=== ERREUR CALCUL DYNAMIQUE ===");
              console.error("Type erreur:", typeof error);
              console.error("Message erreur:", error);
              console.error(
                "Stack trace:",
                error instanceof Error ? error.stack : "Pas de stack"
              );

              let errorMessage = "Erreur de calcul inconnue";
              if (error instanceof Error) {
                errorMessage = error.message;
              } else if (typeof error === "string") {
                errorMessage = error;
              } else {
                errorMessage = String(error);
              }

              setCalculationError(errorMessage);
            }
          } else {
            console.log("Pas de formData disponible");
            setCalculationError("Aucune donnee de formulaire disponible");
          }
        } else {
          console.error("Erreur recuperation devis");
        }
      } catch (error) {
        console.error("Erreur:", error);
      } finally {
        setLoading(false);
      }
    };

    if (params.id) {
      fetchQuote();
    }
  }, [params.id, activeProducts]);

  // Recalculer quand le mapping est chargé
  useEffect(() => {
    if (quote && Object.keys(parameterMapping).length > 0 && quote.formData) {
      try {
        console.log("Recalcul avec mapping chargé");
        const result = calculateWithMapping(quote);
        setCalculationResult(result);
        setCalculationError(null);
      } catch (error) {
        console.error("Erreur recalcul:", error);
        setCalculationError(error instanceof Error ? error.message : "Erreur de calcul");
      }
    }
  }, [parameterMapping, quote]);

  // Fonctions d'édition
  const handleFormDataChange = (fieldName: string, value: any) => {
    console.log("handleFormDataChange", fieldName, value);
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
        `${params.id}_${documentType}_${Date.now()}.${file.name
          .split(".")
          .pop()}`
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
      const docResponse = await fetch(`/api/quotes/${params.id}/documents`, {
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
        `/api/quotes/${params.id}/documents/${documentId}`,
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
    console.log("errors", errors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (status: "DRAFT" | "INCOMPLETE") => {
    if (!validateForm()) {
      return;
    }
    console.log("formData", formData);
    try {
      const updateData = {
        companyData,
        formData,
        status,
      };

      // Mettre à jour via l'API
      const response = await fetch(`/api/quotes/${params.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erreur lors de la mise à jour");
      }

      const result = await response.json();
      
      // Mettre à jour l'état local
      updateQuote(params.id as string, result.data);
      setQuote(result.data);
    } catch (error) {
      console.error("Update error:", error);
      setErrors((prev) => ({
        ...prev,
        submit: "Erreur lors de la mise à jour",
      }));
    }
  };

  // Fonctions pour la lettre d'intention
  const handleGeneratePDF = async () => {
    try {
      if (!quote) {
        alert("Aucun devis disponible");
        return;
      }

      setGeneratingLetterPDF(true);

      const response = await fetch('/api/generate-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'letter-of-intent',
          quote,
          calculationResult,
        }),
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la génération du PDF');
      }

      // Télécharger le PDF
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `lettre-intention-${quote.reference || 'devis'}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Erreur génération PDF:", error);
      alert("Erreur lors de la génération du PDF");
    } finally {
      setGeneratingLetterPDF(false);
    }
  };

  const handleSendEmail = async () => {
    try {
      // TODO: Implémenter l'envoi par email
      console.log("Envoi de la lettre d'intention par email...");
      alert("Fonctionnalité d'envoi par email à implémenter");
    } catch (error) {
      console.error("Erreur envoi email:", error);
    }
  };

  // Fonctions pour l'appel de prime
  const handleGeneratePremiumCallPDF = async () => {
    try {
      if (!quote) {
        alert("Aucun devis disponible");
        return;
      }

      setGeneratingPremiumCallPDF(true);

      const response = await fetch('/api/generate-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'premium-call',
          quote,
          calculationResult,
        }),
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la génération du PDF');
      }

      // Télécharger le PDF
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `appel-prime-${quote.reference || 'devis'}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Erreur génération PDF:", error);
      alert("Erreur lors de la génération du PDF");
    } finally {
      setGeneratingPremiumCallPDF(false);
    }
  };

  const handleSendPremiumCallEmail = async () => {
    try {
      // TODO: Implémenter l'envoi par email
      console.log("Envoi de l'appel de prime par email...");
      alert("Fonctionnalité d'envoi par email à implémenter");
    } catch (error) {
      console.error("Erreur envoi email:", error);
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          <span className="text-gray-600">Chargement...</span>
        </div>
      </div>
    );
  }

  if (!quote) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Devis introuvable
          </h1>
          <p className="text-gray-600 mb-4">
            Le devis demande n'existe pas ou a ete supprime.
          </p>
          <button
            onClick={() => router.push("/dashboard")}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            Retour au tableau de bord
          </button>
        </div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    const colors = {
      DRAFT: "bg-gray-100 text-gray-800",
      INCOMPLETE: "bg-yellow-100 text-yellow-800",
      SUBMITTED: "bg-blue-100 text-blue-800",
      IN_PROGRESS: "bg-blue-100 text-blue-800",
      OFFER_READY: "bg-green-100 text-green-800",
      ACCEPTED: "bg-green-100 text-green-800",
      REJECTED: "bg-red-100 text-red-800",
    };
    return colors[status as keyof typeof colors] || "bg-gray-100 text-gray-800";
  };

  const getStatusText = (status: string) => {
    const labels = {
      DRAFT: "Brouillon",
      INCOMPLETE: "Incomplet",
      SUBMITTED: "Soumis",
      IN_PROGRESS: "En cours",
      OFFER_READY: "Offre prete",
      ACCEPTED: "Accepte",
      REJECTED: "Rejete",
    };
    return labels[status as keyof typeof labels] || status;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <button
                  onClick={() => router.push("/dashboard")}
                  className="mr-4 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 19l-7-7 7-7"
                    />
                  </svg>
                </button>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    Devis {quote.reference}
                  </h1>
                  <div className="flex items-center space-x-4 mt-1">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                        quote.status
                      )}`}
                    >
                      {getStatusText(quote.status)}
                    </span>

                    <span className="text-sm text-gray-500">
                      Cree le{" "}
                      {new Date(quote.createdAt).toLocaleDateString("fr-FR")}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <button className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                  Exporter PDF
                </button>
                <button className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors">
                  Modifier
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Company Info Bar */}
      {/* <div className="bg-indigo-50 border-b border-indigo-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center space-x-6 text-sm">
            <div className="flex items-center">
              <svg
                className="w-4 h-4 text-indigo-500 mr-2"
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
              <span className="font-medium text-indigo-900">
                {quote.companyData.companyName}
              </span>
            </div>
            <div className="text-indigo-700">
              SIRET: {quote.companyData.siret}
            </div>
            <div className="text-indigo-700">{quote.companyData.address}</div>
          </div>
        </div>
      </div> */}

      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8" aria-label="Tabs">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? "border-indigo-500 text-indigo-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                <div
                  className={`mr-2 transition-colors ${
                    activeTab === tab.id
                      ? "text-indigo-500"
                      : "text-gray-400 group-hover:text-gray-500"
                  }`}
                >
                  {tab.icon}
                </div>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === "form-data" && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                Donnees du formulaire
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Informations saisies lors de la creation du devis
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
        )}

        {activeTab === "calculation" && (
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
                    <p className="text-sm text-red-700 mt-1">
                      {calculationError}
                    </p>
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
                      Le calcul automatique n'est disponible que pour les
                      produits RC Decennale (RCD).
                    </p>
                  </div>
                </div>
              </div>
            )}

            {calculationResult && (
              <div className="space-y-8">
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
                      <div className={`p-3 rounded-full ${calculationResult.refus ? 'bg-red-400/20' : 'bg-white/20'}`}>
                        {calculationResult.refus ? (
                          <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                          </svg>
                        ) : (
                          <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                    <div>
                        <h2 className="text-3xl font-bold mb-2">
                        {calculationResult.refus
                          ? "Demande Refusée"
                          : "Prime RCD Calculée"}
                      </h2>
                        <p className={`text-lg ${calculationResult.refus ? "text-red-100" : "text-indigo-100"}`}>
                        {calculationResult.refus
                            ? calculationResult.refusReason || "Le dossier ne peut pas être accepté"
                          : "Calcul basé sur les données du formulaire"}
                      </p>
                      </div>
                    </div>
                    <div className="text-right">
                      {!calculationResult.refus && (
                        <>
                          <div className="text-4xl font-bold mb-1">
                            {calculationResult.totalTTC?.toLocaleString("fr-FR") || 
                             calculationResult.primeTotal?.toLocaleString("fr-FR") || "0"} €
                          </div>
                          <div className="text-indigo-200 text-sm">
                            Total TTC
                          </div>
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
                    {/* Résumé financier */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      {/* CA Calculé */}
                      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-600">CA Calculé</p>
                            <p className="text-2xl font-bold text-gray-900">
                              {calculationResult.caCalculee?.toLocaleString("fr-FR") || "0"} €
                            </p>
                          </div>
                          <div className="p-3 bg-blue-100 rounded-full">
                            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                          </div>
                        </div>
                      </div>

                      {/* Prime HT */}
                      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-600">Prime HT</p>
                            <p className="text-2xl font-bold text-gray-900">
                              {calculationResult.primeTotal?.toLocaleString("fr-FR") || "0"} €
                            </p>
                          </div>
                          <div className="p-3 bg-green-100 rounded-full">
                            <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                            </svg>
                          </div>
                        </div>
                      </div>

                      {/* Total TTC */}
                      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-600">Total TTC</p>
                            <p className="text-2xl font-bold text-indigo-600">
                              {calculationResult.totalTTC?.toLocaleString("fr-FR") || "0"} €
                            </p>
                          </div>
                          <div className="p-3 bg-indigo-100 rounded-full">
                            <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
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
                            <svg className="w-5 h-5 mr-2 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                            </svg>
                              Composition de la prime
                            </h3>
                          </div>
                          <div className="p-6 space-y-4">
                          <div className="flex justify-between items-center py-2 border-b border-gray-100">
                            <span className="text-gray-600">Prime minimum HT</span>
                            <span className="font-semibold text-gray-900">
                              {calculationResult.PminiHT?.toLocaleString("fr-FR") || "0"} €
                              </span>
                          </div>
                          <div className="flex justify-between items-center py-2 border-b border-gray-100">
                            <span className="text-gray-600">Prime au-delà</span>
                            <span className="font-semibold text-gray-900">
                              {calculationResult.primeAuDela?.toLocaleString("fr-FR") || "0"} €
                              </span>
                            </div>
                          <div className="flex justify-between items-center py-2 border-b border-gray-100">
                            <span className="text-gray-600">Prime HT sans majorations</span>
                            <span className="font-semibold text-gray-900">
                              {calculationResult.PrimeHTSansMajorations?.toLocaleString("fr-FR") || "0"} €
                              </span>
                            </div>
                          <div className="flex justify-between items-center py-2 border-b border-gray-100">
                            <span className="text-gray-600">Total majorations</span>
                            <span className={`font-semibold ${calculationResult.totalMajorations > 0 ? 'text-red-600' : calculationResult.totalMajorations < 0 ? 'text-green-600' : 'text-gray-600'}`}>
                              {calculationResult.totalMajorations > 0 ? '+' : ''}
                              {((calculationResult.totalMajorations - 1) * 100).toFixed(1)}%
                              </span>
                            </div>
                          <div className="flex justify-between items-center py-3 bg-gray-50 rounded-lg px-4">
                            <span className="text-gray-900 font-medium">Prime HT finale</span>
                            <span className="font-bold text-lg text-indigo-600">
                              {calculationResult.primeTotal?.toLocaleString("fr-FR") || "0"} €
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Majorations appliquées */}
                      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 rounded-t-xl">
                          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                            <svg className="w-5 h-5 mr-2 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                            </svg>
                              Majorations appliquées
                            </h3>
                          </div>
                        <div className="p-6 space-y-3">
                          {calculationResult.majorations && Object.entries(calculationResult.majorations).map(
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
                        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                          <svg className="w-5 h-5 mr-2 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                          </svg>
                          Frais et taxes
                        </h3>
                      </div>
                      <div className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                          <div className="text-center p-4 bg-blue-50 rounded-lg">
                            <p className="text-sm text-blue-600 font-medium">Protection Juridique</p>
                            <p className="text-xl font-bold text-blue-900">
                              {calculationResult.protectionJuridique?.toLocaleString("fr-FR") || "0"} €
                            </p>
                          </div>
                          <div className="text-center p-4 bg-green-50 rounded-lg">
                            <p className="text-sm text-green-600 font-medium">Frais de gestion</p>
                            <p className="text-xl font-bold text-green-900">
                              {calculationResult.fraisGestion?.toLocaleString("fr-FR") || "0"} €
                            </p>
                          </div>
                          <div className="text-center p-4 bg-orange-50 rounded-lg">
                            <p className="text-sm text-orange-600 font-medium">Taxe assurance</p>
                            <p className="text-xl font-bold text-orange-900">
                              {calculationResult.autres?.taxeAssurance?.toLocaleString("fr-FR") || "0"} €
                            </p>
                          </div>
                          <div className="text-center p-4 bg-purple-50 rounded-lg">
                            <p className="text-sm text-purple-600 font-medium">Frais fractionnement</p>
                            <p className="text-xl font-bold text-purple-900">
                              {calculationResult.autres?.fraisFractionnementPrimeHT?.toLocaleString("fr-FR") || "0"} €
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Prime d'aggravation Bilan N-1 non fourni */}
                    {calculationResult.primeAggravationBilanN_1NonFourni && calculationResult.primeAggravationBilanN_1NonFourni > 0 && (
                      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 rounded-t-xl">
                          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                            <svg className="w-5 h-5 mr-2 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
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
                                  Une majoration a été appliquée car le bilan N-1 n'a pas été fourni.
                                  Cette prime supplémentaire s'ajoute au montant de base.
                                </p>
                              </div>
                              <div className="text-right">
                                <div className="text-3xl font-bold text-red-600">
                                  {calculationResult.primeAggravationBilanN_1NonFourni.toLocaleString("fr-FR")} €
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
                            <svg className="w-5 h-5 mr-2 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Reprise du passé
                          </h3>
                        </div>
                        <div className="p-6">
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div className="space-y-4">
                              <h4 className="font-semibold text-gray-900">Analyse sinistralité</h4>
                              <div className="space-y-3">
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Ratio S/P</span>
                                  <span className="font-medium">{calculationResult.reprisePasseResult.ratioSP?.toFixed(3) || "0"}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Fréquence sinistres</span>
                                  <span className="font-medium">{calculationResult.reprisePasseResult.frequenceSinistres?.toFixed(2) || "0"}</span>
                                </div>
                              </div>
                            </div>
                            <div className="space-y-4">
                              <h4 className="font-semibold text-gray-900">Classification</h4>
                              <div className="space-y-3">
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Ancienneté</span>
                                  <span className="font-medium">{calculationResult.reprisePasseResult.categorieAnciennete || "-"}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Fréquence</span>
                                  <span className="font-medium">{calculationResult.reprisePasseResult.categorieFrequence || "-"}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Ratio S/P</span>
                                  <span className="font-medium">{calculationResult.reprisePasseResult.categorieRatioSP || "-"}</span>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Résumé des calculs */}
                          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-blue-50 rounded-lg p-4">
                              <h4 className="font-semibold text-blue-900 mb-2">Taux de majoration</h4>
                              <div className="text-2xl font-bold text-blue-800">
                                {(calculationResult.reprisePasseResult.tauxMajoration * 100)?.toFixed(1) || "0"}%
                              </div>
                              <p className="text-sm text-blue-700 mt-1">
                                Coefficient appliqué selon l'analyse sinistralité
                              </p>
                            </div>
                            <div className="bg-green-50 rounded-lg p-4">
                              <h4 className="font-semibold text-green-900 mb-2">Prime après sinistralité</h4>
                              <div className="text-2xl font-bold text-green-800">
                                {calculationResult.reprisePasseResult.primeApresSinistralite?.toLocaleString("fr-FR") || "0"} €
                              </div>
                              <p className="text-sm text-green-700 mt-1">
                                Prime HT × Taux de majoration
                              </p>
                            </div>
                          </div>

                          {/* Tableau des années */}
                          {calculationResult.reprisePasseResult.tableauAnnees && calculationResult.reprisePasseResult.tableauAnnees.length > 0 && (
                            <div className="mt-6">
                              <h4 className="font-semibold text-gray-900 mb-4">Détail par année</h4>
                              <div className="overflow-x-auto">
                                <table className="w-full border-collapse border border-gray-300">
                                  <thead>
                                    <tr className="bg-amber-100">
                                      <th className="border border-gray-300 px-4 py-3 text-left text-sm font-medium text-gray-700">Année</th>
                                      <th className="border border-gray-300 px-4 py-3 text-right text-sm font-medium text-gray-700">Taux TI</th>
                                      <th className="border border-gray-300 px-4 py-3 text-right text-sm font-medium text-gray-700">% Année</th>
                                      <th className="border border-gray-300 px-4 py-3 text-right text-sm font-medium text-gray-700">Prime Reprise</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {calculationResult.reprisePasseResult.tableauAnnees.map((annee: any, index: number) => (
                                      <tr key={index} className="hover:bg-gray-50">
                                        <td className="border border-gray-300 px-4 py-3 text-sm font-medium text-gray-900">{annee.annee}</td>
                                        <td className="border border-gray-300 px-4 py-3 text-sm text-gray-600 text-right">
                                          {(annee.tauxTI * 100)?.toFixed(2) || "0"}%
                                        </td>
                                        <td className="border border-gray-300 px-4 py-3 text-sm text-gray-600 text-right">
                                          {annee.pourcentageAnnee?.toFixed(1) || "0"}%
                                        </td>
                                        <td className="border border-gray-300 px-4 py-3 text-sm font-medium text-gray-900 text-right">
                                          {annee.primeRepriseAnnee?.toLocaleString("fr-FR") || "0"} €
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )}

                          <div className="mt-6 p-4 bg-amber-50 rounded-lg">
                            <div className="flex justify-between items-center">
                              <div>
                                <p className="font-semibold text-amber-900">Prime reprise du passé TTC</p>
                                <p className="text-sm text-amber-700">
                                  Taux de majoration: {(calculationResult.reprisePasseResult.tauxMajoration * 100)?.toFixed(1) || "0"}%
                                </p>
                                <p className="text-sm text-amber-700">
                                  Calculée sur {calculationResult.reprisePasseResult.tableauAnnees?.length || 0} année(s)
                                </p>
                              </div>
                              <span className="text-2xl font-bold text-amber-900">
                                {calculationResult.reprisePasseResult.primeReprisePasseTTC?.toLocaleString("fr-FR") || "0"} €
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Échéancier */}
                    {calculationResult.echeancier && calculationResult.echeancier.echeances && calculationResult.echeancier.echeances.length > 0 && (
                      <div className="space-y-6">
                        {/* Échéancier détaillé */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 rounded-t-xl">
                            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                              <svg className="w-5 h-5 mr-2 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              Échéancier de paiement détaillé
                            </h3>
                      </div>
                          <div className="p-6">
                            <div className="overflow-x-auto">
                              <table className="w-full">
                                <thead>
                                  <tr className="bg-gray-50">
                                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Date échéance</th>
                                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Début période</th>
                                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Fin période</th>
                                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">RCD HT</th>
                                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">PJ HT</th>
                                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">Frais HT</th>
                                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">Frais Gestion HT</th>
                                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">Reprise HT</th>
                                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">Total HT</th>
                                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">Taxe</th>
                                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">Total TTC</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                  {calculationResult.echeancier.echeances.map((echeance: any, index: number) => (
                                    <tr key={index} className="hover:bg-gray-50">
                                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{echeance.date}</td>
                                      <td className="px-4 py-3 text-sm text-gray-600">{echeance.debutPeriode}</td>
                                      <td className="px-4 py-3 text-sm text-gray-600">{echeance.finPeriode}</td>
                                      <td className="px-4 py-3 text-sm text-gray-600 text-right">
                                        {echeance.rcd?.toLocaleString("fr-FR") || "0"} €
                                      </td>
                                      <td className="px-4 py-3 text-sm text-gray-600 text-right">
                                        {echeance.pj?.toLocaleString("fr-FR") || "0"} €
                                      </td>
                                      <td className="px-4 py-3 text-sm text-gray-600 text-right">
                                        {echeance.frais?.toLocaleString("fr-FR") || "0"} €
                                      </td>
                                      <td className="px-4 py-3 text-sm text-gray-600 text-right">
                                        {echeance.fraisGestion?.toLocaleString("fr-FR") || "0"} €
                                      </td>
                                      <td className="px-4 py-3 text-sm text-gray-600 text-right">
                                        {echeance.reprise?.toLocaleString("fr-FR") || "0"} €
                                      </td>
                                      <td className="px-4 py-3 text-sm font-medium text-gray-900 text-right">
                                        {echeance.totalHT?.toLocaleString("fr-FR") || "0"} €
                                      </td>
                                      <td className="px-4 py-3 text-sm text-orange-600 text-right">
                                        {echeance.taxe?.toLocaleString("fr-FR") || "0"} €
                                      </td>
                                      <td className="px-4 py-3 text-sm font-bold text-indigo-600 text-right">
                                        {echeance.totalTTC?.toLocaleString("fr-FR") || "0"} €
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                                {/* Ligne de totaux */}
                                <tfoot>
                                  <tr className="bg-gray-100 font-semibold">
                                    <td className="px-4 py-3 text-sm font-medium text-gray-900" colSpan={3}>
                                      TOTAUX
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-900 text-right">
                                      {calculationResult.echeancier.echeances.reduce((sum: number, echeance: any) => sum + (echeance.rcd || 0), 0).toLocaleString("fr-FR")} €
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-900 text-right">
                                      {calculationResult.echeancier.echeances.reduce((sum: number, echeance: any) => sum + (echeance.pj || 0), 0).toLocaleString("fr-FR")} €
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-900 text-right">
                                      {calculationResult.echeancier.echeances.reduce((sum: number, echeance: any) => sum + (echeance.frais || 0), 0).toLocaleString("fr-FR")} €
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-900 text-right">
                                      {calculationResult.echeancier.echeances.reduce((sum: number, echeance: any) => sum + (echeance.fraisGestion || 0), 0).toLocaleString("fr-FR")} €
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-900 text-right">
                                      {calculationResult.echeancier.echeances.reduce((sum: number, echeance: any) => sum + (echeance.reprise || 0), 0).toLocaleString("fr-FR")} €
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-900 text-right">
                                      {calculationResult.echeancier.echeances.reduce((sum: number, echeance: any) => sum + (echeance.totalHT || 0), 0).toLocaleString("fr-FR")} €
                                    </td>
                                    <td className="px-4 py-3 text-sm text-orange-600 text-right">
                                      {calculationResult.echeancier.echeances.reduce((sum: number, echeance: any) => sum + (echeance.taxe || 0), 0).toLocaleString("fr-FR")} €
                                    </td>
                                    <td className="px-4 py-3 text-sm font-bold text-indigo-600 text-right">
                                      {calculationResult.echeancier.echeances.reduce((sum: number, echeance: any) => sum + (echeance.totalTTC || 0), 0).toLocaleString("fr-FR")} €
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
                              <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                              </svg>
                              Échéancier par année
                            </h3>
                          </div>
                          <div className="p-6">
                            <div className="overflow-x-auto">
                              <table className="w-full">
                                <thead>
                                  <tr className="bg-gray-50">
                                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Année</th>
                                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">RCD</th>
                                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">PJ</th>
                                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">Frais</th>
                                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">Frais Gestion</th>
                                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">Reprise</th>

                                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">Total TTC</th>
                                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">Nb échéances</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                  {(() => {
                                    // Grouper les échéances par année
                                    const echeancesParAnnee = calculationResult.echeancier.echeances.reduce((acc: any, echeance: any) => {
                                      const annee = echeance.date.split('/')[2];
                                      if (!acc[annee]) {
                                        acc[annee] = {
                                          annee,
                                          rcd: 0,
                                          pj: 0,
                                          frais: 0,
                                          fraisGestion: 0,
                                            reprise: 0,
                                          totalTTC: 0,
                                          nbEcheances: 0
                                        };
                                      }
                                      acc[annee].rcd += echeance.rcd || 0;
                                      acc[annee].pj += echeance.pj || 0;
                                      acc[annee].frais += echeance.frais || 0;
                                      acc[annee].fraisGestion += echeance.fraisGestion || 0;
                                      acc[annee].reprise += echeance.reprise || 0;
                                      acc[annee].totalTTC += echeance.totalTTC || 0;
                                      acc[annee].nbEcheances += 1;
                                      return acc;
                                    }, {});

                                    return Object.values(echeancesParAnnee)
                                      .sort((a: any, b: any) => a.annee.localeCompare(b.annee))
                                      .map((annee: any, index: number) => (
                                        <tr key={index} className="hover:bg-gray-50">
                                          <td className="px-4 py-3 text-sm font-medium text-gray-900">{annee.annee}</td>
                                          <td className="px-4 py-3 text-sm text-gray-600 text-right">
                                            {annee.rcd.toLocaleString("fr-FR")} €
                                          </td>
                                          <td className="px-4 py-3 text-sm text-gray-600 text-right">
                                            {annee.pj.toLocaleString("fr-FR")} €
                                          </td>
                                          <td className="px-4 py-3 text-sm text-gray-600 text-right">
                                            {annee.frais.toLocaleString("fr-FR")} €
                                          </td>
                                          <td className="px-4 py-3 text-sm text-gray-600 text-right">
                                            {annee.fraisGestion.toLocaleString("fr-FR")} €
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
                              <svg className="w-5 h-5 mr-2 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h4a2 2 0 012 2v2H8V5z" />
                              </svg>
                              Répartition par postes et types
                            </h3>
                          </div>
                          <div className="p-6">
                            <div className="overflow-x-auto">
                              <table className="w-full">
                                <thead>
                                  <tr className="bg-gray-50">
                                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Type</th>
                                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">RCD</th>
                                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">PJ</th>
                                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">Frais</th>
                                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">Frais Gestion</th>
                                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">Reprise</th>
                                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">Total</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                  {(() => {
                                    // Calculer les totaux par type
                                    const totaux = calculationResult.echeancier.echeances.reduce((acc: any, echeance: any) => {
                                      acc.rcd += echeance.rcd || 0;
                                      acc.pj += echeance.pj || 0;
                                      acc.frais += echeance.frais || 0;
                                      acc.fraisGestion += echeance.fraisGestion || 0;
                                      acc.reprise += echeance.reprise || 0;
                                      acc.totalHT += echeance.totalHT || 0;
                                      acc.totalTTC += echeance.totalTTC || 0;
                                      acc.taxe += echeance.taxe || 0;
                                      return acc;
                                    }, {
                                      rcd: 0,
                                      pj: 0,
                                      frais: 0,
                                      fraisGestion: 0,
                                      reprise: 0,
                                      totalHT: 0,
                                      totalTTC: 0,
                                      taxe: 0
                                    });

                                    return [
                                      {
                                        type: "HT",
                                        rcd: totaux.rcd,
                                        pj: totaux.pj,
                                        frais: totaux.frais,
                                        fraisGestion: totaux.fraisGestion,
                                        reprise: totaux.reprise,
                                        total: totaux.totalHT,
                                        className: "text-gray-600"
                                      },
                                      {
                                        type: "Taxe",
                                        rcd: 0,
                                        pj: 0,
                                        frais: 0,
                                        fraisGestion: 0,
                                        reprise: 0,
                                        total: totaux.taxe,
                                        className: "text-orange-600"
                                      },
                                      {
                                        type: "TTC",
                                        rcd: totaux.rcd,
                                        pj: totaux.pj,
                                        frais: totaux.frais,
                                        fraisGestion: totaux.fraisGestion,
                                        reprise: totaux.reprise,
                                        total: totaux.totalTTC,
                                        className: "text-indigo-600 font-semibold"
                                      }
                                    ].map((row: any, index: number) => (
                                      <tr key={index} className="hover:bg-gray-50">
                                        <td className={`px-4 py-3 text-sm font-medium ${row.className}`}>
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
                                          <span className={`font-semibold ${row.className}`}>
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

                    {/* Détail par activité */}
                    {calculationResult.returnTab && calculationResult.returnTab.length > 0 && (
                      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 rounded-t-xl">
                          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                            <svg className="w-5 h-5 mr-2 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-4m-5 0H3m2 0h3M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                            </svg>
                          Détail par activité
                        </h3>
                      </div>
                      <div className="p-6">
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead>
                              <tr className="bg-gray-50">
                                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Activité</th>
                                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">Part CA (%)</th>
                                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">Taux de base</th>
                                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">Prime Mini Act.</th>
                                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">Dégressivité</th>
                                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">Prime au-delà</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {calculationResult.returnTab.map((activity: any, index: number) => (
                                  <tr key={index} className="hover:bg-gray-50">
                                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                                      {activity.nomActivite}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-600 text-right">
                                      {activity.partCA?.toFixed(1) || "0"}%
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-600 text-right">
                                      {(activity.tauxBase * 100)?.toFixed(3) || "0"}%
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-600 text-right">
                                      {activity.PrimeMiniAct?.toLocaleString("fr-FR") || "0"} €
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-600 text-right">
                                      {activity.Deg400k > 0
                                        ? `${(activity.Deg400k * 100)?.toFixed(1) || "0"}%`
                                        : "-"}
                                    </td>
                                    <td className="px-4 py-3 text-sm font-medium text-gray-900 text-right">
                                      {activity.Prime100Min?.toLocaleString("fr-FR") || "0"} €
                                    </td>
                                  </tr>
                                ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                    )}
                  </>
                  )}
              </div>
            )}
          </div>
        )}

        {activeTab === "letter" && (
          <div className="space-y-6">
            {/* Actions */}
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Lettre d'intention</h2>
                <p className="text-gray-600 mt-1">
                  Lettre d'intention pour {quote?.companyData?.companyName || "l'entreprise"}
                </p>
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={handleGeneratePDF}
                  disabled={generatingLetterPDF}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {generatingLetterPDF ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Génération...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Générer PDF
                    </>
                  )}
                </button>
                <button
                  onClick={handleSendEmail}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  Envoyer par email
                </button>
              </div>
            </div>

            {/* Lettre d'intention */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="p-8">
                <div className="max-w-4xl mx-auto">
                  {/* En-tête */}
                  <div className="text-center mb-8">
                    <div className="text-2xl font-bold text-gray-900 mb-2">
                      LETTRE D'INTENTION
                    </div>
                    <div className="text-lg text-gray-600">
                      Assurance Responsabilité Civile Décennale
                    </div>
                    <div className="text-sm text-gray-500 mt-2">
                      Devis n° {quote?.reference || "N/A"} - {new Date().toLocaleDateString("fr-FR")}
                    </div>
                  </div>

                  {/* Destinataire */}
                  <div className="mb-8">
                    <div className="text-sm text-gray-500 mb-2">À l'attention de :</div>
                    <div className="font-semibold text-gray-900">
                      {quote?.companyData?.companyName || "Nom de l'entreprise"}
                    </div>
                    <div className="text-gray-600">
                      {quote?.companyData?.address || "Adresse de l'entreprise"}
                    </div>
                    <div className="text-gray-600">
                      SIRET : {quote?.companyData?.siret || "N/A"}
                    </div>
                  </div>

                  {/* Corps de la lettre */}
                  <div className="space-y-6 text-gray-700 leading-relaxed">
                    <p>
                      <strong>Objet :</strong> Proposition d'assurance Responsabilité Civile Décennale
                    </p>

                    <p>
                      Madame, Monsieur,
                    </p>

                    <p>
                      Suite à votre demande d'assurance Responsabilité Civile Décennale, nous avons le plaisir de vous présenter notre proposition d'assurance adaptée à votre activité.
                    </p>

                    {/* Informations du calcul */}
                    {calculationResult && !calculationResult.refus ? (
                      <div className="bg-gray-50 rounded-lg p-6 my-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Résumé de notre proposition :</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <div className="text-sm text-gray-600">Chiffre d'affaires déclaré</div>
                            <div className="font-semibold text-gray-900">
                              {calculationResult.caCalculee?.toLocaleString("fr-FR") || "0"} €
                            </div>
                          </div>
                          <div>
                            <div className="text-sm text-gray-600">Prime HT</div>
                            <div className="font-semibold text-gray-900">
                              {calculationResult.primeTotal?.toLocaleString("fr-FR") || "0"} €
                            </div>
                          </div>
                          <div>
                            <div className="text-sm text-gray-600">Protection Juridique</div>
                            <div className="font-semibold text-gray-900">
                              {calculationResult.protectionJuridique?.toLocaleString("fr-FR") || "0"} €
                            </div>
                          </div>
                          <div>
                            <div className="text-sm text-gray-600">Total TTC</div>
                            <div className="font-semibold text-indigo-600 text-lg">
                              {calculationResult.totalTTC?.toLocaleString("fr-FR") || "0"} €
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : calculationResult?.refus ? (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-6 my-6">
                        <h3 className="text-lg font-semibold text-red-900 mb-2">Demande non acceptée</h3>
                        <p className="text-red-700">
                          Malheureusement, nous ne pouvons pas accepter votre demande d'assurance pour la raison suivante : {calculationResult.refusReason || "Critères non respectés"}.
                        </p>
                      </div>
                    ) : (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 my-6">
                        <h3 className="text-lg font-semibold text-yellow-900 mb-2">Calcul en cours</h3>
                        <p className="text-yellow-700">
                          Le calcul de votre prime est en cours de finalisation. Nous vous contacterons prochainement avec notre proposition.
                        </p>
                      </div>
                    )}

                    <p>
                      Notre proposition d'assurance comprend :
                    </p>

                    <ul className="list-disc list-inside space-y-2 ml-4">
                      <li>Couverture Responsabilité Civile Décennale selon les conditions générales en vigueur</li>
                      <li>Protection Juridique incluse</li>
                      <li>Garantie des travaux de construction, rénovation et réparation</li>
                      <li>Couverture des dommages corporels, matériels et immatériels</li>
                      <li>Assistance juridique et technique</li>
                    </ul>

                    {/* Échéancier si disponible */}
                    {calculationResult?.echeancier?.echeances && calculationResult.echeancier.echeances.length > 0 && (
                      <div className="bg-blue-50 rounded-lg p-6 my-6">
                        <h3 className="text-lg font-semibold text-blue-900 mb-4">Modalités de paiement :</h3>
                        <div className="text-sm text-blue-800">
                          <p className="mb-2">Votre prime sera payable selon l'échéancier suivant :</p>
                          <ul className="list-disc list-inside space-y-1">
                            {calculationResult.echeancier.echeances.slice(0, 3).map((echeance: any, index: number) => (
                              <li key={index}>
                                {echeance.date} : {echeance.totalTTC?.toLocaleString("fr-FR") || "0"} €
                              </li>
                            ))}
                            {calculationResult.echeancier.echeances.length > 3 && (
                              <li>... et {calculationResult.echeancier.echeances.length - 3} autres échéances</li>
                            )}
                          </ul>
                        </div>
                      </div>
                    )}

                    <p>
                      Cette proposition est valable 30 jours à compter de la date d'émission. Pour accepter cette offre, veuillez nous retourner le présent document signé accompagné des pièces justificatives demandées.
                    </p>

                    <p>
                      Nous restons à votre disposition pour tout complément d'information.
                    </p>

                    <div className="mt-8">
                      <p>Cordialement,</p>
                      <div className="mt-4">
                        <div className="font-semibold text-gray-900">L'équipe commerciale</div>
                        <div className="text-gray-600">Encyclie Logiciel</div>
                      </div>
                    </div>
                  </div>

                  {/* Pied de page */}
                  <div className="mt-12 pt-6 border-t border-gray-200 text-xs text-gray-500">
                    <p>
                      Cette lettre d'intention est établie sous réserve de l'acceptation définitive de votre dossier par notre compagnie d'assurance partenaire.
                      Les conditions définitives seront précisées dans le contrat d'assurance.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "premium-call" && (
          <div className="space-y-6">
            {/* Actions */}
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Appel de prime</h2>
                <p className="text-gray-600 mt-1">
                  Appel de prime pour {quote?.companyData?.companyName || "l'entreprise"}
                </p>
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={handleGeneratePremiumCallPDF}
                  disabled={generatingPremiumCallPDF}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {generatingPremiumCallPDF ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Génération...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Générer PDF
                    </>
                  )}
                </button>
                <button
                  onClick={handleSendPremiumCallEmail}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  Envoyer par email
                </button>
              </div>
            </div>

            {/* Appel de prime */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="p-8">
                <div className="max-w-6xl mx-auto">
                  {/* En-tête */}
                  <div className="mb-8">
                    <div className="text-sm text-gray-500 mb-2">Monsieur,</div>
                    <div className="text-gray-700 leading-relaxed">
                      vous trouverez ci-joint votre appel de prime ainsi que votre échéancier de règlement au titre de votre contrat <strong>RESPONSABILITÉ CIVILE ET DÉCENNALE</strong>.
                    </div>
                  </div>

                  {/* Période */}
                  {calculationResult?.echeancier?.echeances && calculationResult.echeancier.echeances.length > 0 && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-8">
                      <div className="text-center">
                        <div className="text-lg font-semibold text-green-900 mb-2">PÉRIODE DU</div>
                        <div className="flex items-center justify-center space-x-4">
                          <div className="text-2xl font-bold text-green-800">
                            {calculationResult.echeancier.echeances[0]?.debutPeriode || "N/A"}
                          </div>
                          <div className="text-green-600 font-medium">AU</div>
                          <div className="text-2xl font-bold text-green-800">
                            {calculationResult.echeancier.echeances[calculationResult.echeancier.echeances.length - 1]?.finPeriode || "N/A"}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Résumé de la période */}
                  {calculationResult && (
                    <div className="bg-gray-50 rounded-lg p-6 mb-8">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4 text-center">Période</h3>
                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div>
                          <div className="text-sm text-gray-600">Montant HT</div>
                          <div className="text-xl font-bold text-gray-900">
                            {calculationResult.primeTotal?.toLocaleString("fr-FR") || "0"} €
                          </div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-600">Taxe €</div>
                          <div className="text-xl font-bold text-gray-900">
                            {calculationResult.autres?.taxeAssurance?.toLocaleString("fr-FR") || "0"} €
                          </div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-600">MONTANT TTC</div>
                          <div className="text-2xl font-bold text-indigo-600">
                            {calculationResult.totalTTC?.toLocaleString("fr-FR") || "0"} €
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Échéancier */}
                  {calculationResult?.echeancier?.echeances && calculationResult.echeancier.echeances.length > 0 && (
                    <div className="mb-8">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Échéancier</h3>
                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse border border-gray-300">
                          <thead>
                            <tr className="bg-green-100">
                              <th className="border border-gray-300 px-4 py-3 text-left text-sm font-medium text-gray-700">Période Date</th>
                              <th className="border border-gray-300 px-4 py-3 text-right text-sm font-medium text-gray-700">Montant HT Total HT €</th>
                              <th className="border border-gray-300 px-4 py-3 text-right text-sm font-medium text-gray-700">Taxe €</th>
                              <th className="border border-gray-300 px-4 py-3 text-right text-sm font-medium text-gray-700">MONTANT TTC Total TTC</th>
                              <th className="border border-gray-300 px-4 py-3 text-center text-sm font-medium text-gray-700">Date de règlement</th>
                            </tr>
                          </thead>
                          <tbody>
                            {calculationResult.echeancier.echeances.map((echeance: any, index: number) => (
                              <tr key={index} className="hover:bg-gray-50">
                                <td className="border border-gray-300 px-4 py-3 text-sm font-medium text-gray-900">
                                  {echeance.date}
                                </td>
                                <td className="border border-gray-300 px-4 py-3 text-sm text-gray-600 text-right">
                                  {echeance.totalHT?.toLocaleString("fr-FR") || "0"} €
                                </td>
                                <td className="border border-gray-300 px-4 py-3 text-sm text-gray-600 text-right">
                                  {echeance.taxe?.toLocaleString("fr-FR") || "0"} €
                                </td>
                                <td className="border border-gray-300 px-4 py-3 text-sm font-medium text-gray-900 text-right">
                                  {echeance.totalTTC?.toLocaleString("fr-FR") || "0"} €
                                </td>
                                <td className="border border-gray-300 px-4 py-3 text-sm text-gray-600 text-center">
                                  {echeance.date}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Détail de la prime et Validité des attestations */}
                  {calculationResult?.echeancier?.echeances && calculationResult.echeancier.echeances.length > 0 && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                      {/* Détail de la prime */}
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Détail de la prime</h3>
                        <div className="overflow-x-auto">
                          <table className="w-full border-collapse border border-gray-300">
                            <thead>
                              <tr className="bg-orange-100">
                                <th className="border border-gray-300 px-4 py-3 text-center text-sm font-medium text-gray-700">RCD</th>
                                <th className="border border-gray-300 px-4 py-3 text-center text-sm font-medium text-gray-700">PJ</th>
                                <th className="border border-gray-300 px-4 py-3 text-center text-sm font-medium text-gray-700">Frais</th>
                                <th className="border border-gray-300 px-4 py-3 text-center text-sm font-medium text-gray-700">Reprise</th>
                              </tr>
                            </thead>
                            <tbody>
                              {calculationResult.echeancier.echeances.map((echeance: any, index: number) => (
                                <tr key={index} className="hover:bg-gray-50">
                                  <td className="border border-gray-300 px-4 py-3 text-sm text-gray-600 text-center">
                                    {echeance.rcd?.toLocaleString("fr-FR") || "0"} €
                                  </td>
                                  <td className="border border-gray-300 px-4 py-3 text-sm text-gray-600 text-center">
                                    {echeance.pj?.toLocaleString("fr-FR") || "0"} €
                                  </td>
                                  <td className="border border-gray-300 px-4 py-3 text-sm text-gray-600 text-center">
                                    {echeance.frais?.toLocaleString("fr-FR") || "0"} €
                                  </td>
                                  <td className="border border-gray-300 px-4 py-3 text-sm text-gray-600 text-center">
                                    {echeance.reprise?.toLocaleString("fr-FR") || "0"} €
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Validité de vos attestations */}
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Validité de vos attestations</h3>
                        <div className="overflow-x-auto">
                          <table className="w-full border-collapse border border-gray-300">
                            <thead>
                              <tr className="bg-orange-100">
                                <th className="border border-gray-300 px-4 py-3 text-center text-sm font-medium text-gray-700">début période</th>
                                <th className="border border-gray-300 px-4 py-3 text-center text-sm font-medium text-gray-700">fin période</th>
                              </tr>
                            </thead>
                            <tbody>
                              {calculationResult.echeancier.echeances.map((echeance: any, index: number) => (
                                <tr key={index} className="hover:bg-gray-50">
                                  <td className="border border-gray-300 px-4 py-3 text-sm text-gray-600 text-center">
                                    {echeance.debutPeriode}
                                  </td>
                                  <td className="border border-gray-300 px-4 py-3 text-sm text-gray-600 text-center">
                                    {echeance.finPeriode}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Pied de page */}
                  <div className="mt-12 pt-6 border-t border-gray-200">
                    <div className="text-gray-700 leading-relaxed mb-6">
                      <p>
                        Soucieux de votre satisfaction, nous restons à votre disposition et vous prions d'agréer, Madame, Monsieur, nos sincères salutations.
                      </p>
                    </div>
                    <div className="text-sm text-gray-600">
                      <p><strong>Service Cotisations:</strong> cotisation.encycliebat@encyclie-construction.fr</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "edit" && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                Modifier le devis #{quote?.reference}
              </h2>
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
                {/* Company Information - Identique à QuoteForm.tsx */}
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
                        htmlFor="directorName"
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

                {/* Dynamic Product Fields - Identique à QuoteForm.tsx */}
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
                                .map((doc: QuoteDocument) => (
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
                                ))}
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
                    onClick={() => setActiveTab("form-data")}
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
        )}
      </div>
    </div>
  );
}
