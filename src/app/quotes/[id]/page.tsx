"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

import useProductsStore, {
  InsuranceProduct,
} from "@/lib/stores/products-store";

import ResumeTab from "../tabs/ResumeTab";
import FormDataTab from "../tabs/FormDataTab";
import { CalculationResult, Quote } from "@/lib/types";
import CalculationTab from "../tabs/CalculationTab";
import LetterTab from "../tabs/LetterTab";

import SimpleParameterEditor from "../components/forms/SimpleParameterEditor";
import ChatTab from "../tabs/ChatTab";

import PaymentTrackingTab from "../tabs/PremiumCallTab";
import PieceJointeTab from "../tabs/PieceJointeTab";
import BrokerCommissionsTab from "../tabs/BrokerCommissionsTab";
import OffreTab from "../tabs/OffreTab";
import AppelDePrimeTab from "../tabs/AppelDePrimeTab";
import ContratTab from "../tabs/ContratTab";
import AggravationTab from "../tabs/AggravationTab";
import DebitNoteTab from "../tabs/DebitNoteTab";
import BordereauTab from "../tabs/BordereauTab";
import {
  DossierExerciseBar,
  dossierOriginalYear,
} from "../components/DossierExerciseBar";
import { calendarYear } from "@/lib/quotes/exercise-year-filter";
import { calculateWithMapping } from "@/lib/utils";
import { applyCalculationChange } from "@/lib/calculation-apply";
import { AuthenticatedAppShell } from "@/components/ui/AuthenticatedAppShell";
import { Button, StatusBadge } from "@/components/ui/Controls";
import { GroupedNav } from "@/components/ui/DataDisplay";
import { LoadingState } from "@/components/ui/Feedback";
import { notify } from "@/lib/ui/notify";

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

  // État simplifié pour l'éditeur de paramètres
  const [showParameterEditor, setShowParameterEditor] = useState(false);

  // Déclencheur pour forcer le rechargement des échéances après sauvegarde
  const [installmentsRefreshTrigger, setInstallmentsRefreshTrigger] =
    useState(0);
  const [dossierYear, setDossierYear] = useState<number | null>(null);

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

  const tabGroups = [
    {
      title: "Dossier",
      items: [
        { id: "resume", label: "Résumé" },
        { id: "form-data", label: "Formulaire" },
        { id: "chat", label: "Messages" },
      ],
    },
    {
      title: "Étude et offre",
      items: [
        { id: "calculation", label: "Calcul de prime" },
        { id: "letter", label: "Lettre d'intention" },
        { id: "piece-jointe", label: "Étude de dossier" },
        { id: "offre", label: "Offre", adminOnly: true },
      ],
    },
    {
      title: "Contrat",
      items: [
        { id: "echeancier", label: "Échéancier" },
        { id: "appel-prime", label: "Appel de prime" },
        { id: "contrat", label: "Contrat" },
        { id: "aggravation", label: "Aggravation" },
      ],
    },
    {
      title: "Production",
      items: [
        { id: "bordereau", label: "Bordereau", adminOnly: true },
        { id: "debit-note", label: "Note de débit" },
        { id: "broker-commissions", label: "Commissions" },
      ],
    },
  ]
    .map((group) => ({
      ...group,
      items: group.items.filter(
        (tab) => !("adminOnly" in tab && tab.adminOnly) || isAdmin,
      ),
    }))
    .filter((group) => group.items.length > 0);

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
              setNonFournitureBilanEnabled(
                result.majorations?.nonFournitureBilanN_1 === 0.5
              );
              setReprisePasseEnabled(!!result.reprisePasseResult);
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

  // Charger ou calculer la prime (ne pas écraser les modifs locales : switches ou SimpleParameterEditor)
  const hasLocalCalculationChanges = !!originalCalculationResult;

  useEffect(() => {
    const loadOrCalculatePremium = async () => {
      if (!quote || !Object.keys(parameterMapping).length || !quote.formData) {
        return;
      }
      if (hasLocalCalculationChanges) return;

      try {
        const response = await fetch(
          `/api/quotes/${params.id}/calculated-premium`
        );
        if (response.ok) {
          const data = await response.json();
          if (data.data?.calculatedPremium) {
            const premium = data.data.calculatedPremium;
            setCalculationResult(premium);
            setCalculationError(null);
            setNonFournitureBilanEnabled(
              premium.majorations?.nonFournitureBilanN_1 === 0.5
            );
            setReprisePasseEnabled(!!premium.reprisePasseResult);
            return;
          }
        }

        const result = calculateWithMapping(
          quote,
          parameterMapping,
          formFields
        );
        setCalculationResult(result);
        setCalculationError(null);
        setNonFournitureBilanEnabled(
          result.majorations?.nonFournitureBilanN_1 === 0.5
        );
        setReprisePasseEnabled(!!result.reprisePasseResult);
      } catch (error) {
        console.error("Erreur chargement/calcul:", error);
        setCalculationError(
          error instanceof Error ? error.message : "Erreur de calcul"
        );
      }
    };

    loadOrCalculatePremium();
  }, [
    parameterMapping,
    quote,
    params.id,
    hasLocalCalculationChanges,
  ]);

  useEffect(() => {
    if (activeTab === "revision-2027") setActiveTab("resume");
  }, [activeTab]);

  // Fonction pour recalculer côté client (prend en compte les switches)
  const handleRecalculate = () => {
    if (!quote) return;
    const originalYear = dossierOriginalYear(quote);
    const viewingYear = dossierYear ?? originalYear;
    if (viewingYear !== originalYear) {
      notify(
        "Le recalcul s'applique à l'exercice d'origine du dossier.",
        "error",
      );
      return;
    }

    setRecalculating(true);
    setCalculationError(null);

    try {
      const modifiedQuote = {
        ...quote,
        formData: {
          ...quote.formData,
          nonFournitureBilanN_1: nonFournitureBilanEnabled,
          reprisePasse: reprisePasseEnabled,
        },
      };
      const result = calculateWithMapping(
        modifiedQuote,
        parameterMapping,
        formFields
      );
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

  // Logique remontée : utilisé par SimpleParameterEditor et le toggle Non fourniture
  const handleApplyChange = (
    sectionKey: string,
    fieldKey: string,
    value: number,
    baseResult?: CalculationResult
  ): CalculationResult | void => {
    if (fieldKey === "nonFournitureBilanN_1") {
      setNonFournitureBilanEnabled(value === 0.5);
    }

    const base = baseResult ?? calculationResult;
    if (!base || !quote) return;
    setOriginalCalculationResult(calculationResult ?? null);
    const newResult = applyCalculationChange(
      base,
      quote,
      sectionKey,
      fieldKey,
      value
    );
    setCalculationResult(newResult);
    return newResult;
  };

  const handleReprisePasseChange = (enabled: boolean) => {
    setReprisePasseEnabled(enabled);
    if (!quote || !Object.keys(parameterMapping).length) return;
    setOriginalCalculationResult(calculationResult ?? null);
    const modifiedQuote = {
      ...quote,
      formData: {
        ...quote.formData,
        nonFournitureBilanN_1: nonFournitureBilanEnabled,
        reprisePasse: enabled,
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
      console.error("Erreur recalcul reprise passe:", error);
    }
  };

  const handleNonFournitureBilanChange = (enabled: boolean) => {
    handleApplyChange(
      "majorations",
      "nonFournitureBilanN_1",
      enabled ? 0.5 : 0
    );
  };

  // Fonction pour sauvegarder le calcul actuel en DB (y compris l'échéancier dans paymentInstallments)
  const saveCalculationToDatabase = async () => {
    if (!calculationResult) {
      notify("Aucun calcul à enregistrer.", "error");
      return;
    }
    if (quote) {
      const originalYear = dossierOriginalYear(quote);
      const viewingYear = dossierYear ?? originalYear;
      if (viewingYear !== originalYear) {
        notify(
          "L'enregistrement du calcul reste sur l'exercice d'origine du dossier.",
          "error",
        );
        return;
      }
    }

    setRecalculating(true);
    try {
      // 1. Sauvegarder le calcul (calculatedPremium)
      await fetch(`/api/quotes/${params.id}/calculated-premium`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ calculatedPremium: calculationResult }),
      });

      // 2. Mettre à jour l'échéancier dans paymentInstallments si présent
      const echeances =
        calculationResult?.echeancier?.echeances;
      if (echeances && Array.isArray(echeances) && echeances.length > 0) {
        const scheduleRes = await fetch(
          `/api/quotes/${params.id}/payment-schedule`
        );
        const scheduleData = scheduleRes.ok
          ? await scheduleRes.json()
          : null;
        const existingSchedule = scheduleData?.data;

        if (existingSchedule?.payments?.length > 0) {
          // PATCH : mettre à jour les échéances existantes
          const payments = echeances.map((echeance: any, index: number) => {
            const existingPayment = existingSchedule.payments.find(
              (p: any) => p.installmentNumber === index + 1
            );
            return {
              id: existingPayment?.id,
              installmentNumber: index + 1,
              dueDate: echeance.date,
              amountHT: echeance.totalHT ?? 0,
              taxAmount: echeance.taxe ?? 0,
              amountTTC: echeance.totalTTC ?? 0,
              rcdAmount: echeance.rcd ?? 0,
              pjAmount: echeance.pj ?? 0,
              feesAmount: echeance.frais ?? 0,
              resumeAmount: echeance.reprise ?? 0,
              periodStart: echeance.debutPeriode,
              periodEnd: echeance.finPeriode,
            };
          });

          await fetch(`/api/quotes/${params.id}/payment-schedule`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ payments }),
          });
        } else {
          // POST : créer l'échéancier
          await fetch(`/api/quotes/${params.id}/payment-schedule`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ calculationResult }),
          });
        }
      }

      setInstallmentsRefreshTrigger((t) => t + 1);
      setOriginalCalculationResult(null); // Réinitialiser les modifs après sauvegarde
      notify("Calcul enregistré.", "success");
    } catch (error) {
      console.error("Erreur sauvegarde:", error);
      notify("L'enregistrement du calcul a échoué.", "error");
    } finally {
      setRecalculating(false);
    }
  };

  if (loading) {
    return (
      <AuthenticatedAppShell>
        <LoadingState active label="Chargement du dossier" />
      </AuthenticatedAppShell>
    );
  }

  if (!quote) {
    return (
      <AuthenticatedAppShell>
        <div className="py-16 text-center">
          <h1 className="text-xl font-semibold text-ink">Dossier introuvable</h1>
          <p className="mt-2 text-sm text-ink-muted">
            Ce devis n'existe pas ou a été supprimé.
          </p>
          <Button className="mt-4" onClick={() => router.push("/dashboard")}>
            Retourner au tableau de bord
          </Button>
        </div>
      </AuthenticatedAppShell>
    );
  }

  const originalYear = dossierOriginalYear(quote);
  const yearsOnDossier = [
    originalYear,
    ...(quote.vintages ?? []).map((item) => item.year),
  ].filter((year, index, all) => all.indexOf(year) === index);
  const selectedDossierYear = isAdmin
    ? (dossierYear ?? originalYear)
    : yearsOnDossier.includes(calendarYear())
      ? calendarYear()
      : originalYear;
  const selectedVintage = quote.vintages?.find(
    (item) => item.year === selectedDossierYear,
  );
  const displayedCalculation =
    selectedDossierYear !== originalYear && selectedVintage?.calculatedPremium
      ? selectedVintage.calculatedPremium
      : calculationResult;

  const reloadQuote = async () => {
    const response = await fetch(`/api/quotes/${params.id}`);
    if (!response.ok) return;
    const dataA = await response.json();
    if (dataA.data) setQuote(dataA.data);
  };

  return (
    <AuthenticatedAppShell>
      <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="secondary" onClick={() => router.push("/dashboard")}>
          Retourner au tableau de bord
        </Button>
        <div>
          <h1 className="text-xl font-semibold text-ink">
            Dossier {quote.reference}
          </h1>
          <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-ink-muted">
            <StatusBadge status={quote.status} />
            <span>Créé le {new Date(quote.createdAt).toLocaleDateString("fr-FR")}</span>
          </div>
        </div>
      </div>

      <DossierExerciseBar
        quote={quote}
        isAdmin={isAdmin}
        selectedYear={selectedDossierYear}
        onSelectYear={setDossierYear}
        onAdded={() => {
          void reloadQuote();
        }}
      />
      {selectedDossierYear !== originalYear ? (
        <p className="text-sm text-ink-muted">
          Exercice {selectedDossierYear} : le formulaire et la prime enregistrée
          de l&apos;origine du dossier ne sont pas modifiés.
        </p>
      ) : null}

      <div className="grid items-start gap-4 lg:grid-cols-[14rem_minmax(0,1fr)]">
      <GroupedNav
        groups={tabGroups}
        value={activeTab}
        onChange={setActiveTab}
        label="Sections du dossier"
      />

      <div className="min-w-0 rounded-lg border border-line bg-white p-4 sm:p-6">
        {activeTab === "resume" && quote && (
          <ResumeTab quote={quote} isAdmin={isAdmin} />
        )}

        {activeTab === "form-data" && (
          <FormDataTab
            quote={quote}
            parameterMapping={parameterMapping}
            formFields={formFields}
            onEcheancesRecalculated={() => {
              // Optionnel : rafraîchir le devis ou forcer un re-render des onglets échéancier / appel de prime
              setQuote((q) => (q ? { ...q } : null));
            }}
          />
        )}

        {activeTab === "calculation" && (
          <CalculationTab
            quote={quote}
            calculationResult={displayedCalculation}
            calculationError={calculationError}
            originalCalculationResult={originalCalculationResult}
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
            onOpenParameterEditor={() => setShowParameterEditor(true)}
            installmentsRefreshTrigger={installmentsRefreshTrigger}
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

        {activeTab === "appel-prime" && (
          <AppelDePrimeTab
            quote={quote}
            calculationResult={calculationResult}
            session={session}
            preferredYear={selectedDossierYear}
          />
        )}

        {activeTab === "contrat" && (
          <ContratTab
            quote={quote}
            session={session}
            calculationResult={calculationResult}
          />
        )}

        {activeTab === "aggravation" && (
          <AggravationTab quote={quote} calculationResult={calculationResult} />
        )}

        {activeTab === "debit-note" && (
          <DebitNoteTab
            quoteId={quote.id}
            isAdmin={isAdmin}
            preferredYear={selectedDossierYear}
          />
        )}

        {activeTab === "bordereau" && (
          <BordereauTab
            quote={quote}
            calculationResult={calculationResult}
            session={session}
          />
        )}

        {activeTab === "chat" && <ChatTab quote={quote} />}
        {activeTab === "piece-jointe" && <PieceJointeTab quote={quote} />}
        {activeTab === "broker-commissions" &&
          (calculationResult ? (
            <BrokerCommissionsTab calculationResult={calculationResult} />
          ) : (
            <p className="text-sm text-ink-muted">
              Les commissions apparaîtront une fois la prime calculée.
            </p>
          ))}
        {activeTab === "offre" && (
          <OffreTab quote={quote} calculationResult={calculationResult} />
        )}
      </div>
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

      {/* Popup d'édition des paramètres */}
      {showParameterEditor && quote && calculationResult && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full h-[90vh] flex flex-col overflow-hidden shadow-2xl">
            <SimpleParameterEditor
              quote={quote}
              calculationResult={calculationResult}
              originalCalculationResult={originalCalculationResult}
              onApplyChange={handleApplyChange}
              onUpdate={setCalculationResult}
              onClose={() => setShowParameterEditor(false)}
            />
          </div>
        </div>
      )}
      </div>
    </AuthenticatedAppShell>
  );
}
