// Composant pour l'historique des sinistres
interface LossHistoryFieldProps {
    fields: Array<{
      name: string;
      label: string;
      type: string;
      min?: number;
      max?: number;
    }>;
    maxEntries?: number;
    value: Array<{ year: number; numClaims: number; totalCost: number }>;
    onChange: (
      value: Array<{ year: number; numClaims: number; totalCost: number }>
    ) => void;
  }
  
  export default function LossHistoryField({
    fields,
    maxEntries = 5,
    value,
    onChange,
  }: LossHistoryFieldProps) {
    const addEntry = () => {
      if (value.length < maxEntries) {
        onChange([
          ...value,
          { year: new Date().getFullYear(), numClaims: 1, totalCost: 0 },
        ]);
      }
    };
  
    const removeEntry = (index: number) => {
      onChange(value.filter((_, i) => i !== index));
    };
  
    const updateEntry = (index: number, field: string, newValue: number) => {
      onChange(
        value.map((entry, i) =>
          i === index ? { ...entry, [field]: newValue } : entry
        )
      );
    };
  
    return (
      <div className="space-y-3">
        {value.map((entry, index) => (
          <div
            key={index}
            className="flex items-center space-x-3 p-3 border rounded-lg bg-gray-50"
          >
            <div className="flex-1 grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Année</label>
                <input
                  type="number"
                  min="2020"
                  max="2025"
                  value={entry.year}
                  onChange={(e) =>
                    updateEntry(index, "year", Number(e.target.value))
                  }
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Nombre</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={entry.numClaims}
                  onChange={(e) =>
                    updateEntry(index, "numClaims", Number(e.target.value))
                  }
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">
                  Coût (€)
                </label>
                <input
                  type="number"
                  min="0"
                  value={entry.totalCost}
                  onChange={(e) =>
                    updateEntry(index, "totalCost", Number(e.target.value))
                  }
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>
            <button
              type="button"
              onClick={() => removeEntry(index)}
              className="px-2 py-1 text-xs text-red-600 hover:text-red-800 hover:bg-red-50 rounded"
            >
              Suppr.
            </button>
          </div>
        ))}
        {value.length < maxEntries && (
          <button
            type="button"
            onClick={addEntry}
            className="w-full px-3 py-2 text-sm text-indigo-600 border border-indigo-600 rounded-lg hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            + Ajouter un sinistre
          </button>
        )}
        {value.length === 0 && (
          <p className="text-sm text-gray-500 italic">Aucun sinistre déclaré</p>
        )}
      </div>
    );
  }