"use client";

import { useEffect, useState } from "react";
import useQuotesStore from "@/lib/stores/quotes-store";
import { useExerciseYearStore } from "@/lib/stores/exercise-year-store";
import { Button, inputClassName, StatusBadge } from "@/components/ui/Controls";
import { DataTable, PaginationBar } from "@/components/ui/DataDisplay";
import { EmptyState, ErrorBanner, LoadingState } from "@/components/ui/Feedback";
import { formatEur } from "@/lib/ui/labels";
import { ConfirmDialog } from "@/components/ui/Modal";

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
  const exerciseYear = useExerciseYearStore((state) => state.exerciseYear);

  const [searchInput, setSearchInput] = useState(filters.search || "");
  const [pendingStatus, setPendingStatus] = useState<{
    id: string;
    status: string;
    label: string;
  } | null>(null);

  useEffect(() => {
    fetchQuotes();
  }, [fetchQuotes, pagination.page, pagination.limit, filters, exerciseYear]);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      const next = searchInput.trim();
      const current = (filters.search || "").trim();
      if (next === current) return;
      setFilters({ search: next || undefined });
      setPagination({ page: 1 });
    }, 350);
    return () => window.clearTimeout(handle);
  }, [searchInput, filters.search, setFilters, setPagination]);

  const visible = quotes;

  if (loading && quotes.length === 0) {
    return <LoadingState active label="Chargement des dossiers" />;
  }

  if (error) {
    return <ErrorBanner>{error}</ErrorBanner>;
  }

  return (
    <>
    <DataTable
      toolbar={
        <>
          <input
            className={`${inputClassName} max-w-xs`}
            placeholder="Rechercher (raison sociale, référence)"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            aria-label="Rechercher un dossier par nom ou référence"
          />
          <select
            value={filters.status || ""}
            onChange={(e) => setFilters({ status: e.target.value || undefined })}
            className={inputClassName}
            aria-label="Filtrer par statut"
          >
            <option value="">Tous les statuts</option>
            <option value="DRAFT">Brouillon</option>
            <option value="INCOMPLETE">À compléter</option>
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
            className={inputClassName}
            aria-label="Date de début"
          />
          <input
            type="date"
            value={filters.dateTo || ""}
            onChange={(e) => setFilters({ dateTo: e.target.value || undefined })}
            className={inputClassName}
            aria-label="Date de fin"
          />
          <Button
            variant="secondary"
            onClick={() => {
              setSearchInput("");
              setFilters({});
            }}
          >
            Effacer les filtres
          </Button>
        </>
      }
      footer={
        <PaginationBar
          page={pagination.page}
          totalPages={pagination.totalPages}
          total={pagination.total}
          limit={pagination.limit}
          itemLabel="dossier"
          onPageChange={(page) => setPagination({ page })}
          onLimitChange={(limit) => setPagination({ page: 1, limit })}
        />
      }
    >
      {visible.length === 0 ? (
        <EmptyState
          title={searchInput ? "Aucun dossier ne correspond" : "Aucun devis"}
          description={
            searchInput
              ? "Aucun dossier ne correspond à cette raison sociale ou référence."
              : "Créez une demande de devis pour commencer."
          }
        />
      ) : (
        <table>
          <thead>
            <tr>
              <th>Référence / Assuré</th>
              <th>Prime</th>
              <th>Statut</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((quote) => {
              return (
                <tr key={quote.id}>
                  <td>
                    <div className="font-medium">{quote.reference}</div>
                    <div className="text-xs text-ink-muted">
                      {quote.companyData?.companyName ||
                        quote.formData?.companyName ||
                        "—"}
                    </div>
                    <div className="text-xs text-ink-muted">
                      {quote.product?.name}
                    </div>
                  </td>
                  <td>{formatEur(quote.calculatedPremium)}</td>
                  <td>
                    <StatusBadge status={quote.status} />
                  </td>
                  <td>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        className="text-sm font-semibold underline decoration-brand underline-offset-4"
                        onClick={() => onQuoteSelect?.(quote.id)}
                      >
                        Voir détails
                      </button>
                      {quote.status === "OFFER_READY" && (
                        <button
                          type="button"
                          className="text-sm font-semibold text-emerald-800"
                          onClick={() =>
                            setPendingStatus({
                              id: quote.id,
                              status: "OFFER_SENT",
                              label: "Marquer l'offre comme envoyée",
                            })
                          }
                        >
                          Marquer comme envoyée
                        </button>
                      )}
                      {quote.status === "OFFER_SENT" && (
                        <>
                          <button
                            type="button"
                            className="text-sm font-semibold text-emerald-800"
                            onClick={() =>
                              setPendingStatus({
                                id: quote.id,
                                status: "ACCEPTED",
                                label: "Accepter l'offre",
                              })
                            }
                          >
                            Accepter l'offre
                          </button>
                          <button
                            type="button"
                            className="text-sm font-semibold text-rose-700"
                            onClick={() =>
                              setPendingStatus({
                                id: quote.id,
                                status: "REJECTED",
                                label: "Refuser l'offre",
                              })
                            }
                          >
                            Refuser l'offre
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </DataTable>
    <ConfirmDialog
      open={!!pendingStatus}
      title={pendingStatus?.label || "Confirmer"}
      message="Cette action met à jour le statut du dossier. Continuer ?"
      confirmLabel="Confirmer"
      onCancel={() => setPendingStatus(null)}
      onConfirm={async () => {
        if (!pendingStatus) return;
        await updateQuoteStatus(pendingStatus.id, pendingStatus.status);
        setPendingStatus(null);
      }}
    />
    </>
  );
}
