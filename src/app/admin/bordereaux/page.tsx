"use client";

import { useState, useEffect, useCallback } from "react";
import type {
  FidelidadePolicesRow,
  FidelidadeQuittancesRow,
} from "@/lib/bordereau";
import { POLICES_COLUMNS, QUITTANCES_COLUMNS } from "@/lib/bordereau";

type TabId = "polices" | "quittances";

const HISTORY_PAGE_SIZE = 20;

interface HistoryItem {
  id: string;
  generatedAt: string;
  generatedBy: string;
  periodStart: string;
  periodEnd: string;
  countPolices: number;
  countQuittances: number;
  fileNamePolices: string;
  fileNameQuittances: string;
}

const LoadingSpinner = () => (
  <svg
    className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
    fill="none"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <circle
      className="opacity-25"
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="4"
    />
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
    />
  </svg>
);

interface EditableTableProps<T> {
  columns: readonly (keyof T & string)[];
  data: T[];
  onCellEdit: (
    rowIndex: number,
    field: keyof T & string,
    value: string
  ) => void;
  emptyMessage?: string;
}

function EditableTable<T extends object>({
  columns,
  data,
  onCellEdit,
  emptyMessage = "Aucune donnée",
}: EditableTableProps<T>) {
  if (data.length === 0) {
    return <p className="text-center text-gray-500 py-8">{emptyMessage}</p>;
  }

  return (
    <div className="overflow-x-auto max-h-[60vh]">
      <table className="min-w-full divide-y divide-gray-300">
        <thead className="bg-gray-50 sticky top-0 z-10">
          <tr>
            {columns.map((col) => (
              <th
                key={String(col)}
                className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide whitespace-nowrap"
              >
                {String(col)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {data.map((row, rowIndex) => (
            <tr key={rowIndex} className="hover:bg-gray-50">
              {columns.map((col) => (
                <td key={String(col)} className="px-2 py-1 whitespace-nowrap">
                  <input
                    type="text"
                    value={String((row as Record<string, unknown>)[col] ?? "")}
                    onChange={(e) =>
                      onCellEdit(
                        rowIndex,
                        col as keyof T & string,
                        e.target.value
                      )
                    }
                    className="block w-full min-w-[80px] max-w-[180px] rounded border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-2 py-1 border"
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function BordereauxPage() {
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [polices, setPolices] = useState<FidelidadePolicesRow[]>([]);
  const [quittances, setQuittances] = useState<FidelidadeQuittancesRow[]>([]);
  const [editedPolices, setEditedPolices] = useState<FidelidadePolicesRow[]>(
    []
  );
  const [editedQuittances, setEditedQuittances] = useState<
    FidelidadeQuittancesRow[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [loadingExport, setLoadingExport] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>("polices");

  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyTotalPages, setHistoryTotalPages] = useState(0);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [downloadId, setDownloadId] = useState<string | null>(null);
  const [regenerateId, setRegenerateId] = useState<string | null>(null);

  const loadHistory = useCallback(async (page: number = 1) => {
    setLoadingHistory(true);
    try {
      const res = await fetch(
        `/api/admin/bordereaux/history?page=${page}&limit=${HISTORY_PAGE_SIZE}`
      );
      const data = await res.json();
      if (!data.success)
        throw new Error(data.error || "Erreur chargement historique");
      setHistoryItems(data.data.items ?? []);
      setHistoryTotalPages(data.data.totalPages ?? 0);
      setHistoryTotal(data.data.total ?? 0);
    } catch {
      setHistoryItems([]);
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    void loadHistory(historyPage);
  }, [historyPage, loadHistory]);

  const handleDownload = async (id: string) => {
    setDownloadId(id);
    try {
      const res = await fetch(`/api/admin/bordereaux/${id}/download`);
      if (!res.ok) throw new Error("Erreur téléchargement");
      const blob = await res.blob();
      const name =
        res.headers.get("Content-Disposition")?.match(/filename="(.+)"/)?.[1] ??
        "bordereau.zip";
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = name;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur téléchargement");
    } finally {
      setDownloadId(null);
    }
  };

  const handleRegenerate = async (item: HistoryItem) => {
    setRegenerateId(item.id);
    setError(null);
    try {
      const response = await fetch("/api/admin/bordereaux/export-v2", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dateRange: {
            startDate: item.periodStart,
            endDate: item.periodEnd,
          },
        }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Erreur régénération");
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const [, month, year] = item.periodEnd.split("-");
      link.download = `BORDEREAU_FIDELIDADE_${month}_${year}.zip`;
      link.click();
      URL.revokeObjectURL(url);
      await loadHistory(historyPage);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur régénération");
    } finally {
      setRegenerateId(null);
    }
  };

  const handlePreview = async () => {
    setError(null);
    setLoading(true);

    try {
      if (!periodStart || !periodEnd) {
        setError("Veuillez sélectionner une période (début et fin)");
        setLoading(false);
        return;
      }

      const response = await fetch("/api/admin/bordereaux/preview-v2", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dateRange: {
            startDate: periodStart,
            endDate: periodEnd,
          },
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Erreur lors de la prévisualisation");
      }

      setPolices(data.polices ?? []);
      setQuittances(data.quittances ?? []);
      setEditedPolices(JSON.parse(JSON.stringify(data.polices ?? [])));
      setEditedQuittances(JSON.parse(JSON.stringify(data.quittances ?? [])));
      setShowPreview(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Erreur lors de la prévisualisation"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateCSV = async () => {
    setLoadingExport(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/bordereaux/export-v2", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dateRange: {
            startDate: periodStart,
            endDate: periodEnd,
          },
          polices: editedPolices,
          quittances: editedQuittances,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Erreur lors de la génération");
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const [, month, year] = periodEnd.split("-");
      link.download = `BORDEREAU_FIDELIDADE_${month}_${year}.zip`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Erreur lors de la génération"
      );
    } finally {
      setLoadingExport(false);
    }
  };

  const handleReset = () => {
    setEditedPolices(JSON.parse(JSON.stringify(polices)));
    setEditedQuittances(JSON.parse(JSON.stringify(quittances)));
  };

  const handlePolicesCellEdit = (
    rowIndex: number,
    field: keyof FidelidadePolicesRow,
    value: string
  ) => {
    const next = [...editedPolices];
    next[rowIndex] = { ...next[rowIndex], [field]: value };
    setEditedPolices(next);
  };

  const handleQuittancesCellEdit = (
    rowIndex: number,
    field: keyof FidelidadeQuittancesRow,
    value: string
  ) => {
    const next = [...editedQuittances];
    next[rowIndex] = { ...next[rowIndex], [field]: value };
    setEditedQuittances(next);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-full mx-auto">
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Bordereau FIDELIDADE v2
          </h1>
          <p className="text-gray-600">
            Filtrez par période, prévisualisez les polices et quittances, puis
            exportez les deux CSV en ZIP.
          </p>
        </div>

        {/* Filtres — période uniquement */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Filtres</h2>
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Début période
              </label>
              <input
                type="date"
                value={periodStart}
                onChange={(e) => setPeriodStart(e.target.value)}
                className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fin période
              </label>
              <input
                type="date"
                value={periodEnd}
                onChange={(e) => setPeriodEnd(e.target.value)}
                className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handlePreview}
                disabled={loading}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <LoadingSpinner />
                    Chargement...
                  </>
                ) : (
                  "Prévisualiser"
                )}
              </button>
              {showPreview && (
                <>
                  <button
                    onClick={handleReset}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                  >
                    Réinitialiser
                  </button>
                  <button
                    onClick={handleGenerateCSV}
                    disabled={loadingExport}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    {loadingExport ? (
                      <>
                        <LoadingSpinner />
                        Génération...
                      </>
                    ) : (
                      "Générer CSV (ZIP)"
                    )}
                  </button>
                </>
              )}
            </div>
          </div>

          {error && (
            <div className="mt-4 bg-red-50 border border-red-200 rounded-md p-4">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}
        </div>

        {/* Prévisualisation : deux onglets */}
        {showPreview && (
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Prévisualisation
            </h2>
            <div className="flex gap-2 mb-4 border-b border-gray-200">
              <button
                type="button"
                onClick={() => setActiveTab("polices")}
                className={`px-4 py-2 text-sm font-medium rounded-t-md ${
                  activeTab === "polices"
                    ? "bg-indigo-50 text-indigo-700 border border-b-0 border-indigo-200"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Polices ({editedPolices.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("quittances")}
                className={`px-4 py-2 text-sm font-medium rounded-t-md ${
                  activeTab === "quittances"
                    ? "bg-indigo-50 text-indigo-700 border border-b-0 border-indigo-200"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Quittances ({editedQuittances.length})
              </button>
            </div>

            {activeTab === "polices" && (
              <EditableTable<FidelidadePolicesRow>
                columns={POLICES_COLUMNS}
                data={editedPolices}
                onCellEdit={handlePolicesCellEdit}
                emptyMessage="Aucune police pour cette période"
              />
            )}
            {activeTab === "quittances" && (
              <EditableTable<FidelidadeQuittancesRow>
                columns={QUITTANCES_COLUMNS}
                data={editedQuittances}
                onCellEdit={handleQuittancesCellEdit}
                emptyMessage="Aucune quittance pour cette période"
              />
            )}
          </div>
        )}

        {/* Historique des bordereaux */}
        <div className="bg-white shadow rounded-lg p-6 mt-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Historique des bordereaux
          </h2>
          {loadingHistory ? (
            <p className="text-gray-500 py-4">Chargement...</p>
          ) : historyItems.length === 0 ? (
            <p className="text-gray-500 py-4">Aucun bordereau généré.</p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-300">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Date/heure
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Généré par
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Période
                      </th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                        Polices
                      </th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                        Quittances
                      </th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {historyItems.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="px-3 py-2 text-sm text-gray-900 whitespace-nowrap">
                          {new Date(item.generatedAt).toLocaleString("fr-FR")}
                        </td>
                        <td className="px-3 py-2 text-sm text-gray-700">
                          {item.generatedBy}
                        </td>
                        <td className="px-3 py-2 text-sm text-gray-700 whitespace-nowrap">
                          {item.periodStart} → {item.periodEnd}
                        </td>
                        <td className="px-3 py-2 text-sm text-gray-700 text-right">
                          {item.countPolices}
                        </td>
                        <td className="px-3 py-2 text-sm text-gray-700 text-right">
                          {item.countQuittances}
                        </td>
                        <td className="px-3 py-2 text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => handleDownload(item.id)}
                            disabled={downloadId === item.id}
                            className="text-indigo-600 hover:text-indigo-800 text-sm font-medium disabled:opacity-50 mr-2"
                          >
                            {downloadId === item.id ? "..." : "Télécharger ZIP"}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRegenerate(item)}
                            disabled={regenerateId === item.id}
                            className="text-green-600 hover:text-green-800 text-sm font-medium disabled:opacity-50"
                          >
                            {regenerateId === item.id ? "..." : "Régénérer"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {historyTotalPages > 1 && (
                <div className="flex items-center justify-between border-t border-gray-200 pt-4 mt-4">
                  <p className="text-sm text-gray-600">
                    {historyTotal} bordereau(x) — page {historyPage} /{" "}
                    {historyTotalPages}
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}
                      disabled={historyPage <= 1}
                      className="px-3 py-1 text-sm border border-gray-300 rounded-md disabled:opacity-50"
                    >
                      Précédent
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setHistoryPage((p) =>
                          Math.min(historyTotalPages, p + 1)
                        )
                      }
                      disabled={historyPage >= historyTotalPages}
                      className="px-3 py-1 text-sm border border-gray-300 rounded-md disabled:opacity-50"
                    >
                      Suivant
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
