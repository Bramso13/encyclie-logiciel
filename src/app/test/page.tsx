"use client";

import { calculateRcdPremium, calculPrimeRCD } from "@/lib/tarificateurs/rcd";

export default function TestPage() {
  const result = calculPrimeRCD({
    caDeclared: 400_000,
    etp: 5,
    activites: [
      { code: 2, caSharePercent: 0.625 },
      { code: 17, caSharePercent: 0.375 },
    ],
    dateCreation: new Date("2023-01-01"),
    tempsSansActivite12mois: false,
    anneeExperience: 2,
    assureurDefaillant: false,
    nombreAnneeAssuranceContinue: 1,
    qualif: true,
    ancienneAssurance: "RESILIE",
    activiteSansEtreAssure: false,
    experienceDirigeant: 2,
  });
  console.log(result);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      {/* JSON brut */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold text-gray-800">
            Données techniques (JSON)
          </h3>
          <button
            onClick={() =>
              navigator.clipboard.writeText(JSON.stringify(result, null, 2))
            }
            className="bg-blue-100 hover:bg-blue-200 text-blue-700 px-3 py-1 rounded-md text-sm font-medium transition-colors"
          >
            Copier JSON
          </button>
        </div>
        <div className="bg-gray-900 rounded-lg p-4 overflow-auto max-h-96">
          <pre className="text-green-400 text-xs font-mono leading-relaxed">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
}
