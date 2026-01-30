"use client";

import { useState, useEffect } from "react";
import { ContractStatus } from "@prisma/client";
import type { FidelidadeRow, SourceDataItem } from "@/lib/bordereau";

/** Toutes les colonnes CSV FIDELIDADE dans l'ordre (36 colonnes) */
const ALL_FIDELIDADE_COLUMNS: (keyof FidelidadeRow)[] = [
  "APPORTEUR",
  "IDENTIFIANT_POLICE",
  "DATE_SOUSCRIPTION",
  "DATE_EFFET_CONTRAT",
  "DATE_FIN_CONTRAT",
  "NUMERO_AVENANT",
  "MOTIF_AVENANT",
  "DATE_EFFET_AVENANT",
  "DATE_ECHEANCE",
  "ETAT_POLICE",
  "DATE_ETAT_POLICE",
  "MOTIF_ETAT",
  "FRANCTIONNEMENT",
  "SIREN",
  "ADRESSE_RISQUE",
  "VILLE_RISQUE",
  "CODE_POSTAL_RISQUE",
  "CA_ENTREPRISE",
  "EFFECTIF_ENTREPRISE",
  "CODE_NAF",
  "LIBELLE_ACTIVITE_1",
  "POID_ACTIVITE_1",
  "LIBELLE_ACTIVITE_2",
  "POID_ACTIVITE_2",
  "LIBELLE_ACTIVITE_3",
  "POID_ACTIVITE_3",
  "LIBELLE_ACTIVITE_4",
  "POID_ACTIVITE_4",
  "LIBELLE_ACTIVITE_5",
  "POID_ACTIVITE_5",
  "LIBELLE_ACTIVITE_6",
  "POID_ACTIVITE_6",
  "LIBELLE_ACTIVITE_7",
  "POID_ACTIVITE_7",
  "LIBELLE_ACTIVITE_8",
  "POID_ACTIVITE_8",
];

interface Broker {
  id: string;
  name: string;
  code: string;
  email: string;
  companyName?: string;
}

interface BordereauFilters {
  periodStart: string;
  periodEnd: string;
  brokerIds: string[];
  contractStatus: ContractStatus[];
  productType: string;
  includeQuotes: boolean;
}

