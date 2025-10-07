"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import useQuotesStore from "@/lib/stores/quotes-store";
import useProductsStore from "@/lib/stores/products-store";
import useMessagesStore from "@/lib/stores/messages-store";
import QuotesList from "@/components/quotes/QuotesList";
import QuoteForm from "@/components/quotes/QuoteForm";
import QuoteSuccessPage from "@/components/quotes/QuoteSuccessPage";

interface BrokerScreenProps {
  user: {
    name: string;
    email: string;
    role: string;
  };
}

interface TutorialVideo {
  title: string;
  url: string;
}

// Liste des vidéos explicatives
const TUTORIAL_VIDEOS: TutorialVideo[] = [
  // { title: "Comment créer un devis", url: "https://example.com/video1" },
  // { title: "Gestion des contrats", url: "https://example.com/video2" },
  // { title: "Suivi des commissions", url: "https://example.com/video3" },
];

export default function BrokerScreen({ user }: BrokerScreenProps) {
  const [activeTab, setActiveTab] = useState("quotes");
  const [showQuoteForm, setShowQuoteForm] = useState(false);
  const [showSuccessPage, setShowSuccessPage] = useState(false);
  const [createdQuote, setCreatedQuote] = useState<any>(null);
  const [selectedQuoteId, setSelectedQuoteId] = useState<string | null>(null);
  const [showTutorialModal, setShowTutorialModal] = useState(false);
  const router = useRouter();

  const {
    quotes,
    loading: quotesLoading,
    fetchQuotes,
    setFilters,
  } = useQuotesStore();

  const { activeProducts, fetchActiveProducts } = useProductsStore();

  const {
    receivedMessages,
    unreadCount,
    loading: messagesLoading,
    fetchReceivedMessages,
    fetchUnreadCount,
    markMessageAsRead,
    deleteMessage,
  } = useMessagesStore();

  useEffect(() => {
    fetchQuotes();
    fetchActiveProducts();
    fetchReceivedMessages();
    fetchUnreadCount();
  }, [
    fetchQuotes,
    fetchActiveProducts,
    fetchReceivedMessages,
    fetchUnreadCount,
  ]);

  // Calculate stats from real data
  const stats = {
    quotesEnCours: quotes.filter(
      (q) => q.status === "IN_PROGRESS" || q.status === "SUBMITTED"
    ).length,
    offresEmises: quotes.filter((q) => q.status === "OFFER_SENT").length,
    contratsActifs: quotes.filter((q) => q.status === "ACCEPTED").length, // TODO: Get from contracts
    commissionsEnAttente: 0, // TODO: Get from commissions API
    totalCommissions: 0, // TODO: Get from commissions API
  };

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
    // The store will automatically update with the new quote
  };

  const handleBackToDashboard = () => {
    setShowSuccessPage(false);
    setCreatedQuote(null);
    setActiveTab("quotes");
  };

  const handleQuoteSelect = (quoteId: string) => {
    router.push(`/quotes/${quoteId}`);
  };

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
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Espace Courtier Assurance
            </h1>
            <p className="text-gray-600 mt-2">
              Bienvenue {user.name}, gérez vos devis et contrats d'assurance
            </p>
          </div>
          <div className="flex space-x-3">
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
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white overflow-hidden shadow rounded-lg">
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
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Devis en cours
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {stats.quotesEnCours}
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
                <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                  <svg
                    className="w-5 h-5 text-white"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Offres émises
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {stats.offresEmises}
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
                    Contrats actifs
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {stats.contratsActifs}
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
                <div className="w-8 h-8 bg-purple-500 rounded-md flex items-center justify-center">
                  <svg
                    className="w-5 h-5 text-white"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" />
                  </svg>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Commissions dues
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {stats.commissionsEnAttente}
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
                <div className="w-8 h-8 bg-indigo-500 rounded-md flex items-center justify-center">
                  <svg
                    className="w-5 h-5 text-white"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Total commissions
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {stats.totalCommissions.toLocaleString("fr-FR")} €
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Urgent notifications can be added later if needed */}

      {/* Tabs */}
      <div className="bg-white shadow rounded-lg">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6">
            <button
              onClick={() => setActiveTab("quotes")}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === "quotes"
                  ? "border-indigo-500 text-indigo-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Demandes de devis ({quotes.length})
            </button>
            <button
              onClick={() => setActiveTab("contracts")}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === "contracts"
                  ? "border-indigo-500 text-indigo-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Portefeuille
            </button>
            <button
              onClick={() => setActiveTab("commissions")}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === "commissions"
                  ? "border-indigo-500 text-indigo-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Commissions
            </button>
            <button
              onClick={() => setActiveTab("notifications")}
              className={`py-4 px-1 border-b-2 font-medium text-sm relative ${
                activeTab === "notifications"
                  ? "border-indigo-500 text-indigo-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Messages & Notifications ({receivedMessages.length})
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full px-2 py-1 min-w-[20px] h-5 flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </button>
          </nav>
        </div>

        <div className="p-6">
          {activeTab === "quotes" && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-900">
                  Demandes de devis
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
                  Nouvelle demande
                </button>
              </div>
              <QuotesList onQuoteSelect={handleQuoteSelect} />
            </div>
          )}

          {activeTab === "contracts" && (
            <div className="text-center py-8">
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
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
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                Gestion des contrats
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                La gestion des contrats sera disponible prochainement.
              </p>
            </div>
          )}

          {activeTab === "commissions" && (
            <div className="text-center py-8">
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
                />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                Suivi des commissions
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Le suivi des commissions sera disponible prochainement.
              </p>
            </div>
          )}

          {activeTab === "notifications" && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-900">
                  Messages et Notifications
                </h3>
                {unreadCount > 0 && (
                  <button
                    onClick={() => {
                      receivedMessages
                        .filter((m) => !m.isRead)
                        .forEach((m) => markMessageAsRead(m.id));
                    }}
                    className="text-sm text-indigo-600 hover:text-indigo-900"
                  >
                    Marquer tout comme lu
                  </button>
                )}
              </div>

              {messagesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                </div>
              ) : receivedMessages.length === 0 ? (
                <div className="text-center py-8">
                  <svg
                    className="mx-auto h-12 w-12 text-gray-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-2.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 009.586 13H7"
                    />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">
                    Aucun message
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Vous n'avez reçu aucun message pour le moment.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {receivedMessages.map((message) => (
                    <div
                      key={message.id}
                      className={`p-4 rounded-lg border ${
                        !message.isRead
                          ? "bg-blue-50 border-blue-200"
                          : "bg-white border-gray-200"
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <h4
                              className={`text-sm ${
                                !message.isRead ? "font-bold" : "font-medium"
                              } text-gray-900`}
                            >
                              {message.title}
                            </h4>
                            {message.isUrgent && (
                              <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                                Urgent
                              </span>
                            )}
                            {!message.isRead && (
                              <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                                Nouveau
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 mb-2">
                            {message.message}
                          </p>
                          <p className="text-xs text-gray-500">
                            {new Date(message.createdAt).toLocaleDateString(
                              "fr-FR",
                              {
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              }
                            )}
                          </p>
                        </div>
                        <div className="flex space-x-2 ml-4">
                          {!message.isRead && (
                            <button
                              onClick={() => markMessageAsRead(message.id)}
                              className="text-green-600 hover:text-green-800 text-sm"
                            >
                              <svg
                                className="w-4 h-4"
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                  clipRule="evenodd"
                                />
                              </svg>
                            </button>
                          )}
                          <button
                            onClick={() => deleteMessage(message.id)}
                            className="text-red-600 hover:text-red-800 text-sm"
                          >
                            <svg
                              className="w-4 h-4"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path
                                fillRule="evenodd"
                                d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"
                                clipRule="evenodd"
                              />
                              <path
                                fillRule="evenodd"
                                d="M10 5a1 1 0 011 1v6a1 1 0 11-2 0V6a1 1 0 011-1zm4 0a1 1 0 011 1v6a1 1 0 11-2 0V6a1 1 0 011-1zm-8 0a1 1 0 011 1v6a1 1 0 11-2 0V6a1 1 0 011-1z"
                                clipRule="evenodd"
                              />
                              <path
                                fillRule="evenodd"
                                d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM4 7a1 1 0 000 2h12a1 1 0 100-2H4z"
                                clipRule="evenodd"
                              />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Bouton flottant pour les vidéos explicatives */}
      <button
        onClick={() => setShowTutorialModal(true)}
        className="fixed bottom-8 right-8 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-full shadow-2xl transition-all duration-300 hover:scale-105 z-50 animate-pulse hover:animate-none group"
        title="Vidéos explicatives"
        style={{
          boxShadow:
            "0 10px 40px rgba(99, 102, 241, 0.5), 0 0 20px rgba(99, 102, 241, 0.3)",
        }}
      >
        <div className="flex items-center gap-3 px-6 py-4">
          <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 20 20">
            <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
          </svg>
          <span className="font-semibold text-base whitespace-nowrap">
            Vidéos d'aide
          </span>
          <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full px-2 py-1 animate-bounce">
            AIDE
          </span>
        </div>
      </button>

      {/* Modal des vidéos explicatives */}
      {showTutorialModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900">
                Vidéos explicatives
              </h2>
              <button
                onClick={() => setShowTutorialModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
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

            <div className="p-6 overflow-y-auto max-h-[calc(80vh-80px)]">
              {TUTORIAL_VIDEOS.length === 0 ? (
                <div className="text-center py-12">
                  <svg
                    className="mx-auto h-12 w-12 text-gray-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                    />
                  </svg>
                  <p className="mt-4 text-gray-600 text-lg">
                    Les vidéos explicatives sont en cours de création.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {TUTORIAL_VIDEOS.map((video, index) => (
                    <a
                      key={index}
                      href={video.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-indigo-300 transition-all duration-200"
                    >
                      <div className="flex-shrink-0 w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                        <svg
                          className="w-5 h-5 text-indigo-600"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                        </svg>
                      </div>
                      <div className="ml-4 flex-1">
                        <h3 className="text-sm font-medium text-gray-900">
                          {video.title}
                        </h3>
                      </div>
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
                          d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                        />
                      </svg>
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
