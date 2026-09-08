"use client";

import { useMemo, useState } from "react";
import useQuotesStore from "@/lib/stores/quotes-store";
import { Button, inputClassName, StatusBadge } from "@/components/ui/Controls";
import { DataTable, PaginationBar } from "@/components/ui/DataDisplay";
import { EmptyState, LoadingState } from "@/components/ui/Feedback";
import { ConfirmDialog, Modal } from "@/components/ui/Modal";
import { formatDateFr } from "@/lib/ui/labels";
import { notify } from "@/lib/ui/notify";

const DEFAULT_QUOTE_JSON_PRODUCT_ID = "cmdw8d0js0001yx04kbtrri2o";

const EXAMPLE_QUOTE_JSON = {
  companyData: {
    siret: "81404561300019",
    address: "10 RUE ECOLES BONOVO, MTSAPERE, 97600, MAMOUDZOU, France",
    legalForm: "Entrepreneur individuel",
    companyName: "MAJANI ZAIDOU",
    creationDate: "2015-10-12",
  },
  formData: {
    city: "MAMOUDZOU",
    address: "10 RUE ECOLES BONOVO, MTSAPERE, 97600, MAMOUDZOU, France",
    includePJ: true,
    legalForm: "Entrepreneur individuel",
    territory: "MAYOTTE",
    activities: [{ code: "20", caSharePercent: 100 }],
    dateDeffet: "2026-01-01",
    enCreation: false,
    mailAdress: "vk@encyclie-construction.com",
    postalCode: "97600",
    companyName: "MAJANI ZAIDOU",
    periodicity: "trimestriel",
    phoneNumber: "06.39.69.56.47",
    creationDate: "2015-10-12",
    directorName: "ZAIDOU MAJANI",
    nombreSalaries: "2",
    tradingPercent: "0",
    chiffreAffaires: "90000",
    previousInsurer: "AUTRES",
    experienceMetier: "5",
    honoraireCourtier: "0",
    previousRcdStatus: "RESILIE",
    resiliationReason: "INITIATIVE_ASSURE",
    tempsSansActivite: "NON",
    assureurDefaillant: true,
    subContractingPercent: "0",
    dateFinCouverturePrecedente: "2024-12-31",
    nombreAnneeAssuranceContinue: "-1",
    absenceDeSinistreSurLes5DernieresAnnees: "ASSUREUR_DEFAILLANT",
    sansActiviteDepuisPlusDe12MoisSansFermeture: "NON",
  } as Record<string, unknown>,
};

