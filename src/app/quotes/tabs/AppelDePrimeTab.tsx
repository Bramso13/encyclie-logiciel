"use client";

import { CalculationResult, Quote } from "@/lib/types";
import { pdf } from "@react-pdf/renderer";
import { useState, useEffect } from "react";
import PremiumCallPDF from "@/components/pdf/PremiumCallPDF";
import { getBrokerInfo } from "@/lib/utils";

export default function AppelDePrimeTab({
  quote,
  calculationResult,
  session,
}: {
  quote: Quote;
  calculationResult: CalculationResult | null;
  session: any;
}) {
  const [loading, setLoading] = useState(false);
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
            type: "premium-call",
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

  const handleGeneratePDF = async () => {
    if (!quote) return;
    try {
      setLoading(true);
      const response = await fetch("/api/generate-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "premium-call",
          quote,
          calculationResult,
        }),
      });
      if (!response.ok) throw new Error("Erreur génération PDF");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `appel-prime-${quote.reference || "devis"}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (e) {
      console.error(e);
      alert("Erreur lors de la génération du PDF");
    } finally {
      setLoading(false);
    }
  };

  const handleSendEmail = async () => {
    try {
      if (!calculationResult) {
        alert("Aucun calcul disponible pour générer le document");
        return;
      }

      const brokerInfo = await getBrokerInfo(session?.user?.id);
      const pdfBlob = await pdf(
        <PremiumCallPDF
          quote={quote}
          calculationResult={calculationResult}
          baseUrl={typeof window !== "undefined" ? window.location.origin : ""}
        />
      ).toBlob();

      const formData = new FormData();
      formData.append("quoteId", quote.id);
      formData.append(
        "companyName",
        quote.formData?.companyName || quote.companyData?.companyName || ""
      );
      formData.append("clientEmail", session?.user?.email || "");
      formData.append(
        "pdf",
        pdfBlob,
        `appel-prime-${quote.reference || "devis"}.pdf`
      );

      const response = await fetch("/api/email/send-premium-call", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data?.error || "Erreur lors de l'envoi");
      }

      alert("Appel de prime envoyé par email avec succès");
    } catch (error) {
      console.error("Erreur envoi email appel de prime:", error);
      alert("Erreur lors de l'envoi de l'email");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Appel de prime</h2>
          <p className="text-gray-600 mt-1">
            Document d'appel de prime et échéancier de règlement
          </p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={handleGeneratePDF}
            disabled={loading}
            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
          >
            {loading ? "Génération..." : "Télécharger PDF"}
          </button>
          <button
            onClick={handleSendEmail}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
          >
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
            title="Appel de prime PDF"
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
