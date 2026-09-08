"use client";

import { useState, useRef } from "react";
import { AuthenticatedAppShell } from "@/components/ui/AuthenticatedAppShell";

type ImportAction =
  | "UPDATED"
  | "CREATED"
  | "DRY_RUN_UPDATE"
  | "DRY_RUN_CREATE"
  | "SKIPPED_ALREADY_PAID"
  | "SKIPPED_DUPLICATE_CSV"
  | "SKIPPED_DUPLICATE_DB"
  | "ERROR";

interface ImportResult {
  rowIndex: number;
  success: boolean;
  created?: boolean;
  message: string;
  action: ImportAction;
  nomClient: string;
  numeroPolice: string;
  siret: string;
  periode: string;
  dateReglement: string;
  primeReglee: number;
  quoteReference?: string;
  installmentNumber?: number;
  installmentId?: string;
  matchMethod?: string;
  warnings: string[];
  details: string;
}

interface ImportStats {
  total: number;
  imported: number;
  created: number;
  skipped: number;
  errors: number;
  duplicateCsv: number;
  duplicateDb: number;
}

type ResultFilter = "all" | "ok" | "created" | "skipped" | "errors" | "warnings";

const ACTION_LABELS: Record<ImportAction, string> = {
  UPDATED: "Mis à jour",
  CREATED: "Créé",
  DRY_RUN_UPDATE: "Simul. MAJ",
  DRY_RUN_CREATE: "Simul. création",
  SKIPPED_ALREADY_PAID: "Déjà payé",
  SKIPPED_DUPLICATE_CSV: "Doublon CSV",
  SKIPPED_DUPLICATE_DB: "Doublon DB",
  ERROR: "Erreur",
};

function actionBadgeClass(action: ImportAction): string {
  switch (action) {
    case "UPDATED":
    case "DRY_RUN_UPDATE":
      return "bg-green-100 text-green-800";
    case "CREATED":
    case "DRY_RUN_CREATE":
      return "bg-blue-100 text-blue-800";
    case "SKIPPED_ALREADY_PAID":
    case "SKIPPED_DUPLICATE_CSV":
    case "SKIPPED_DUPLICATE_DB":
      return "bg-amber-100 text-amber-800";
    default:
      return "bg-red-100 text-red-800";
  }
}

function rowBgClass(result: ImportResult): string {
  if (result.success) {
    return result.created ? "bg-blue-50/60" : "bg-green-50/60";
  }
  if (
    result.action === "SKIPPED_ALREADY_PAID" ||
    result.action === "SKIPPED_DUPLICATE_CSV"
  ) {
    return "bg-amber-50/80";
  }
  return "bg-red-50/80";
}

function matchesFilter(result: ImportResult, filter: ResultFilter): boolean {
  switch (filter) {
    case "ok":
      return result.success && !result.created;
    case "created":
      return result.success && !!result.created;
    case "skipped":
      return result.action.startsWith("SKIPPED");
    case "errors":
      return result.action === "ERROR";
    case "warnings":
      return result.warnings.length > 0;
    default:
      return true;
  }
}

interface ImportResponse {
  success: boolean;
  message: string;
  data: {
    fileName: string;
    dryRun: boolean;
    stats: ImportStats;
    results: ImportResult[];
  };
}