export function AdminQuotesPanel({
  onCreateQuote,
  onQuoteCreated,
}: {
  onCreateQuote: () => void;
  onQuoteCreated: (quote: unknown) => void;
}) {
  const {
    quotes,
    loading,
    fetchQuotes,
    createQuote,
    deleteQuote,
    pagination,
    setPagination,
  } = useQuotesStore();

  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [quoteToDelete, setQuoteToDelete] = useState<{
    id: string;
    reference: string;
    companyName: string;
  } | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importInput, setImportInput] = useState("");
  const [importError, setImportError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return quotes;
    return quotes.filter((quote) => {
      const company =
        quote.formData?.companyName ||
        quote.companyData?.companyName ||
        "";
      return [
        quote.reference,
        quote.product?.name,
        quote.broker?.name,
        quote.broker?.companyName,
        company,
        quote.formData?.directorName,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q));
    });
  }, [quotes, search]);

  const allSelected =
    filtered.length > 0 && filtered.every((quote) => selectedIds.has(quote.id));

  const handleImport = async () => {
    setImportError(null);
    let data: {
      productId?: string;
      companyData?: Record<string, unknown>;
      formData?: Record<string, unknown>;
      status?: string;
    };
    try {
      data = JSON.parse(importInput);
    } catch {
      setImportError("Le contenu collé n'est pas un fichier de données valide.");
      return;
    }
    const productId = data.productId ?? DEFAULT_QUOTE_JSON_PRODUCT_ID;
    if (!data.companyData || !data.formData) {
      setImportError(
        "Le fichier doit contenir les informations entreprise et le formulaire.",
      );
      return;
    }
    const quote = await createQuote({
      productId,
      companyData: data.companyData,
      formData: data.formData,
      status: data.status ?? "INCOMPLETE",
    });
    if (quote) {
      setImportOpen(false);
      setImportInput("");
      onQuoteCreated(quote);
    } else {
      setImportError(
        useQuotesStore.getState().error ||
          "La création du dossier a échoué. Vérifiez les données.",
      );
    }
  };

  return (
    <div className="space-y-4">
      <DataTable
        toolbar={
          <>
            <input
              className={`${inputClassName} max-w-sm`}
              placeholder="Rechercher sur cette page (nom, référence, courtier)"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Rechercher un dossier"
            />
            <div className="ml-auto flex flex-wrap gap-2">
              {selectedIds.size > 0 ? (
                <Button variant="danger" onClick={() => setBulkOpen(true)}>
                  Supprimer la sélection ({selectedIds.size})
                </Button>
              ) : null}
              <Button
                variant="secondary"
                onClick={() => {
                  setImportOpen(true);
                  setImportError(null);
                  setImportInput("");
                }}
              >
                Créer depuis des données enregistrées
              </Button>
              <Button onClick={onCreateQuote}>Créer une demande de devis</Button>
            </div>
          </>
        }
        footer={
          <PaginationBar
            page={pagination.page}
            totalPages={pagination.totalPages}
            total={pagination.total}
            limit={pagination.limit}
            itemLabel="dossier"
            onPageChange={(page) => {
              setPagination({ page });
              fetchQuotes();
            }}
            onLimitChange={(limit) => {
              setPagination({ page: 1, limit });
              fetchQuotes();
            }}
          />
        }
      >
        {loading && quotes.length === 0 ? (
          <LoadingState active label="Chargement des dossiers" />
        ) : filtered.length === 0 ? (
          <EmptyState
            title={search ? "Aucun dossier sur cette page" : "Aucun dossier"}
            description={
              search
                ? "La recherche porte sur la page affichée. Changez de page ou élargissez le nombre de lignes."
                : "Créez une demande de devis pour commencer."
            }
          />
        ) : (
          <table>
            <thead>
              <tr>
                <th>
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={() => {
                      setSelectedIds((prev) => {
                        if (allSelected) return new Set();
                        return new Set(filtered.map((quote) => quote.id));
                      });
                    }}
                    aria-label="Sélectionner tous les dossiers de la page"
                  />
                </th>
                <th>Référence</th>
                <th>Courtier</th>
                <th>Assuré</th>
                <th>Statut</th>
                <th>Créé le</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((quote) => {
                const company =
                  quote.formData?.companyName ||
                  quote.companyData?.companyName ||
                  "—";
                return (
                  <tr key={quote.id}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selectedIds.has(quote.id)}
                        onChange={() => {
                          setSelectedIds((prev) => {
                            const next = new Set(prev);
                            if (next.has(quote.id)) next.delete(quote.id);
                            else next.add(quote.id);
                            return next;
                          });
                        }}
                        aria-label={`Sélectionner ${quote.reference}`}
                      />
                    </td>
                    <td className="font-medium">{quote.reference}</td>
                    <td>
                      <div>{quote.broker?.name}</div>
                      <div className="text-xs text-ink-muted">
                        {quote.broker?.companyName}
                      </div>
                    </td>
                    <td>{company}</td>
                    <td>
                      <StatusBadge status={quote.status} />
                    </td>
                    <td>{formatDateFr(quote.createdAt)}</td>
                    <td>
                      <div className="flex flex-wrap gap-2">
                        <a
                          href={`/quotes/${quote.id}`}
                          className="text-sm font-semibold text-ink underline decoration-brand underline-offset-4"
                        >
                          Ouvrir
                        </a>
                        <button
                          type="button"
                          className="text-sm font-semibold text-rose-700"
                          onClick={() => {
                            setQuoteToDelete({
                              id: quote.id,
                              reference: quote.reference,
                              companyName: company,
                            });
                            setDeleteError(null);
                          }}
                        >
                          Supprimer
                        </button>
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
        open={!!quoteToDelete}
        title="Supprimer le dossier"
        message={
          quoteToDelete
            ? `Supprimer le devis ${quoteToDelete.reference} (${quoteToDelete.companyName}) ? Cette action est irréversible.`
            : ""
        }
        confirmLabel="Supprimer"
        danger
        error={deleteError}
        onCancel={() => setQuoteToDelete(null)}
        onConfirm={async () => {
          if (!quoteToDelete) return;
          try {
            await deleteQuote(quoteToDelete.id);
            setQuoteToDelete(null);
            fetchQuotes();
            notify("Dossier supprimé.", "success");
          } catch {
            setDeleteError("La suppression du dossier a échoué.");
          }
        }}
      />

      <ConfirmDialog
        open={bulkOpen}
        title="Supprimer les dossiers sélectionnés"
        message={`Supprimer ${selectedIds.size} dossier(s) ? Cette action est irréversible.`}
        confirmLabel="Supprimer"
        danger
        busy={bulkBusy}
        error={deleteError}
        onCancel={() => {
          if (!bulkBusy) setBulkOpen(false);
        }}
        onConfirm={async () => {
          try {
            setBulkBusy(true);
            setDeleteError(null);
            for (const id of selectedIds) {
              await deleteQuote(id);
            }
            setSelectedIds(new Set());
            setBulkOpen(false);
            fetchQuotes();
            notify("Dossiers supprimés.", "success");
          } catch {
            setDeleteError(
              "La suppression a échoué. Certains dossiers sont peut-être encore présents.",
            );
          } finally {
            setBulkBusy(false);
          }
        }}
      />

      <Modal
        open={importOpen}
        title="Créer un dossier depuis des données enregistrées"
        onClose={() => setImportOpen(false)}
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() =>
                setImportInput(JSON.stringify(EXAMPLE_QUOTE_JSON, null, 2))
              }
            >
              Charger un exemple
            </Button>
            <Button onClick={handleImport}>Créer le dossier</Button>
          </>
        }
      >
        <p className="mb-3 text-ink-muted">
          Collez les informations entreprise et le formulaire. Le produit RC
          Décennale est utilisé par défaut.
        </p>
        {importError ? (
          <p className="mb-3 text-rose-700">{importError}</p>
        ) : null}
        <textarea
          className={`${inputClassName} min-h-48 font-mono text-xs`}
          value={importInput}
          onChange={(e) => setImportInput(e.target.value)}
          aria-label="Données du dossier"
        />
      </Modal>
    </div>
  );
}
