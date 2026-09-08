"use client";

import { useEffect, useMemo, useState } from "react";
import useUsersStore from "@/lib/stores/users-store";
import { Button, inputClassName } from "@/components/ui/Controls";
import { DataTable, PaginationBar } from "@/components/ui/DataDisplay";
import { EmptyState, LoadingState } from "@/components/ui/Feedback";
import { notify } from "@/lib/ui/notify";
import { importBrokers } from "@/scripts/import-brokers";
import AddBrokerModal from "@/components/modals/AddBrokerModal";

export function AdminBrokersPanel() {
  const {
    brokers,
    loading,
    pagination,
    fetchBrokers,
    setPagination,
    toggleUserStatus,
  } = useUsersStore();

  useEffect(() => {
    fetchBrokers();
  }, [fetchBrokers, pagination.page, pagination.limit]);
  const [query, setQuery] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [importing, setImporting] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return brokers;
    return brokers.filter((broker) =>
      [broker.name, broker.email, broker.companyName, broker.phone]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q)),
    );
  }, [brokers, query]);

  const handleCreateBroker = async (brokerData: {
    name: string;
    email: string;
    companyName: string;
    phone: string;
    address: string;
    siretNumber?: string;
    brokerCode: string;
  }) => {
    const response = await fetch("/api/brokers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(brokerData),
    });
    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error || "La création du courtier a échoué.");
    }
    await fetchBrokers();
    notify("Courtier créé.", "success");
    return result.data;
  };

  const handleImport = async () => {
    setImporting(true);
    try {
      const results = await importBrokers(handleCreateBroker);
      await fetchBrokers();
      notify(
        `Import terminé : ${results.success} créé(s), ${results.skipped} ignoré(s), ${results.failed} échec(s).`,
        results.failed ? "error" : "success",
      );
    } catch (error) {
      notify(
        error instanceof Error ? error.message : "L'import des courtiers a échoué.",
        "error",
      );
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-4">
      <DataTable
        toolbar={
          <>
            <input
              className={`${inputClassName} max-w-sm`}
              placeholder="Rechercher un courtier (nom, cabinet, e-mail)"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Rechercher un courtier"
            />
            <div className="ml-auto flex flex-wrap gap-2">
              <Button variant="secondary" onClick={handleImport} disabled={importing}>
                {importing ? "Import…" : "Importer des courtiers"}
              </Button>
              <Button onClick={() => setShowAdd(true)}>Ajouter un courtier</Button>
            </div>
          </>
        }
        footer={
          <PaginationBar
            page={pagination.page}
            totalPages={pagination.totalPages}
            total={pagination.total}
            limit={pagination.limit}
            itemLabel="courtier"
            onPageChange={(page) => setPagination({ page })}
            onLimitChange={(limit) => setPagination({ page: 1, limit })}
          />
        }
      >
        {loading ? (
          <LoadingState active label="Chargement des courtiers" />
        ) : filtered.length === 0 ? (
          <EmptyState
            title={query ? "Aucun courtier ne correspond" : "Aucun courtier"}
            description={
              query
                ? "Modifiez la recherche ou ajoutez un courtier."
                : "Ajoutez un courtier pour lui ouvrir un accès."
            }
          />
        ) : (
          <table>
            <thead>
              <tr>
                <th>Courtier</th>
                <th>Cabinet</th>
                <th>Téléphone</th>
                <th>Statut</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((broker) => (
                <tr key={broker.id}>
                  <td>
                    <div className="font-medium text-ink">{broker.name}</div>
                    <div className="text-xs text-ink-muted">{broker.email}</div>
                  </td>
                  <td>{broker.companyName || "—"}</td>
                  <td>{broker.phone || "—"}</td>
                  <td>
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        broker.isActive
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-zinc-100 text-zinc-600"
                      }`}
                    >
                      {broker.isActive ? "Actif" : "Inactif"}
                    </span>
                  </td>
                  <td>
                    <Button
                      variant="ghost"
                      className="!text-ink hover:!bg-surface"
                      onClick={() => toggleUserStatus(broker.id)}
                    >
                      {broker.isActive ? "Désactiver" : "Activer"}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </DataTable>
      <p className="text-sm text-ink-muted">
        {pagination.total} courtier{pagination.total > 1 ? "s" : ""} au total
        {query ? ` · ${filtered.length} sur cette page` : ""}
      </p>
      <AddBrokerModal
        isOpen={showAdd}
        onClose={() => setShowAdd(false)}
        onSubmit={handleCreateBroker}
      />
    </div>
  );
}
