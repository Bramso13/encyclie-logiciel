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
      DRAFT: { color: "bg-gray-100 text-gray-700", text: "Brouillon" },
      INCOMPLETE: { color: "bg-amber-100 text-amber-800", text: "A compléter" },
      SUBMITTED: { color: "bg-sky-100 text-sky-800", text: "Soumis" },
      IN_PROGRESS: { color: "bg-amber-100 text-amber-800", text: "En cours" },
      COMPLEMENT_REQUIRED: {
        color: "bg-orange-100 text-orange-800",
        text: "Complément demandé",
      },
      OFFER_READY: { color: "bg-violet-100 text-violet-800", text: "Offre prête" },
      OFFER_SENT: { color: "bg-sky-100 text-sky-800", text: "Offre envoyée" },
      ACCEPTED: { color: "bg-emerald-100 text-emerald-800", text: "Acceptée" },
      REJECTED: { color: "bg-rose-100 text-rose-800", text: "Refusée" },
      EXPIRED: { color: "bg-gray-100 text-gray-700", text: "Expirée" },
    };

    const config = statusConfig[status] || statusConfig.DRAFT;
    return (
      <span
        className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${config.color}`}
      >
        {config.text}
      </span>
    );
  };

  const handleStatusChange = async (quoteId: string, newStatus: string) => {
    try {
      await updateQuoteStatus(quoteId, newStatus);
    } catch (err) {
      console.error("Error updating quote status:", err);
    }
  };

  if (loading && quotes.length === 0) {
    return (
      <div className="flex items-center justify-center py-16">
        <div
          className="size-8 animate-spin rounded-full border-2 border-[var(--ql-accent)] border-t-transparent"
          aria-hidden
        />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 p-4">
        <p className="text-rose-800">{error}</p>
      </div>
    );
  }

  if (quotes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-gray-200 bg-white py-16 text-center">
        <div
          className="mb-4 rounded-full bg-gray-100 p-4 text-gray-500"
          aria-hidden
        >
          <svg
            className="size-8"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        </div>
        <h3 className="text-sm font-semibold text-gray-900">Aucun devis</h3>
        <p className="mt-1 text-sm text-gray-500">
          Commencez par créer votre première demande de devis.
        </p>
      </div>
    );
  }

  return (
    <div
      className="quotes-list flex h-full max-h-[calc(100vh-12rem)] min-h-[420px] flex-col rounded-xl border border-gray-200 bg-white shadow-sm"
      style={
        {
          "--ql-bg": "#ffffff",
          "--ql-fg": "#171717",
          "--ql-muted": "rgb(243 244 246)",
          "--ql-muted-fg": "rgb(107 114 128)",
          "--ql-border": "rgb(229 231 235)",
          "--ql-accent": "rgb(30 64 175)",
          "--ql-accent-hover": "rgb(49 46 129)",
        } as React.CSSProperties
      }
    >
      {/* Barre de filtres — toujours visible en haut */}
      <div className="flex shrink-0 flex-wrap items-center gap-3 border-b border-[var(--ql-border)] bg-[var(--ql-bg)] px-4 py-3">
        <span className="text-xs font-medium uppercase tracking-wider text-[var(--ql-muted-fg)]">
          Filtres
        </span>
        <select
          value={filters.status || ""}
          onChange={(e) => setFilters({ status: e.target.value || undefined })}
          className="rounded-lg border border-[var(--ql-border)] bg-[var(--ql-bg)] px-3 py-2 text-sm text-[var(--ql-fg)] transition-colors focus:border-[var(--ql-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--ql-accent)]/20"
          aria-label="Statut"
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
          className="rounded-lg border border-[var(--ql-border)] bg-[var(--ql-bg)] px-3 py-2 text-sm text-[var(--ql-fg)] transition-colors focus:border-[var(--ql-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--ql-accent)]/20"
          aria-label="Date de début"
        />
        <input
          type="date"
          value={filters.dateTo || ""}
          onChange={(e) => setFilters({ dateTo: e.target.value || undefined })}
          className="rounded-lg border border-[var(--ql-border)] bg-[var(--ql-bg)] px-3 py-2 text-sm text-[var(--ql-fg)] transition-colors focus:border-[var(--ql-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--ql-accent)]/20"
          aria-label="Date de fin"
        />
        <button
          type="button"
          onClick={() => setFilters({})}
          className="rounded-lg px-3 py-2 text-sm font-medium text-[var(--ql-muted-fg)] transition-colors hover:bg-[var(--ql-muted)] hover:text-[var(--ql-fg)]"
        >
          Effacer
        </button>
      </div>

      {/* Table scrollable — seul le corps défile */}
      <div className="min-h-0 flex-1 overflow-auto">
        <table className="w-full border-collapse text-left text-sm">
          <thead className="sticky top-0 z-10 border-b border-[var(--ql-border)] bg-gray-50">
            <tr>
              <th
                className="w-[220px] px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--ql-muted-fg)]"
                scope="col"
              >
                Actions
              </th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--ql-muted-fg)]">
                Référence / Entreprise
              </th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--ql-muted-fg)]">
                Produit
              </th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--ql-muted-fg)]">
                Prime calculée
              </th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--ql-muted-fg)]">
                Statut
              </th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--ql-muted-fg)]">
                Documents
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--ql-border)]">
            {quotes.map((quote) => (
              <tr
                key={quote.id}
                className="group bg-white transition-colors hover:bg-gray-50"
              >
                <td className="w-[220px] px-4 py-3">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => onQuoteSelect?.(quote.id)}
                      className="rounded-lg px-3 py-1.5 text-sm font-medium text-[var(--ql-accent)] transition-colors hover:bg-blue-50 hover:text-[var(--ql-accent-hover)]"
                    >
                      Voir
                    </button>
                    {quote.status === "OFFER_READY" && (
                      <button
                        type="button"
                        onClick={() =>
                          handleStatusChange(quote.id, "OFFER_SENT")
                        }
                        disabled={loading}
                        className="rounded-lg px-2.5 py-1.5 text-sm font-medium text-emerald-700 transition-colors hover:bg-emerald-50 disabled:opacity-50"
                      >
                        Envoyer
                      </button>
                    )}
                    {quote.status === "OFFER_SENT" && (
                      <>
                        <button
                          type="button"
                          onClick={() =>
                            handleStatusChange(quote.id, "ACCEPTED")
                          }
                          disabled={loading}
                          className="rounded-lg px-2.5 py-1.5 text-sm font-medium text-emerald-700 transition-colors hover:bg-emerald-50 disabled:opacity-50"
                        >
                          Accepter
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            handleStatusChange(quote.id, "REJECTED")
                          }
                          disabled={loading}
                          className="rounded-lg px-2.5 py-1.5 text-sm font-medium text-rose-700 transition-colors hover:bg-rose-50 disabled:opacity-50"
                        >
                          Refuser
                        </button>
                      </>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="font-medium text-gray-900">
                    {quote.reference}
                  </div>
                  <div className="text-xs text-gray-500">
                    {quote.companyData.companyName}
                  </div>
                  <div className="text-xs text-gray-400">
                    SIRET: {quote.companyData.siret}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="text-gray-900">{quote.product.name}</div>
                  <div className="text-xs text-gray-500">
                    {quote.product.code}
                  </div>
                </td>
                <td className="whitespace-nowrap px-4 py-3 font-medium text-gray-900">
                  {quote.calculatedPremium
                    ? `${quote.calculatedPremium.toLocaleString("fr-FR")} €`
                    : "—"}
                </td>
                <td className="px-4 py-3">{getStatusBadge(quote.status)}</td>
                <td className="whitespace-nowrap px-4 py-3 text-gray-500">
                  {quote.documents?.length ?? 0} /{" "}
                  {quote.product.requiredDocs?.length ?? 0} doc.
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination — toujours visible en bas */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-4 border-t border-[var(--ql-border)] bg-[var(--ql-bg)] px-4 py-3">
          <span className="text-sm text-[var(--ql-muted-fg)]">
            Page {pagination.page} sur {pagination.totalPages} ·{" "}
            {pagination.total} résultat{pagination.total > 1 ? "s" : ""}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPagination({ page: pagination.page - 1 })}
              disabled={pagination.page === 1}
              className="rounded-lg border border-[var(--ql-border)] bg-[var(--ql-bg)] px-3 py-2 text-sm font-medium text-[var(--ql-fg)] transition-colors hover:bg-[var(--ql-muted)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Précédent
            </button>
            <button
              type="button"
              onClick={() => setPagination({ page: pagination.page + 1 })}
              disabled={pagination.page === pagination.totalPages}
              className="rounded-lg border border-[var(--ql-border)] bg-[var(--ql-bg)] px-3 py-2 text-sm font-medium text-[var(--ql-fg)] transition-colors hover:bg-[var(--ql-muted)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Suivant
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
