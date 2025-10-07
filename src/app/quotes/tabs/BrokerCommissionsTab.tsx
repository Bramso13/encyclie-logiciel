import { CalculationResult } from "@/lib/types";

interface BrokerCommissionsTabProps {
  calculationResult: CalculationResult;
}

interface Echeance {
  date: string;
  debutPeriode: string;
  finPeriode: string;
  totalHT: number;
  taxe: number;
  totalTTC: number;
  rcd: number;
  pj: number;
  frais: number;
  reprise: number;
  fraisGestion: number;
}

export default function BrokerCommissionsTab({
  calculationResult,
}: BrokerCommissionsTabProps) {
  // Vérifier si le calculationResult et l'échéancier sont disponibles
  if (!calculationResult || !calculationResult.echeancier) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">Aucun échéancier disponible</div>
      </div>
    );
  }

  const echeances: Echeance[] = calculationResult.echeancier.echeances || [];

  // Formater les montants pour l'affichage
  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat("fr-FR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  // Calculer la commission pour une échéance : 10% de (totalHT + fraisGestion)
  const calculateCommission = (echeance: Echeance) => {
    const base = echeance.totalHT;
    return base * 0.1;
  };

  // Calculer le total des commissions
  const totalCommissions = echeances.reduce((sum, echeance) => {
    return sum + calculateCommission(echeance);
  }, 0);

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Commissions du courtier par échéance
            </h2>
            <p className="text-gray-600">
              Commission de 10% calculée sur (Total HT + Frais de gestion) pour
              chaque échéance
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500 uppercase tracking-wide mb-1">
              Commission totale
            </p>
            <p className="text-3xl font-bold text-indigo-600">
              {formatAmount(totalCommissions)} €
            </p>
          </div>
        </div>
      </div>

      {/* Tableau de l'échéancier avec commissions */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date d'échéance
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Période
                </th>
                <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total HT
                </th>
                <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Frais gestion
                </th>
                <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Base commission
                </th>
                <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Commission (10%)
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {echeances.map((echeance, index) => {
                const baseCommission = echeance.totalHT + echeance.fraisGestion;
                const commission = calculateCommission(echeance);

                return (
                  <tr
                    key={index}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center mr-3">
                          <span className="text-xs font-semibold text-indigo-600">
                            {index + 1}
                          </span>
                        </div>
                        <div className="text-sm font-medium text-gray-900">
                          {echeance.date}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-600">
                        {echeance.debutPeriode}
                      </div>
                      <div className="text-xs text-gray-400">
                        au {echeance.finPeriode}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="text-sm font-medium text-gray-900">
                        {formatAmount(echeance.totalHT)} €
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="text-sm text-gray-600">
                        {formatAmount(echeance.fraisGestion)} €
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="text-sm font-medium text-gray-700">
                        {formatAmount(baseCommission)} €
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="text-sm font-bold text-indigo-600 bg-indigo-50 rounded-md px-3 py-2">
                        {formatAmount(commission)} €
                      </div>
                    </td>
                  </tr>
                );
              })}

              {/* Ligne de total */}
              <tr className="bg-indigo-50 font-semibold">
                <td
                  colSpan={5}
                  className="px-2 py-4 text-right text-sm text-gray-900 uppercase tracking-wider"
                >
                  Total des commissions
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right">
                  <div className="text-lg font-bold text-indigo-600">
                    {formatAmount(totalCommissions)} +{" "}
                    {formatAmount(calculationResult.honoraireGestion)} €
                    (honoraire de courtage)={" "}
                    {formatAmount(
                      totalCommissions + calculationResult.honoraireGestion
                    )}{" "}
                    €
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Info complémentaire */}
      <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg
              className="h-5 w-5 text-blue-400"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-blue-700">
              <span className="font-semibold">Calcul :</span> La commission est
              calculée à 10% sur la somme du montant HT et des frais de gestion
              pour chaque échéance.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
