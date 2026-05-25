"use client";

import { useState, useRef } from "react";

interface ImportResult {
  rowIndex: number;
  success: boolean;
  created?: boolean;
  message: string;
}

interface ImportStats {
  total: number;
  imported: number;
  created: number;
  skipped: number;
  errors: number;
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

export default function ImportPaymentsPage() {
  const [file, setFile] = useState<File | null>(null);
  const [dryRun, setDryRun] = useState(true);
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<ImportResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Import des paiements CSV
          </h1>
          <p className="text-gray-600">
            Importez les règlements depuis un fichier CSV. Les échéances seront
            automatiquement mises à jour ou créées si elles n&apos;existent pas.
          </p>
        </div>

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
                Format attendu : CSV avec séparateur virgule, colonnes : Nom
                Client, bordereau, DATE DE REGLEMENT, prime reglee, etc.
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

              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-500">Total lignes</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {response.data.stats.total}
                  </p>
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                  <p className="text-sm text-green-600">Importés</p>
                  <p className="text-2xl font-bold text-green-700">
                    {response.data.stats.imported}
                  </p>
                </div>
                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="text-sm text-blue-600">Créés</p>
                  <p className="text-2xl font-bold text-blue-700">
                    {response.data.stats.created}
                  </p>
                </div>
                <div className="bg-amber-50 rounded-lg p-4">
                  <p className="text-sm text-amber-600">Ignorés</p>
                  <p className="text-2xl font-bold text-amber-700">
                    {response.data.stats.skipped}
                  </p>
                </div>
                <div className="bg-red-50 rounded-lg p-4">
                  <p className="text-sm text-red-600">Erreurs</p>
                  <p className="text-2xl font-bold text-red-700">
                    {response.data.stats.errors}
                  </p>
                </div>
              </div>
            </div>

            {/* Détails */}
            <div className="overflow-x-auto max-h-[60vh]">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-16">
                      Ligne
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
                      Statut
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Message
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {response.data.results.map((result, idx) => (
                    <tr
                      key={idx}
                      className={`${
                        result.success
                          ? result.created
                            ? "bg-blue-50"
                            : "bg-green-50"
                          : result.message.includes("déjà payée")
                          ? "bg-amber-50"
                          : "bg-red-50"
                      }`}
                    >
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        #{result.rowIndex + 1}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {result.success ? (
                          result.created ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              Créé
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              OK
                            </span>
                          )
                        ) : result.message.includes("déjà payée") ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                            Ignoré
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            Erreur
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {result.message}
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
                Préparez votre fichier CSV avec les colonnes suivantes :
                <ul className="list-disc list-inside ml-6 mt-1 space-y-1">
                  <li>Nom Client</li>
                  <li>bordereau</li>
                  <li>DATE DE REGLEMENT</li>
                  <li>prime reglee</li>
                  <li>NUMERO SIRET</li>
                  <li>PERIODE REGLEE</li>
                </ul>
              </li>
              <li>
                Utilisez d&apos;abord le <strong>mode simulation</strong> pour
                vérifier que tout est correct.
              </li>
              <li>
                Si la simulation est concluante, cliquez sur{" "}
                <strong>Confirmer et appliquer</strong>.
              </li>
              <li>
                Les paiements seront associés aux échéances existantes (par
                SIRET/SIREN et période) ou de nouvelles échéances seront créées
                si nécessaire.
              </li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
