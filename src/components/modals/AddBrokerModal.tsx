"use client";

import { useState } from "react";
import { X } from "lucide-react";

interface AddBrokerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: BrokerFormData) => Promise<void>;
}

interface BrokerFormData {
  name: string;
  email: string;
  companyName: string;
  phone: string;
  address: string;
  siretNumber: string;
  brokerCode: string;
}

export default function AddBrokerModal({
  isOpen,
  onClose,
  onSubmit,
}: AddBrokerModalProps) {
  const [formData, setFormData] = useState<BrokerFormData>({
    name: "",
    email: "",
    companyName: "",
    phone: "",
    address: "",
    siretNumber: "",
    brokerCode: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateBrokerCode = () => {
    // Génère un code courtier automatique basé sur le nom et la date
    const namePart = formData.name
      .split(" ")
      .map((word) => word.substring(0, 2).toUpperCase())
      .join("");
    const datePart = new Date().getFullYear().toString().slice(-2);
    const randomPart = Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, "0");

    const generatedCode = `BR${namePart}${datePart}${randomPart}`;
    setFormData((prev) => ({ ...prev, brokerCode: generatedCode }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await onSubmit(formData);
      // Reset form
      setFormData({
        name: "",
        email: "",
        companyName: "",
        phone: "",
        address: "",
        siretNumber: "",
        brokerCode: "",
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: keyof BrokerFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            Ajouter un nouveau courtier
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Nom complet */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nom complet *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => handleChange("name", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Jean Dupont"
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Adresse email *
              </label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => handleChange("email", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="jean.dupont@example.com"
              />
            </div>

            {/* Téléphone */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Téléphone *
              </label>
              <input
                type="tel"
                required
                value={formData.phone}
                onChange={(e) => handleChange("phone", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="0123456789"
              />
            </div>

            {/* Nom de l'entreprise */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nom de l'entreprise *
              </label>
              <input
                type="text"
                required
                value={formData.companyName}
                onChange={(e) => handleChange("companyName", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Mon Entreprise SARL"
              />
            </div>

            {/* SIRET */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Numéro SIRET
              </label>
              <input
                type="text"
                value={formData.siretNumber}
                onChange={(e) => handleChange("siretNumber", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="12345678901234"
              />
            </div>

            {/* Adresse */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Adresse complète *
              </label>
              <textarea
                required
                value={formData.address}
                onChange={(e) => handleChange("address", e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="123 Rue de la République, 75001 Paris"
              />
            </div>

            {/* Code courtier */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Code courtier *
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  required
                  value={formData.brokerCode}
                  onChange={(e) => handleChange("brokerCode", e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="BR001"
                />
                <button
                  type="button"
                  onClick={generateBrokerCode}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors whitespace-nowrap"
                >
                  Générer automatiquement
                </button>
              </div>
              <p className="text-sm text-gray-500 mt-1">
                Le code sera utilisé pour identifier le courtier dans le système
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {loading && (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              )}
              {loading ? "Création en cours..." : "Créer le courtier"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
