"use client";

import { useState, useEffect } from "react";
import { CalculationResult, Quote } from "@/lib/types";

export default function AggravationTab({
  quote,
  calculationResult,
}: {
  quote: Quote;
  calculationResult: CalculationResult | null;
}) {
  const [percentage, setPercentage] = useState<string>("");
  const [calculatedAmount, setCalculatedAmount] = useState<number>(0);

  // Calculer le montant à partir du pourcentage
  useEffect(() => {
    if (calculationResult && percentage) {
      const primeHT =
        calculationResult.primeHT || calculationResult.primeTotal || 0;
      const percentValue = parseFloat(percentage);
      if (!isNaN(percentValue) && percentValue >= 0) {
        const amount = (primeHT * percentValue) / 100;
        setCalculatedAmount(amount);
      } else {
        setCalculatedAmount(0);
      }
    } else {
      setCalculatedAmount(0);
    }
  }, [calculationResult, percentage]);

  if (!calculationResult) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="text-center py-12">
          <p className="text-gray-500 mb-2">
            Aucun calcul de prime disponible
          </p>
          <p className="text-sm text-gray-400">
            Le calcul de prime est requis pour afficher les informations
            d'aggravation
          </p>
        </div>
      </div>
    );
  }

  const primeHT = calculationResult.primeHT || calculationResult.primeTotal || 0;
  const hasAmount = calculatedAmount > 0;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 rounded-t-xl">
          <h2 className="text-xl font-semibold text-gray-900">
            Aggravation et réajustement
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Saisissez un pourcentage de la prime HT pour calculer la prime
            d'aggravation
          </p>
        </div>
        <div className="p-6">
          <div className="mb-6">
            <label
              htmlFor="percentage-input"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Pourcentage de la prime HT (%)
            </label>
            <div className="flex items-center space-x-4">
              <input
                id="percentage-input"
                type="number"
                min="0"
                step="0.01"
                value={percentage}
                onChange={(e) => setPercentage(e.target.value)}
                placeholder="0.00"
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
              <div className="text-sm text-gray-500">
                Prime HT de base:{" "}
                <span className="font-semibold">
                  {primeHT.toLocaleString("fr-FR")} €
                </span>
              </div>
            </div>
          </div>

          {hasAmount && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-lg font-semibold text-red-900 mb-2">
                    Majoration appliquée
                  </h4>
                  <p className="text-red-700 text-sm">
                    Une majoration de {percentage}% a été appliquée sur la
                    prime HT. Cette prime supplémentaire s'ajoute au montant de
                    base.
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold text-red-600">
                    {calculatedAmount.toLocaleString("fr-FR")} €
                  </div>
                  <div className="text-sm text-red-500">
                    Prime d'aggravation
                  </div>
                </div>
              </div>
            </div>
          )}

          {!hasAmount && percentage && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <p className="text-sm text-gray-600">
                Veuillez saisir un pourcentage valide pour calculer la prime
                d'aggravation.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

