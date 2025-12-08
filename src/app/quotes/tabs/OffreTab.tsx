"use client";

import { useState, useEffect } from "react";
import { Quote, CalculationResult, QuoteDocument } from "@/lib/types";
import { useSession } from "@/lib/auth-client";

interface OffreTabProps {
  quote: Quote;
  calculationResult: CalculationResult | null;
}

// Document obligatoire qui ne peut pas être modifié
const REQUIRED_DOCUMENT = {
  id: "offre_signee",
  label: "Offre signée",
};

// Liste complète des pièces justificatives selon les spécifications
const DOCUMENT_CHECKLIST = {
  general: {
    label: "Documents généraux",
    items: [
      {
        id: "rcd_questionnaire",
        label: "Questionnaire RCD signé par le proposant",
      },
      {
        id: "kbis",
        label: "Kbis de moins de 3 mois et les statuts de l'entreprise",
      },
      {
        id: "cv_dirigeant",
        label: "CV du dirigeant justifiant du/des activités demandées",
      },
      {
        id: "rib_mandat",
        label: "RIB/MANDAT SEPA si paiement par prélèvement automatique choisi",
      },
      { id: "cni_gerant", label: "CNI du gérant" },
      {
        id: "qualification",
        label: "Qualification QUALIBAT/QUALIFELEC si applicable",
      },
      {
        id: "attestation_honneur",
        label:
          "Attestation sur l'honneur et signée précisant que le dirigeant n'a pas connaissance de difficulté ou d'incident susceptibles d'occasionner une déclaration de sinistre",
      },
      {
        id: "verification_coherence",
        label:
          "Vérification de la cohérence des déclarations relatives à l'activité",
      },
      {
        id: "diplome_certificat",
        label:
          "Diplôme/certificat professionnel justifiant du/des activités demandées",
      },
      {
        id: "organigramme",
        label: "Organigramme pour les CA supérieur à 500 000€",
      },
    ],
  },
  newCompany: {
    label:
      "Pour les entreprises en création (créées depuis moins de 12 mois) sans activité",
    items: [
      {
        id: "ventilation_previsionnelle",
        label:
          "Ventilation prévisionnelle des activités du chiffre d'affaires N",
      },
      {
        id: "certificat_travail",
        label:
          "Certificat de travail/fiche de paie des anciens employeurs émanant du dirigeant",
      },
      {
        id: "certificat_experience",
        label:
          "Certificat de travail/fiche de paie pour couvrir la totalité de la durée d'expérience prise en compte",
      },
      {
        id: "factures_ancienne_entreprise",
        label:
          "Factures émises sous son ancienne entreprise pour les travailleurs non-salariés",
      },
      { id: "situation_comptable", label: "Situation comptable intermédiaire" },
      {
        id: "attestation_emploi",
        label:
          "Attestation sur l'honneur certifiant l'emploi dans une société ou organigramme",
      },
    ],
  },
  existingCompany: {
    label:
      "Pour les entreprises créées depuis plus de 12 mois et précédemment assurées",
    items: [
      {
        id: "ventilation_activites",
        label: "Ventilation des activités du chiffre d'affaires N-1 et N",
      },
      {
        id: "releve_sinistralite",
        label:
          "RI/Relevé de sinistralité de 5 ans ou depuis la création de l'entreprise",
      },
      {
        id: "attestation_assurance",
        label:
          "Dernière attestation d'assurance mentionnant les activités assurées",
      },
      {
        id: "bilan_financier",
        label:
          "Dernier bilan financier pour les sociétés créées depuis plus de 2 ans",
      },
      {
        id: "factures_chantier",
        label:
          "Minimum 4 factures de chantier justifiant l'expérience déclarée",
      },
      {
        id: "attestation_non_reprise",
        label: "Attestation du gérant pour la non reprise du passé",
      },
    ],
  },
};

