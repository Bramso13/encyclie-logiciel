"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { calculPrimeRCD, getTaxeByRegion } from "@/lib/tarificateurs/rcd";
import { authClient } from "@/lib/auth-client";

import useProductsStore, {
  InsuranceProduct,
} from "@/lib/stores/products-store";

import ResumeTab from "../tabs/ResumeTab";
import FormDataTab from "../tabs/FormDataTab";
import { CalculationResult, Quote } from "@/lib/types";
import CalculationTab from "../tabs/CalculationTab";
import LetterTab from "../tabs/LetterTab";

import ModificationForm from "../components/forms/ModificationForm";
import { Calendar, MessageCircle } from "lucide-react";
import ChatTab from "../tabs/ChatTab";

import PaymentTrackingTab from "../tabs/PremiumCallTab";
import PieceJointeTab from "../tabs/PieceJointeTab";
import BrokerCommissionsTab from "../tabs/BrokerCommissionsTab";
import OffreTab from "../tabs/OffreTab";
import { calculateWithMapping } from "@/lib/utils";

export default function QuoteDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [activeTab, setActiveTab] = useState("resume");
  const [calculationResult, setCalculationResult] =
    useState<CalculationResult | null>(null);
  const [calculationError, setCalculationError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [recalculating, setRecalculating] = useState(false);

  const [selectedProduct, setSelectedProduct] =
    useState<InsuranceProduct | null>(null);
  const [originalCalculationResult, setOriginalCalculationResult] =
    useState<CalculationResult | null>(null);
  const [editingSections, setEditingSections] = useState<{
    majorations: boolean;
    fraisEtTaxes: boolean;
  }>({
    majorations: false,
    fraisEtTaxes: false,
  });
  const [showModificationPopup, setShowModificationPopup] = useState(false);
  const [currentEditingSection, setCurrentEditingSection] = useState<
    "majorations" | "fraisEtTaxes" | null
  >(null);

  // États pour l'édition

  const { activeProducts, fetchActiveProducts } = useProductsStore();

  // États pour le mapping dynamique
  const [parameterMapping, setParameterMapping] = useState<
    Record<string, string>
  >({});
  const [formFields, setFormFields] = useState<Record<string, any>>({});

  // États pour les notifications
  const [notification, setNotification] = useState<{
    type: "success" | "error" | "info";
    title: string;
    message: string;
    show: boolean;
  }>({
    type: "info",
    title: "",
    message: "",
    show: false,
  });

  // États pour les switches de calcul
  const [reprisePasseEnabled, setReprisePasseEnabled] = useState(false);
  const [nonFournitureBilanEnabled, setNonFournitureBilanEnabled] =
    useState(false);

  // Détection des rôles utilisateur
  const userRole = session?.user?.role;
  const isAdmin = userRole === "ADMIN";

  const tabs = [
    {
      id: "resume",
      label: "Résumé",
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
            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
          />
        </svg>
      ),
    },
    {
      id: "form-data",
      label: "Formulaire",
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
      id: "echeancier",
      label: "Echeancier",
      icon: <Calendar className="w-5 h-5" />,
    },
    {
      id: "piece-jointe",
      label: "Pièce jointe",
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
    {
      id: "chat",
      label: "Chat",
      icon: <MessageCircle />,
    },
    {
      id: "broker-commissions",
      label: "Commissions",
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
            d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
    },
    {
      id: "offre",
      label: "Offre",
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
      console.error("Erreur lors du chargement du mapping:", error);
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

              const result = calculateWithMapping(
                data,
                parameterMapping,
                formFields
              );
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

  // Charger ou calculer la prime
  useEffect(() => {
    const loadOrCalculatePremium = async () => {
      if (!quote || !Object.keys(parameterMapping).length || !quote.formData) {
        return;
      }

      try {
        // D'abord essayer de récupérer calculatedPremium de la DB
        const response = await fetch(
          `/api/quotes/${params.id}/calculated-premium`
        );
        if (response.ok) {
          const data = await response.json();
          console.log("data///", data);
          if (data.data.calculatedPremium) {
            console.log("Utilisation calculatedPremium depuis DB");
            setCalculationResult(data.data.calculatedPremium);
            setCalculationError(null);
            return;
          }
        }

        // Si pas de calculatedPremium en DB, faire le calcul
        console.log("Calcul");
        const result = calculateWithMapping(
          quote,
          parameterMapping,
          formFields
        );
        setCalculationResult(result);
        setCalculationError(null);
      } catch (error) {
        console.error("Erreur chargement/calcul:", error);
        setCalculationError(
          error instanceof Error ? error.message : "Erreur de calcul"
        );
      }
    };

    loadOrCalculatePremium();
  }, [parameterMapping, quote, params.id]);

  // Fonction pour recalculer côté client (sans sauvegarder)
  const handleRecalculate = () => {
    if (!quote) return;

    setRecalculating(true);
    setCalculationError(null);

    try {
      console.log("Recalcul côté client");
      const result = calculateWithMapping(quote, parameterMapping, formFields);
      setCalculationResult(result);
    } catch (error) {
      console.error("Erreur recalcul:", error);
      setCalculationError(
        error instanceof Error ? error.message : "Erreur de recalcul"
      );
    } finally {
      setRecalculating(false);
    }
  };

  // Fonctions pour gérer les switches
  const handleReprisePasseChange = (enabled: boolean) => {
    setReprisePasseEnabled(enabled);
    // Recalcul automatique
    setTimeout(() => {
      if (quote) {
        const modifiedQuote = {
          ...quote,
          formData: {
            ...quote.formData,
            reprisePasse: enabled,
            nonFournitureBilanN_1: nonFournitureBilanEnabled,
          },
        };
        try {
          const result = calculateWithMapping(
            modifiedQuote,
            parameterMapping,
            formFields
          );
          setCalculationResult(result);
        } catch (error) {
          console.error("Erreur recalcul automatique:", error);
        }
      }
    }, 100);
  };

  const handleNonFournitureBilanChange = (enabled: boolean) => {
    setNonFournitureBilanEnabled(enabled);
    // Recalcul automatique
    setTimeout(() => {
      if (quote) {
        const modifiedQuote = {
          ...quote,
          formData: {
            ...quote.formData,
            reprisePasse: reprisePasseEnabled,
            nonFournitureBilanN_1: enabled,
          },
        };
        console.log("modifiedQuote", modifiedQuote);
        try {
          const result = calculateWithMapping(
            modifiedQuote,
            parameterMapping,
            formFields
          );
          setCalculationResult(result);
        } catch (error) {
          console.error("Erreur recalcul automatique:", error);
        }
      }
    }, 100);
  };

  // Fonction pour sauvegarder le calcul actuel en DB
  const saveCalculationToDatabase = async () => {
    if (!calculationResult) {
      alert("Aucun calcul à sauvegarder");
      return;
    }

    setRecalculating(true);
    try {
      await fetch(`/api/quotes/${params.id}/calculated-premium`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ calculatedPremium: calculationResult }),
      });
      alert("Calcul sauvegardé en base de données");
    } catch (error) {
      console.error("Erreur sauvegarde:", error);
      alert("Erreur lors de la sauvegarde");
    } finally {
      setRecalculating(false);
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
      {/* CSS pour les switches */}
      <style jsx>{`
        .toggle-checkbox:checked {
          right: 0;
          border-color: #48bb78;
        }
        .toggle-checkbox {
          transition: all 0.3s ease;
          top: 0;
          left: 0;
        }
        .toggle-label {
          transition: all 0.3s ease;
        }
      `}</style>

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
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8" aria-label="Tabs">
            {tabs.map((tab) => {
              return (
                (!(tab.id === "offre") || session?.user?.role === "ADMIN") && (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                      activeTab === tab.id
                        ? "border-indigo-500 text-indigo-600"
                        : "border-transparent text-black hover:text-gray-700 hover:border-gray-300"
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
                )
              );
            })}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === "resume" && quote && (
          <ResumeTab quote={quote} isAdmin={isAdmin} />
        )}

        {activeTab === "form-data" && <FormDataTab quote={quote} />}

        {activeTab === "calculation" && (
          <CalculationTab
            quote={quote}
            calculationResult={calculationResult}
            calculationError={calculationError}
            originalCalculationResult={originalCalculationResult}
            setEditingSections={setEditingSections}
            setCalculationResult={setCalculationResult}
            setOriginalCalculationResult={setOriginalCalculationResult}
            reprisePasseEnabled={reprisePasseEnabled}
            handleReprisePasseChange={handleReprisePasseChange}
            nonFournitureBilanEnabled={nonFournitureBilanEnabled}
            handleNonFournitureBilanChange={handleNonFournitureBilanChange}
            saveCalculationToDatabase={saveCalculationToDatabase}
            recalculating={recalculating}
            handleRecalculate={handleRecalculate}
            session={session}
            setCurrentEditingSection={setCurrentEditingSection}
            setShowModificationPopup={setShowModificationPopup}
          />
        )}

        {activeTab === "letter" && (
          <LetterTab
            quote={quote}
            calculationResult={calculationResult}
            session={session}
          />
        )}

        {activeTab === "echeancier" && (
          <PaymentTrackingTab
            quote={quote}
            calculationResult={calculationResult}
          />
        )}

        {activeTab === "chat" && <ChatTab quote={quote} />}
        {activeTab === "piece-jointe" && <PieceJointeTab quote={quote} />}
        {activeTab === "broker-commissions" && calculationResult && (
          <BrokerCommissionsTab calculationResult={calculationResult} />
        )}
        {activeTab === "offre" && (
          <OffreTab quote={quote} calculationResult={calculationResult} />
        )}
      </div>

      {/* Notification Toast */}
      {notification.show && (
        <div className="fixed top-4 right-4 z-50 max-w-sm w-full">
          <div
            className={`rounded-lg shadow-lg border p-4 ${
              notification.type === "success"
                ? "bg-green-50 border-green-200"
                : notification.type === "error"
                ? "bg-red-50 border-red-200"
                : "bg-blue-50 border-blue-200"
            } animate-in slide-in-from-right duration-300`}
          >
            <div className="flex items-start">
              <div className="flex-shrink-0">
                {notification.type === "success" && (
                  <svg
                    className="h-5 w-5 text-green-400"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
                {notification.type === "error" && (
                  <svg
                    className="h-5 w-5 text-red-400"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
                {notification.type === "info" && (
                  <svg
                    className="h-5 w-5 text-blue-400"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </div>
              <div className="ml-3 w-0 flex-1">
                <h3
                  className={`text-sm font-medium ${
                    notification.type === "success"
                      ? "text-green-800"
                      : notification.type === "error"
                      ? "text-red-800"
                      : "text-blue-800"
                  }`}
                >
                  {notification.title}
                </h3>
                <p
                  className={`mt-1 text-sm ${
                    notification.type === "success"
                      ? "text-green-700"
                      : notification.type === "error"
                      ? "text-red-700"
                      : "text-blue-700"
                  }`}
                >
                  {notification.message}
                </p>
              </div>
              <div className="ml-4 flex-shrink-0 flex">
                <button
                  onClick={() =>
                    setNotification((prev) => ({ ...prev, show: false }))
                  }
                  className={`rounded-md inline-flex ${
                    notification.type === "success"
                      ? "text-green-400 hover:text-green-500"
                      : notification.type === "error"
                      ? "text-red-400 hover:text-red-500"
                      : "text-blue-400 hover:text-blue-500"
                  } focus:outline-none`}
                >
                  <svg
                    className="h-4 w-4"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Popup de modification des calculs */}
      {showModificationPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                  Modifier les calculs -{" "}
                  {currentEditingSection === "majorations"
                    ? "Majorations"
                    : "Frais et taxes"}
                </h3>
                <button
                  onClick={() => {
                    setShowModificationPopup(false);
                    setCurrentEditingSection(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
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
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              {calculationResult && (
                <ModificationForm
                  quote={quote}
                  calculationResult={calculationResult}
                  onUpdate={setCalculationResult}
                  originalCalculationResult={originalCalculationResult}
                  section={currentEditingSection}
                />
              )}
            </div>

            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-between">
              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    if (originalCalculationResult) {
                      setCalculationResult(originalCalculationResult);
                      setOriginalCalculationResult(null);
                    }
                    setShowModificationPopup(false);
                    setCurrentEditingSection(null);
                    setEditingSections({
                      majorations: false,
                      fraisEtTaxes: false,
                    });
                  }}
                  className="px-4 py-2 text-sm bg-red-100 text-red-700 hover:bg-red-200 rounded-md transition-colors"
                >
                  Restaurer l'original
                </button>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setShowModificationPopup(false);
                    setCurrentEditingSection(null);
                  }}
                  className="px-4 py-2 text-sm bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-md transition-colors"
                >
                  Fermer
                </button>
                <button
                  onClick={() => {
                    // Ici vous pourrez ajouter la logique de sauvegarde
                    alert("Modifications appliquées!");
                    setShowModificationPopup(false);
                    setCurrentEditingSection(null);
                  }}
                  className="px-4 py-2 text-sm bg-blue-600 text-white hover:bg-blue-700 rounded-md transition-colors"
                >
                  Appliquer les modifications
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
