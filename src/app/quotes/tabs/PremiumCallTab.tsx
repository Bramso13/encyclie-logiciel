import { CalculationResult, Quote } from "@/lib/types";
import { useState } from "react";


export default function PremiumCallTab({ quote, calculationResult }: { quote: Quote, calculationResult: CalculationResult }) {

    const [generatingPremiumCallPDF, setGeneratingPremiumCallPDF] = useState(false);

    // Fonctions pour l'appel de prime
  const handleGeneratePremiumCallPDF = async () => {
    try {
      if (!quote) {
        alert("Aucun devis disponible");
        return;
      }

      setGeneratingPremiumCallPDF(true);

      const response = await fetch("/api/generate-pdf", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "premium-call",
          quote,
          calculationResult,
        }),
      });

      if (!response.ok) {
        throw new Error("Erreur lors de la génération du PDF");
      }

      // Télécharger le PDF
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `appel-prime-${quote.reference || "devis"}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Erreur génération PDF:", error);
      alert("Erreur lors de la génération du PDF");
    } finally {
      setGeneratingPremiumCallPDF(false);
    }
  };

  const handleSendPremiumCallEmail = async () => {
    try {
      // TODO: Implémenter l'envoi par email
      console.log("Envoi de l'appel de prime par email...");
      alert("Fonctionnalité d'envoi par email à implémenter");
    } catch (error) {
      console.error("Erreur envoi email:", error);
    }
  };
  return (
    <div className="space-y-6">
            {/* Actions */}
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  Appel de prime
                </h2>
                <p className="text-gray-600 mt-1">
                  Appel de prime pour{" "}
                  {quote?.companyData?.companyName || "l'entreprise"}
                </p>
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={handleGeneratePremiumCallPDF}
                  disabled={generatingPremiumCallPDF}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {generatingPremiumCallPDF ? (
                    <>
                      <svg
                        className="animate-spin -ml-1 mr-2 h-4 w-4 text-gray-500"
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
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      Génération...
                    </>
                  ) : (
                    <>
                      <svg
                        className="w-4 h-4 mr-2"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                      Générer PDF
                    </>
                  )}
                </button>
                <button
                  onClick={handleSendPremiumCallEmail}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  <svg
                    className="w-4 h-4 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                  </svg>
                  Envoyer par email
                </button>
              </div>
            </div>

            {/* Appel de prime */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="p-8">
                <div className="max-w-6xl mx-auto">
                  {/* En-tête */}
                  <div className="mb-8">
                    <div className="text-sm text-gray-500 mb-2">Monsieur,</div>
                    <div className="text-gray-700 leading-relaxed">
                      vous trouverez ci-joint votre appel de prime ainsi que
                      votre échéancier de règlement au titre de votre contrat{" "}
                      <strong>RESPONSABILITÉ CIVILE ET DÉCENNALE</strong>.
                    </div>
                  </div>

                  {/* Période */}
                  {calculationResult?.echeancier?.echeances &&
                    calculationResult.echeancier.echeances.length > 0 && (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-8">
                        <div className="text-center">
                          <div className="text-lg font-semibold text-green-900 mb-2">
                            PÉRIODE DU
                          </div>
                          <div className="flex items-center justify-center space-x-4">
                            <div className="text-2xl font-bold text-green-800">
                              {calculationResult.echeancier.echeances[0]
                                ?.debutPeriode || "N/A"}
                            </div>
                            <div className="text-green-600 font-medium">AU</div>
                            <div className="text-2xl font-bold text-green-800">
                              {calculationResult.echeancier.echeances[
                                calculationResult.echeancier.echeances.length -
                                  1
                              ]?.finPeriode || "N/A"}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                  {/* Résumé de la période */}
                  {calculationResult && (
                    <div className="bg-gray-50 rounded-lg p-6 mb-8">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4 text-center">
                        Période
                      </h3>
                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div>
                          <div className="text-sm text-gray-600">
                            Montant HT
                          </div>
                          <div className="text-xl font-bold text-gray-900">
                            {calculationResult.primeTotal?.toLocaleString(
                              "fr-FR"
                            ) || "0"}{" "}
                            €
                          </div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-600">Taxe €</div>
                          <div className="text-xl font-bold text-gray-900">
                            {calculationResult.autres?.taxeAssurance?.toLocaleString(
                              "fr-FR"
                            ) || "0"}{" "}
                            €
                          </div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-600">
                            MONTANT TTC
                          </div>
                          <div className="text-2xl font-bold text-indigo-600">
                            {calculationResult.totalTTC?.toLocaleString(
                              "fr-FR"
                            ) || "0"}{" "}
                            €
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Échéancier */}
                  {calculationResult?.echeancier?.echeances &&
                    calculationResult.echeancier.echeances.length > 0 && (
                      <div className="mb-8">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">
                          Échéancier
                        </h3>
                        <div className="overflow-x-auto">
                          <table className="w-full border-collapse border border-gray-300">
                            <thead>
                              <tr className="bg-green-100">
                                <th className="border border-gray-300 px-4 py-3 text-left text-sm font-medium text-gray-700">
                                  Période Date
                                </th>
                                <th className="border border-gray-300 px-4 py-3 text-right text-sm font-medium text-gray-700">
                                  Montant HT Total HT €
                                </th>
                                <th className="border border-gray-300 px-4 py-3 text-right text-sm font-medium text-gray-700">
                                  Taxe €
                                </th>
                                <th className="border border-gray-300 px-4 py-3 text-right text-sm font-medium text-gray-700">
                                  MONTANT TTC Total TTC
                                </th>
                                <th className="border border-gray-300 px-4 py-3 text-center text-sm font-medium text-gray-700">
                                  Date de règlement
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {calculationResult.echeancier.echeances.map(
                                (echeance: any, index: number) => (
                                  <tr key={index} className="hover:bg-gray-50">
                                    <td className="border border-gray-300 px-4 py-3 text-sm font-medium text-gray-900">
                                      {echeance.date}
                                    </td>
                                    <td className="border border-gray-300 px-4 py-3 text-sm text-gray-600 text-right">
                                      {echeance.totalHT?.toLocaleString(
                                        "fr-FR"
                                      ) || "0"}{" "}
                                      €
                                    </td>
                                    <td className="border border-gray-300 px-4 py-3 text-sm text-gray-600 text-right">
                                      {echeance.taxe?.toLocaleString("fr-FR") ||
                                        "0"}{" "}
                                      €
                                    </td>
                                    <td className="border border-gray-300 px-4 py-3 text-sm font-medium text-gray-900 text-right">
                                      {echeance.totalTTC?.toLocaleString(
                                        "fr-FR"
                                      ) || "0"}{" "}
                                      €
                                    </td>
                                    <td className="border border-gray-300 px-4 py-3 text-sm text-gray-600 text-center">
                                      {echeance.date}
                                    </td>
                                  </tr>
                                )
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                  {/* Détail de la prime et Validité des attestations */}
                  {calculationResult?.echeancier?.echeances &&
                    calculationResult.echeancier.echeances.length > 0 && (
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                        {/* Détail de la prime */}
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 mb-4">
                            Détail de la prime
                          </h3>
                          <div className="overflow-x-auto">
                            <table className="w-full border-collapse border border-gray-300">
                              <thead>
                                <tr className="bg-orange-100">
                                  <th className="border border-gray-300 px-4 py-3 text-center text-sm font-medium text-gray-700">
                                    RCD
                                  </th>
                                  <th className="border border-gray-300 px-4 py-3 text-center text-sm font-medium text-gray-700">
                                    PJ
                                  </th>
                                  <th className="border border-gray-300 px-4 py-3 text-center text-sm font-medium text-gray-700">
                                    Frais
                                  </th>
                                  <th className="border border-gray-300 px-4 py-3 text-center text-sm font-medium text-gray-700">
                                    Reprise
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {calculationResult.echeancier.echeances.map(
                                  (echeance: any, index: number) => (
                                    <tr
                                      key={index}
                                      className="hover:bg-gray-50"
                                    >
                                      <td className="border border-gray-300 px-4 py-3 text-sm text-gray-600 text-center">
                                        {echeance.rcd?.toLocaleString(
                                          "fr-FR"
                                        ) || "0"}{" "}
                                        €
                                      </td>
                                      <td className="border border-gray-300 px-4 py-3 text-sm text-gray-600 text-center">
                                        {echeance.pj?.toLocaleString("fr-FR") ||
                                          "0"}{" "}
                                        €
                                      </td>
                                      <td className="border border-gray-300 px-4 py-3 text-sm text-gray-600 text-center">
                                        {echeance.frais?.toLocaleString(
                                          "fr-FR"
                                        ) || "0"}{" "}
                                        €
                                      </td>
                                      <td className="border border-gray-300 px-4 py-3 text-sm text-gray-600 text-center">
                                        {echeance.reprise?.toLocaleString(
                                          "fr-FR"
                                        ) || "0"}{" "}
                                        €
                                      </td>
                                    </tr>
                                  )
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>

                        {/* Validité de vos attestations */}
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 mb-4">
                            Validité de vos attestations
                          </h3>
                          <div className="overflow-x-auto">
                            <table className="w-full border-collapse border border-gray-300">
                              <thead>
                                <tr className="bg-orange-100">
                                  <th className="border border-gray-300 px-4 py-3 text-center text-sm font-medium text-gray-700">
                                    début période
                                  </th>
                                  <th className="border border-gray-300 px-4 py-3 text-center text-sm font-medium text-gray-700">
                                    fin période
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {calculationResult.echeancier.echeances.map(
                                  (echeance: any, index: number) => (
                                    <tr
                                      key={index}
                                      className="hover:bg-gray-50"
                                    >
                                      <td className="border border-gray-300 px-4 py-3 text-sm text-gray-600 text-center">
                                        {echeance.debutPeriode}
                                      </td>
                                      <td className="border border-gray-300 px-4 py-3 text-sm text-gray-600 text-center">
                                        {echeance.finPeriode}
                                      </td>
                                    </tr>
                                  )
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    )}

                  {/* Pied de page */}
                  <div className="mt-12 pt-6 border-t border-gray-200">
                    <div className="text-gray-700 leading-relaxed mb-6">
                      <p>
                        Soucieux de votre satisfaction, nous restons à votre
                        disposition et vous prions d'agréer, Madame, Monsieur,
                        nos sincères salutations.
                      </p>
                    </div>
                    <div className="text-sm text-gray-600">
                      <p>
                        <strong>Service Cotisations:</strong>{" "}
                        cotisation.encycliebat@encyclie-construction.fr
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
  )
}