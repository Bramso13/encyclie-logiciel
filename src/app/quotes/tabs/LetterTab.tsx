import LetterOfIntentPDF from "@/components/pdf/LetterOfIntentPDF";
import { CalculationResult, Quote } from "@/lib/types";
import { pdf } from "@react-pdf/renderer";
import { useState } from "react";
import Image from "next/image";
import { getTaxeByRegion, tableauTax } from "@/lib/tarificateurs/rcd";

export default function LetterTab({ quote, calculationResult, session }: { quote: Quote, calculationResult: CalculationResult, session: any }) {

    const [generatingLetterPDF, setGeneratingLetterPDF] = useState(false);

    // Fonctions pour la lettre d'intention
  const handleGeneratePDF = async () => {
    try {
      if (!quote) {
        alert("Aucun devis disponible");
        return;
      }

      setGeneratingLetterPDF(true);

      const response = await fetch("/api/generate-pdf", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "letter-of-intent",
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
      a.download = `lettre-intention-${quote.reference || "devis"}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Erreur génération PDF:", error);
      alert("Erreur lors de la génération du PDF");
    } finally {
      setGeneratingLetterPDF(false);
    }
  };


  const handleSendEmail = async () => {
    try {
      if (!quote?.formData?.directorName) {
        alert("Impossible d'envoyer l'email : nom du dirigeant manquant");
        return;
      }

      // Demander l'email du client
      const clientEmail = session?.user?.email;

      if (!clientEmail) {
        alert("Impossible d'envoyer l'email : email du broker manquant");
        return;
      }

      // Validation basique de l'email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(clientEmail)) {
        alert("Veuillez saisir un email valide");
        return;
      }

      // Générer le PDF
      const pdfBlob = await pdf(
        <LetterOfIntentPDF
          quote={quote}
          calculationResult={calculationResult}
        />
      ).toBlob();

      // Préparer les données pour l'API
      const formData = new FormData();
      formData.append("quoteId", quote.id);
      formData.append("directorName", quote.formData.directorName);
      formData.append(
        "companyName",
        quote.formData.companyName || quote.companyData.companyName
      );
      formData.append("clientEmail", clientEmail);
      formData.append(
        "pdf",
        pdfBlob,
        `lettre-intention-${quote.reference}.pdf`
      );

      const response = await fetch("/api/email/send-letter-intent", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        alert(
          `Lettre d'intention envoyée par email à ${clientEmail} avec succès !`
        );
      } else {
        const errorData = await response.json();
        alert(`Erreur lors de l'envoi : ${errorData.error}`);
      }
    } catch (error) {
      console.error("Erreur envoi email:", error);
      alert("Erreur lors de l'envoi de l'email");
    }
  };
  return (
    <div className="space-y-6">
            {/* Actions */}
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  Lettre d'intention
                </h2>
                <p className="text-gray-600 mt-1">
                  Lettre d'intention pour{" "}
                  {quote?.companyData?.companyName || "l'entreprise"}
                </p>
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={handleGeneratePDF}
                  disabled={generatingLetterPDF}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {generatingLetterPDF ? (
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
                  onClick={handleSendEmail}
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

            {/* Lettre d'intention */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="p-8">
                <div className="max-w-4xl mx-auto">
                  {/* En-tête avec validité et logo */}
                  <div className="flex justify-between items-start mb-6">
                    <div className="text-sm font-bold text-gray-900">
                      {new Date().toLocaleDateString("fr-FR", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                      })}
                    </div>
                    <div className="text-center">
                      <div className="w-20 h-10 rounded mb-2 mx-auto">
                        <Image
                          src="/couleur_1.png"
                          alt="ENCYCLIE CONSTRUCTION"
                          width={80}
                          height={40}
                        />
                      </div>
                      <div className="text-sm font-bold text-gray-900">
                        ENCYCLIE CONSTRUCTION
                      </div>
                    </div>
                  </div>

                  {/* Destinataire */}
                  <div className="mb-4">
                    <div className="text-sm text-gray-700">
                      A l'attention de {quote?.formData?.directorName}
                    </div>
                  </div>

                  {/* Objet */}
                  <div className="mb-4">
                    <div className="text-sm font-bold text-gray-900">
                      Objet: Indication tarifaire RC Décennale
                    </div>
                  </div>

                  {/* Salutation */}
                  <div className="mb-4">
                    <div className="text-sm text-gray-700">
                      Cher Monsieur, Madame,
                    </div>
                  </div>

                  {/* Accusé de réception */}
                  <div className="mb-6">
                    <div className="text-sm text-gray-700">
                      Nous accusons réception de votre demande et nous vous
                      remercions:
                    </div>
                  </div>

                  {/* Informations entreprise */}
                  <div className="mb-6 space-y-2">
                    <div className="flex text-sm">
                      <span className="font-bold mr-2">
                        Nom de la société / Raison sociale :
                      </span>
                      <span>
                        {quote?.formData?.companyName ||
                          quote?.companyData?.companyName ||
                          "________________"}
                      </span>
                    </div>
                    <div className="flex text-sm">
                      <span className="font-bold mr-2">Forme juridique :</span>
                      <span>
                        {quote?.formData?.legalForm ||
                          quote?.companyData?.legalForm ||
                          "________________"}
                      </span>
                    </div>
                    <div className="flex text-sm">
                      <span className="font-bold mr-2">
                        Nom & Prénom du ou des dirigeants :
                      </span>
                      <span>
                        {quote?.formData?.directorName || "________________"}
                      </span>
                    </div>
                    <div className="flex text-sm">
                      <span className="font-bold mr-2">
                        Rue du siège social :
                      </span>
                      <span>
                        {quote?.formData?.address ||
                          quote?.companyData?.address ||
                          "________________"}
                      </span>
                    </div>
                    <div className="flex text-sm">
                      <span className="font-bold mr-2">
                        CP Ville du siège social :
                      </span>
                      <span>
                        {quote?.formData?.VILLE  ||
                          "________________"}
                      </span>
                    </div>
                    <div className="flex text-sm">
                      <span className="font-bold mr-2">N° SIREN</span>
                      <span>
                        {quote?.formData?.siret ||
                          quote?.companyData?.siret ||
                          "________________"}
                      </span>
                    </div>
                    <div className="flex text-sm">
                      <span className="font-bold mr-2">
                        Chiffre d'affaires :
                      </span>
                      <span>
                        {calculationResult?.caCalculee?.toLocaleString(
                          "fr-FR"
                        ) ||
                          quote?.formData?.chiffreAffaires ||
                          "________________"}{" "}
                        €
                      </span>
                    </div>
                    <div className="flex text-sm">
                      <span className="font-bold mr-2">Date d'effet :</span>
                      <span>
                        {quote?.formData?.dateDeffet
                          ? new Date(
                              quote.formData.dateDeffet
                            ).toLocaleDateString("fr-FR")
                          : "________________"}
                      </span>
                    </div>
                    <div className="text-sm">
                      <span className="font-bold mr-2">
                        Effectif y compris le chef d'entreprise :
                      </span>
                      <span>
                        {quote?.formData?.nombreSalaries || "xxx"} personnes
                      </span>
                    </div>
                    <div className="text-sm">
                      <span className="font-bold mr-2">
                        Date de création de l'entreprise :
                      </span>
                      <span>
                        {new Date(
                          quote?.formData?.companyCreationDate ||
                            quote?.companyData?.creationDate
                        ).toLocaleDateString("fr-FR") || "xxx"}
                      </span>
                    </div>
                  </div>

                  {/* Expérience professionnelle
                  <div className="mb-6">
                    <div className="text-sm font-bold text-gray-900 mb-3">
                      Expérience professionnelle (y compris en qualité de
                      salarié) :
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center text-sm">
                        <div
                          className={`w-3 h-3 border border-gray-400 mr-2 ${
                            parseFloat(quote?.formData?.experienceMetier) < 1
                              ? "bg-gray-900"
                              : ""
                          }`}
                        ></div>
                        <span>Moins de 1 an (refus):</span>
                      </div>
                      <div className="flex items-center text-sm">
                        <div
                          className={`w-3 h-3 border border-gray-400 mr-2 ${
                            parseFloat(quote?.formData?.experienceMetier) >=
                              1 &&
                            parseFloat(quote?.formData?.experienceMetier) < 3
                              ? "bg-gray-900"
                              : ""
                          }`}
                        ></div>
                        <span>1 à 3 ans:</span>
                      </div>
                      <div className="flex items-center text-sm">
                        <div
                          className={`w-3 h-3 border border-gray-400 mr-2 ${
                            parseFloat(quote?.formData?.experienceMetier) >=
                              3 &&
                            parseFloat(quote?.formData?.experienceMetier) < 5
                              ? "bg-gray-900"
                              : ""
                          }`}
                        ></div>
                        <span>3 à 5 ans:</span>
                      </div>
                      <div className="flex items-center text-sm">
                        <div
                          className={`w-3 h-3 border border-gray-400 mr-2 ${
                            parseFloat(quote?.formData?.experienceMetier) >= 5
                              ? "bg-gray-900"
                              : ""
                          }`}
                        ></div>
                        <span>Sup à 5 ans:</span>
                      </div>
                    </div>
                  </div> */}

                  {/* Activités professionnelles */}
                  <div className="mb-6">
                    <div className="text-sm font-bold text-gray-900 mb-3">
                      Activités professionnelles :
                    </div>
                    <table className="min-w-full text-sm text-gray-700 border border-gray-300 rounded">
                      <thead>
                        <tr className="bg-gray-100">
                          <th className="px-2 py-1 border-b border-gray-300 text-left">Activité</th>
                          <th className="px-2 py-1 border-b border-gray-300 text-left">Code</th>
                          <th className="px-2 py-1 border-b border-gray-300 text-left">Part CA (%) </th>

                        </tr>
                      </thead>
                      <tbody>
                        {(quote?.formData?.activities && quote.formData.activities.length > 0) ? (
                          quote.formData.activities.map((activity: any, idx: number) => (
                            <tr key={idx} className="border-b border-gray-200">
                              <td className="px-2 py-1">{tableauTax.find((tax) => tax.code.toString() === activity.code)?.title || "—"}</td>
                              <td className="px-2 py-1">{activity.code || "—"}</td>
                              <td className="px-2 py-1">{activity.caSharePercent || "—"} %</td>

                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td className="px-2 py-1" colSpan={3}>________________</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {
                    calculationResult?.echeancier?.echeances && calculationResult.echeancier.echeances.length > 0 && (
                        <div className="space-y-6">
                    {/* Échéancier détaillé */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 rounded-t-xl">
                        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                          <svg
                            className="w-5 h-5 mr-2 text-emerald-600"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                            />
                          </svg>
                          Échéancier de paiement détaillé
                        </h3>
                      </div>
                      <div className="p-6">
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead>
                              <tr className="bg-gray-50">
                                
                                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">
                                  Début période
                                </th>
                                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">
                                  Fin période
                                </th>
                                <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">
                                  RCD HT
                                </th>
                                <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">
                                  PJ HT
                                </th>
                                <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">
                                  Frais HT
                                </th>
                                <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">
                                  Frais Gestion HT
                                </th>
                                <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">
                                  Reprise HT
                                </th>
                                <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">
                                  Total HT
                                </th>
                                <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">
                                  Taxe
                                </th>
                                <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">
                                  Total TTC
                                </th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                              {calculationResult.echeancier.echeances
                                .filter(
                                  (echeance: any) =>
                                    new Date(echeance.date).getFullYear() ===
                                    new Date().getFullYear()
                                )
                                .map((echeance: any, index: number) => (
                                  <tr key={index} className="hover:bg-gray-50">
                                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                                      {echeance.date}
                                    </td>
                                    
                                    <td className="px-4 py-3 text-sm text-gray-600">
                                      {echeance.finPeriode}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-600 text-right">
                                      {echeance.rcd?.toLocaleString("fr-FR") ||
                                        "0"}{" "}
                                      €
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-600 text-right">
                                      {echeance.pj?.toLocaleString("fr-FR") ||
                                        "0"}{" "}
                                      €
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-600 text-right">
                                      {echeance.frais?.toLocaleString(
                                        "fr-FR"
                                      ) || "0"}{" "}
                                      €
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-600 text-right">
                                      {echeance.fraisGestion?.toLocaleString(
                                        "fr-FR"
                                      ) || "0"}{" "}
                                      €
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-600 text-right">
                                      {echeance.reprise?.toLocaleString(
                                        "fr-FR"
                                      ) || "0"}{" "}
                                      €
                                    </td>
                                    <td className="px-4 py-3 text-sm font-medium text-gray-900 text-right">
                                      {echeance.totalHT?.toLocaleString(
                                        "fr-FR"
                                      ) || "0"}{" "}
                                      €
                                    </td>
                                    <td className="px-4 py-3 text-sm text-orange-600 text-right">
                                      {echeance.taxe?.toLocaleString("fr-FR") ||
                                        "0"}{" "}
                                      €
                                    </td>
                                    <td className="px-4 py-3 text-sm font-bold text-indigo-600 text-right">
                                      {echeance.totalTTC?.toLocaleString(
                                        "fr-FR"
                                      ) || "0"}{" "}
                                      €
                                    </td>
                                  </tr>
                                ))}
                            </tbody>
                            {/* Ligne de totaux */}
                            <tfoot>
                              <tr className="bg-gray-100 font-semibold">
                                <td
                                  className="px-4 py-3 text-sm font-medium text-gray-900"
                                  colSpan={2}
                                >
                                  TOTAUX
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-900 text-right">
                                  {calculationResult.echeancier.echeances
                                    .filter(
                                      (echeance: any) =>
                                        new Date(echeance.date).getFullYear() ===
                                        new Date().getFullYear()
                                    )
                                    .reduce(
                                      (sum: number, echeance: any) =>
                                        sum + (echeance.rcd || 0),
                                      0
                                    )
                                    .toLocaleString("fr-FR")}{" "}
                                  €
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-900 text-right">
                                  {calculationResult.echeancier.echeances
                                    .filter(
                                      (echeance: any) =>
                                        new Date(echeance.date).getFullYear() ===
                                        new Date().getFullYear()
                                    )
                                    .reduce(
                                      (sum: number, echeance: any) =>
                                        sum + (echeance.pj || 0),
                                      0
                                    )
                                    .toLocaleString("fr-FR")}{" "}
                                  €
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-900 text-right">
                                  {calculationResult.echeancier.echeances
                                    .filter(
                                      (echeance: any) =>
                                        new Date(echeance.date).getFullYear() ===
                                        new Date().getFullYear()
                                    )
                                    .reduce(
                                      (sum: number, echeance: any) =>
                                        sum + (echeance.frais || 0),
                                      0
                                    )
                                    .toLocaleString("fr-FR")}{" "}
                                  €
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-900 text-right">
                                  {calculationResult.echeancier.echeances
                                    .filter(
                                      (echeance: any) =>
                                        new Date(echeance.date).getFullYear() ===
                                        new Date().getFullYear()
                                    )
                                    .reduce(
                                      (sum: number, echeance: any) =>
                                        sum + (echeance.fraisGestion || 0),
                                      0
                                    )
                                    .toLocaleString("fr-FR")}{" "}
                                  €
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-900 text-right">
                                  {calculationResult.echeancier.echeances
                                    .filter(
                                      (echeance: any) =>
                                        new Date(echeance.date).getFullYear() ===
                                        new Date().getFullYear()
                                    )
                                    .reduce(
                                      (sum: number, echeance: any) =>
                                        sum + (echeance.reprise || 0),
                                      0
                                    )
                                    .toLocaleString("fr-FR")}{" "}
                                  €
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-900 text-right">
                                  {calculationResult.echeancier.echeances
                                    .filter(
                                      (echeance: any) =>
                                        new Date(echeance.date).getFullYear() ===
                                        new Date().getFullYear()
                                    )
                                    .reduce(
                                      (sum: number, echeance: any) =>
                                        sum + (echeance.totalHT || 0),
                                      0
                                    )
                                    .toLocaleString("fr-FR")}{" "}
                                  €
                                </td>
                                <td className="px-4 py-3 text-sm text-orange-600 text-right">
                                  {calculationResult.echeancier.echeances
                                    .filter(
                                      (echeance: any) =>
                                        new Date(echeance.date).getFullYear() ===
                                        new Date().getFullYear()
                                    )
                                    .reduce(
                                      (sum: number, echeance: any) =>
                                        sum + (echeance.taxe || 0),
                                      0
                                    )
                                    .toLocaleString("fr-FR")}{" "}
                                  €
                                </td>
                                <td className="px-4 py-3 text-sm font-bold text-indigo-600 text-right">
                                  {calculationResult.echeancier.echeances
                                    .filter(
                                      (echeance: any) =>
                                        new Date(echeance.date).getFullYear() ===
                                        new Date().getFullYear()
                                    )
                                    .reduce(
                                      (sum: number, echeance: any) =>
                                        sum + (echeance.totalTTC || 0),
                                      0
                                    )
                                    .toLocaleString("fr-FR")}{" "}
                                  €
                                </td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      </div>
                    </div>
                    </div>)
                  }

                  {/* Paragraphe d'introduction */}
                  <div className="mb-6 text-sm text-gray-700 leading-relaxed">
                    Nous sommes en mesure de vous confirmer notre intérêt pour
                    vos projets suite à une étude préliminaire, et votre demande
                    d'une approche tarifaire sera examinée, sous réserves du
                    dossier complet et sous réserves de la validation par la
                    Compagnie à laquelle le projet sera soumis, notre
                    proposition tarifaire indicative est de :
                  </div>

                  {/* Tableau de tarification */}
                  <div className="mb-6">
                    <div className="border border-gray-300 rounded-lg overflow-hidden">
                      <div className="grid grid-cols-4 bg-gray-100 border-b border-gray-300">
                        <div className="p-2 text-xs font-bold text-center"></div>
                        <div className="p-2 text-xs font-bold text-center">
                          Montants H.T
                        </div>
                        <div className="p-2 text-xs font-bold text-center">
                          Montants Taxes
                        </div>
                        <div className="p-2 text-xs font-bold text-center">
                          Montant TTC
                        </div>
                      </div>

                      <div className="grid grid-cols-4 border-b border-gray-200">
                        <div className="p-2 text-xs">
                          PRIMES année en cours pour la période du au
                        </div>
                        <div className="p-2 text-xs text-right"></div>
                        <div className="p-2 text-xs text-right"></div>
                        <div className="p-2 text-xs text-right"></div>
                      </div>

                      <div className="grid grid-cols-4 border-b border-gray-200">
                        <div className="p-2 text-xs">
                          Prime RCD provisionnelle hors reprise du passé
                        </div>
                        <div className="p-2 text-xs text-right">
                          {calculationResult?.echeancier?.echeances
                            ?.filter(
                              (echeance: any) =>
                                new Date(echeance.date).getFullYear() ===
                                new Date().getFullYear()
                            )
                            .reduce(
                              (sum: number, echeance: any) =>
                                sum + (echeance.rcd - echeance.taxe || 0),
                              0
                            )
                            ?.toLocaleString("fr-FR") || ""}{" "}
                          €
                        </div>
                        <div className="p-2 text-xs text-right">
                          {calculationResult?.echeancier?.echeances
                            ?.filter(
                              (echeance: any) =>
                                new Date(echeance.date).getFullYear() ===
                                new Date().getFullYear()
                            )
                            .reduce(
                              (sum: number, echeance: any) =>
                                sum + (echeance.taxe || 0),
                              0
                            )
                            ?.toLocaleString("fr-FR") || ""}{" "}
                          €
                        </div>
                        <div className="p-2 text-xs text-right">
                          {calculationResult?.echeancier?.echeances
                            ?.filter(
                              (echeance: any) =>
                                new Date(echeance.date).getFullYear() ===
                                new Date().getFullYear()
                            )
                            .reduce(
                              (sum: number, echeance: any) =>
                                sum +
                                (echeance.rcd || 0) +
                                (echeance.taxe || 0),
                              0
                            )
                            ?.toLocaleString("fr-FR") || ""}{" "}
                          €
                        </div>
                      </div>

                      <div className="grid grid-cols-4 border-b border-gray-200">
                        <div className="p-2 text-xs">
                          Prime Protection Juridique
                        </div>
                        <div className="p-2 text-xs text-right">
                          {(
                            calculationResult?.echeancier?.echeances
                              ?.filter(
                                (echeance: any) =>
                                  new Date(echeance.date).getFullYear() ===
                                  new Date().getFullYear()
                              )
                              .reduce(
                                (sum: number, echeance: any) =>
                                  sum + (echeance.pj || 0),
                                0
                              ) *
                            (1 - getTaxeByRegion(quote?.formData?.territory))
                          )?.toLocaleString("fr-FR") || ""}{" "}
                          €
                        </div>
                        <div className="p-2 text-xs text-right">
                          {(
                            calculationResult?.echeancier?.echeances
                              ?.filter(
                                (echeance: any) =>
                                  new Date(echeance.date).getFullYear() ===
                                  new Date().getFullYear()
                              )
                              .reduce(
                                (sum: number, echeance: any) =>
                                  sum + (echeance.pj || 0),
                                0
                              ) * getTaxeByRegion(quote?.formData?.territory)
                          )?.toLocaleString("fr-FR") || ""}{" "}
                          €
                        </div>
                        <div className="p-2 text-xs text-right">
                          {calculationResult?.echeancier?.echeances
                            ?.filter(
                              (echeance: any) =>
                                new Date(echeance.date).getFullYear() ===
                                new Date().getFullYear()
                            )
                            .reduce(
                              (sum: number, echeance: any) =>
                                sum + (echeance.pj || 0),
                              0
                            )
                            ?.toLocaleString("fr-FR") || ""}{" "}
                          €
                        </div>
                      </div>

                      <div className="grid grid-cols-4 border-b border-gray-200">
                        <div className="p-2 text-xs">
                          Montant total RCD + PJ
                        </div>
                        <div className="p-2 text-xs text-right">
                          {calculationResult?.echeancier?.echeances
                            ?.filter(
                              (echeance: any) =>
                                new Date(echeance.date).getFullYear() ===
                                new Date().getFullYear()
                            )
                            .reduce(
                              (sum: number, echeance: any) =>
                                sum + (echeance.rcd || 0) + (echeance.pj || 0),
                              0
                            )
                            ?.toLocaleString("fr-FR") || ""}{" "}
                          €
                        </div>
                        <div className="p-2 text-xs text-right">
                          {calculationResult?.echeancier?.echeances
                            ?.filter(
                              (echeance: any) =>
                                new Date(echeance.date).getFullYear() ===
                                new Date().getFullYear()
                            )
                            .reduce(
                              (sum: number, echeance: any) =>
                                sum + (echeance.taxe || 0),
                              0
                            )
                            ?.toLocaleString("fr-FR") || ""}{" "}
                          €
                        </div>
                        <div className="p-2 text-xs text-right">
                          {calculationResult?.echeancier?.echeances
                            ?.filter(
                              (echeance: any) =>
                                new Date(echeance.date).getFullYear() ===
                                new Date().getFullYear()
                            )
                            .reduce(
                              (sum: number, echeance: any) =>
                                sum +
                                (echeance.rcd || 0) +
                                (echeance.pj || 0) +
                                (echeance.taxe || 0),
                              0
                            )
                            ?.toLocaleString("fr-FR") || ""}{" "}
                          €
                        </div>
                      </div>

                      <div className="grid grid-cols-4 border-b border-gray-200">
                        <div className="p-2 text-xs">Honoraire de gestion</div>
                        <div className="p-2 text-xs text-right">
                          {calculationResult?.echeancier?.echeances
                            ?.filter(
                              (echeance: any) =>
                                new Date(echeance.date).getFullYear() ===
                                new Date().getFullYear()
                            )
                            .reduce(
                              (sum: number, echeance: any) =>
                                sum + (echeance.fraisGestion || 0),
                              0
                            )
                            ?.toLocaleString("fr-FR") || ""}{" "}
                          €
                        </div>
                        <div className="p-2 text-xs text-right"></div>
                        <div className="p-2 text-xs text-right"></div>
                      </div>

                      <div className="grid grid-cols-4 border-b border-gray-200">
                        <div className="p-2 text-xs">
                          Montant RCD +PJ+ Frais gestion
                        </div>
                        <div className="p-2 text-xs text-right">
                          {calculationResult?.echeancier?.echeances
                            ?.filter(
                              (echeance: any) =>
                                new Date(echeance.date).getFullYear() ===
                                new Date().getFullYear()
                            )
                            .reduce(
                              (sum: number, echeance: any) =>
                                sum +
                                (echeance.rcd || 0) +
                                (echeance.pj || 0) +
                                (echeance.fraisGestion || 0) -
                                (echeance.taxe || 0),
                              0
                            )
                            ?.toLocaleString("fr-FR") || ""}{" "}
                          €
                        </div>
                        <div className="p-2 text-xs text-right">
                          {calculationResult?.echeancier?.echeances
                            ?.filter(
                              (echeance: any) =>
                                new Date(echeance.date).getFullYear() ===
                                new Date().getFullYear()
                            )
                            .reduce(
                              (sum: number, echeance: any) =>
                                sum + (echeance.taxe || 0),
                              0
                            )
                            ?.toLocaleString("fr-FR") || ""}{" "}
                          €
                        </div>
                        <div className="p-2 text-xs text-right">
                          {calculationResult?.echeancier?.echeances
                            ?.filter(
                              (echeance: any) =>
                                new Date(echeance.date).getFullYear() ===
                                new Date().getFullYear()
                            )
                            .reduce(
                              (sum: number, echeance: any) =>
                                sum +
                                (echeance.rcd || 0) +
                                (echeance.pj || 0) +
                                (echeance.fraisGestion || 0),
                              0
                            )
                            ?.toLocaleString("fr-FR") || ""}{" "}
                          €
                        </div>
                      </div>

                      {/* <div className="grid grid-cols-4 border-b border-gray-200">
                        <div className="p-2 text-xs">Prime RCD pour la garantie reprise du passé (Prime unique à la souscription)</div>
                        <div className="p-2 text-xs text-right">{calculationResult?.echeancier?.echeances?.filter((echeance: any) => new Date(echeance.date).getFullYear() === new Date().getFullYear()).reduce((sum: number, echeance: any) => sum + (echeance.reprise || 0), 0)?.toLocaleString("fr-FR") || ""} €</div>
                        <div className="p-2 text-xs text-right"></div>
                        <div className="p-2 text-xs text-right"></div>
                      </div> */}

                      <div className="grid grid-cols-4">
                        <div className="p-2 text-xs">Prime totale à régler</div>
                        <div className="p-2 text-xs text-right">
                          {calculationResult?.echeancier?.echeances
                            ?.filter(
                              (echeance: any) =>
                                new Date(echeance.date).getFullYear() ===
                                new Date().getFullYear()
                            )
                            .reduce(
                              (sum: number, echeance: any) =>
                                sum +
                                (echeance.rcd || 0) +
                                (echeance.pj || 0) +
                                (echeance.fraisGestion || 0) +
                                (echeance.reprise || 0) -
                                (echeance.taxe || 0),
                              0
                            )
                            ?.toLocaleString("fr-FR") || ""}{" "}
                          €
                        </div>
                        <div className="p-2 text-xs text-right">
                          {calculationResult?.echeancier?.echeances
                            ?.filter(
                              (echeance: any) =>
                                new Date(echeance.date).getFullYear() ===
                                new Date().getFullYear()
                            )
                            .reduce(
                              (sum: number, echeance: any) =>
                                sum + (echeance.taxe || 0),
                              0
                            )
                            ?.toLocaleString("fr-FR") || ""}{" "}
                          €
                        </div>
                        <div className="p-2 text-xs text-right">
                          {calculationResult?.echeancier?.echeances
                            ?.filter(
                              (echeance: any) =>
                                new Date(echeance.date).getFullYear() ===
                                new Date().getFullYear()
                            )
                            .reduce(
                              (sum: number, echeance: any) =>
                                sum + (echeance.totalTTC || 0),
                              0
                            )
                            ?.toLocaleString("fr-FR") || ""}{" "}
                          €
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Pied de page */}
                  <div className="mt-8 pt-4 border-t border-gray-200 text-xs text-gray-600 leading-relaxed">
                    <p>
                      ENCYCLIE CONSTRUCTION - 42 Rue Notre-Dame des Victoire,
                      75002 PARIS - SAS au capital de 1 000 € - SIREN 897 796
                      785 - RCS ST NAZAIRE - N° ORIAS : 21 004 564 -
                      www.orias.fr - Sous le contrôle de l'ACPR, Autorité de
                      Contrôle Prudentiel et de Résolution - 4 Place de
                      Budapest, CS 92459, 75436 PARIS CEDEX 09 -
                      acpr.banque-france.fr - Assurance de Responsabilité Civile
                      Professionnelle et Garantie Financière conformes au Code
                      des assurances.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
  )
}