const MOIS = [
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

function getYears(): number[] {
  const currentYear = new Date().getFullYear();
  const from = currentYear - 2;
  const to = currentYear + 1;
  return Array.from({ length: to - from + 1 }, (_, i) => from + i);
}

export function ImportPaymentsAdminView({
  embedded = false,
}: {
  embedded?: boolean;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [dryRun, setDryRun] = useState(true);
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<ImportResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // États pour la réinitialisation des paiements
  const now = new Date();
  const [resetMonth, setResetMonth] = useState(now.getMonth() + 1);
  const [resetYear, setResetYear] = useState(now.getFullYear());
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetSuccess, setResetSuccess] = useState<string | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resultFilter, setResultFilter] = useState<ResultFilter>("all");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (!selectedFile.name.toLowerCase().endsWith(".csv")) {
        setError("Le fichier doit être au format CSV (.csv)");
        setFile(null);
        return;
      }
      setFile(selectedFile);
      setError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setLoading(true);
    setError(null);
    setResponse(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("dryRun", dryRun.toString());

      const res = await fetch("/api/admin/import-payments", {
        method: "POST",
        body: formData,
      });

      const data: ImportResponse = await res.json();

      if (!data.success) {
        throw new Error(data.message || "Erreur lors de l'import");
      }

      setResponse(data);
      setResultFilter("all");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setResponse(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleResetPayments = async () => {
    setResetLoading(true);
    setResetError(null);
    setResetSuccess(null);

    try {
      const startDate = `${resetYear}-${String(resetMonth).padStart(2, "0")}-01`;
      const nextMonth = resetMonth === 12 ? 1 : resetMonth + 1;
      const nextYear = resetMonth === 12 ? resetYear + 1 : resetYear;
      const endDate = `${nextYear}-${String(nextMonth).padStart(2, "0")}-01`;

      const res = await fetch("/api/admin/payments/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startDate, endDate }),
      });

      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error || "Erreur lors de la réinitialisation");
      }

      setResetSuccess(
        `${data.count} paiement(s) réinitialisé(s) pour ${MOIS.find(m => m.value === resetMonth)?.label} ${resetYear}`
      );
      setShowResetConfirm(false);
    } catch (err) {
      setResetError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setResetLoading(false);
    }
  };

  const body = (
    <div className={embedded ? "space-y-6" : ""}>
      <div className="max-w-6xl mx-auto space-y-6">
        {embedded ? null : (
        <div className="rounded-lg border border-line bg-white p-6">
          <h1 className="text-xl font-semibold text-ink mb-2">
            Importer les paiements
          </h1>
          <p className="text-ink-muted">
            Chargez un fichier CSV. Les échéances sont mises à jour ou créées
            si elles n&apos;existent pas. Une simulation est lancée par défaut.
          </p>
        </div>
        )}

        {/* Formulaire */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Upload fichier */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Fichier CSV
              </label>
              <div className="flex items-center gap-4">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  disabled={loading}
                  className="block w-full text-sm text-gray-500
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-md file:border-0
                    file:text-sm file:font-medium
                    file:bg-indigo-50 file:text-indigo-700
                    hover:file:bg-indigo-100
                    disabled:opacity-50"
                />
                {file && (
                  <button
                    type="button"
                    onClick={handleReset}
                    className="text-sm text-gray-500 hover:text-gray-700"
                  >
                    Réinitialiser
                  </button>
                )}
              </div>
              <p className="mt-1 text-sm text-gray-500">
                Format <strong>reglementVinu.csv</strong> : séparateur virgule,
                dates en <strong>JJ/MM/AAAA</strong>, période{" "}
                <code className="text-xs bg-gray-100 px-1 rounded">
                  01/01/2026 AU 31/03/2026
                </code>
              </p>
            </div>

            {/* Option dry-run */}
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="dryRun"
                checked={dryRun}
                onChange={(e) => setDryRun(e.target.checked)}
                disabled={loading}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <label htmlFor="dryRun" className="text-sm text-gray-700">
                <span className="font-medium">Mode simulation (dry-run)</span>{" "}
                - Afficher les résultats sans appliquer les modifications
              </label>
            </div>

            {/* Erreur */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            {/* Boutons */}
            <div className="flex gap-4">
              <button
                type="submit"
                disabled={!file || loading}
                className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white ${
                  dryRun
                    ? "bg-indigo-600 hover:bg-indigo-700"
                    : "bg-green-600 hover:bg-green-700"
                } disabled:bg-gray-400 disabled:cursor-not-allowed`}
              >
                {loading ? (
                  <>
                    <svg
                      className="animate-spin -ml-1 mr-2 h-4 w-4"
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
                    Traitement en cours...
                  </>
                ) : dryRun ? (
                  "Simuler l'import"
                ) : (
                  "Importer les paiements"
                )}
              </button>

              {response && (
                <button
                  type="button"
                  onClick={() => {
                    setDryRun(false);
                    if (file) {
                      const formData = new FormData();
                      formData.append("file", file);
                      formData.append("dryRun", "false");
                      handleSubmit({
                        preventDefault: () => {},
                      } as React.FormEvent);
                    }
                  }}
                  disabled={loading || !dryRun}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 disabled:bg-gray-400"
                >
                  Confirmer et appliquer
                </button>
              )}
            </div>
          </form>
        </div>

        {/* ─── Section Réinitialisation des paiements ─── */}
        <div className="bg-white shadow rounded-lg p-6 mb-6 border-t-4 border-red-400">
          <div className="flex items-center gap-3 mb-4">
            <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <h2 className="text-lg font-semibold text-gray-900">
              Réinitialiser les paiements
            </h2>
          </div>
          <p className="text-gray-600 mb-4">
            Cette action supprime les informations de paiement (paidAt, paidAmount, paymentMethod) 
            des échéances pour une période donnée. Les échéances elles-mêmes ne sont pas supprimées.
          </p>

          {/* Sélecteurs de période */}
          <div className="flex flex-wrap items-end gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mois
              </label>
              <select
                value={resetMonth}
                onChange={(e) => setResetMonth(Number(e.target.value))}
                disabled={resetLoading}
                className="rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500 sm:text-sm px-3 py-2 border min-w-[140px]"
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
                value={resetYear}
                onChange={(e) => setResetYear(Number(e.target.value))}
                disabled={resetLoading}
                className="rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500 sm:text-sm px-3 py-2 border min-w-[100px]"
              >
                {getYears().map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Messages */}
          {resetError && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
              <p className="text-sm text-red-800">{resetError}</p>
            </div>
          )}
          {resetSuccess && (
            <div className="bg-green-50 border border-green-200 rounded-md p-4 mb-4">
              <p className="text-sm text-green-800">{resetSuccess}</p>
            </div>
          )}

          {/* Bouton de réinitialisation */}
          {!showResetConfirm ? (
            <button
              onClick={() => setShowResetConfirm(true)}
              disabled={resetLoading}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Réinitialiser tous les paiements du mois
            </button>
          ) : (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-800 font-medium mb-3">
                ⚠️ Êtes-vous sûr de vouloir réinitialiser tous les paiements de{" "}
                <strong>{MOIS.find((m) => m.value === resetMonth)?.label} {resetYear}</strong> ?
              </p>
              <p className="text-xs text-red-600 mb-4">
                Cette action est irréversible. Les données de paiement (date, montant, méthode) seront perdues.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={handleResetPayments}
                  disabled={resetLoading}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 disabled:bg-gray-400"
                >
                  {resetLoading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Suppression en cours...
                    </>
                  ) : (
                    "Oui, réinitialiser"
                  )}
                </button>
                <button
                  onClick={() => setShowResetConfirm(false)}
                  disabled={resetLoading}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  Annuler
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Résultats */}
        {response && (
          <div className="bg-white shadow rounded-lg overflow-hidden">
            {/* Stats */}
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">
                  Résultats de {response.data.dryRun ? "la simulation" : "l'import"}
                </h2>
                {response.data.dryRun && (
                  <span className="px-3 py-1 rounded-full text-sm font-medium bg-amber-100 text-amber-800">
                    Mode simulation
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500">Total lignes</p>
                  <p className="text-xl font-bold text-gray-900">
                    {response.data.stats.total}
                  </p>
                </div>
                <div className="bg-green-50 rounded-lg p-3">
                  <p className="text-xs text-green-600">Mis à jour</p>
                  <p className="text-xl font-bold text-green-700">
                    {response.data.stats.imported}
                  </p>
                </div>
                <div className="bg-blue-50 rounded-lg p-3">
                  <p className="text-xs text-blue-600">Créés</p>
                  <p className="text-xl font-bold text-blue-700">
                    {response.data.stats.created}
                  </p>
                </div>
                <div className="bg-amber-50 rounded-lg p-3">
                  <p className="text-xs text-amber-600">Ignorés</p>
                  <p className="text-xl font-bold text-amber-700">
                    {response.data.stats.skipped}
                  </p>
                </div>
                <div className="bg-red-50 rounded-lg p-3">
                  <p className="text-xs text-red-600">Erreurs</p>
                  <p className="text-xl font-bold text-red-700">
                    {response.data.stats.errors}
                  </p>
                </div>
                <div className="bg-orange-50 rounded-lg p-3">
                  <p className="text-xs text-orange-600">Doublons CSV</p>
                  <p className="text-xl font-bold text-orange-700">
                    {response.data.stats.duplicateCsv ?? 0}
                  </p>
                </div>
                <div className="bg-purple-50 rounded-lg p-3">
                  <p className="text-xs text-purple-600">Doublons DB</p>
                  <p className="text-xl font-bold text-purple-700">
                    {response.data.stats.duplicateDb ?? 0}
                  </p>
                </div>
              </div>

              {(response.data.stats.duplicateCsv > 0 ||
                response.data.stats.duplicateDb > 0) && (
                <div className="mt-4 bg-amber-50 border border-amber-200 rounded-md p-3 text-sm text-amber-900">
                  <strong>Attention doublons :</strong>{" "}
                  {response.data.stats.duplicateCsv > 0 &&
                    `${response.data.stats.duplicateCsv} ligne(s) en double dans le fichier CSV `}
                  {response.data.stats.duplicateDb > 0 &&
                    `${response.data.stats.duplicateDb} ligne(s) avec échéances dupliquées en base`}
                </div>
              )}
            </div>

            {/* Filtres */}
            <div className="px-6 py-3 border-b border-gray-200 flex flex-wrap gap-2">
              {(
                [
                  ["all", "Tout"],
                  ["ok", "Mis à jour"],
                  ["created", "Créés"],
                  ["skipped", "Ignorés"],
                  ["errors", "Erreurs"],
                  ["warnings", "Avertissements"],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setResultFilter(key)}
                  className={`px-3 py-1 rounded-full text-xs font-medium ${
                    resultFilter === key
                      ? "bg-indigo-600 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Journal détaillé */}
            <div className="overflow-x-auto max-h-[65vh]">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50 sticky top-0 z-10">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">#</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Client</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Police</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">SIRET</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Période</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Règlement</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Montant</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Éch.</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Matching</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase min-w-[220px]">Détail</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {response.data.results
                    .filter((r) => matchesFilter(r, resultFilter))
                    .map((result) => (
                      <tr key={result.rowIndex} className={rowBgClass(result)}>
                        <td className="px-3 py-2 whitespace-nowrap font-mono text-gray-600">
                          {result.rowIndex + 1}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          <span
                            className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${actionBadgeClass(result.action)}`}
                          >
                            {ACTION_LABELS[result.action]}
                          </span>
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-gray-900">
                          {result.nomClient}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap font-mono text-xs">
                          {result.numeroPolice || "—"}
                          {result.quoteReference &&
                            result.quoteReference !== result.numeroPolice && (
                              <div className="text-gray-400">
                                → {result.quoteReference}
                              </div>
                            )}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap font-mono text-xs">
                          {result.siret}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-xs max-w-[140px] truncate" title={result.periode}>
                          {result.periode}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          {result.dateReglement}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-right font-mono">
                          {result.primeReglee.toFixed(2)} €
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          {result.installmentNumber != null
                            ? `#${result.installmentNumber}`
                            : "—"}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-600">
                          {result.matchMethod || "—"}
                        </td>
                        <td className="px-3 py-2 text-xs text-gray-700">
                          <div>{result.message}</div>
                          <div className="text-gray-500 mt-0.5">{result.details}</div>
                          {result.warnings.length > 0 && (
                            <ul className="mt-1 text-amber-700 list-disc list-inside">
                              {result.warnings.map((w, i) => (
                                <li key={i}>{w}</li>
                              ))}
                            </ul>
                          )}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="bg-white shadow rounded-lg p-6 mt-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Instructions
          </h2>
          <div className="prose prose-sm text-gray-600">
            <ol className="list-decimal list-inside space-y-2">
              <li>
                Fichier au format <strong>reglementVinu.csv</strong> (virgule,
                dates <strong>JJ/MM/AAAA</strong>).
              </li>
              <li>
                Colonnes clés : Nom Client, bordereau, DATE DE REGLEMENT, prime
                reglee, PERIODE REGLEE, NUMERO DE POLICE RCD, NUMERO SIRET.
              </li>
              <li>
                Lancez d&apos;abord une <strong>simulation</strong> et vérifiez
                le journal : doublons CSV, échéances déjà payées, matching par
                n° de police + période.
              </li>
              <li>
                Les échéances existantes sont <strong>réutilisées</strong> (pas
                de doublon créé si la période existe déjà).
              </li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );

  if (embedded) return body;
  return <AuthenticatedAppShell>{body}</AuthenticatedAppShell>;
}