export default function BordereauxPage() {
  // Filter state
  const [filters, setFilters] = useState<BordereauFilters>({
    periodStart: "",
    periodEnd: "",
    brokerIds: [],
    contractStatus: [],
    productType: "",
    includeQuotes: true,
  });

  // UI state
  const [brokers, setBrokers] = useState<Broker[]>([]);
  const [previewData, setPreviewData] = useState<FidelidadeRow[]>([]);
  const [editedData, setEditedData] = useState<FidelidadeRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  /** Modal "Modifier les données" : index de la ligne en cours d'édition */
  const [editingRowIndex, setEditingRowIndex] = useState<number | null>(null);
  /** Copie des données de la ligne en cours d'édition (pour le formulaire) */
  const [editingRowData, setEditingRowData] = useState<FidelidadeRow | null>(
    null,
  );
  /** Données sources par ligne (formData, companyData, calculatedPremium) pour drag & drop */
  const [sourceDataPerRow, setSourceDataPerRow] = useState<SourceDataItem[][]>(
    [],
  );

  // Load brokers on mount
  useEffect(() => {
    fetchBrokers();
  }, []);

  const fetchBrokers = async () => {
    try {
      const response = await fetch("/api/admin/brokers");
      const data = await response.json();

      if (data.success) {
        setBrokers(data.brokers);
      }
    } catch (err) {
      console.error("Error loading brokers:", err);
    }
  };

  const handlePreview = async () => {
    setError(null);
    setLoading(true);

    try {
      // Validate filters
      if (!filters.periodStart || !filters.periodEnd) {
        setError("Veuillez sélectionner une période");
        setLoading(false);
        return;
      }

      const response = await fetch("/api/admin/bordereaux/preview", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          dateRange: {
            startDate: filters.periodStart,
            endDate: filters.periodEnd,
          },
          brokerIds:
            filters.brokerIds.length > 0 ? filters.brokerIds : undefined,
          contractStatus:
            filters.contractStatus.length > 0
              ? filters.contractStatus
              : undefined,
          productType: filters.productType || undefined,
          includeQuotes: filters.includeQuotes,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Erreur lors de la prévisualisation");
      }

      setPreviewData(data.data);
      setEditedData(JSON.parse(JSON.stringify(data.data))); // Deep copy
      setSourceDataPerRow(data.sourceDataPerRow ?? []);
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
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/bordereaux/export", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          rows: editedData,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Erreur lors de la génération du CSV");
      }

      // Download the CSV file
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `BORDEREAU_FIDELIDADE_${new Date().toISOString().slice(0, 7)}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Erreur lors de la génération",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCellEdit = (
    rowIndex: number,
    field: keyof FidelidadeRow,
    value: string,
  ) => {
    const newData = [...editedData];
    newData[rowIndex] = { ...newData[rowIndex], [field]: value };
    setEditedData(newData);
  };

  const handleReset = () => {
    setEditedData(JSON.parse(JSON.stringify(previewData)));
  };

  const toggleBroker = (brokerId: string) => {
    setFilters((prev) => ({
      ...prev,
      brokerIds: prev.brokerIds.includes(brokerId)
        ? prev.brokerIds.filter((id) => id !== brokerId)
        : [...prev.brokerIds, brokerId],
    }));
  };

  const toggleContractStatus = (status: ContractStatus) => {
    setFilters((prev) => ({
      ...prev,
      contractStatus: prev.contractStatus.includes(status)
        ? prev.contractStatus.filter((s) => s !== status)
        : [...prev.contractStatus, status],
    }));
  };

  const contractStatusOptions: { value: ContractStatus; label: string }[] = [
    { value: "ACTIVE", label: "EN COURS" },
    { value: "SUSPENDED", label: "SUSPENDU" },
    { value: "EXPIRED", label: "EXPIRÉ" },
    { value: "CANCELLED", label: "RÉSILIÉ" },
    { value: "PENDING_RENEWAL", label: "EN ATTENTE DE RENOUVELLEMENT" },
  ];

  const openRowEditor = (rowIndex: number) => {
    setEditingRowIndex(rowIndex);
    setEditingRowData(JSON.parse(JSON.stringify(editedData[rowIndex])));
  };

  const closeRowEditor = () => {
    setEditingRowIndex(null);
    setEditingRowData(null);
  };

  const updateEditingRow = (field: keyof FidelidadeRow, value: string) => {
    if (!editingRowData) return;
    setEditingRowData({ ...editingRowData, [field]: value });
  };

  /** Données du devis pour la ligne en cours d'édition (liste draggable) */
  const currentRowSourceData: SourceDataItem[] =
    editingRowIndex !== null && sourceDataPerRow[editingRowIndex]
      ? sourceDataPerRow[editingRowIndex]
      : [];

  const handleDragStart = (e: React.DragEvent, value: string) => {
    e.dataTransfer.setData("text/plain", value);
    e.dataTransfer.effectAllowed = "copy";
  };

  const handleDropOnCell = (
    e: React.DragEvent,
    colKey: keyof FidelidadeRow,
  ) => {
    e.preventDefault();
    const value = e.dataTransfer.getData("text/plain");
    if (value) updateEditingRow(colKey, value);
  };

  const handleDragOverCell = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  };

  const saveRowEditor = () => {
    if (editingRowIndex === null || !editingRowData) return;
    const next = [...editedData];
    next[editingRowIndex] = editingRowData;
    setEditedData(next);
    closeRowEditor();
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-full mx-auto">
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Génération de Bordereau FIDELIDADE
          </h1>
          <p className="text-gray-600">
            Filtrez les contrats et générez un fichier CSV pour FIDELIDADE
          </p>
        </div>

        {/* Filters */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Filtres</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Date Range */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Période
              </label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="date"
                  value={filters.periodStart}
                  onChange={(e) =>
                    setFilters({ ...filters, periodStart: e.target.value })
                  }
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border"
                  placeholder="Début"
                />
                <input
                  type="date"
                  value={filters.periodEnd}
                  onChange={(e) =>
                    setFilters({ ...filters, periodEnd: e.target.value })
                  }
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border"
                  placeholder="Fin"
                />
              </div>
            </div>

            {/* Include quotes (devis) - checked by default */}
            <div className="flex items-center">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.includeQuotes}
                  onChange={(e) =>
                    setFilters({ ...filters, includeQuotes: e.target.checked })
                  }
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-sm font-medium text-gray-700">
                  Inclure aussi les devis
                </span>
              </label>
            </div>

            {/* Product Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Type de produit
              </label>
              <select
                value={filters.productType}
                onChange={(e) =>
                  setFilters({ ...filters, productType: e.target.value })
                }
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border"
              >
                <option value="">Tous les produits</option>
                <option value="RCD">RC Décennale</option>
              </select>
            </div>
          </div>

          {/* Brokers Multi-select */}
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Courtiers ({filters.brokerIds.length} sélectionné
              {filters.brokerIds.length > 1 ? "s" : ""})
            </label>
            <div className="max-h-48 overflow-y-auto border border-gray-300 rounded-md p-2 bg-white">
              {brokers.length === 0 ? (
                <p className="text-sm text-gray-500 p-2">
                  Aucun courtier disponible
                </p>
              ) : (
                brokers.map((broker) => (
                  <label
                    key={broker.id}
                    className="flex items-center p-2 hover:bg-gray-50 cursor-pointer rounded"
                  >
                    <input
                      type="checkbox"
                      checked={filters.brokerIds.includes(broker.id)}
                      onChange={() => toggleBroker(broker.id)}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-900">
                      {broker.name} ({broker.code})
                    </span>
                  </label>
                ))
              )}
            </div>
          </div>

          {/* Contract Status */}
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Statut du contrat
            </label>
            <div className="space-y-2">
              {contractStatusOptions.map((option) => (
                <label
                  key={option.value}
                  className="flex items-center cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={filters.contractStatus.includes(option.value)}
                    onChange={() => toggleContractStatus(option.value)}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-900">
                    {option.label}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-6 flex space-x-4">
            <button
              onClick={handlePreview}
              disabled={loading}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {loading && !showPreview ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
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
                  disabled={loading}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {loading && showPreview ? (
                    <>
                      <svg
                        className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                        fill="none"
                        viewBox="0 0 24 24"
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
                      Génération...
                    </>
                  ) : (
                    "Générer CSV"
                  )}
                </button>
              </>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="mt-4 bg-red-50 border border-red-200 rounded-md p-4">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}
        </div>

        {/* Preview Table */}
        {showPreview && editedData.length > 0 && (
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                Prévisualisation ({editedData.length} ligne
                {editedData.length > 1 ? "s" : ""})
              </h2>
              <p className="text-sm text-gray-600">
                Toutes les cellules sont éditables
              </p>
            </div>

            <div className="overflow-x-auto max-h-[70vh]">
              <table className="min-w-full divide-y divide-gray-300">
                <thead className="bg-gray-50 sticky top-0 z-10">
                  <tr>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide whitespace-nowrap w-24">
                      Actions
                    </th>
                    {ALL_FIDELIDADE_COLUMNS.map((col) => (
                      <th
                        key={col}
                        className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide whitespace-nowrap"
                      >
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {editedData.map((row, rowIndex) => (
                    <tr key={rowIndex} className="hover:bg-gray-50">
                      <td className="px-3 py-2 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => openRowEditor(rowIndex)}
                          className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
                        >
                          Modifier
                        </button>
                      </td>
                      {ALL_FIDELIDADE_COLUMNS.map((col) => (
                        <td key={col} className="px-3 py-2 whitespace-nowrap">
                          <input
                            type="text"
                            value={row[col]}
                            onChange={(e) =>
                              handleCellEdit(rowIndex, col, e.target.value)
                            }
                            className="block w-full min-w-[90px] max-w-[140px] rounded border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-2 py-1 border"
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {showPreview && editedData.length === 0 && (
          <div className="bg-white shadow rounded-lg p-6">
            <p className="text-center text-gray-500">
              Aucune donnée trouvée pour les filtres sélectionnés
            </p>
          </div>
        )}

        {/* Modal : Modifier les données de la ligne (formData, companyData, CSV) */}
        {editingRowIndex !== null && editingRowData && (
          <div
            className="fixed inset-0 z-50 overflow-y-auto"
            aria-labelledby="modal-title"
            role="dialog"
            aria-modal="true"
          >
            <div className="flex min-h-screen items-center justify-center p-4">
              <div
                className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
                onClick={closeRowEditor}
                aria-hidden="true"
              />
              <div className="relative bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                <div className="flex-shrink-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
                  <h2 className="text-lg font-semibold text-gray-900">
                    Ligne {editingRowIndex + 1} — Glissez les données du devis
                    dans les cases CSV
                  </h2>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={closeRowEditor}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                    >
                      Annuler
                    </button>
                    <button
                      type="button"
                      onClick={saveRowEditor}
                      className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
                    >
                      Enregistrer
                    </button>
                  </div>
                </div>
                <div className="flex-1 flex overflow-hidden min-h-0">
                  {/* Liste de TOUTES les données du devis : formData + calculatedPremium + companyData */}
                  <div className="w-96 flex-shrink-0 border-r border-gray-200 overflow-y-auto bg-gray-50 p-4">
                    <h3 className="text-sm font-semibold text-gray-900 mb-1">
                      Données du devis (formData, calculatedPremium,
                      companyData)
                    </h3>
                    <p className="text-xs text-gray-500 mb-3">
                      Glissez une valeur dans une case CSV à droite.
                    </p>
                    {currentRowSourceData.length === 0 ? (
                      <p className="text-sm text-amber-700 bg-amber-50 p-3 rounded-md">
                        Aucune donnée source pour cette ligne. Vérifiez que le
                        devis a bien formData et calculatedPremium en base.
                      </p>
                    ) : (
                      <ul className="space-y-2">
                        {currentRowSourceData.map((item, idx) => (
                          <li
                            key={`${item.key}-${idx}`}
                            draggable
                            onDragStart={(e) => handleDragStart(e, item.value)}
                            className="rounded border border-gray-300 bg-white px-3 py-2 text-sm cursor-grab active:cursor-grabbing shadow-sm hover:border-indigo-500 hover:bg-indigo-50/50"
                          >
                            <span
                              className="text-xs text-gray-500 font-mono block truncate"
                              title={item.key}
                            >
                              {item.key}
                            </span>
                            <span
                              className="font-medium text-gray-900 block truncate mt-0.5"
                              title={item.value}
                            >
                              {item.value}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  {/* Cases CSV : drop targets */}
                  <div className="flex-1 overflow-y-auto p-4">
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">
                      Cases CSV — déposez une valeur ici
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                      {ALL_FIDELIDADE_COLUMNS.map((colKey) => (
                        <label
                          key={colKey}
                          className="block"
                          onDragOver={handleDragOverCell}
                          onDrop={(e) => handleDropOnCell(e, colKey)}
                        >
                          <span className="text-xs text-gray-500 block mb-1 truncate">
                            {colKey}
                          </span>
                          <input
                            type="text"
                            value={editingRowData[colKey]}
                            onChange={(e) =>
                              updateEditingRow(colKey, e.target.value)
                            }
                            onDragOver={handleDragOverCell}
                            onDrop={(e) => handleDropOnCell(e, colKey)}
                            className="block w-full rounded border border-dashed border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-2 py-1.5"
                          />
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
