"use client";

import { useEffect, useState } from "react";
import { aggravationAmount } from "@/lib/quotes/aggravation";
import { getTaxeByRegion } from "@/lib/tarificateurs/rcd";
import { CalculationResult, Quote } from "@/lib/types";
import { Button } from "@/components/ui/Controls";
import { EmptyState } from "@/components/ui/Feedback";
import { formatEur } from "@/lib/ui/labels";

export default function AggravationTab({
  quote,
  calculationResult,
}: {
  quote: Quote;
  calculationResult: CalculationResult | null;
}) {
  const [percentage, setPercentage] = useState<string>("");
  const [calculatedAmount, setCalculatedAmount] = useState<number>(0);

  const primeHT =
    calculationResult?.primeHT || calculationResult?.primeTotal || 0;
  const taxRate = getTaxeByRegion(String(quote.formData?.territory || "")) ?? 0;
  const fraisRate =
    calculationResult?.primeTotal > 0 && calculationResult?.fraisGestion
      ? calculationResult.fraisGestion / calculationResult.primeTotal
      : 0.1;

  useEffect(() => {
    if (!calculationResult || !percentage) {
      setCalculatedAmount(0);
      return;
    }
    const percentValue = parseFloat(percentage);
    if (Number.isNaN(percentValue) || percentValue < 0) {
      setCalculatedAmount(0);
      return;
    }
    setCalculatedAmount(
      aggravationAmount(primeHT, percentValue, fraisRate, taxRate),
    );
  }, [calculationResult, percentage, primeHT, fraisRate, taxRate]);

  if (!calculationResult) {
    return (
      <EmptyState
        title="Aucun calcul de prime"
        description="Le calcul de prime est requis pour afficher l'aggravation."
      />
    );
  }

  const hasAmount = calculatedAmount > 0;

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="rounded-t-xl border-b border-gray-200 bg-gray-50 px-6 py-4">
          <h2 className="text-xl font-semibold text-gray-900">
            Aggravation et réajustement
          </h2>
          <p className="mt-1 text-sm text-gray-600">
            Prime d&apos;aggravation = prime HT × % × (1 + frais de gestion +
            taxe).
          </p>
        </div>
        <div className="p-6">
          <div className="mb-6">
            <label
              htmlFor="percentage-input"
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              Pourcentage de la prime HT (%)
            </label>
            <div className="flex flex-wrap items-center gap-3">
              <input
                id="percentage-input"
                type="number"
                min="0"
                step="0.01"
                value={percentage}
                onChange={(e) => setPercentage(e.target.value)}
                placeholder="0.00"
                className="flex-1 rounded-lg border border-gray-300 px-4 py-2 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
              />
              <Button
                type="button"
                variant="secondary"
                onClick={() => setPercentage("50")}
              >
                50 % bilan non fourni
              </Button>
              <div className="text-sm text-gray-500">
                Prime HT :{" "}
                <span className="font-semibold">{formatEur(primeHT)}</span>
              </div>
            </div>
            <p className="mt-2 text-xs text-ink-muted">
              Frais de gestion {(fraisRate * 100).toFixed(1)} % — taxe{" "}
              {(taxRate * 100).toFixed(1)} %
            </p>
          </div>

          {hasAmount ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h4 className="mb-2 text-lg font-semibold text-red-900">
                    Majoration calculée
                  </h4>
                  <p className="text-sm text-red-700">
                    {percentage} % × {formatEur(primeHT)} × (1 + {fraisRate} +{" "}
                    {taxRate}).
                    {percentage === "50"
                      ? " L'appel de prime portera le titre « Appel de prime {année} aggravé » si le switch bilan N-1 est actif sur le calcul."
                      : ""}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold text-red-600">
                    {formatEur(calculatedAmount)}
                  </div>
                  <div className="text-sm text-red-500">Prime d'aggravation</div>
                </div>
              </div>
            </div>
          ) : null}

          {!hasAmount && percentage ? (
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <p className="text-sm text-gray-600">
                Saisissez un pourcentage valide pour calculer la prime
                d&apos;aggravation.
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
