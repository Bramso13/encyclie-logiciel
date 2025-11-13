import LetterOfIntentPDF from "@/components/pdf/LetterOfIntentPDF";
import { CalculationResult, Quote } from "@/lib/types";
import { pdf } from "@react-pdf/renderer";
import { useState, useEffect } from "react";
import { getBrokerInfo } from "@/lib/utils";

export default function LetterTab({
  quote,
  calculationResult,
  session,
}: {
  quote: Quote;
  calculationResult: CalculationResult;
  session: any;
}) {
  const [generatingLetterPDF, setGeneratingLetterPDF] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loadingPdf, setLoadingPdf] = useState(true);

  // Charger le PDF au montage du composant
  useEffect(() => {
    let currentPdfUrl: string | null = null;
    let isMounted = true;

    const loadPDF = async () => {
      if (!quote || !calculationResult) {
        if (isMounted) setLoadingPdf(false);
        return;
      }
      try {
        if (isMounted) setLoadingPdf(true);

        const response = await fetch("/api/generate-pdf", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "letter-of-intent",
            quote,
            calculationResult,
          }),
        });
        if (!response.ok) throw new Error("Erreur génération PDF");
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        currentPdfUrl = url;

        if (isMounted) {
          // Nettoyer l'ancienne URL avant de définir la nouvelle
          setPdfUrl((prevUrl) => {
            if (prevUrl) {
              window.URL.revokeObjectURL(prevUrl);
            }
            return url;
          });
          setLoadingPdf(false);
        } else {
          // Si le composant est démonté, nettoyer immédiatement
          window.URL.revokeObjectURL(url);
        }
      } catch (e) {
        console.error("Erreur chargement PDF:", e);
        if (isMounted) setLoadingPdf(false);
      }
    };

    loadPDF();

    // Nettoyer l'URL lors du démontage
    return () => {
      isMounted = false;
      if (currentPdfUrl) {
        window.URL.revokeObjectURL(currentPdfUrl);
      }
    };
  }, [quote, calculationResult]);

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
      const brokerInfo = await getBrokerInfo(session?.user?.id);

      if (!brokerInfo) {
        alert("Impossible d'envoyer l'email : broker non trouvé");
        return;
      }
      console.log("brokerInfo", brokerInfo);

      // Générer le PDF
      const pdfBlob = await pdf(
        <LetterOfIntentPDF
          quote={quote}
          calculationResult={calculationResult}
          user={{ ...session?.user, brokerCode: brokerInfo.code }}
          baseUrl={typeof window !== "undefined" ? window.location.origin : ""}
        />
      ).toBlob();

      // Préparer les données pour l'API
      const formData = new FormData();
      formData.append("quoteId", quote.id);
      formData.append("brokerName", session?.user?.name || "");
      formData.append(
        "companyName",
        quote.formData.companyName || quote.companyData.companyName
      );
      formData.append("clientEmail", session?.user?.email || "");
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
            {generatingLetterPDF ? "Génération..." : "Télécharger PDF"}
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

      {/* Affichage du PDF */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loadingPdf ? (
          <div className="flex items-center justify-center py-24">
            <div className="flex flex-col items-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
              <span className="text-gray-600">Chargement du document...</span>
            </div>
          </div>
        ) : pdfUrl ? (
          <iframe
            src={pdfUrl}
            className="w-full"
            style={{ height: "calc(100vh - 300px)", minHeight: "800px" }}
            title="Lettre d'intention PDF"
          />
        ) : (
          <div className="flex items-center justify-center py-24">
            <div className="text-center">
              <p className="text-gray-500 mb-2">Aucun document disponible</p>
              <p className="text-sm text-gray-400">
                {!calculationResult
                  ? "Le calcul de prime est requis pour générer le document"
                  : "Erreur lors du chargement du document"}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
