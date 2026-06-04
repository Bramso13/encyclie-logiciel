"use client";

import { useState, useEffect, useCallback } from "react";
import type {
  FidelidadePolicesRow,
  FidelidadeQuittancesRow,
} from "@/lib/bordereau";
import { POLICES_COLUMNS, QUITTANCES_COLUMNS } from "@/lib/bordereau";

function Toggle({
  checked,
  onChange,
  id,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  id: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      id={id}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
        checked ? "bg-indigo-600" : "bg-gray-300"
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
          checked ? "translate-x-4" : "translate-x-0"
        }`}
      />
    </button>
  );
}

type TabId = "polices" | "quittances";

const HISTORY_PAGE_SIZE = 20;

const MOIS: { value: number; label: string }[] = [
  { value: 1, label: "Janvier" },
  { value: 2, label: "Février" },
  { value: 3, label: "Mars" },
  { value: 4, label: "Avril" },
  { value: 5, label: "Mai" },
  { value: 6, label: "Juin" },
  { value: 7, label: "Juillet" },
  { value: 8, label: "Août" },
  { value: 9, label: "Septembre" },
  { value: 10, label: "Octobre" },
  { value: 11, label: "Novembre" },
  { value: 12, label: "Décembre" },
];

function getDateRangeForMonthYear(
  month: number,
  year: number,
): { startDate: string; endDate: string } {
  const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  const endDate = `${nextYear}-${String(nextMonth).padStart(2, "0")}-01`;
  return { startDate, endDate };
}

function getYears(): number[] {
  const currentYear = new Date().getFullYear();
  const from = currentYear - 5;
  const to = currentYear + 1;
  return Array.from({ length: to - from + 1 }, (_, i) => from + i);
}

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
    value: string,
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
                        e.target.value,
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

// ─── Tableau des Polices groupé par MOTIF_ETAT ───────────────────────────────

interface GroupedPolicesTableProps {
  data: FidelidadePolicesRow[];
  onCellEdit: (
    rowIndex: number,
    field: keyof FidelidadePolicesRow,
    value: string,
  ) => void;
  emptyMessage?: string;
}

// Utiliser toutes les colonnes POLICES_COLUMNS (importées depuis @/lib/bordereau)
// pour afficher TOUTES les données dans la preview

function GroupedPolicesTable({
  data,
  onCellEdit,
  emptyMessage = "Aucune donnée",
}: GroupedPolicesTableProps) {
  if (data.length === 0) {
    return <p className="text-center text-gray-500 py-8">{emptyMessage}</p>;
  }

  // Grouper les données par MOTIF_ETAT
  const groups = {
    REGLEMENT: [] as { row: FidelidadePolicesRow; index: number }[],
    EMISSION: [] as { row: FidelidadePolicesRow; index: number }[],
    RESILIATION: [] as { row: FidelidadePolicesRow; index: number }[],
    OTHER: [] as { row: FidelidadePolicesRow; index: number }[],
  };

  data.forEach((row, index) => {
    const motif = row.MOTIF_ETAT;
    if (motif === "REGLEMENT") {
      groups.REGLEMENT.push({ row, index });
    } else if (motif === "EMISSION") {
      groups.EMISSION.push({ row, index });
    } else if (motif === "RESILIATION") {
      groups.RESILIATION.push({ row, index });
    } else {
      groups.OTHER.push({ row, index });
    }
  });

  const groupConfigs = {
    REGLEMENT: {
      label: "💰 RÈGLEMENTS",
      subtitle: "Échéances payées ce mois-ci",
      color: "emerald",
      bgColor: "bg-emerald-50",
      borderColor: "border-emerald-200",
      headerTextColor: "text-emerald-800",
      badgeColor: "bg-emerald-100 text-emerald-700",
    },
    EMISSION: {
      label: "📄 EMISSIONS",
      subtitle: "Échéances en attente de paiement",
      color: "amber",
      bgColor: "bg-amber-50",
      borderColor: "border-amber-200",
      headerTextColor: "text-amber-800",
      badgeColor: "bg-amber-100 text-amber-700",
    },
    RESILIATION: {
      label: "🚫 RÉSILIATIONS",
      subtitle: "Contrats résiliés",
      color: "red",
      bgColor: "bg-red-50",
      borderColor: "border-red-200",
      headerTextColor: "text-red-800",
      badgeColor: "bg-red-100 text-red-700",
    },
    OTHER: {
      label: "❓ AUTRES",
      subtitle: "Motifs non classés",
      color: "gray",
      bgColor: "bg-gray-50",
      borderColor: "border-gray-200",
      headerTextColor: "text-gray-800",
      badgeColor: "bg-gray-100 text-gray-700",
    },
  };

  function renderGroup(
    groupKey: keyof typeof groups,
    items: { row: FidelidadePolicesRow; index: number }[],
  ) {
    if (items.length === 0) return null;
    const config = groupConfigs[groupKey];

    return (
      <div
        key={groupKey}
        className={`mb-6 rounded-lg border ${config.borderColor} overflow-hidden`}
      >
        {/* En-tête du groupe */}
        <div
          className={`${config.bgColor} ${config.borderColor} border-b px-4 py-3 flex items-center justify-between`}
        >
          <div className="flex items-center gap-3">
            <span className={`font-bold ${config.headerTextColor} text-sm uppercase tracking-wide`}>
              {config.label}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${config.badgeColor}`}>
              {items.length} ligne{items.length > 1 ? "s" : ""}
            </span>
          </div>
          <span className="text-xs text-gray-500 italic">{config.subtitle}</span>
        </div>

        {/* Tableau du groupe */}
        <div className="overflow-x-auto max-h-[50vh]">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className={`${config.bgColor} sticky top-0 z-10`}>
              <tr>
                {POLICES_COLUMNS.map((col) => (
                  <th
                    key={String(col)}
                    className={`px-3 py-2 text-left text-xs font-semibold ${config.headerTextColor} uppercase tracking-wide whitespace-nowrap`}
                  >
                    {String(col)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {items.map(({ row, index }, rowIdx) => (
                <tr
                  key={index}
                  className={rowIdx % 2 === 0 ? "bg-white" : "bg-gray-50/50"}
                >
                  {POLICES_COLUMNS.map((col) => {
                    const value = row[col];
                    const isBadge = col === "MOTIF_ETAT" || col === "ETAT_POLICE" || col === "FRACTIONNEMENT";
                    
                    // Déterminer la couleur du badge pour ETAT_POLICE
                    let badgeClass = "bg-gray-100 text-gray-700";
                    if (col === "ETAT_POLICE") {
                      if (value === "RESILIE") badgeClass = "bg-red-100 text-red-700";
                      else if (value === "SOUSCRIPTION") badgeClass = "bg-indigo-100 text-indigo-700";
                      else if (value === "EN COURS") badgeClass = "bg-blue-100 text-blue-700";
                    }
                    // Badge MOTIF_ETAT
                    if (col === "MOTIF_ETAT") {
                      if (value === "REGLEMENT") badgeClass = "bg-emerald-100 text-emerald-700";
                      else if (value === "EMISSION") badgeClass = "bg-amber-100 text-amber-700";
                      else if (value === "RESILIATION") badgeClass = "bg-red-100 text-red-700";
                    }

                    return (
                      <td key={String(col)} className="px-3 py-2 whitespace-nowrap">
                        {isBadge ? (
                          <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${badgeClass}`}>
                            {String(value || "—")}
                          </span>
                        ) : (
                          <input
                            type="text"
                            value={String(value ?? "")}
                            onChange={(e) =>
                              onCellEdit(index, col, e.target.value)
                            }
                            className="block w-full min-w-[80px] max-w-[160px] rounded border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm px-2 py-1 border"
                          />
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {renderGroup("REGLEMENT", groups.REGLEMENT)}
      {renderGroup("EMISSION", groups.EMISSION)}
      {renderGroup("RESILIATION", groups.RESILIATION)}
      {renderGroup("OTHER", groups.OTHER)}

      {/* Légende */}
      <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-600">
        <div className="flex flex-wrap gap-4">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            REGLEMENT : payé ce mois
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            EMISSION : en attente
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-red-500" />
            RESILIATION : résilié
          </span>
        </div>
        <div className="mt-2 pt-2 border-t border-gray-200 text-gray-400">
          Les échéances sont affichées dans le bordereau du mois de leur règlement (paidAt), pas de leur échéance (dueDate).
        </div>
      </div>
    </div>
  );
}

const now = new Date();
const defaultMonth = now.getMonth() + 1;
const defaultYear = now.getFullYear();

export default function BordereauxPage() {
  const [selectedMonth, setSelectedMonth] = useState(defaultMonth);
  const [selectedYear, setSelectedYear] = useState(defaultYear);

  // Filtres d'inclusion bordereau
  const [requireEmission, setRequireEmission] = useState(true);
  const [requirePrevPaid, setRequirePrevPaid] = useState(true);

  const [polices, setPolices] = useState<FidelidadePolicesRow[]>([]);
  const [quittances, setQuittances] = useState<FidelidadeQuittancesRow[]>([]);
  const [editedPolices, setEditedPolices] = useState<FidelidadePolicesRow[]>(
    [],
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
        `/api/admin/bordereaux/history?page=${page}&limit=${HISTORY_PAGE_SIZE}`,
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
      const { startDate, endDate } = getDateRangeForMonthYear(
        selectedMonth,
        selectedYear,
      );

      const response = await fetch("/api/admin/bordereaux/preview-v2", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dateRange: { startDate, endDate },
          inclusionOptions: { requireEmission, requirePrevPaid },
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Erreur lors de la prévisualisation");
      }

      const rawPolices = data.polices ?? [];
      const rawQuittances = (data.quittances ??
        []) as FidelidadeQuittancesRow[];
      const normalizeQuittanceRow = (row: FidelidadeQuittancesRow) =>
        QUITTANCES_COLUMNS.reduce(
          (acc, col) => {
            const v = row[col];
            acc[col] = v !== undefined && v !== null ? String(v) : "";
            return acc;
          },
          {} as Record<string, string>,
        ) as unknown as FidelidadeQuittancesRow;
      const normalizedQuittances = rawQuittances.map(normalizeQuittanceRow);
      setPolices(rawPolices);
      setQuittances(normalizedQuittances);
      setEditedPolices(JSON.parse(JSON.stringify(rawPolices)));
      setEditedQuittances(JSON.parse(JSON.stringify(normalizedQuittances)));
      setShowPreview(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Erreur lors de la prévisualisation",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateCSV = async () => {
    setLoadingExport(true);
    setError(null);

    try {
      const { startDate, endDate } = getDateRangeForMonthYear(
        selectedMonth,
        selectedYear,
      );

      const response = await fetch("/api/admin/bordereaux/export-v2", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dateRange: { startDate, endDate },
          polices: editedPolices,
          quittances: editedQuittances,
          inclusionOptions: { requireEmission, requirePrevPaid },
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
      const monthStr = String(selectedMonth).padStart(2, "0");
      link.download = `BORDEREAU_FIDELIDADE_${monthStr}_${selectedYear}.zip`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Erreur lors de la génération",
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
    value: string,
  ) => {
    const next = [...editedPolices];
    next[rowIndex] = { ...next[rowIndex], [field]: value };
    setEditedPolices(next);
  };

  const handleQuittancesCellEdit = (
    rowIndex: number,
    field: keyof FidelidadeQuittancesRow,
    value: string,
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

        {/* Filtres — mois et année (période = 1er du mois → 1er du mois suivant) */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Filtres</h2>
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mois
              </label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border min-w-[140px]"
              >
                {MOIS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Année
              </label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border min-w-[100px]"
              >
                {getYears().map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>

            {/* Séparateur vertical */}
            <div className="hidden sm:block w-px h-10 bg-gray-200" />

            {/* Filtres d'inclusion */}
            <div className="flex flex-col gap-2.5">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Filtres d'inclusion
              </p>
              <div className="flex items-center gap-2">
                <Toggle
                  id="filter-emission"
                  checked={requireEmission}
                  onChange={(v) => {
                    setRequireEmission(v);
                    setShowPreview(false);
                  }}
                />
                <label
                  htmlFor="filter-emission"
                  className="text-sm text-gray-700 cursor-pointer select-none"
                >
                  Date d'émission requise
                </label>
                <span
                  className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                    requireEmission
                      ? "bg-indigo-100 text-indigo-700"
                      : "bg-gray-100 text-gray-400"
                  }`}
                >
                  {requireEmission ? "ON" : "OFF"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Toggle
                  id="filter-prev-paid"
                  checked={requirePrevPaid}
                  onChange={(v) => {
                    setRequirePrevPaid(v);
                    setShowPreview(false);
                  }}
                />
                <label
                  htmlFor="filter-prev-paid"
                  className="text-sm text-gray-700 cursor-pointer select-none"
                >
                  Échéance précédente réglée
                </label>
                <span
                  className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                    requirePrevPaid
                      ? "bg-indigo-100 text-indigo-700"
                      : "bg-gray-100 text-gray-400"
                  }`}
                >
                  {requirePrevPaid ? "ON" : "OFF"}
                </span>
              </div>
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

          {/* Récapitulatif des filtres actifs */}
          {(!requireEmission || !requirePrevPaid) && (
            <div className="mt-4 flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-md p-3 text-sm text-amber-800">
              <svg
                className="w-4 h-4 mt-0.5 flex-shrink-0"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              <span>
                Filtres assouplis :{" "}
                {!requireEmission && (
                  <strong>date d'émission non requise</strong>
                )}
                {!requireEmission && !requirePrevPaid && " · "}
                {!requirePrevPaid && (
                  <strong>échéance précédente non vérifiée</strong>
                )}{" "}
                — le bordereau peut inclure des échéances non encore émises.
              </span>
            </div>
          )}

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
              <GroupedPolicesTable
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
                          Math.min(historyTotalPages, p + 1),
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
