"use client";

import { useState, useEffect } from "react";
import useProductsStore from "@/lib/stores/products-store";
import useQuotesStore from "@/lib/stores/quotes-store";
import useUsersStore from "@/lib/stores/users-store";
import useMessagesStore from "@/lib/stores/messages-store";
import MessageComposer from "@/components/messages/MessageComposer";
import AddBrokerModal from "@/components/modals/AddBrokerModal";
import { calculPrimeRCD } from "@/lib/tarificateurs/rcd";
import ProductConfigTab from "@/components/admin/ProductConfigTab";
import QuoteForm from "@/components/quotes/QuoteForm";
import QuoteSuccessPage from "@/components/quotes/QuoteSuccessPage";
import CorrespondanceTab from "@/components/admin/CorrespondanceTab";
import { importBrokers } from "@/scripts/import-brokers";

// Types exacts de la fonction calculPrimeRCD
interface SimulatorParams {
  caDeclared: number;
  etp: number;
  activites: { code: number; caSharePercent: number }[];
  dateCreation: Date;
  tempsSansActivite12mois: boolean;
  anneeExperience: number;
  assureurDefaillant: boolean;
  nombreAnneeAssuranceContinue: number;
  qualif: boolean;
  ancienneAssurance: string;
  activiteSansEtreAssure: boolean;
  experienceDirigeant: number;
  nomDeLAsurreur: string;
  dateEffet?: string;
  dateFinCouverturePrecedente?: string;
  sinistresPrecedents?: SinistrePasse[];
  tauxTI?: number;
  coefficientAntecedent?: number;
}

interface SinistrePasse {
  year: number;
  numClaims: number;
  totalCost: number;
}

interface ReprisePasseResult {
  pourcentageAnneeReprise: number;
  tauxTIPondere: number;
  ratioSP: number;
  frequenceSinistres: number;
  categorieAnciennete: string;
  categorieFrequence: string;
  categorieRatioSP: string;
  coefficientMajoration: number;
  analyseCompagnieRequise: boolean;
  primeReprisePasseTTC: number;
  calculDetail: {
    sommeDesTauxTI: number;
    primeAnnuelleAvecCoeff: number;
    primeRepriseAvantMajoration: number;
    primeRepriseApresMajoration: number;
  };
}

interface ActivityTab {
  nomActivite: string;
  partCA: number;
  tauxBase: number;
  PrimeMiniAct: number;
  DegMax: number;
  Deg400k: number;
  PrimeRefAct: number;
  Prime100Ref: number;
  Prime100Min: number;
}

interface Majorations {
  etp?: number;
  qualif: number;
  dateCreation: number;
  tempsSansActivite12mois: number;
  anneeExperience?: number;
  assureurDefaillant: number;
  nombreAnneeAssuranceContinue: number;
}

interface SimulationResult {
  refus: boolean;
  returnTab: ActivityTab[];
  PminiHT: number;
  PrimeHT: number;
  majorations: Majorations;
  reprisePasseResult?: ReprisePasseResult;
}

// Formulaire RCD (structure alignée avec le JSON fourni)
interface RcdFormInput {
  siret: string;
  address: string;
  includePJ: boolean;
  legalForm: string;
  territory: string;
  activities: { code: string; caSharePercent: number }[];
  companyName: string;
  lossHistory: { year: number; numClaims: number; totalCost: number }[];
  periodicity: "annuel" | "semestriel" | "trimestriel" | "mensuel";
  nombreSalaries: string;
  tradingPercent: string;
  chiffreAffaires: string;
  experienceMetier: string;
  previousRcdStatus: string;
  dateEffetSouhaitee: string;
  companyCreationDate: string;
  subContractingPercent: string;
  previousResiliationDate?: string;
}

interface AdminScreenProps {
  user: {
    name: string;
    email: string;
    role: string;
  };
}

