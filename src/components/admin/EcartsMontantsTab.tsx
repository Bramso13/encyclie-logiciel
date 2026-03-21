"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

type Row = {
  id: string;
  reference: string;
  status: string;
  installmentCount: number;
  commonAmountHT: number;
  contract: { id: string; reference: string } | null;
  modifieAlaMain: boolean;
};

export default function EcartsMontantsTab() {
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchInput.trim()), 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const q = debouncedSearch
        ? `?search=${encodeURIComponent(debouncedSearch)}`
        : "";
      const res = await fetch(`/api/admin/ecarts-montants${q}`);
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Erreur lors du chargement");
        setRows([]);
        return;
      }
      setRows(json.data ?? []);
    } catch {
      setError("Erreur réseau");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch]);

  useEffect(() => {
    load();
  }, [load]);

  const toggle = async (quoteId: string) => {
    setTogglingId(quoteId);
    setError(null);
    try {
      const res = await fetch(`/api/admin/ecarts-montants/${quoteId}`, {
        method: "PATCH",
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Échec du basculement");
        return;
      }
      const next = json.data?.modifieAlaMain as boolean | undefined;
      if (typeof next === "boolean") {
        setRows((prev) =>
          prev.map((r) =>
            r.id === quoteId ? { ...r, modifieAlaMain: next } : r,
          ),
        );
      } else {
        await load();
      }
    } catch {
      setError("Erreur réseau");
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-medium text-gray-900">
          Écarts montants
        </h3>
        <p className="mt-1 text-sm text-gray-500">
          Devis dont toutes les échéances ont le même montant HT (au moins 2
          échéances). Marquez un devis comme modifié à la main pour conserver
          l’affichage bordereau historique.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
        <input
          type="search"
          placeholder="Filtrer par référence devis…"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="block w-full max-w-md rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
        />
        <button
          type="button"
          onClick={() => load()}
          className="inline-flex justify-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
        >
          Actualiser
        </button>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
        </div>
      ) : rows.length === 0 ? (
        <p className="text-sm text-gray-500 py-6">Aucun devis ne correspond.</p>
      ) : (
        <div className="overflow-x-auto shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
          <table className="min-w-full divide-y divide-gray-300">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                  Référence
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                  Statut
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                  Nb échéances
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                  Montant HT commun
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                  Contrat
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                  Modifié à la main
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-indigo-600">
                    <Link href={`/quotes/${r.id}`} className="hover:underline">
                      {r.reference}
                    </Link>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">
                    {r.status}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">
                    {r.installmentCount}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">
                    {r.commonAmountHT.toLocaleString("fr-FR", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}{" "}
                    €
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {r.contract ? (
                      <span>
                        Oui —{" "}
                        <span className="font-mono text-xs">
                          {r.contract.reference}
                        </span>
                      </span>
                    ) : (
                      "Non"
                    )}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={r.modifieAlaMain}
                      disabled={togglingId === r.id}
                      onClick={() => toggle(r.id)}
                      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 ${
                        r.modifieAlaMain ? "bg-indigo-600" : "bg-gray-200"
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          r.modifieAlaMain ? "translate-x-5" : "translate-x-1"
                        }`}
                      />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
