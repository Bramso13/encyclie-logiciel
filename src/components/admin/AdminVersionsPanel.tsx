"use client";

import { useState } from "react";
import useQuotesStore from "@/lib/stores/quotes-store";
import { Button, inputClassName, StatusBadge } from "@/components/ui/Controls";
import { DataTable } from "@/components/ui/DataDisplay";
import { EmptyState, LoadingState } from "@/components/ui/Feedback";
import { Modal } from "@/components/ui/Modal";
import {
  formatDateFr,
  quoteStatusLabel,
  versionActionLabel,
} from "@/lib/ui/labels";
import { notify } from "@/lib/ui/notify";

type VersionRow = {
  id: string;
  version: number;
  action: string;
  status: string;
  createdAt: string;
  changedBy?: { name?: string };
  changes?: unknown;
};

export function AdminVersionsPanel() {
  const { quotes } = useQuotesStore();
  const [quoteId, setQuoteId] = useState("");
  const [versions, setVersions] = useState<{
    quoteReference: string;
    totalVersions: number;
    versions: VersionRow[];
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<VersionRow | null>(null);

  const load = async (id: string) => {
    if (!id) {
      setVersions(null);
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(`/api/quotes/${id}/versions`);
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || "Impossible de charger l'historique.");
      }
      setVersions(data.data);
    } catch (error) {
      notify(
        error instanceof Error ? error.message : "Chargement de l'historique impossible.",
        "error",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <label className="block text-sm font-medium text-ink">
        Dossier
        <select
          className={`${inputClassName} mt-1`}
          value={quoteId}
          onChange={(e) => {
            setQuoteId(e.target.value);
            load(e.target.value);
          }}
        >
          <option value="">Choisir un dossier</option>
          {quotes.map((quote) => (
            <option key={quote.id} value={quote.id}>
              {quote.reference} —{" "}
              {quote.formData?.companyName || quote.companyData?.companyName} (
              {quoteStatusLabel(quote.status)})
            </option>
          ))}
        </select>
      </label>

      {loading ? (
        <LoadingState active label="Chargement de l'historique" />
      ) : !quoteId ? (
        <EmptyState
          title="Aucun dossier sélectionné"
          description="Choisissez un devis pour voir les versions enregistrées."
        />
      ) : versions && versions.versions?.length ? (
        <DataTable>
          <table>
            <thead>
              <tr>
                <th>Version</th>
                <th>Action</th>
                <th>Statut</th>
                <th>Auteur</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {versions.versions.map((version) => (
                <tr key={version.id}>
                  <td>v{version.version}</td>
                  <td>{versionActionLabel(version.action)}</td>
                  <td>
                    <StatusBadge status={version.status} />
                  </td>
                  <td>{version.changedBy?.name || "—"}</td>
                  <td>{formatDateFr(version.createdAt)}</td>
                  <td>
                    <Button
                      variant="secondary"
                      onClick={() => setSelected(version)}
                    >
                      Voir le détail
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </DataTable>
      ) : (
        <EmptyState
          title="Aucune version"
          description="Ce dossier n'a pas encore d'historique enregistré."
        />
      )}

      <Modal
        open={!!selected}
        title={selected ? `Version ${selected.version}` : ""}
        onClose={() => setSelected(null)}
        footer={
          <Button variant="secondary" onClick={() => setSelected(null)}>
            Fermer
          </Button>
        }
      >
        {selected ? (
          <div className="space-y-2 text-sm">
            <p>
              <span className="text-ink-muted">Action : </span>
              {versionActionLabel(selected.action)}
            </p>
            <p>
              <span className="text-ink-muted">Statut : </span>
              {quoteStatusLabel(selected.status)}
            </p>
            <pre className="max-h-64 overflow-auto rounded-md bg-surface p-3 text-xs">
              {JSON.stringify(selected.changes ?? selected, null, 2)}
            </pre>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
