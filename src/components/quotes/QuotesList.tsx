"use client";

import { useEffect } from "react";
import useQuotesStore from "@/lib/stores/quotes-store";

interface QuotesListProps {
  onQuoteSelect?: (quoteId: string) => void;
}

export default function QuotesList({ onQuoteSelect }: QuotesListProps) {
  const {
    quotes,
    loading,
    error,
    pagination,
    filters,
    fetchQuotes,
    setFilters,
    setPagination,
    updateQuoteStatus,
  } = useQuotesStore();

  useEffect(() => {
    fetchQuotes();
  }, [fetchQuotes, pagination.page, filters]);

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { color: string; text: string }> = {
      DRAFT: { color: "bg-gray-100 text-gray-800", text: "Brouillon" },
      INCOMPLETE: {
        color: "bg-yellow-100 text-yellow-800",
        text: "A compléter",
      },
      SUBMITTED: { color: "bg-blue-100 text-blue-800", text: "Soumis" },
      IN_PROGRESS: { color: "bg-yellow-100 text-yellow-800", text: "En cours" },
      COMPLEMENT_REQUIRED: {
        color: "bg-orange-100 text-orange-800",
        text: "Complément demandé",
      },
      OFFER_READY: {
        color: "bg-purple-100 text-purple-800",
        text: "Offre prête",
      },
      OFFER_SENT: { color: "bg-blue-100 text-blue-800", text: "Offre envoyée" },
      ACCEPTED: { color: "bg-green-100 text-green-800", text: "Acceptée" },
      REJECTED: { color: "bg-red-100 text-red-800", text: "Refusée" },
      EXPIRED: { color: "bg-gray-100 text-gray-800", text: "Expirée" },
    };

    const config = statusConfig[status] || statusConfig.DRAFT;
    return (
      <span
        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${config.color}`}
      >
        {config.text}
      </span>
    );
  };

  const handleStatusChange = async (quoteId: string, newStatus: string) => {
    try {
      await updateQuoteStatus(quoteId, newStatus);
    } catch (error) {
      console.error("Error updating quote status:", error);
    }
  };

  if (loading && quotes.length === 0) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">{error}</p>
      </div>
    );
  }

  if (quotes.length === 0) {
    return (
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
        <h3 className="mt-2 text-sm font-medium text-gray-900">Aucun devis</h3>
        <p className="mt-1 text-sm text-gray-500">
          Commencez par créer votre première demande de devis.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-4 p-4 bg-gray-50 rounded-lg">
        <select
          value={filters.status || ""}
          onChange={(e) => setFilters({ status: e.target.value || undefined })}
          className="px-3 py-2 border border-gray-300 rounded-md text-sm"
        >
          <option value="">Tous les statuts</option>
          <option value="DRAFT">Brouillon</option>
          <option value="SUBMITTED">Soumis</option>
          <option value="IN_PROGRESS">En cours</option>
          <option value="COMPLEMENT_REQUIRED">Complément demandé</option>
          <option value="OFFER_READY">Offre prête</option>
          <option value="OFFER_SENT">Offre envoyée</option>
          <option value="ACCEPTED">Acceptée</option>
          <option value="REJECTED">Refusée</option>
        </select>

        <input
          type="date"
          value={filters.dateFrom || ""}
          onChange={(e) =>
            setFilters({ dateFrom: e.target.value || undefined })
          }
          className="px-3 py-2 border border-gray-300 rounded-md text-sm"
          placeholder="Date de début"
        />

        <input
          type="date"
          value={filters.dateTo || ""}
          onChange={(e) => setFilters({ dateTo: e.target.value || undefined })}
          className="px-3 py-2 border border-gray-300 rounded-md text-sm"
          placeholder="Date de fin"
        />

        <button
          onClick={() => setFilters({})}
          className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
        >
          Effacer les filtres
        </button>
      </div>

      {/* Table */}
      <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
        <table className="min-w-full divide-y divide-gray-300">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                Référence / Entreprise
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                Produit
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                Prime calculée
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                Statut
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                Documents
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {quotes &&
              quotes.map((quote) => (
                <tr key={quote.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {quote.reference}
                      </div>
                      <div className="text-sm text-gray-500">
                        {quote.companyData.companyName}
                      </div>
                      <div className="text-xs text-gray-400">
                        SIRET: {quote.companyData.siret}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {quote.product.name}
                    </div>
                    <div className="text-xs text-gray-500">
                      {quote.product.code}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {quote.calculatedPremium
                      ? `${quote.calculatedPremium.toLocaleString("fr-FR")} €`
                      : "-"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(quote.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {quote.documents &&
                      `${quote.documents.length}/${
                        quote.product.requiredDocs?.length || 0
                      } document(s)`}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    <button
                      onClick={() => onQuoteSelect?.(quote.id)}
                      className="text-indigo-600 hover:text-indigo-900"
                    >
                      Voir
                    </button>

                    {quote.status === "OFFER_READY" && (
                      <button
                        onClick={() =>
                          handleStatusChange(quote.id, "OFFER_SENT")
                        }
                        className="text-green-600 hover:text-green-900"
                        disabled={loading}
                      >
                        Envoyer offre
                      </button>
                    )}

                    {quote.status === "OFFER_SENT" && (
                      <>
                        <button
                          onClick={() =>
                            handleStatusChange(quote.id, "ACCEPTED")
                          }
                          className="text-green-600 hover:text-green-900"
                          disabled={loading}
                        >
                          Accepter
                        </button>
                        <button
                          onClick={() =>
                            handleStatusChange(quote.id, "REJECTED")
                          }
                          className="text-red-600 hover:text-red-900"
                          disabled={loading}
                        >
                          Refuser
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 bg-white border-t border-gray-200 sm:px-6">
          <div className="flex items-center">
            <span className="text-sm text-gray-700">
              Page {pagination.page} sur {pagination.totalPages} (
              {pagination.total} résultats)
            </span>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setPagination({ page: pagination.page - 1 })}
              disabled={pagination.page === 1}
              className="px-3 py-2 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Précédent
            </button>
            <button
              onClick={() => setPagination({ page: pagination.page + 1 })}
              disabled={pagination.page === pagination.totalPages}
              className="px-3 py-2 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Suivant
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