export default function OffreTab({ quote, calculationResult }: OffreTabProps) {
  const { data: session } = useSession();
  const [selectedDocuments, setSelectedDocuments] = useState<Set<string>>(
    new Set([REQUIRED_DOCUMENT.id])
  );
  const [sending, setSending] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showOfferLetterPreview, setShowOfferLetterPreview] = useState(false);
  const [offerSent, setOfferSent] = useState(false);
  const [offerData, setOfferData] = useState<any>(null);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editableDocuments, setEditableDocuments] = useState(
    JSON.parse(JSON.stringify(DOCUMENT_CHECKLIST))
  );
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loadingPdf, setLoadingPdf] = useState(false);
  const [uploadedDocuments, setUploadedDocuments] = useState<
    Record<string, QuoteDocument[]>
  >({});
  const [loadingDocuments, setLoadingDocuments] = useState(false);
  const [downloadingDocs, setDownloadingDocs] = useState<Set<string>>(
    new Set()
  );

  const isAdmin = session?.user?.role === "ADMIN";

  console.log("quote.formData", quote.formData);

  const getDocumentLabel = (documentId: string) => {
    // Gérer le document obligatoire
    if (documentId === REQUIRED_DOCUMENT.id) {
      return REQUIRED_DOCUMENT.label;
    }
    const docChecklist = editableDocuments;
    for (const category of Object.values(docChecklist)) {
      const item = (category as any).items.find(
        (i: any) => i.id === documentId
      );
      if (item) return item.label;
    }
    return documentId;
  };

  // Charger l'état de l'offre si elle existe
  useEffect(() => {
    const fetchOfferData = async () => {
      try {
        const response = await fetch(`/api/quotes/${quote.id}/offer`);
        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data) {
            setOfferData(result.data);
            setOfferSent(result.data.sent || false);
            if (result.data.requiredDocuments) {
              const documentsSet = new Set<string>(
                Array.isArray(result.data.requiredDocuments)
                  ? result.data.requiredDocuments
                  : []
              );
              // S'assurer que le document obligatoire est toujours inclus
              documentsSet.add(REQUIRED_DOCUMENT.id);
              setSelectedDocuments(documentsSet);
            }
          }
        }
      } catch (error) {
        console.error("Erreur lors du chargement de l'offre:", error);
      }
    };

    fetchOfferData();
  }, [quote.id]);

  // Charger les documents uploadés
  useEffect(() => {
    const fetchDocuments = async () => {
      setLoadingDocuments(true);
      try {
        const response = await fetch(
          `/api/quotes/${quote.id}/documents/by-type`
        );
        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data) {
            setUploadedDocuments(result.data);
          }
        }
      } catch (error) {
        console.error("Erreur lors du chargement des documents:", error);
      } finally {
        setLoadingDocuments(false);
      }
    };

    fetchDocuments();
  }, [quote.id]);

  // Fonction pour obtenir les documents uploadés pour un ID de document de la checklist
  // Compare directement l'ID de la checklist avec le documentType
  const getUploadedDocumentsForChecklistId = (
    checklistId: string
  ): QuoteDocument[] => {
    // Comparer directement l'ID avec le documentType
    return uploadedDocuments[checklistId] || [];
  };

  // Fonction pour télécharger un document
  const handleDownloadDocument = async (doc: QuoteDocument) => {
    setDownloadingDocs((prev) => new Set(prev).add(doc.id));
    try {
      const response = await fetch(
        `/api/quotes/${quote.id}/documents/${doc.id}`
      );
      if (!response.ok) {
        throw new Error("Erreur lors du téléchargement");
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = doc.originalName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Erreur lors du téléchargement:", error);
      alert("Erreur lors du téléchargement du document");
    } finally {
      setDownloadingDocs((prev) => {
        const newSet = new Set(prev);
        newSet.delete(doc.id);
        return newSet;
      });
    }
  };

  // Charger le PDF quand showOfferLetterPreview est activé
  useEffect(() => {
    let currentPdfUrl: string | null = null;
    let isMounted = true;

    const loadPDF = async () => {
      if (!showOfferLetterPreview || !quote || !calculationResult) {
        if (isMounted) {
          setPdfUrl(null);
          setLoadingPdf(false);
        }
        return;
      }

      try {
        if (isMounted) setLoadingPdf(true);

        // Fonction locale pour obtenir le label d'un document
        const getDocLabel = (documentId: string) => {
          if (documentId === REQUIRED_DOCUMENT.id) {
            return REQUIRED_DOCUMENT.label;
          }
          for (const category of Object.values(editableDocuments)) {
            const item = (category as any).items.find(
              (i: any) => i.id === documentId
            );
            if (item) return item.label;
          }
          return documentId;
        };

        const response = await fetch("/api/generate-pdf", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "offer-letter",
            quote,
            calculationResult,
            formData: quote.formData,
            selectedDocuments: Array.from(selectedDocuments).map((docId) =>
              getDocLabel(docId)
            ),
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
        if (isMounted) {
          setLoadingPdf(false);
          setPdfUrl(null);
        }
      }
    };

    loadPDF();

    // Nettoyer l'URL lors du démontage
    return () => {
      isMounted = false;
      if (currentPdfUrl) {
        window.URL.revokeObjectURL(currentPdfUrl);
      }
      setPdfUrl((prevUrl) => {
        if (prevUrl) {
          window.URL.revokeObjectURL(prevUrl);
        }
        return null;
      });
    };
  }, [
    showOfferLetterPreview,
    quote,
    calculationResult,
    selectedDocuments,
    editableDocuments,
  ]);

  const handleDocumentToggle = (documentId: string) => {
    // Empêcher la désélection du document obligatoire
    if (documentId === REQUIRED_DOCUMENT.id) {
      return;
    }
    const newSelected = new Set(selectedDocuments);
    if (newSelected.has(documentId)) {
      newSelected.delete(documentId);
    } else {
      newSelected.add(documentId);
    }
    setSelectedDocuments(newSelected);
  };

  const handleSelectAll = (category: keyof typeof DOCUMENT_CHECKLIST) => {
    const newSelected = new Set(selectedDocuments);
    const docChecklist = editableDocuments;
    docChecklist[category].items.forEach((item: any) => {
      newSelected.add(item.id);
    });
    setSelectedDocuments(newSelected);
  };

  const handleDeselectAll = (category: keyof typeof DOCUMENT_CHECKLIST) => {
    const newSelected = new Set(selectedDocuments);
    const docChecklist = editableDocuments;
    docChecklist[category].items.forEach((item: any) => {
      // Ne pas désélectionner le document obligatoire
      if (item.id !== REQUIRED_DOCUMENT.id) {
        newSelected.delete(item.id);
      }
    });
    // S'assurer que le document obligatoire reste sélectionné
    newSelected.add(REQUIRED_DOCUMENT.id);
    setSelectedDocuments(newSelected);
  };

  const handleSendOffer = async () => {
    if (selectedDocuments.size === 0) {
      alert("Veuillez sélectionner au moins un document requis");
      return;
    }

    setSending(true);
    try {
      // 1. Générer le PDF via l'API existante
      const pdfResponse = await fetch("/api/generate-pdf", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "offer-letter",
          quote: quote,
          calculationResult: calculationResult,
          formData: quote.formData,
          selectedDocuments: Array.from(selectedDocuments).map((docId) =>
            getDocumentLabel(docId)
          ),
        }),
      });

      if (!pdfResponse.ok) {
        throw new Error("Erreur lors de la génération du PDF");
      }

      const pdfBlob = await pdfResponse.blob();

      // 2. Envoyer l'email avec le PDF en pièce jointe
      const emailFormData = new FormData();
      emailFormData.append("quoteId", quote.id);
      emailFormData.append(
        "directorName",
        (quote.formData as any)?.directorName || ""
      );
      emailFormData.append(
        "companyName",
        (quote.formData as any)?.companyName ||
          (quote.companyData as any)?.companyName ||
          ""
      );
      emailFormData.append("brokerEmail", (quote as any).broker?.email || "");
      emailFormData.append(
        "pdf",
        pdfBlob,
        `proposition-offre-${quote.reference}.pdf`
      );

      const emailResponse = await fetch("/api/email/send-offer-letter", {
        method: "POST",
        body: emailFormData,
      });

      if (!emailResponse.ok) {
        throw new Error("Erreur lors de l'envoi de l'email");
      }

      // 3. Sauvegarder l'offre dans la base de données
      const saveResponse = await fetch(`/api/quotes/${quote.id}/offer`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          requiredDocuments: Array.from(selectedDocuments),
          calculationResult,
          formData: quote.formData,
          companyData: quote.companyData,
        }),
      });

      const result = await saveResponse.json();

      if (!result.success) {
        console.error("Erreur lors de la sauvegarde:", result.error);
      }

      setOfferSent(true);
      setOfferData(result.data);
      alert("L'offre a été envoyée au courtier avec succès !");
    } catch (error) {
      console.error("Erreur:", error);
      alert("Erreur lors de l'envoi de l'offre");
    } finally {
      setSending(false);
    }
  };

  const handleSaveDocuments = async () => {
    if (!isAdmin) return;

    try {
      const response = await fetch(`/api/quotes/${quote.id}/offer`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          requiredDocuments: Array.from(selectedDocuments),
        }),
      });

      const result = await response.json();

      if (result.success) {
        alert("Liste des documents sauvegardée !");
      } else {
        throw new Error(result.error || "Erreur lors de la sauvegarde");
      }
    } catch (error) {
      console.error("Erreur:", error);
      alert("Erreur lors de la sauvegarde");
    }
  };

  const handleDownloadOfferPdf = async () => {
    setGeneratingPdf(true);
    try {
      const response = await fetch("/api/generate-pdf", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "offer-letter",
          quote: quote,
          calculationResult: calculationResult,
          formData: quote.formData,
          selectedDocuments: Array.from(selectedDocuments).map((docId) =>
            getDocumentLabel(docId)
          ),
        }),
      });

      if (!response.ok) {
        throw new Error("Erreur lors de la génération du PDF");
      }

      const pdfBlob = await response.blob();
      const url = window.URL.createObjectURL(pdfBlob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `lettre-offre-${quote.reference || "devis"}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Erreur:", error);
      alert("Erreur lors de la génération du PDF");
    } finally {
      setGeneratingPdf(false);
    }
  };

  const handleUpdateDocumentLabel = (
    categoryKey: string,
    itemId: string,
    newLabel: string
  ) => {
    setEditableDocuments((prev: any) => {
      const updated = { ...prev };
      updated[categoryKey] = {
        ...updated[categoryKey],
        items: updated[categoryKey].items.map((item: any) =>
          item.id === itemId ? { ...item, label: newLabel } : item
        ),
      };
      return updated;
    });
  };

  const handleAddDocument = (categoryKey: string) => {
    const newId = `custom_${Date.now()}`;
    setEditableDocuments((prev: any) => {
      const updated = { ...prev };
      updated[categoryKey] = {
        ...updated[categoryKey],
        items: [
          ...updated[categoryKey].items,
          {
            id: newId,
            label: "Nouveau document",
          },
        ],
      };
      return updated;
    });
  };

  const handleDeleteDocument = (categoryKey: string, itemId: string) => {
    setEditableDocuments((prev: any) => {
      const updated = { ...prev };
      updated[categoryKey] = {
        ...updated[categoryKey],
        items: updated[categoryKey].items.filter(
          (item: any) => item.id !== itemId
        ),
      };
      return updated;
    });
    // Retirer aussi de la sélection si c'était sélectionné
    setSelectedDocuments((prev) => {
      const newSet = new Set(prev);
      newSet.delete(itemId);
      return newSet;
    });
  };

  const handleUpdateCategoryLabel = (categoryKey: string, newLabel: string) => {
    setEditableDocuments((prev: any) => {
      const updated = { ...prev };
      updated[categoryKey] = {
        ...updated[categoryKey],
        label: newLabel,
      };
      return updated;
    });
  };

  const handleResetDocuments = () => {
    setEditableDocuments(JSON.parse(JSON.stringify(DOCUMENT_CHECKLIST)));
    setIsEditMode(false);
  };

  if (!isAdmin) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <div className="flex items-center">
          <svg
            className="w-6 h-6 text-yellow-600 mr-3"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>
          <div>
            <h3 className="text-lg font-medium text-yellow-900">
              Accès réservé aux administrateurs
            </h3>
            <p className="text-sm text-yellow-700 mt-1">
              Seuls les administrateurs peuvent accéder à l'onglet Offre.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* En-tête avec statut */}
      <div
        className={`rounded-lg p-4 ${
          offerSent
            ? "bg-green-50 border border-green-200"
            : "bg-blue-50 border border-blue-200"
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            {offerSent ? (
              <>
                <svg
                  className="w-6 h-6 text-green-600 mr-3"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                <div>
                  <h3 className="text-lg font-semibold text-green-900">
                    Offre envoyée
                  </h3>
                  <p className="text-sm text-green-700">
                    L'offre a été envoyée au courtier le{" "}
                    {offerData?.sentAt
                      ? new Date(offerData.sentAt).toLocaleString("fr-FR")
                      : ""}
                  </p>
                </div>
              </>
            ) : (
              <>
                <svg
                  className="w-6 h-6 text-blue-600 mr-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                <div>
                  <h3 className="text-lg font-semibold text-blue-900">
                    Préparation de l'offre
                  </h3>
                  <p className="text-sm text-blue-700">
                    Sélectionnez les documents requis et prévisualisez l'offre
                    avant envoi
                  </p>
                </div>
              </>
            )}
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              {showPreview ? "Masquer" : "Afficher"} la prévisualisation
            </button>
            <button
              onClick={() => setShowOfferLetterPreview(!showOfferLetterPreview)}
              className="px-4 py-2 bg-blue-600 text-white border border-blue-600 rounded-md text-sm font-medium hover:bg-blue-700"
            >
              {showOfferLetterPreview ? "Masquer" : "Afficher"} la lettre
              d'offre
            </button>
            <button
              onClick={handleDownloadOfferPdf}
              disabled={generatingPdf}
              className="px-4 py-2 bg-green-600 text-white border border-green-600 rounded-md text-sm font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {generatingPdf ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
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
                  Télécharger le PDF
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Prévisualisation du formulaire (Admin seulement) */}
      {showPreview && (
        <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200">
          <h3 className="text-xl font-semibold mb-6 text-gray-900">
            Prévisualisation complète de l'offre
          </h3>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Informations de l'entreprise */}
            <div className="space-y-4">
              <h4 className="font-semibold text-gray-900 border-b pb-2 text-lg">
                Informations de l'entreprise
              </h4>
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <p className="text-sm text-gray-500">Nom de l'entreprise</p>
                  <p className="font-medium">
                    {quote.formData?.companyName ||
                      quote.companyData?.companyName ||
                      "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">SIRET</p>
                  <p className="font-medium">
                    {quote.formData?.siret || quote.companyData?.siret || "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Forme juridique</p>
                  <p className="font-medium">
                    {quote.formData?.legalForm ||
                      quote.companyData?.legalForm ||
                      "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Dirigeant</p>
                  <p className="font-medium">
                    {quote.formData?.directorName ||
                      quote.companyData?.directorName ||
                      "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Adresse</p>
                  <p className="font-medium">
                    {quote.formData?.address ||
                      quote.companyData?.address ||
                      "N/A"}
                  </p>
                  <p className="font-medium">
                    {quote.formData?.postalCode ||
                      quote.companyData?.postalCode}{" "}
                    {quote.formData?.city || quote.companyData?.city}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">
                    Entreprise en création
                  </p>
                  <p className="font-medium">
                    {quote.formData.enCreation ? "Oui" : "Non"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Date de création</p>
                  <p className="font-medium">
                    {quote.formData?.companyCreationDate
                      ? new Date(
                          quote.formData.companyCreationDate
                        ).toLocaleDateString("fr-FR")
                      : quote.formData?.creationDate
                      ? new Date(
                          quote.formData.creationDate
                        ).toLocaleDateString("fr-FR")
                      : "N/A"}
                  </p>
                </div>
                {quote.formData?.phoneNumber && (
                  <div>
                    <p className="text-sm text-gray-500">Téléphone</p>
                    <p className="font-medium">{quote.formData.phoneNumber}</p>
                  </div>
                )}
                {quote.formData?.mailAddress && (
                  <div>
                    <p className="text-sm text-gray-500">Email</p>
                    <p className="font-medium">{quote.formData.mailAddress}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Informations d'activité */}
            <div className="space-y-4">
              <h4 className="font-semibold text-gray-900 border-b pb-2 text-lg">
                Activité et risques
              </h4>
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <p className="text-sm text-gray-500">Chiffre d'affaires</p>
                  <p className="font-medium">
                    {quote.formData?.chiffreAffaires
                      ? `${parseInt(
                          quote.formData.chiffreAffaires
                        ).toLocaleString("fr-FR")} €`
                      : "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Nombre de salariés</p>
                  <p className="font-medium">
                    {quote.formData?.nombreSalaries || "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">
                    Territoire d'intervention
                  </p>
                  <p className="font-medium">
                    {quote.formData?.territory || "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Expérience métier</p>
                  <p className="font-medium">
                    {quote.formData?.experienceMetier || "N/A"} ans
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Pourcentage de négoce</p>
                  <p className="font-medium">
                    {quote.formData?.tradingPercent || "N/A"}%
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">
                    Pourcentage de sous-traitance
                  </p>
                  <p className="font-medium">
                    {quote.formData?.subContractingPercent || "N/A"}%
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">
                    Qualification professionnelle
                  </p>
                  <p className="font-medium">
                    {quote.formData?.hasQualification ? "Oui" : "Non"}
                  </p>
                </div>
                {quote.formData?.tempsSansActivite && (
                  <div>
                    <p className="text-sm text-gray-500">Temps sans activité</p>
                    <p className="font-medium">
                      {quote.formData.tempsSansActivite}
                    </p>
                  </div>
                )}
                {quote.formData
                  ?.sansActiviteDepuisPlusDe12MoisSansFermeture && (
                  <div>
                    <p className="text-sm text-gray-500">
                      Sans activité +12 mois sans fermeture
                    </p>
                    <p className="font-medium">
                      {
                        quote.formData
                          .sansActiviteDepuisPlusDe12MoisSansFermeture
                      }
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Activités détaillées */}
            {quote.formData?.activities &&
              quote.formData.activities.length > 0 && (
                <div className="space-y-4">
                  <h4 className="font-semibold text-gray-900 border-b pb-2 text-lg">
                    Répartition des activités
                  </h4>
                  <div className="space-y-2">
                    {quote.formData.activities.map((activity, index) => (
                      <div
                        key={index}
                        className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border"
                      >
                        <div className="flex-1">
                          <span className="text-sm font-medium text-gray-900">
                            {activity.code}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-semibold text-indigo-600">
                            {activity.caSharePercent}%
                          </span>
                          <p className="text-xs text-gray-500">du CA</p>
                        </div>
                      </div>
                    ))}
                    <div className="mt-3 p-2 bg-blue-50 rounded text-xs text-blue-700">
                      Total:{" "}
                      {quote.formData.activities.reduce(
                        (sum, activity) => sum + activity.caSharePercent,
                        0
                      )}
                      % du chiffre d'affaires
                    </div>
                  </div>
                </div>
              )}

            {/* Informations d'assurance */}
            <div className="space-y-4">
              <h4 className="font-semibold text-gray-900 border-b pb-2 text-lg">
                Informations d'assurance
              </h4>
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <p className="text-sm text-gray-500">
                    Date d'effet souhaitée
                  </p>
                  <p className="font-medium">
                    {quote.formData?.dateDeffet
                      ? new Date(quote.formData.dateDeffet).toLocaleDateString(
                          "fr-FR"
                        )
                      : "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">
                    Périodicité de paiement
                  </p>
                  <p className="font-medium">
                    {quote.formData?.periodicity || "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Honoraires courtier</p>
                  <p className="font-medium">
                    {quote.formData?.honoraireCourtier || "N/A"}%
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">
                    Protection juridique incluse
                  </p>
                  <p className="font-medium">
                    {quote.formData?.includePJ ? "Oui" : "Non"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Statut RCD précédent</p>
                  <p className="font-medium">
                    {quote.formData?.previousRcdStatus || "N/A"}
                  </p>
                </div>
                {quote.formData?.previousInsurer && (
                  <div>
                    <p className="text-sm text-gray-500">Assureur précédent</p>
                    <p className="font-medium">
                      {quote.formData.previousInsurer}
                    </p>
                  </div>
                )}
                {quote.formData?.nombreAnneeAssuranceContinue && (
                  <div>
                    <p className="text-sm text-gray-500">
                      Années d'assurance continue
                    </p>
                    <p className="font-medium">
                      {quote.formData.nombreAnneeAssuranceContinue} ans
                    </p>
                  </div>
                )}
                {quote.formData?.assureurDefaillant !== undefined && (
                  <div>
                    <p className="text-sm text-gray-500">Assureur défaillant</p>
                    <p className="font-medium">
                      {quote.formData.assureurDefaillant ? "Oui" : "Non"}
                    </p>
                  </div>
                )}
                {quote.formData?.absenceDeSinistreSurLes5DernieresAnnees && (
                  <div>
                    <p className="text-sm text-gray-500">
                      Absence de sinistre sur 5 ans
                    </p>
                    <p className="font-medium">
                      {quote.formData.absenceDeSinistreSurLes5DernieresAnnees}
                    </p>
                  </div>
                )}
                {quote.formData?.previousResiliationDate && (
                  <div>
                    <p className="text-sm text-gray-500">
                      Date de résiliation précédente
                    </p>
                    <p className="font-medium">
                      {new Date(
                        quote.formData.previousResiliationDate
                      ).toLocaleDateString("fr-FR")}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Historique des sinistres */}
            {quote.formData?.lossHistory &&
              quote.formData.lossHistory.length > 0 && (
                <div className="space-y-4">
                  <h4 className="font-semibold text-gray-900 border-b pb-2 text-lg">
                    Historique des sinistres
                  </h4>
                  <div className="space-y-2">
                    {quote.formData.lossHistory.map((loss, index) => (
                      <div
                        key={index}
                        className="flex justify-between items-center p-3 bg-red-50 rounded border border-red-200"
                      >
                        <div>
                          <span className="text-sm font-medium">
                            Année {loss.year}
                          </span>
                          <p className="text-xs text-gray-600">
                            {loss.numClaims} sinistre
                            {loss.numClaims > 1 ? "s" : ""}
                          </p>
                        </div>
                        <span className="text-sm font-medium text-red-600">
                          {loss.totalCost.toLocaleString("fr-FR")} €
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            {/* Calcul de la prime */}
            <div className="space-y-4 lg:col-span-2">
              <h4 className="font-semibold text-gray-900 border-b pb-2 text-lg">
                Calcul de la prime
              </h4>
              {calculationResult ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <p className="text-sm text-gray-600">Prime HT</p>
                    <p className="text-xl font-bold text-blue-600">
                      {calculationResult.primeTotal?.toFixed(2) || "N/A"} €
                    </p>
                  </div>

                  <div className="p-4 bg-indigo-50 rounded-lg border-2 border-indigo-200">
                    <p className="text-sm text-gray-600">Prime TTC</p>
                    <p className="text-2xl font-bold text-indigo-600">
                      {calculationResult.totalTTC?.toFixed(2) || "N/A"} €
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-gray-500 text-center">
                    Aucun calcul disponible
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Prévisualisation de la lettre d'offre (Admin seulement) */}
      {showOfferLetterPreview && (
        <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200">
          <h3 className="text-xl font-semibold mb-6 text-gray-900">
            Prévisualisation de la Lettre d'Offre
          </h3>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            {loadingPdf ? (
              <div className="flex items-center justify-center py-24">
                <div className="flex flex-col items-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
                  <span className="text-gray-600">
                    Chargement du document...
                  </span>
                </div>
              </div>
            ) : pdfUrl ? (
              <iframe
                src={pdfUrl}
                className="w-full"
                style={{ height: "calc(100vh - 300px)", minHeight: "800px" }}
                title="Lettre d'offre PDF"
              />
            ) : (
              <div className="flex items-center justify-center py-24">
                <div className="text-center">
                  <p className="text-gray-500 mb-2">
                    Aucun document disponible
                  </p>
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
      )}

      {/* Liste des documents à cocher */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold text-gray-900">
            Pièces justificatives requises
          </h3>
          <div className="flex items-center gap-4">
            <div className="text-sm text-gray-600">
              {selectedDocuments.size} document
              {selectedDocuments.size > 1 ? "s" : ""} sélectionné
              {selectedDocuments.size > 1 ? "s" : ""}
            </div>
            <button
              onClick={() => setIsEditMode(!isEditMode)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                isEditMode
                  ? "bg-orange-600 text-white hover:bg-orange-700"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {isEditMode ? "Terminer l'édition" : "Modifier la liste"}
            </button>
            {isEditMode && (
              <button
                onClick={handleResetDocuments}
                className="px-4 py-2 bg-red-100 text-red-700 rounded-md text-sm font-medium hover:bg-red-200"
              >
                Réinitialiser
              </button>
            )}
          </div>
        </div>

        {/* Document obligatoire */}
        <div className="mb-6 pb-6 border-b border-gray-300">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold text-gray-800">
              Documents obligatoires
            </h4>
          </div>
          <div className="space-y-2 pl-4">
            {(() => {
              const uploadedDocs = getUploadedDocumentsForChecklistId(
                REQUIRED_DOCUMENT.id
              );
              const hasUploaded = uploadedDocs.length > 0;
              return (
                <div
                  className={`flex items-start space-x-3 p-2 rounded border ${
                    hasUploaded
                      ? "bg-green-50 border-green-200"
                      : "bg-blue-50 border-blue-200"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedDocuments.has(REQUIRED_DOCUMENT.id)}
                    disabled={true}
                    className="mt-1 h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded cursor-not-allowed opacity-75"
                  />
                  <div className="flex-1 flex items-center justify-between gap-2">
                    <label className="flex-1 text-sm text-gray-700 font-medium cursor-not-allowed">
                      {REQUIRED_DOCUMENT.label}
                    </label>
                    <div className="flex items-center gap-2">
                      {hasUploaded ? (
                        <>
                          <span className="text-xs text-green-600 font-medium flex items-center gap-1">
                            <svg
                              className="w-4 h-4"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path
                                fillRule="evenodd"
                                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                clipRule="evenodd"
                              />
                            </svg>
                            Uploadé ({uploadedDocs.length})
                          </span>
                          {uploadedDocs.map((doc) => (
                            <button
                              key={doc.id}
                              onClick={() => handleDownloadDocument(doc)}
                              disabled={downloadingDocs.has(doc.id)}
                              className="text-xs px-2 py-1 bg-blue-600 text-white hover:bg-blue-700 rounded flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                              title={`Télécharger ${doc.originalName}`}
                            >
                              {downloadingDocs.has(doc.id) ? (
                                <svg
                                  className="animate-spin h-3 w-3"
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
                              ) : (
                                <svg
                                  className="w-3 h-3"
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
                              )}
                              <span className="hidden sm:inline">
                                Télécharger
                              </span>
                            </button>
                          ))}
                        </>
                      ) : (
                        <span className="text-xs text-gray-500 flex items-center gap-1">
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
                              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                          Non uploadé
                        </span>
                      )}
                      <span className="text-xs text-blue-600 font-medium bg-blue-100 px-2 py-1 rounded">
                        Obligatoire
                      </span>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>

        {Object.entries(editableDocuments).map(
          ([categoryKey, category]: [string, any]) => (
            <div key={categoryKey} className="mb-6">
              <div className="flex items-center justify-between mb-3">
                {isEditMode ? (
                  <input
                    type="text"
                    value={category.label}
                    onChange={(e) =>
                      handleUpdateCategoryLabel(categoryKey, e.target.value)
                    }
                    className="font-medium text-gray-800 bg-yellow-50 border border-yellow-300 rounded px-2 py-1 text-sm"
                  />
                ) : (
                  <h4 className="font-medium text-gray-800">
                    {category.label}
                  </h4>
                )}
                <div className="flex space-x-2">
                  {isEditMode && (
                    <button
                      onClick={() => handleAddDocument(categoryKey)}
                      className="text-xs px-3 py-1 bg-green-600 text-white hover:bg-green-700 rounded flex items-center gap-1"
                    >
                      <svg
                        className="w-3 h-3"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 4v16m8-8H4"
                        />
                      </svg>
                      Ajouter
                    </button>
                  )}
                  <button
                    onClick={() =>
                      handleSelectAll(
                        categoryKey as keyof typeof DOCUMENT_CHECKLIST
                      )
                    }
                    className="text-xs px-2 py-1 text-indigo-600 hover:bg-indigo-50 rounded"
                  >
                    Tout sélectionner
                  </button>
                  <button
                    onClick={() =>
                      handleDeselectAll(
                        categoryKey as keyof typeof DOCUMENT_CHECKLIST
                      )
                    }
                    className="text-xs px-2 py-1 text-gray-600 hover:bg-gray-50 rounded"
                  >
                    Tout désélectionner
                  </button>
                </div>
              </div>
              <div className="space-y-2 pl-4">
                {category.items.map((item: any) => {
                  const uploadedDocs = getUploadedDocumentsForChecklistId(
                    item.id
                  );
                  const hasUploaded = uploadedDocs.length > 0;
                  return (
                    <div
                      key={item.id}
                      className={`flex items-start space-x-3 p-2 rounded ${
                        isEditMode ? "bg-gray-50 border border-gray-200" : ""
                      } ${
                        hasUploaded ? "bg-green-50 border border-green-200" : ""
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedDocuments.has(item.id)}
                        onChange={() => handleDocumentToggle(item.id)}
                        className="mt-1 h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                        disabled={offerSent && !isAdmin}
                      />
                      {isEditMode ? (
                        <div className="flex-1 flex items-center gap-2">
                          <input
                            type="text"
                            value={item.label}
                            onChange={(e) =>
                              handleUpdateDocumentLabel(
                                categoryKey,
                                item.id,
                                e.target.value
                              )
                            }
                            className="flex-1 text-sm text-gray-700 bg-white border border-gray-300 rounded px-2 py-1"
                          />
                          <button
                            onClick={() =>
                              handleDeleteDocument(categoryKey, item.id)
                            }
                            className="text-red-600 hover:text-red-800 hover:bg-red-50 rounded p-1"
                            title="Supprimer"
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
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                              />
                            </svg>
                          </button>
                        </div>
                      ) : (
                        <div className="flex-1 flex items-center justify-between gap-2">
                          <label className="flex-1 text-sm text-gray-700 cursor-pointer">
                            {item.label}
                          </label>
                          <div className="flex items-center gap-2">
                            {hasUploaded ? (
                              <>
                                <span className="text-xs text-green-600 font-medium flex items-center gap-1">
                                  <svg
                                    className="w-4 h-4"
                                    fill="currentColor"
                                    viewBox="0 0 20 20"
                                  >
                                    <path
                                      fillRule="evenodd"
                                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                      clipRule="evenodd"
                                    />
                                  </svg>
                                  Uploadé ({uploadedDocs.length})
                                </span>
                                {uploadedDocs.map((doc) => (
                                  <button
                                    key={doc.id}
                                    onClick={() => handleDownloadDocument(doc)}
                                    disabled={downloadingDocs.has(doc.id)}
                                    className="text-xs px-2 py-1 bg-blue-600 text-white hover:bg-blue-700 rounded flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                                    title={`Télécharger ${doc.originalName}`}
                                  >
                                    {downloadingDocs.has(doc.id) ? (
                                      <svg
                                        className="animate-spin h-3 w-3"
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
                                    ) : (
                                      <svg
                                        className="w-3 h-3"
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
                                    )}
                                    <span className="hidden sm:inline">
                                      Télécharger
                                    </span>
                                  </button>
                                ))}
                              </>
                            ) : (
                              <span className="text-xs text-gray-500 flex items-center gap-1">
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
                                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                  />
                                </svg>
                                Non uploadé
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )
        )}
      </div>

      {/* Documents sélectionnés (résumé) */}
      {selectedDocuments.size > 0 && (
        <div className="bg-indigo-50 rounded-lg p-4 border border-indigo-200">
          <h4 className="font-medium text-indigo-900 mb-3">
            Documents qui seront demandés au courtier
          </h4>
          <ul className="space-y-1">
            {Array.from(selectedDocuments).map((docId) => (
              <li
                key={docId}
                className="text-sm text-indigo-800 flex items-center"
              >
                <svg
                  className="w-4 h-4 mr-2 text-indigo-600"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                {getDocumentLabel(docId)}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-between items-center pt-4 border-t">
        <button
          onClick={handleSaveDocuments}
          disabled={sending || selectedDocuments.size === 0}
          className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Sauvegarder la sélection
        </button>

        <button
          onClick={handleSendOffer}
          disabled={sending || selectedDocuments.size === 0 || offerSent}
          className="px-8 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium flex items-center"
        >
          {sending ? (
            <>
              <svg
                className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
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
              Envoi en cours...
            </>
          ) : offerSent ? (
            <>
              <svg
                className="w-5 h-5 mr-2"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              Offre envoyée
            </>
          ) : (
            <>
              <svg
                className="w-5 h-5 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                />
              </svg>
              Envoyer l'offre au courtier
            </>
          )}
        </button>
      </div>
    </div>
  );
}
