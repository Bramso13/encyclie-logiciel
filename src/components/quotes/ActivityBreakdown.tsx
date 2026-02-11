import { useState } from "react";

// Composant pour la saisie des activités avec pourcentages
interface ActivityBreakdownFieldProps {
  options: Array<{ label: string; value: string }>;
  value: Array<{ code: string; caSharePercent: number }>;
  onChange: (value: Array<{ code: string; caSharePercent: number }>) => void;
  error?: string;
}
export default function ActivityBreakdownField({
  options,
  value,
  onChange,
  error,
}: ActivityBreakdownFieldProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedActivities, setSelectedActivities] = useState<string[]>([]);

  // Initialiser les activités sélectionnées quand on ouvre le modal
  const openModal = () => {
    setSelectedActivities(value.map((activity) => activity.code));
    setIsModalOpen(true);
  };

  const handleActivityToggle = (activityCode: string) => {
    setSelectedActivities((prev) =>
      prev.includes(activityCode)
        ? prev.filter((code) => code !== activityCode)
        : [...prev, activityCode],
    );
  };

  const handleConfirmSelection = () => {
    // Créer les nouvelles activités avec les pourcentages existants ou 0
    const newActivities = selectedActivities.map((code) => {
      const existing = value.find((activity) => activity.code === code);
      return existing || { code, caSharePercent: 0 };
    });
    onChange(newActivities);
    setIsModalOpen(false);
    setSearchTerm("");
  };

  const handlePercentageChange = (code: string, percent: number) => {
    onChange(
      value.map((v) =>
        v.code === code ? { ...v, caSharePercent: percent } : v,
      ),
    );
  };

  const handleRemoveActivity = (codeToRemove: string) => {
    onChange(value.filter((activity) => activity.code !== codeToRemove));
  };

  // Vérifie si les 8 premières activités représentent au moins 50% du total
  // (uniquement lorsqu'il y a un mix entre activités 1-8 et activités 9-20)
  const checkMainActivitiesShare = (
    activities: Array<{ code: string; caSharePercent: number }>,
  ) => {
    const mainActivities = activities.filter((a) => parseInt(a.code) <= 8);
    const otherActivities = activities.filter((a) => parseInt(a.code) > 8);
    const hasMix = mainActivities.length > 0 && otherActivities.length > 0;

    const mainActivitiesPercent = mainActivities.reduce(
      (sum, act) => sum + act.caSharePercent,
      0,
    );

    return !hasMix || mainActivitiesPercent >= 50;
  };

  // Vérifie si au moins une activité parmi 1 à 8 est à 30% minimum
  // (uniquement lorsqu'il y a au moins une activité 1 à 8)
  const checkMainActivityMinimum = (
    activities: Array<{ code: string; caSharePercent: number }>,
  ) => {
    const activities1to8 = activities.filter(
      (a) => parseInt(a.code) >= 1 && parseInt(a.code) <= 8,
    );
    if (activities1to8.length === 0) return true; // pas d'activité 1-8, condition non applicable
    return activities1to8.some((a) => a.caSharePercent >= 30);
  };

  const totalPercent = value.reduce((sum, v) => sum + v.caSharePercent, 0);

  const filteredOptions = options.filter((option) =>
    option.label.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <div className="space-y-4">
      {/* Bouton principal pour ouvrir le modal */}
      <button
        type="button"
        onClick={openModal}
        className="w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-indigo-400 hover:bg-indigo-50 transition-colors text-left"
      >
        <div className="flex items-center justify-between">
          <span className="text-gray-600">
            {value.length > 0
              ? `${value.length} activité${
                  value.length > 1 ? "s" : ""
                } sélectionnée${value.length > 1 ? "s" : ""}`
              : "Sélectionner les activités"}
          </span>
          <svg
            className="w-5 h-5 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 6v6m0 0v6m0-6h6m-6 0H6"
            />
          </svg>
        </div>
      </button>

      {/* Liste des activités sélectionnées avec pourcentages */}
      {value.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-gray-700">
              Répartition du chiffre d'affaires
            </h4>
            <div
              className={`text-sm font-medium px-2 py-1 rounded ${
                totalPercent === 100 &&
                checkMainActivitiesShare(value) &&
                checkMainActivityMinimum(value)
                  ? "bg-green-100 text-green-700"
                  : totalPercent > 100
                    ? "bg-red-100 text-red-700"
                    : "bg-orange-100 text-orange-700"
              }`}
            >
              Total: {totalPercent}%
            </div>
          </div>

          <div className="space-y-2">
            {value.map((activity) => {
              const option = options.find((o) => o.value === activity.code);
              return option ? (
                <div
                  key={activity.code}
                  className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg shadow-sm"
                >
                  <div className="flex-1">
                    <span className="text-sm font-medium text-black">
                      {option.label}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={activity.caSharePercent || ""}
                      onChange={(e) => {
                        const value = parseFloat(e.target.value) || 0;
                        handlePercentageChange(
                          activity.code,
                          Math.min(100, Math.max(0, value)),
                        );
                      }}
                      className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="0"
                    />
                    <span className="text-sm text-gray-500">%</span>
                  </div>

                  <button
                    type="button"
                    className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                    onClick={() => handleRemoveActivity(activity.code)}
                    title="Supprimer cette activité"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
              ) : null;
            })}
          </div>

          {/* Validation du total et des règles */}
          <div
            className={`text-sm p-3 rounded-lg border ${
              totalPercent === 100 &&
              checkMainActivitiesShare(value) &&
              checkMainActivityMinimum(value)
                ? "bg-green-50 text-green-700 border-green-200"
                : totalPercent > 100
                  ? "bg-red-50 text-red-700 border-red-200"
                  : "bg-amber-50 text-amber-700 border-amber-200"
            }`}
          >
            <div className="flex items-center gap-2">
              {totalPercent === 100 &&
              checkMainActivitiesShare(value) &&
              checkMainActivityMinimum(value) ? (
                <svg
                  className="w-4 h-4 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              ) : (
                <svg
                  className="w-4 h-4 text-amber-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                  />
                </svg>
              )}
              <span>
                <strong>Total: {totalPercent}%</strong>{" "}
                {totalPercent === 100 &&
                checkMainActivitiesShare(value) &&
                checkMainActivityMinimum(value)
                  ? "✓ Répartition valide"
                  : totalPercent > 100
                    ? "La somme des pourcentages ne peut pas dépasser 100%"
                    : totalPercent < 100
                      ? "La somme des pourcentages doit atteindre 100%"
                      : !checkMainActivityMinimum(value)
                        ? "Au moins une activité parmi 1 à 5 doit être à 30% minimum"
                        : !checkMainActivitiesShare(value)
                          ? "Les activités 1 à 8 doivent représenter au moins 50% du total"
                          : ""}
              </span>
            </div>
          </div>
        </div>
      )}

      {error && <p className="text-sm text-red-600 mt-2">{error}</p>}

      {/* Modal de sélection des activités */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
            {/* Header du modal */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                Sélectionner les activités
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg
                  className="w-5 h-5 text-gray-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Barre de recherche */}
            <div className="p-6 border-b border-gray-200">
              <input
                type="text"
                placeholder="Rechercher une activité..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Liste des activités */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-2">
                {filteredOptions.map((option) => (
                  <label
                    key={option.value}
                    className="flex items-center p-3 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={selectedActivities.includes(option.value)}
                      onChange={() => handleActivityToggle(option.value)}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                    <span className="ml-3 text-sm text-gray-900 flex-1">
                      {option.label}
                    </span>
                  </label>
                ))}

                {filteredOptions.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <svg
                      className="w-12 h-12 mx-auto mb-4 text-gray-300"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                    <p>Aucune activité trouvée</p>
                  </div>
                )}
              </div>
            </div>

            {/* Footer du modal */}
            <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50 rounded-b-xl">
              <div className="text-sm text-gray-600">
                {selectedActivities.length} activité
                {selectedActivities.length > 1 ? "s" : ""} sélectionnée
                {selectedActivities.length > 1 ? "s" : ""}
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={handleConfirmSelection}
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  Confirmer la sélection
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
