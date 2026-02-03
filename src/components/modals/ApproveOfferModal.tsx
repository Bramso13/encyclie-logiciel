"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";

type QuoteForModal = {
  id: string;
  formData?: unknown;
  product?: { name?: string } | null;
};

interface ApproveOfferModalProps {
  isOpen: boolean;
  onClose: () => void;
  quote: QuoteForModal | null;
  onSuccess: () => void;
}

/** Extrait la date d'effet du devis depuis formData (dateEffet / dateDeffet / dateDebut). */
function getQuoteDateEffet(formData: unknown): string | null {
  const fd = formData as Record<string, unknown> | null | undefined;
  if (!fd) return null;
  const raw =
    (fd.dateEffet as string | undefined) ??
    (fd.dateDeffet as string | undefined) ??
    (fd.dateDebut as string | undefined) ??
    (fd.startDate as string | undefined);
  if (!raw) return null;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

export default function ApproveOfferModal({
  isOpen,
  onClose,
  quote,
  onSuccess,
}: ApproveOfferModalProps) {
  const [option, setOption] = useState<"quote" | "other">("quote");
  const [customDate, setCustomDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const quoteDateEffet = quote ? getQuoteDateEffet(quote.formData) : null;
  const hasQuoteDate = !!quoteDateEffet;

  useEffect(() => {
    if (isOpen && quote) {
      const qd = getQuoteDateEffet(quote.formData);
      if (qd) {
        setOption("quote");
        setCustomDate(qd);
      } else {
        setOption("other");
        const today = new Date().toISOString().slice(0, 10);
        setCustomDate(today);
      }
      setError(null);
    }
  }, [isOpen, quote]);

  const getEffectiveStartDate = (): string | null => {
    if (option === "quote" && quoteDateEffet) return quoteDateEffet;
    if (option === "other" && customDate) {
      const d = new Date(customDate);
      return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const startDate = getEffectiveStartDate();
    if (!startDate || !quote) {
      setError("Veuillez choisir une date de début de contrat.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/quotes/${quote.id}/approve-and-create-contract`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ startDate }),
        }
      );
      const data = await response.json();
      if (!response.ok) {
        throw new Error(
          data.error || data.message || "Erreur lors de la création du contrat"
        );
      }
      onClose();
      onSuccess();
      alert(data.message || "Contrat créé avec succès.");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Erreur lors de la création du contrat"
      );
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Approuver l&apos;offre et créer le contrat
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">
              {error}
            </div>
          )}

          <p className="text-sm text-gray-600">
            Choisissez la date de début du contrat (date d&apos;effet).
          </p>

          <div className="space-y-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="dateOption"
                checked={option === "quote"}
                onChange={() => setOption("quote")}
                disabled={!hasQuoteDate}
                className="rounded border-gray-300"
              />
              <span className={!hasQuoteDate ? "text-gray-400" : ""}>
                Utiliser la date d&apos;effet du devis
                {hasQuoteDate && quoteDateEffet && (
                  <span className="ml-1 font-medium text-gray-700">
                    ({new Date(quoteDateEffet).toLocaleDateString("fr-FR")})
                  </span>
                )}
                {!hasQuoteDate && " (non renseignée)"}
              </span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="dateOption"
                checked={option === "other"}
                onChange={() => setOption("other")}
                className="rounded border-gray-300"
              />
              <span>Choisir une autre date</span>
            </label>

            {option === "other" && (
              <div className="pl-6">
                <input
                  type="date"
                  value={customDate}
                  onChange={(e) => setCustomDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required={option === "other"}
                />
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading || !getEffectiveStartDate()}
              className="px-4 py-2 text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Création..." : "Valider et créer le contrat"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
