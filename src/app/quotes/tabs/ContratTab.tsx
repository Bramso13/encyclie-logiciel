"use client";

import { Quote, CalculationResult } from "@/lib/types";
import { pdf } from "@react-pdf/renderer";
import { useState, useEffect } from "react";
import ContratPDF from "@/components/pdf/ContratPDF";
import { getBrokerInfo } from "@/lib/utils";

export default function ContratTab({
  quote,
  session,
  calculationResult,
}: {
  quote: Quote;
  session: any;
  calculationResult?: CalculationResult | null;
}) {
  const [loading, setLoading] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loadingPdf, setLoadingPdf] = useState(true);

  // Charger le PDF au montage du composant
  useEffect(() => {
    let currentPdfUrl: string | null = null;
    let isMounted = true;

    const loadPDF = async () => {
      if (!quote) {
        if (isMounted) setLoadingPdf(false);
        return;
      }
      try {
        if (isMounted) setLoadingPdf(true);

        const response = await fetch("/api/generate-pdf", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "contrat",
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
          type: "contrat",
          quote,
          calculationResult,
        }),
      });
      if (!response.ok) throw new Error("Erreur génération PDF");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `contrat-${quote.reference || "devis"}.pdf`;
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
      const brokerInfo = await getBrokerInfo(session?.user?.id);
      const pdfBlob = await pdf(
        <ContratPDF
          baseUrl={typeof window !== "undefined" ? window.location.origin : ""}
          quote={quote}
          formData={quote?.formData}
          calculationResult={calculationResult}
        />
      ).toBlob();

      const formData = new FormData();
      formData.append("quoteId", quote.id);
      formData.append(
        "companyName",
        quote.formData?.companyName || quote.companyData?.companyName || ""
      );
      formData.append("clientEmail", brokerInfo.email || "");
      formData.append(
        "pdf",
        pdfBlob,
        `contrat-${quote.reference || "devis"}.pdf`
      );

      const response = await fetch("/api/email/send-contrat", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data?.error || "Erreur lors de l'envoi");
      }

      alert("Contrat envoyé par email avec succès");
    } catch (error) {
      console.error("Erreur envoi email contrat:", error);
      alert("Erreur lors de l'envoi de l'email");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Contrat</h2>
          <p className="text-gray-600 mt-1">
            Conditions particulières – Responsabilité Civile Professionnelle et Décennale
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
            title="Contrat PDF"
          />
        ) : (
          <div className="flex items-center justify-center py-24">
            <div className="text-center">
              <p className="text-gray-500 mb-2">Aucun document disponible</p>
              <p className="text-sm text-gray-400">
                Erreur lors du chargement du document
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