export default function AdminScreen({ user }: AdminScreenProps) {
  const [activeTab, setActiveTab] = useState("brokers");
  const [showProductForm, setShowProductForm] = useState(false);
  const [showMessageComposer, setShowMessageComposer] = useState(false);
  const [showAddBrokerModal, setShowAddBrokerModal] = useState(false);
  const [quotesSearchTerm, setQuotesSearchTerm] = useState("");
  const [showQuoteForm, setShowQuoteForm] = useState(false);
  const [showSuccessPage, setShowSuccessPage] = useState(false);
  const [createdQuote, setCreatedQuote] = useState<any>(null);

  // States pour l'historique des versions
  const [selectedQuoteForVersions, setSelectedQuoteForVersions] =
    useState<string>("");
  const [versionsData, setVersionsData] = useState<any>(null);
  const [loadingVersions, setLoadingVersions] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<any>(null);
  const [showVersionDetails, setShowVersionDetails] = useState(false);

  // States pour les paiements en retard
  const [overduePayments, setOverduePayments] = useState<any[]>([]);
  const [loadingOverduePayments, setLoadingOverduePayments] = useState(false);
  const [overdueCount, setOverdueCount] = useState(0);

  // États pour le simulateur de tarif
  const [simulatorData, setSimulatorData] = useState<SimulatorParams>({
    caDeclared: 300000,
    etp: 3,
    activites: [{ code: 2, caSharePercent: 100 }],
    dateCreation: new Date("2020-01-01"),
    tempsSansActivite12mois: false,
    anneeExperience: 5,
    assureurDefaillant: false,
    nombreAnneeAssuranceContinue: 3,
    qualif: false,
    ancienneAssurance: "EN_COURS",
    activiteSansEtreAssure: false,
    experienceDirigeant: 5,
    nomDeLAsurreur: "AXA",
    dateEffet: "2024-01-15",
    dateFinCouverturePrecedente: "2023-12-31",
    sinistresPrecedents: [],
    tauxTI: 0.7,
    coefficientAntecedent: 1.0,
  });
  const [simulationResult, setSimulationResult] =
    useState<SimulationResult | null>(null);

  // État du formulaire RCD (pré-rempli avec l'exemple fourni)
  const [rcdForm, setRcdForm] = useState<RcdFormInput>({
    siret: "81399383900014",
    address: "69 LOTISSEMENT GIBELIN 1-97351 MATOURY",
    includePJ: true,
    legalForm: "SAS",
    territory: "GUYANE",
    activities: [
      { code: "2", caSharePercent: 70 },
      { code: "11", caSharePercent: 30 },
    ],
    companyName: "CLEAN 51",
    lossHistory: [{ year: 2025, numClaims: 1, totalCost: 0 }],
    periodicity: "semestriel",
    nombreSalaries: "4",
    tradingPercent: "0",
    chiffreAffaires: "280000",
    experienceMetier: "6",
    previousRcdStatus: "EN_COURS",
    dateEffetSouhaitee: "2025-08-11",
    companyCreationDate: "2025-01-01",
    subContractingPercent: "0",
    previousResiliationDate: "0005-02-01",
  });

  const updateRcdForm = <K extends keyof RcdFormInput>(
    field: K,
    value: RcdFormInput[K]
  ) => {
    setRcdForm((prev) => ({ ...prev, [field]: value }));
  };

  // Appliquer le formulaire RCD au simulateur et lancer le calcul
  const applyRcdFormAndSimulate = () => {
    const mappedActivities = rcdForm.activities.map((a) => ({
      code: parseInt(a.code, 10),
      caSharePercent: (a.caSharePercent ?? 0) / 100,
    }));

    const mappedLosses: SinistrePasse[] = (rcdForm.lossHistory || []).map(
      (l) => ({
        year: Number(l.year),
        numClaims: Number(l.numClaims),
        totalCost: Number(l.totalCost),
      })
    );

    setSimulatorData((prev) => ({
      ...prev,
      caDeclared: Number(rcdForm.chiffreAffaires) || 0,
      etp: Number(rcdForm.nombreSalaries) || 0,
      activites: mappedActivities,
      dateCreation: new Date(rcdForm.companyCreationDate),
      anneeExperience: Number(rcdForm.experienceMetier) || 0,
      ancienneAssurance: rcdForm.previousRcdStatus,
      experienceDirigeant: Number(rcdForm.experienceMetier) || 0,
      dateEffet: rcdForm.dateEffetSouhaitee,
      dateFinCouverturePrecedente: rcdForm.previousResiliationDate,
      sinistresPrecedents: mappedLosses,
      // Optionnel: activer automatiquement le calcul reprise si assureur défaillant sélectionné
    }));

    // lancer le calcul immédiatement
    // setTimeout(() => handleSimulate(), 0);
  };

  const {
    products,
    loading: productsLoading,
    fetchProducts,
    toggleProductStatus,
  } = useProductsStore();

  const { quotes, loading: quotesLoading, fetchQuotes } = useQuotesStore();

  const {
    brokers,
    underwriters,
    loading: usersLoading,
    fetchBrokers,
    fetchUnderwriters,
    toggleUserStatus,
  } = useUsersStore();

  const {
    receivedMessages,
    unreadCount,
    loading: messagesLoading,
    fetchReceivedMessages,
    fetchUnreadCount,
    markMessageAsRead,
    deleteMessage,
  } = useMessagesStore();

  // Function to fetch overdue payments
  const fetchOverduePayments = async () => {
    setLoadingOverduePayments(true);
    try {
      const response = await fetch("/api/payment-installments/overdue");
      const data = await response.json();

      if (data.success) {
        setOverduePayments(data.data.payments || []);
        setOverdueCount(data.data.total || 0);
      }
    } catch (error) {
      console.error(
        "Erreur lors de la récupération des paiements en retard:",
        error
      );
    } finally {
      setLoadingOverduePayments(false);
    }
  };

  // Function to mark payment as paid
  const markPaymentAsPaid = async (
    paymentId: string,
    paymentMethod?: string,
    paymentReference?: string,
    adminNotes?: string
  ) => {
    try {
      const response = await fetch(
        `/api/payment-installments/${paymentId}/mark-paid`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            paymentMethod,
            paymentReference,
            adminNotes,
          }),
        }
      );

      const data = await response.json();

      if (!data.success) {
        throw new Error(
          data.error || "Erreur lors de la mise à jour du paiement"
        );
      }

      alert(data.message || "Paiement marqué comme payé avec succès");
      fetchOverduePayments(); // Refresh list
    } catch (error) {
      console.error("Erreur:", error);
      alert(
        error instanceof Error ? error.message : "Erreur lors de la mise à jour"
      );
    }
  };

  // Function to send payment reminder
  const sendPaymentReminder = async (paymentId: string) => {
    if (!confirm("Êtes-vous sûr de vouloir envoyer un rappel de paiement ?")) {
      return;
    }

    try {
      const response = await fetch(
        `/api/payment-installments/${paymentId}/send-reminder`,
        {
          method: "POST",
        }
      );

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Erreur lors de l'envoi du rappel");
      }

      alert(data.message || "Rappel de paiement envoyé avec succès");
      fetchOverduePayments(); // Refresh list
    } catch (error) {
      console.error("Erreur:", error);
      alert(
        error instanceof Error
          ? error.message
          : "Erreur lors de l'envoi du rappel"
      );
    }
  };

  useEffect(() => {
    fetchProducts();
    fetchQuotes();
    fetchBrokers();
    fetchUnderwriters();
    fetchReceivedMessages();
    fetchUnreadCount();
    fetchOverduePayments();
  }, [
    fetchProducts,
    fetchQuotes,
    fetchBrokers,
    fetchUnderwriters,
    fetchReceivedMessages,
    fetchUnreadCount,
  ]);

  // Function to handle new quote
  const handleNewQuote = () => {
    setShowQuoteForm(true);
    setShowSuccessPage(false);
    setCreatedQuote(null);
    setActiveTab("quotes");
  };

  const handleQuoteCreated = (quote: any) => {
    setShowQuoteForm(false);
    setCreatedQuote(quote);
    setShowSuccessPage(true);
  };

  const handleBackToDashboard = () => {
    setShowSuccessPage(false);
    setCreatedQuote(null);
    // Refresh quotes to show the new one
    fetchQuotes();
  };

  // Function to create a new broker
  const handleCreateBroker = async (brokerData: any) => {
    try {
      const response = await fetch("/api/brokers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(brokerData),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(
          result.error || "Erreur lors de la création du courtier"
        );
      }

      // Refresh brokers list
      await fetchBrokers();

      return result.data;
    } catch (error) {
      console.error("Error creating broker:", error);
      throw error;
    }
  };

  const handleImportBrokers = async () => {
    try {
      const results = await importBrokers(handleCreateBroker);
      await fetchBrokers();
      alert(
        `Import terminé: ${results.success} réussis, ${results.skipped} ignorés, ${results.failed} échecs`
      );
    } catch (error) {
      console.error("Error importing brokers:", error);
      alert(error instanceof Error ? error.message : "Erreur lors de l'import");
    }
  };

  // // Function to simulate premium calculation
  // const handleSimulate = () => {
  //   try {
  //     // Préparer les paramètres comme dans page.tsx
  //     const calculParams = {
  //       caDeclared: simulatorData.caDeclared,
  //       etp: simulatorData.etp,
  //       activites: simulatorData.activites,
  //       dateCreation: simulatorData.dateCreation,
  //       tempsSansActivite12mois: simulatorData.tempsSansActivite12mois,
  //       anneeExperience: simulatorData.anneeExperience,
  //       assureurDefaillant: simulatorData.assureurDefaillant,
  //       nombreAnneeAssuranceContinue:
  //         simulatorData.nombreAnneeAssuranceContinue,
  //       qualif: simulatorData.qualif,
  //       ancienneAssurance: simulatorData.ancienneAssurance,
  //       activiteSansEtreAssure: simulatorData.activiteSansEtreAssure,
  //       experienceDirigeant: simulatorData.experienceDirigeant,
  //       nomDeLAsurreur: simulatorData.nomDeLAsurreur,
  //       dateEffet: simulatorData.dateEffet,
  //       dateFinCouverturePrecedente: simulatorData.dateFinCouverturePrecedente,
  //       sinistresPrecedents: simulatorData.sinistresPrecedents,
  //       tauxTI: simulatorData.tauxTI,
  //       coefficientAntecedent: simulatorData.coefficientAntecedent,
  //     };

  //     console.log("Paramètres de simulation:", calculParams);
  //     const result = calculPrimeRCD(calculParams);
  //     console.log("Résultat simulation:", result);
  //     setSimulationResult(result);
  //   } catch (error) {
  //     console.error("Erreur lors de la simulation:", error);
  //     const errorMessage =
  //       error instanceof Error ? error.message : String(error);
  //     alert("Erreur lors de la simulation: " + errorMessage);
  //   }
  // };

  // Function to update simulator data
  const updateSimulatorData = <K extends keyof SimulatorParams>(
    field: K,
    value: SimulatorParams[K]
  ) => {
    setSimulatorData((prev) => ({ ...prev, [field]: value }));
  };

  // Function to add activity
  const addActivity = () => {
    if (simulatorData.activites.length < 3) {
      setSimulatorData((prev) => ({
        ...prev,
        activites: [...prev.activites, { code: 1, caSharePercent: 0 }],
      }));
    }
  };

  // Function to remove activity
  const removeActivity = (index: number) => {
    if (simulatorData.activites.length > 1) {
      setSimulatorData((prev) => ({
        ...prev,
        activites: prev.activites.filter((_, i) => i !== index),
      }));
    }
  };

  // Function to update activity
  const updateActivity = (
    index: number,
    field: keyof { code: number; caSharePercent: number },
    value: number
  ) => {
    setSimulatorData((prev) => ({
      ...prev,
      activites: prev.activites.map((act, i) =>
        i === index ? { ...act, [field]: value } : act
      ),
    }));
  };

  // Function to fetch versions for a quote
  const fetchQuoteVersions = async (quoteId: string) => {
    if (!quoteId) return;

    setLoadingVersions(true);
    try {
      const response = await fetch(`/api/quotes/${quoteId}/versions`);
      const data = await response.json();

      if (!data.success) {
        throw new Error(
          data.error || "Erreur lors de la récupération des versions"
        );
      }

      setVersionsData(data.data);
    } catch (error) {
      console.error("Erreur lors de la récupération des versions:", error);
      alert(
        error instanceof Error
          ? error.message
          : "Erreur lors de la récupération des versions"
      );
    } finally {
      setLoadingVersions(false);
    }
  };

  // Function to view version details
  const viewVersionDetails = (version: any) => {
    setSelectedVersion(version);
    setShowVersionDetails(true);
  };

  // Function to get action label
  const getActionLabel = (action: string) => {
    const labels: Record<string, string> = {
      STATUS_CHANGE: "Changement de statut",
      DATA_UPDATE: "Modification des données",
      PREMIUM_UPDATE: "Mise à jour de la prime",
      OFFER_UPDATE: "Mise à jour de l'offre",
      ADMIN_CORRECTION: "Correction admin",
      BROKER_MODIFICATION: "Modification courtier",
    };
    return labels[action] || action;
  };

  // Function to get status label
  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      DRAFT: "Brouillon",
      INCOMPLETE: "À compléter",
      SUBMITTED: "Soumis",
      IN_PROGRESS: "En cours",
      COMPLEMENT_REQUIRED: "Complément demandé",
      OFFER_READY: "Offre prête",
      OFFER_SENT: "Offre envoyée",
      ACCEPTED: "Acceptée",
      REJECTED: "Refusée",
      EXPIRED: "Expirée",
    };
    return labels[status] || status;
  };

  // Gestion des sinistres précédents (simulateur)
  const addLossEntry = () => {
    setSimulatorData((prev) => ({
      ...prev,
      sinistresPrecedents: [
        ...(prev.sinistresPrecedents ?? []),
        { year: new Date().getFullYear(), numClaims: 0, totalCost: 0 },
      ].slice(0, 5),
    }));
  };

  const removeLossEntry = (index: number) => {
    setSimulatorData((prev) => ({
      ...prev,
      sinistresPrecedents: (prev.sinistresPrecedents ?? []).filter(
        (_, i) => i !== index
      ),
    }));
  };

  const updateLossEntry = (
    index: number,
    field: keyof SinistrePasse,
    value: number
  ) => {
    setSimulatorData((prev) => ({
      ...prev,
      sinistresPrecedents: (prev.sinistresPrecedents ?? []).map((s, i) =>
        i === index ? { ...s, [field]: value } : s
      ),
    }));
  };

  // Filter quotes based on search term
  const filteredQuotes = quotes.filter((quote) => {
    if (!quotesSearchTerm) return true;

    const searchLower = quotesSearchTerm.toLowerCase();
    return (
      quote.reference.toLowerCase().includes(searchLower) ||
      quote.product.name.toLowerCase().includes(searchLower) ||
      quote.broker.name.toLowerCase().includes(searchLower) ||
      (quote.broker.companyName &&
        quote.broker.companyName.toLowerCase().includes(searchLower)) ||
      quote.formData.directorName.toLowerCase().includes(searchLower) ||
      quote.status.toLowerCase().includes(searchLower) ||
      new Date(quote.createdAt)
        .toLocaleDateString("fr-FR")
        .includes(searchLower)
    );
  });

  // Calculate stats from real data

  const stats = {
    totalBrokers: brokers.length,
    activeBrokers: brokers.filter((b) => b.isActive).length,
    totalUnderwriters: underwriters.length,
    totalProducts: products.length,
    activeProducts: products.filter((p) => p.isActive).length,
    totalQuotes: quotes.length,
    pendingQuotes: quotes.filter(
      (q) => q.status === "SUBMITTED" || q.status === "IN_PROGRESS"
    ).length,
  };

  // Show success page after quote creation
  if (showSuccessPage && createdQuote) {
    return (
      <div className="space-y-6">
        <QuoteSuccessPage
          quote={createdQuote}
          onBackToDashboard={handleBackToDashboard}
        />
      </div>
    );
  }

  // Show quote form
  if (showQuoteForm) {
    return (
      <div className="space-y-6">
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">
              Nouvelle demande de devis
            </h1>
            <button
              onClick={() => setShowQuoteForm(false)}
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
        <div className="bg-white shadow rounded-lg p-6">
          <QuoteForm
            onSuccess={handleQuoteCreated}
            onCancel={() => setShowQuoteForm(false)}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white shadow rounded-lg p-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Tableau de bord Administrateur
        </h1>
        <p className="text-gray-600 mt-2">
          Bienvenue {user.name}, gérez votre plateforme d'assurances
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                  <svg
                    className="w-5 h-5 text-white"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                  </svg>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Courtiers Actifs
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {stats.activeBrokers}/{stats.totalBrokers}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-orange-500 rounded-md flex items-center justify-center">
                  <svg
                    className="w-5 h-5 text-white"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Demandes de devis
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {stats.totalQuotes}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        {/* <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                  <svg
                    className="w-5 h-5 text-white"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Souscripteurs
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {stats.totalUnderwriters}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div> */}

        {/* <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-yellow-500 rounded-md flex items-center justify-center">
                  <svg
                    className="w-5 h-5 text-white"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Produits Total
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {stats.totalProducts}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div> */}

        {/* <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                  <svg
                    className="w-5 h-5 text-white"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Produits Actifs
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {stats.activeProducts}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div> */}
      </div>

      {/* Tabs */}
      <div className="bg-white shadow rounded-lg">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6">
            {/* <button
              onClick={() => setActiveTab("products")}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === "products"
                  ? "border-indigo-500 text-indigo-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Produits d'assurance ({stats.totalProducts})
            </button> */}
            <button
              onClick={() => setActiveTab("brokers")}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === "brokers"
                  ? "border-indigo-500 text-indigo-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Courtiers ({stats.totalBrokers})
            </button>
            <button
              onClick={() => setActiveTab("quotes")}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === "quotes"
                  ? "border-indigo-500 text-indigo-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Demandes de devis ({stats.totalQuotes})
            </button>
            <button
              onClick={() => setActiveTab("messages")}
              className={`py-4 px-1 border-b-2 font-medium text-sm relative ${
                activeTab === "messages"
                  ? "border-indigo-500 text-indigo-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Messages ({receivedMessages.length})
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full px-2 py-1 min-w-[20px] h-5 flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </button>
            {/* <button
              onClick={() => setActiveTab("simulator")}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === "simulator"
                  ? "border-indigo-500 text-indigo-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Simulateur de tarif
            </button> */}
            <button
              onClick={() => setActiveTab("productConfig")}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === "productConfig"
                  ? "border-indigo-500 text-indigo-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Configuration des produits
            </button>
            <button
              onClick={() => setActiveTab("correspondance")}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === "correspondance"
                  ? "border-indigo-500 text-indigo-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Correspondance
            </button>
            <button
              onClick={() => setActiveTab("versions")}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === "versions"
                  ? "border-indigo-500 text-indigo-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Historique des versions
            </button>
            <button
              onClick={() => setActiveTab("overduePayments")}
              className={`py-4 px-1 border-b-2 font-medium text-sm relative ${
                activeTab === "overduePayments"
                  ? "border-indigo-500 text-indigo-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Paiements en retard
              {overdueCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full px-2 py-1 min-w-[20px] h-5 flex items-center justify-center">
                  {overdueCount}
                </span>
              )}
            </button>
            {/* <button
              onClick={() => setActiveTab("underwriters")}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === "underwriters"
                  ? "border-indigo-500 text-indigo-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Souscripteurs ({stats.totalUnderwriters})
            </button> */}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === "products" && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-900">
                  Gestion des Produits d'Assurance
                </h3>
                <button
                  onClick={() => setShowProductForm(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
                >
                  <svg
                    className="w-4 h-4 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                  Nouveau produit
                </button>
              </div>

              {productsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                </div>
              ) : (
                <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                  <table className="min-w-full divide-y divide-gray-300">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                          Produit
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                          Code
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                          Statut
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                          Créé par
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                          Date création
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {products.map((product) => (
                        <tr key={product.id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {product.name}
                              </div>
                              {product.description && (
                                <div className="text-sm text-gray-500">
                                  {product.description}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            <span className="bg-gray-100 text-gray-800 text-xs font-medium px-2.5 py-0.5 rounded">
                              {product.code}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                product.isActive
                                  ? "bg-green-100 text-green-800"
                                  : "bg-red-100 text-red-800"
                              }`}
                            >
                              {product.isActive ? "Actif" : "Inactif"}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {product.createdBy.name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {new Date(product.createdAt).toLocaleDateString(
                              "fr-FR"
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                            <button className="text-indigo-600 hover:text-indigo-900">
                              Modifier
                            </button>
                            <button
                              onClick={() => toggleProductStatus(product.id)}
                              className={`${
                                product.isActive
                                  ? "text-red-600 hover:text-red-900"
                                  : "text-green-600 hover:text-green-900"
                              }`}
                            >
                              {product.isActive ? "Désactiver" : "Activer"}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === "brokers" && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-900">
                  Gestion des Courtiers
                </h3>
                <button
                  onClick={() => setShowAddBrokerModal(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
                >
                  <svg
                    className="w-4 h-4 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                  Ajouter un courtier
                </button>
                <button
                  onClick={() => handleImportBrokers()}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
                >
                  Importer des courtiers
                </button>
              </div>
              <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                <table className="min-w-full divide-y divide-gray-300">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                        Nom
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                        Entreprise
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                        Téléphone
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                        Statut
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {usersLoading ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-4 text-center">
                          <div className="flex items-center justify-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                          </div>
                        </td>
                      </tr>
                    ) : brokers.length === 0 ? (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-6 py-4 text-center text-gray-500"
                        >
                          Aucun courtier trouvé
                        </td>
                      </tr>
                    ) : (
                      brokers.map((broker) => (
                        <tr key={broker.id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {broker.name}
                              </div>
                              <div className="text-sm text-gray-500">
                                {broker.email}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {broker.companyName}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {broker.phone}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                broker.isActive
                                  ? "bg-green-100 text-green-800"
                                  : "bg-red-100 text-red-800"
                              }`}
                            >
                              {broker.isActive ? "Actif" : "Inactif"}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <button className="text-indigo-600 hover:text-indigo-900 mr-4">
                              Modifier
                            </button>
                            <button
                              onClick={() => toggleUserStatus(broker.id)}
                              className="text-red-600 hover:text-red-900"
                            >
                              {broker.isActive ? "Désactiver" : "Activer"}
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === "quotes" && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-900">
                  Gestion des Demandes de Devis
                </h3>
                <button
                  onClick={handleNewQuote}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
                >
                  <svg
                    className="w-4 h-4 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                  Nouvelle demande de devis
                </button>
              </div>

              {/* Barre de recherche */}
              <div className="flex items-center space-x-4">
                <div className="flex-1 max-w-md">
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg
                        className="h-5 w-5 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                        />
                      </svg>
                    </div>
                    <input
                      type="text"
                      placeholder="Rechercher par référence, produit, courtier, client, statut..."
                      value={quotesSearchTerm}
                      onChange={(e) => setQuotesSearchTerm(e.target.value)}
                      className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    />
                  </div>
                </div>
                {quotesSearchTerm && (
                  <div className="text-sm text-gray-500">
                    {filteredQuotes.length} résultat(s) sur {quotes.length}
                  </div>
                )}
              </div>
              <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-300 ">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                        Référence
                      </th>

                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                        Courtier
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                        Client
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                        Statut
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                        Date création
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {quotesLoading ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-4 text-center">
                          <div className="flex items-center justify-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                          </div>
                        </td>
                      </tr>
                    ) : filteredQuotes.length === 0 ? (
                      <tr>
                        <td
                          colSpan={6}
                          className="px-6 py-4 text-center text-gray-500"
                        >
                          {quotesSearchTerm
                            ? "Aucune demande de devis ne correspond à votre recherche"
                            : "Aucune demande de devis trouvée"}
                        </td>
                      </tr>
                    ) : (
                      filteredQuotes.map((quote) => (
                        <tr key={quote.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {quote.reference}
                          </td>

                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {quote.broker.name}
                              </div>
                              <div className="text-sm text-gray-500">
                                {quote.broker.companyName}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {quote.formData.companyName}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                quote.status === "DRAFT"
                                  ? "bg-gray-100 text-gray-800"
                                  : quote.status === "SUBMITTED"
                                  ? "bg-yellow-100 text-yellow-800"
                                  : quote.status === "IN_PROGRESS"
                                  ? "bg-blue-100 text-blue-800"
                                  : quote.status === "OFFER_READY"
                                  ? "bg-green-100 text-green-800"
                                  : quote.status === "ACCEPTED"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : quote.status === "REJECTED"
                                  ? "bg-red-100 text-red-800"
                                  : "bg-gray-100 text-gray-800"
                              }`}
                            >
                              {quote.status === "DRAFT"
                                ? "Brouillon"
                                : quote.status === "SUBMITTED"
                                ? "Soumis"
                                : quote.status === "IN_PROGRESS"
                                ? "En cours"
                                : quote.status === "OFFER_READY"
                                ? "Offre prête"
                                : quote.status === "ACCEPTED"
                                ? "Accepté"
                                : quote.status === "REJECTED"
                                ? "Rejeté"
                                : quote.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {new Date(quote.createdAt).toLocaleDateString(
                              "fr-FR"
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                            <button
                              onClick={() =>
                                (window.location.href = `/quotes/${quote.id}`)
                              }
                              className="text-indigo-600 hover:text-indigo-900"
                            >
                              Voir détails
                            </button>
                            {/* {(quote.status === "SUBMITTED" ||
                              quote.status === "IN_PROGRESS") && (
                              <>
                                <button className="text-green-600 hover:text-green-900">
                                  Approuver
                                </button>
                                <button className="text-red-600 hover:text-red-900">
                                  Rejeter
                                </button>
                              </>
                            )} */}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === "messages" && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-900">
                  Messages reçus
                </h3>
                <button
                  onClick={() => setShowMessageComposer(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
                >
                  <svg
                    className="w-4 h-4 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                  Nouveau message
                </button>
              </div>
              <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                <table className="min-w-full divide-y divide-gray-300">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                        De
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                        Sujet
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                        Aperçu
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                        Statut
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {messagesLoading ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-4 text-center">
                          <div className="flex items-center justify-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                          </div>
                        </td>
                      </tr>
                    ) : receivedMessages.length === 0 ? (
                      <tr>
                        <td
                          colSpan={6}
                          className="px-6 py-4 text-center text-gray-500"
                        >
                          Aucun message trouvé
                        </td>
                      </tr>
                    ) : (
                      receivedMessages.map((message) => (
                        <tr
                          key={message.id}
                          className={!message.isRead ? "bg-blue-50" : ""}
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div
                                className={`text-sm ${
                                  !message.isRead ? "font-bold" : "font-medium"
                                } text-gray-900`}
                              >
                                Admin System
                              </div>
                              <div className="text-sm text-gray-500">
                                Système
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div
                              className={`text-sm ${
                                !message.isRead ? "font-bold" : ""
                              } text-gray-900`}
                            >
                              {message.title}
                            </div>
                            {message.isUrgent && (
                              <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800 mt-1">
                                Urgent
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-500 truncate max-w-xs">
                              {message.message.substring(0, 100)}
                              {message.message.length > 100 ? "..." : ""}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {new Date(message.createdAt).toLocaleDateString(
                              "fr-FR"
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                message.isRead
                                  ? "bg-gray-100 text-gray-800"
                                  : "bg-green-100 text-green-800"
                              }`}
                            >
                              {message.isRead ? "Lu" : "Non lu"}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                            {!message.isRead && (
                              <button
                                onClick={() => markMessageAsRead(message.id)}
                                className="text-green-600 hover:text-green-900"
                              >
                                Marquer lu
                              </button>
                            )}
                            <button className="text-indigo-600 hover:text-indigo-900">
                              Voir détails
                            </button>
                            <button
                              onClick={() => deleteMessage(message.id)}
                              className="text-red-600 hover:text-red-900"
                            >
                              Supprimer
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === "simulator" && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-900">
                  Simulateur de Tarif RCD
                </h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={applyRcdFormAndSimulate}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
                  >
                    Remplir avec l'exemple & Calculer
                  </button>
                  {/* <button
                    onClick={handleSimulate}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700"
                  >
                    <svg
                      className="w-4 h-4 mr-2"
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
                    Calculer la prime
                  </button> */}
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Formulaire de simulation */}
                <div className="bg-white shadow rounded-lg p-6">
                  <h4 className="text-md font-medium text-gray-900 mb-4">
                    Paramètres de simulation
                  </h4>

                  <div className="space-y-4">
                    {/* Informations de base */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          CA déclaré (€)
                        </label>
                        <input
                          type="number"
                          value={simulatorData.caDeclared}
                          onChange={(e) =>
                            updateSimulatorData(
                              "caDeclared",
                              parseInt(e.target.value) || 0
                            )
                          }
                          className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          ETP
                        </label>
                        <input
                          type="number"
                          value={simulatorData.etp}
                          onChange={(e) =>
                            updateSimulatorData(
                              "etp",
                              parseInt(e.target.value) || 0
                            )
                          }
                          className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Années d'expérience
                        </label>
                        <input
                          type="number"
                          value={simulatorData.anneeExperience}
                          onChange={(e) =>
                            updateSimulatorData(
                              "anneeExperience",
                              parseInt(e.target.value) || 0
                            )
                          }
                          className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Date de création
                        </label>
                        <input
                          type="date"
                          value={
                            simulatorData.dateCreation
                              .toISOString()
                              .split("T")[0]
                          }
                          onChange={(e) =>
                            updateSimulatorData(
                              "dateCreation",
                              new Date(e.target.value)
                            )
                          }
                          className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                        />
                      </div>
                    </div>

                    {/* Activités */}
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <label className="block text-sm font-medium text-gray-700">
                          Activités
                        </label>
                        <button
                          onClick={addActivity}
                          disabled={simulatorData.activites.length >= 3}
                          className="text-xs bg-blue-500 text-white px-2 py-1 rounded disabled:bg-gray-400"
                        >
                          Ajouter
                        </button>
                      </div>
                      {simulatorData.activites.map((activite, index) => (
                        <div key={index} className="flex gap-2 mb-2">
                          <select
                            value={activite.code}
                            onChange={(e) =>
                              updateActivity(
                                index,
                                "code",
                                parseInt(e.target.value)
                              )
                            }
                            className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm"
                          >
                            <option value={1}>Code 1 - VRD</option>
                            <option value={2}>Code 2 - Maçonnerie</option>
                            <option value={3}>Code 3 - Charpente bois</option>
                            <option value={4}>Code 4 - Charpente métal</option>
                            <option value={5}>Code 5 - Couverture</option>
                            <option value={13}>Code 13 - Peinture</option>
                            <option value={17}>Code 17 - Plomberie</option>
                            <option value={20}>Code 20 - Électricité</option>
                          </select>
                          <input
                            type="number"
                            placeholder="% CA"
                            value={activite.caSharePercent}
                            onChange={(e) =>
                              updateActivity(
                                index,
                                "caSharePercent",
                                parseInt(e.target.value) || 0
                              )
                            }
                            className="w-20 border border-gray-300 rounded-md px-3 py-2 text-sm"
                          />
                          {simulatorData.activites.length > 1 && (
                            <button
                              onClick={() => removeActivity(index)}
                              className="text-red-500 hover:text-red-700"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Sinistres précédents (max 5) */}
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <label className="block text-sm font-medium text-gray-700">
                          Sinistres des 5 dernières années
                        </label>
                        <button
                          onClick={addLossEntry}
                          disabled={
                            (simulatorData.sinistresPrecedents?.length ?? 0) >=
                            5
                          }
                          className="text-xs bg-blue-500 text-white px-2 py-1 rounded disabled:bg-gray-400"
                        >
                          Ajouter
                        </button>
                      </div>
                      {(simulatorData.sinistresPrecedents ?? []).length ===
                        0 && (
                        <p className="text-xs text-gray-500">
                          Aucun sinistre déclaré
                        </p>
                      )}
                      {(simulatorData.sinistresPrecedents ?? []).map(
                        (s, index) => (
                          <div
                            key={index}
                            className="grid grid-cols-3 gap-2 mb-2 items-center"
                          >
                            <input
                              type="number"
                              value={s.year}
                              onChange={(e) =>
                                updateLossEntry(
                                  index,
                                  "year",
                                  parseInt(e.target.value) || 0
                                )
                              }
                              className="border border-gray-300 rounded-md px-3 py-2 text-sm"
                              placeholder="Année"
                            />
                            <input
                              type="number"
                              value={s.numClaims}
                              onChange={(e) =>
                                updateLossEntry(
                                  index,
                                  "numClaims",
                                  parseInt(e.target.value) || 0
                                )
                              }
                              className="border border-gray-300 rounded-md px-3 py-2 text-sm"
                              placeholder="Nb sinistres"
                            />
                            <div className="flex gap-2 items-center">
                              <input
                                type="number"
                                value={s.totalCost}
                                onChange={(e) =>
                                  updateLossEntry(
                                    index,
                                    "totalCost",
                                    parseInt(e.target.value) || 0
                                  )
                                }
                                className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm"
                                placeholder="Coût total €"
                              />
                              <button
                                onClick={() => removeLossEntry(index)}
                                className="text-red-500 hover:text-red-700"
                                title="Supprimer"
                              >
                                ✕
                              </button>
                            </div>
                          </div>
                        )
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Années assurance continue
                        </label>
                        <input
                          type="number"
                          value={simulatorData.nombreAnneeAssuranceContinue}
                          onChange={(e) =>
                            updateSimulatorData(
                              "nombreAnneeAssuranceContinue",
                              parseInt(e.target.value) || 0
                            )
                          }
                          className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Statut RCD précédent
                        </label>
                        <select
                          value={simulatorData.ancienneAssurance}
                          onChange={(e) =>
                            updateSimulatorData(
                              "ancienneAssurance",
                              e.target.value
                            )
                          }
                          className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                        >
                          <option value="EN_COURS">Contrat en cours</option>
                          <option value="RESILIE">Contrat résilié</option>
                          <option value="JAMAIS">Jamais assuré</option>
                        </select>
                      </div>
                    </div>

                    {/* Options */}
                    <div className="space-y-2">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={simulatorData.qualif}
                          onChange={(e) =>
                            updateSimulatorData("qualif", e.target.checked)
                          }
                          className="mr-2"
                        />
                        <span className="text-sm text-gray-700">
                          Qualification QUALIBAT/QUALIFELEC
                        </span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={simulatorData.tempsSansActivite12mois}
                          onChange={(e) =>
                            updateSimulatorData(
                              "tempsSansActivite12mois",
                              e.target.checked
                            )
                          }
                          className="mr-2"
                        />
                        <span className="text-sm text-gray-700">
                          Temps sans activité 12 mois
                        </span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={simulatorData.activiteSansEtreAssure}
                          onChange={(e) =>
                            updateSimulatorData(
                              "activiteSansEtreAssure",
                              e.target.checked
                            )
                          }
                          className="mr-2"
                        />
                        <span className="text-sm text-gray-700">
                          Activité sans être assuré
                        </span>
                      </label>
                    </div>

                    {/* Assureur précédent */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Assureur précédent
                      </label>
                      <select
                        value={simulatorData.nomDeLAsurreur}
                        onChange={(e) =>
                          updateSimulatorData("nomDeLAsurreur", e.target.value)
                        }
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                      >
                        <option value="AXA">AXA</option>
                        <option value="MAAF">MAAF</option>
                        <option value="GENERALI">GENERALI</option>
                        <option value="ACASTA">ACASTA (Défaillant)</option>
                        <option value="ALPHA_INSURANCE">
                          ALPHA INSURANCE (Défaillant)
                        </option>
                        <option value="ELITE">ELITE (Défaillant)</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Résultats de simulation */}
                <div className="bg-white shadow rounded-lg p-6">
                  <h4 className="text-md font-medium text-gray-900 mb-4">
                    Résultats de simulation
                  </h4>

                  {simulationResult ? (
                    <div className="space-y-4">
                      {simulationResult.refus ? (
                        <div className="bg-red-50 border border-red-200 rounded-md p-4">
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
                                Demande refusée
                              </h3>
                              <div className="mt-2 text-sm text-red-700">
                                <p>
                                  Cette demande ne peut pas être acceptée selon
                                  les critères de souscription.
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {/* Prime principale */}
                          <div className="bg-green-50 border border-green-200 rounded-md p-4">
                            <div className="text-center">
                              <div className="text-2xl font-bold text-green-800">
                                {simulationResult.PrimeHT.toLocaleString(
                                  "fr-FR"
                                )}{" "}
                                € HT
                              </div>
                              <div className="text-sm text-green-600">
                                Prime annuelle RCD
                              </div>
                              {simulationResult.reprisePasseResult && (
                                <div className="mt-2 text-sm text-orange-600">
                                  +{" "}
                                  {simulationResult.reprisePasseResult.primeReprisePasseTTC.toLocaleString(
                                    "fr-FR"
                                  )}{" "}
                                  € TTC (Reprise du passé)
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Détails des majorations */}
                          <div className="border border-gray-200 rounded-md p-4">
                            <h5 className="font-medium text-gray-900 mb-2">
                              Majorations appliquées
                            </h5>
                            <div className="space-y-1 text-sm">
                              <div className="flex justify-between">
                                <span>Ancienneté société:</span>
                                <span
                                  className={
                                    simulationResult.majorations.dateCreation >
                                    0
                                      ? "text-red-600"
                                      : "text-green-600"
                                  }
                                >
                                  {(
                                    simulationResult.majorations.dateCreation *
                                    100
                                  ).toFixed(1)}
                                  %
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span>Qualification:</span>
                                <span
                                  className={
                                    simulationResult.majorations.qualif < 0
                                      ? "text-green-600"
                                      : "text-gray-600"
                                  }
                                >
                                  {(
                                    simulationResult.majorations.qualif * 100
                                  ).toFixed(1)}
                                  %
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span>Expérience:</span>
                                <span
                                  className={
                                    (simulationResult.majorations
                                      .anneeExperience ?? 0) < 0
                                      ? "text-green-600"
                                      : (simulationResult.majorations
                                          .anneeExperience ?? 0) > 0
                                      ? "text-red-600"
                                      : "text-gray-600"
                                  }
                                >
                                  {(
                                    (simulationResult.majorations
                                      .anneeExperience ?? 0) * 100
                                  ).toFixed(1)}
                                  %
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span>Assureur défaillant:</span>
                                <span
                                  className={
                                    simulationResult.majorations
                                      .assureurDefaillant > 0
                                      ? "text-red-600"
                                      : "text-gray-600"
                                  }
                                >
                                  {(
                                    simulationResult.majorations
                                      .assureurDefaillant * 100
                                  ).toFixed(1)}
                                  %
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Détail par activité */}
                          <div className="border border-gray-200 rounded-md p-4">
                            <h5 className="font-medium text-gray-900 mb-2">
                              Détail par activité
                            </h5>
                            <div className="space-y-2">
                              {simulationResult.returnTab.map(
                                (activity: ActivityTab, index: number) => (
                                  <div key={index} className="text-sm">
                                    <div className="flex justify-between">
                                      <span className="truncate">
                                        {activity.nomActivite}
                                      </span>
                                      <span>
                                        {activity.Prime100Min.toLocaleString(
                                          "fr-FR"
                                        )}{" "}
                                        €
                                      </span>
                                    </div>
                                  </div>
                                )
                              )}
                            </div>
                          </div>

                          {/* Reprise du passé */}
                          {simulationResult.reprisePasseResult && (
                            <div className="border border-orange-200 rounded-md p-4 bg-orange-50">
                              <h5 className="font-medium text-orange-900 mb-2">
                                Reprise du passé
                              </h5>
                              <div className="text-sm space-y-1">
                                <div className="flex justify-between">
                                  <span>Prime reprise TTC:</span>
                                  <span className="font-medium text-orange-800">
                                    {simulationResult.reprisePasseResult.primeReprisePasseTTC.toLocaleString(
                                      "fr-FR"
                                    )}{" "}
                                    €
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Coefficient majoration:</span>
                                  <span>
                                    {
                                      simulationResult.reprisePasseResult
                                        .coefficientMajoration
                                    }
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Ratio S/P:</span>
                                  <span>
                                    {
                                      simulationResult.reprisePasseResult
                                        .ratioSP
                                    }
                                  </span>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center text-gray-500 py-8">
                      <svg
                        className="mx-auto h-12 w-12 text-gray-400"
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
                      <p className="mt-2">
                        Cliquez sur "Calculer la prime" pour voir les résultats
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === "productConfig" && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-900">
                  Configuration des produits
                </h3>
              </div>
              <ProductConfigTab products={products} loading={productsLoading} />
            </div>
          )}

          {activeTab === "correspondance" && <CorrespondanceTab />}

          {activeTab === "overduePayments" && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-900">
                  Paiements en retard ({overdueCount})
                </h3>
                <button
                  onClick={fetchOverduePayments}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  <svg
                    className="w-4 h-4 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                  Actualiser
                </button>
              </div>

              {loadingOverduePayments ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                </div>
              ) : overduePayments.length === 0 ? (
                <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
                  <svg
                    className="mx-auto h-12 w-12 text-green-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <p className="mt-2 text-sm text-gray-500">
                    Aucun paiement en retard ! Tout est à jour 🎉
                  </p>
                </div>
              ) : (
                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                            Référence Devis
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                            Entreprise
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                            Courtier
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                            Échéance n°
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                            Montant TTC
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                            Date d'échéance
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                            Retard
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                            Rappels
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {overduePayments.map((payment: any) => (
                          <tr key={payment.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">
                                {payment.schedule.quote.reference}
                              </div>
                              <div className="text-xs text-gray-500">
                                {payment.schedule.quote.product.name}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {payment.schedule.quote.companyData
                                ?.companyName || "N/A"}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">
                                {payment.schedule.quote.broker.name}
                              </div>
                              <div className="text-xs text-gray-500">
                                {payment.schedule.quote.broker.email}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                #{payment.installmentNumber}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                              {payment.amountTTC.toFixed(2)}€
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {new Date(payment.dueDate).toLocaleDateString(
                                "fr-FR"
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span
                                className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                  payment.daysOverdue > 30
                                    ? "bg-red-100 text-red-800"
                                    : payment.daysOverdue > 15
                                    ? "bg-orange-100 text-orange-800"
                                    : "bg-yellow-100 text-yellow-800"
                                }`}
                              >
                                {payment.daysOverdue} jour
                                {payment.daysOverdue > 1 ? "s" : ""}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              <div className="flex flex-col">
                                <span className="font-medium">
                                  {payment.reminderCount} envoyé
                                  {payment.reminderCount > 1 ? "s" : ""}
                                </span>
                                {payment.lastReminderSent && (
                                  <span className="text-xs text-gray-500">
                                    Dernier :{" "}
                                    {new Date(
                                      payment.lastReminderSent
                                    ).toLocaleDateString("fr-FR")}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                              <button
                                onClick={() => sendPaymentReminder(payment.id)}
                                className="text-orange-600 hover:text-orange-900"
                                title="Envoyer un rappel"
                              >
                                <svg
                                  className="w-5 h-5 inline"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                                  />
                                </svg>
                              </button>
                              <button
                                onClick={() => markPaymentAsPaid(payment.id)}
                                className="text-green-600 hover:text-green-900"
                                title="Marquer comme payé"
                              >
                                <svg
                                  className="w-5 h-5 inline"
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
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === "versions" && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-900">
                  Historique des versions des devis
                </h3>
              </div>

              {/* Sélecteur de devis */}
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sélectionner un devis
                </label>
                <div className="flex gap-2">
                  <select
                    value={selectedQuoteForVersions}
                    onChange={(e) => {
                      setSelectedQuoteForVersions(e.target.value);
                      if (e.target.value) {
                        fetchQuoteVersions(e.target.value);
                      } else {
                        setVersionsData(null);
                      }
                    }}
                    className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">-- Sélectionnez un devis --</option>
                    {quotes.map((quote) => (
                      <option key={quote.id} value={quote.id}>
                        {quote.reference} - {quote.formData.companyName} (
                        {quote.status})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Liste des versions */}
              {loadingVersions ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                </div>
              ) : versionsData ? (
                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                  <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                    <h4 className="text-sm font-semibold text-gray-900">
                      Devis {versionsData.quoteReference} -{" "}
                      {versionsData.totalVersions} version(s)
                    </h4>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                            Version
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                            Action
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                            Statut
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                            Modifié par
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                            Raison
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                            Date
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {versionsData.versions.map((version: any) => (
                          <tr key={version.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                                v{version.version}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {getActionLabel(version.action)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span
                                className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                  version.status === "DRAFT"
                                    ? "bg-gray-100 text-gray-800"
                                    : version.status === "SUBMITTED"
                                    ? "bg-yellow-100 text-yellow-800"
                                    : version.status === "IN_PROGRESS"
                                    ? "bg-blue-100 text-blue-800"
                                    : version.status === "OFFER_READY"
                                    ? "bg-green-100 text-green-800"
                                    : version.status === "ACCEPTED"
                                    ? "bg-emerald-100 text-emerald-800"
                                    : "bg-gray-100 text-gray-800"
                                }`}
                              >
                                {getStatusLabel(version.status)}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div>
                                <div className="text-sm font-medium text-gray-900">
                                  {version.changedBy?.name || "Inconnu"}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {version.userRole}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-500">
                              <div className="max-w-xs truncate">
                                {version.changeReason || "-"}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {new Date(version.createdAt).toLocaleString(
                                "fr-FR"
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <button
                                onClick={() => viewVersionDetails(version)}
                                className="text-indigo-600 hover:text-indigo-900"
                              >
                                Voir détails
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
                  <svg
                    className="mx-auto h-12 w-12 text-gray-400"
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
                  <p className="mt-2 text-sm text-gray-500">
                    Sélectionnez un devis pour voir son historique des versions
                  </p>
                </div>
              )}
            </div>
          )}

          {activeTab === "underwriters" && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-900">
                  Gestion des Souscripteurs
                </h3>
                <button className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700">
                  <svg
                    className="w-4 h-4 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                  Ajouter un souscripteur
                </button>
              </div>
              <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                <table className="min-w-full divide-y divide-gray-300">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                        Nom
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                        Entreprise
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                        Téléphone
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                        Statut
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {usersLoading ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-4 text-center">
                          <div className="flex items-center justify-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                          </div>
                        </td>
                      </tr>
                    ) : underwriters.length === 0 ? (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-6 py-4 text-center text-gray-500"
                        >
                          Aucun souscripteur trouvé
                        </td>
                      </tr>
                    ) : (
                      underwriters.map((underwriter) => (
                        <tr key={underwriter.id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {underwriter.name}
                              </div>
                              <div className="text-sm text-gray-500">
                                {underwriter.email}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {underwriter.companyName}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {underwriter.phone}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                underwriter.isActive
                                  ? "bg-green-100 text-green-800"
                                  : "bg-red-100 text-red-800"
                              }`}
                            >
                              {underwriter.isActive ? "Actif" : "Inactif"}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <button className="text-indigo-600 hover:text-indigo-900 mr-4">
                              Modifier
                            </button>
                            <button
                              onClick={() => toggleUserStatus(underwriter.id)}
                              className="text-red-600 hover:text-red-900"
                            >
                              {underwriter.isActive ? "Désactiver" : "Activer"}
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Product Form Modal - to be implemented */}
      {showProductForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium leading-6 text-gray-900">
                  Nouveau produit d'assurance
                </h3>
                <button
                  onClick={() => setShowProductForm(false)}
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
              <div className="mt-4 text-center">
                <p className="text-sm text-gray-500">
                  Le formulaire de création de produit sera implémenté
                  prochainement.
                </p>
                <div className="mt-4">
                  <button
                    onClick={() => setShowProductForm(false)}
                    className="px-4 py-2 bg-gray-300 text-gray-700 text-base font-medium rounded-md hover:bg-gray-400"
                  >
                    Fermer
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Message Composer Modal */}
      {showMessageComposer && (
        <MessageComposer
          onClose={() => setShowMessageComposer(false)}
          onSuccess={() => {
            fetchReceivedMessages();
            fetchUnreadCount();
          }}
        />
      )}

      {/* Add Broker Modal */}
      <AddBrokerModal
        isOpen={showAddBrokerModal}
        onClose={() => setShowAddBrokerModal(false)}
        onSubmit={handleCreateBroker}
      />

      {/* Version Details Modal */}
      {showVersionDetails && selectedVersion && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-2/3 shadow-lg rounded-md bg-white mb-10">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium leading-6 text-gray-900">
                  Détails de la version {selectedVersion.version}
                </h3>
                <button
                  onClick={() => {
                    setShowVersionDetails(false);
                    setSelectedVersion(null);
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

              <div className="space-y-4">
                {/* Informations générales */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-3">
                    Informations générales
                  </h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Action :</span>
                      <span className="ml-2 font-medium">
                        {getActionLabel(selectedVersion.action)}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Statut :</span>
                      <span className="ml-2 font-medium">
                        {getStatusLabel(selectedVersion.status)}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Modifié par :</span>
                      <span className="ml-2 font-medium">
                        {selectedVersion.changedBy?.name || "Inconnu"}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Rôle :</span>
                      <span className="ml-2 font-medium">
                        {selectedVersion.userRole}
                      </span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-gray-500">Date :</span>
                      <span className="ml-2 font-medium">
                        {new Date(selectedVersion.createdAt).toLocaleString(
                          "fr-FR"
                        )}
                      </span>
                    </div>
                    {selectedVersion.changeReason && (
                      <div className="col-span-2">
                        <span className="text-gray-500">Raison :</span>
                        <p className="mt-1 text-gray-900">
                          {selectedVersion.changeReason}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Changements */}
                {selectedVersion.changes && (
                  <div className="bg-blue-50 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-3">
                      Changements
                    </h4>
                    <div className="text-sm space-y-2">
                      {Object.entries(selectedVersion.changes).map(
                        ([key, value]: [string, any]) => (
                          <div
                            key={key}
                            className="flex items-center justify-between"
                          >
                            <span className="text-gray-700 font-medium">
                              {key} :
                            </span>
                            <div className="flex items-center space-x-2">
                              <span className="px-2 py-1 bg-red-100 text-red-800 rounded">
                                {value.old}
                              </span>
                              <svg
                                className="w-4 h-4 text-gray-400"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M9 5l7 7-7 7"
                                />
                              </svg>
                              <span className="px-2 py-1 bg-green-100 text-green-800 rounded">
                                {value.new}
                              </span>
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                )}

                {/* Données de l'entreprise */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-3">
                    Données de l'entreprise
                  </h4>
                  <div className="text-sm">
                    <pre className="bg-white p-3 rounded border border-gray-200 overflow-x-auto">
                      {JSON.stringify(selectedVersion.companyData, null, 2)}
                    </pre>
                  </div>
                </div>

                {/* Prime calculée */}
                {selectedVersion.calculatedPremium && (
                  <div className="bg-green-50 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-3">
                      Prime calculée
                    </h4>
                    <div className="text-sm">
                      <pre className="bg-white p-3 rounded border border-gray-200 overflow-x-auto max-h-60">
                        {JSON.stringify(
                          selectedVersion.calculatedPremium,
                          null,
                          2
                        )}
                      </pre>
                    </div>
                  </div>
                )}

                {/* Métadonnées techniques */}
                {(selectedVersion.ipAddress || selectedVersion.userAgent) && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-3">
                      Métadonnées techniques
                    </h4>
                    <div className="text-xs space-y-1 text-gray-600">
                      {selectedVersion.ipAddress && (
                        <div>
                          <span className="font-medium">IP :</span>{" "}
                          {selectedVersion.ipAddress}
                        </div>
                      )}
                      {selectedVersion.userAgent && (
                        <div>
                          <span className="font-medium">User Agent :</span>
                          <div className="mt-1 break-all">
                            {selectedVersion.userAgent}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => {
                    setShowVersionDetails(false);
                    setSelectedVersion(null);
                  }}
                  className="px-4 py-2 bg-gray-300 text-gray-700 text-base font-medium rounded-md hover:bg-gray-400"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
