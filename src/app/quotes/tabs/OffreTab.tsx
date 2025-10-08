"use client";

import { useState, useEffect } from "react";
import { Quote, CalculationResult } from "@/lib/types";
import { useSession } from "@/lib/auth-client";

interface OffreTabProps {
  quote: Quote;
  calculationResult: CalculationResult | null;
}

// Liste complète des pièces justificatives selon les spécifications
const DOCUMENT_CHECKLIST = {
  general: {
    label: "Documents généraux",
    items: [
      { id: "rcd_questionnaire", label: "Questionnaire RCD signé par le proposant" },
      { id: "kbis", label: "Kbis de moins de 3 mois et les statuts de l'entreprise" },
      { id: "cv_dirigeant", label: "CV du dirigeant justifiant du/des activités demandées" },
      { id: "rib_mandat", label: "RIB/MANDAT SEPA si paiement par prélèvement automatique choisi" },
      { id: "cni_gerant", label: "CNI du gérant" },
      { id: "qualification", label: "Qualification QUALIBAT/QUALIFELEC si applicable" },
      { id: "attestation_honneur", label: "Attestation sur l'honneur et signée précisant que le dirigeant n'a pas connaissance de difficulté ou d'incident susceptibles d'occasionner une déclaration de sinistre" },
      { id: "verification_coherence", label: "Vérification de la cohérence des déclarations relatives à l'activité" },
      { id: "diplome_certificat", label: "Diplôme/certificat professionnel justifiant du/des activités demandées" },
      { id: "organigramme", label: "Organigramme pour les CA supérieur à 500 000€" },
    ]
  },
  newCompany: {
    label: "Pour les entreprises en création (créées depuis moins de 12 mois) sans activité",
    items: [
      { id: "ventilation_previsionnelle", label: "Ventilation prévisionnelle des activités du chiffre d'affaires N" },
      { id: "certificat_travail", label: "Certificat de travail/fiche de paie des anciens employeurs émanant du dirigeant" },
      { id: "certificat_experience", label: "Certificat de travail/fiche de paie pour couvrir la totalité de la durée d'expérience prise en compte" },
      { id: "factures_ancienne_entreprise", label: "Factures émises sous son ancienne entreprise pour les travailleurs non-salariés" },
      { id: "situation_comptable", label: "Situation comptable intermédiaire" },
      { id: "attestation_emploi", label: "Attestation sur l'honneur certifiant l'emploi dans une société ou organigramme" },
    ]
  },
  existingCompany: {
    label: "Pour les entreprises créées depuis plus de 12 mois et précédemment assurées",
    items: [
      { id: "ventilation_activites", label: "Ventilation des activités du chiffre d'affaires N-1 et N" },
      { id: "releve_sinistralite", label: "RI/Relevé de sinistralité de 5 ans ou depuis la création de l'entreprise" },
      { id: "attestation_assurance", label: "Dernière attestation d'assurance mentionnant les activités assurées" },
      { id: "bilan_financier", label: "Dernier bilan financier pour les sociétés créées depuis plus de 2 ans" },
      { id: "factures_chantier", label: "Minimum 4 factures de chantier justifiant l'expérience déclarée" },
      { id: "attestation_non_reprise", label: "Attestation du gérant pour la non reprise du passé" },
    ]
  }
};

export default function OffreTab({ quote, calculationResult }: OffreTabProps) {
  const { data: session } = useSession();
  const [selectedDocuments, setSelectedDocuments] = useState<Set<string>>(new Set());
  const [sending, setSending] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [offerSent, setOfferSent] = useState(false);
  const [offerData, setOfferData] = useState<any>(null);
  
  const isAdmin = session?.user?.role === "ADMIN";

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
              setSelectedDocuments(new Set(result.data.requiredDocuments));
            }
          }
        }
      } catch (error) {
        console.error("Erreur lors du chargement de l'offre:", error);
      }
    };

    fetchOfferData();
  }, [quote.id]);

  const handleDocumentToggle = (documentId: string) => {
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
    DOCUMENT_CHECKLIST[category].items.forEach(item => {
      newSelected.add(item.id);
    });
    setSelectedDocuments(newSelected);
  };

  const handleDeselectAll = (category: keyof typeof DOCUMENT_CHECKLIST) => {
    const newSelected = new Set(selectedDocuments);
    DOCUMENT_CHECKLIST[category].items.forEach(item => {
      newSelected.delete(item.id);
    });
    setSelectedDocuments(newSelected);
  };

  const handleSendOffer = async () => {
    if (selectedDocuments.size === 0) {
      alert("Veuillez sélectionner au moins un document requis");
      return;
    }

    setSending(true);
    try {
      const response = await fetch(`/api/quotes/${quote.id}/offer`, {
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

      const result = await response.json();

      if (result.success) {
        setOfferSent(true);
        setOfferData(result.data);
        alert("L'offre a été envoyée au courtier avec succès !");
      } else {
        throw new Error(result.error || "Erreur lors de l'envoi");
      }
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

  const getDocumentLabel = (documentId: string) => {
    for (const category of Object.values(DOCUMENT_CHECKLIST)) {
      const item = category.items.find(i => i.id === documentId);
      if (item) return item.label;
    }
    return documentId;
  };

  if (!isAdmin) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <div className="flex items-center">
          <svg className="w-6 h-6 text-yellow-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <div>
            <h3 className="text-lg font-medium text-yellow-900">Accès réservé aux administrateurs</h3>
            <p className="text-sm text-yellow-700 mt-1">Seuls les administrateurs peuvent accéder à l'onglet Offre.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* En-tête avec statut */}
      <div className={`rounded-lg p-4 ${offerSent ? 'bg-green-50 border border-green-200' : 'bg-blue-50 border border-blue-200'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            {offerSent ? (
              <>
                <svg className="w-6 h-6 text-green-600 mr-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <div>
                  <h3 className="text-lg font-semibold text-green-900">Offre envoyée</h3>
                  <p className="text-sm text-green-700">
                    L'offre a été envoyée au courtier le {offerData?.sentAt ? new Date(offerData.sentAt).toLocaleString('fr-FR') : ''}
                  </p>
                </div>
              </>
            ) : (
              <>
                <svg className="w-6 h-6 text-blue-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <div>
                  <h3 className="text-lg font-semibold text-blue-900">Préparation de l'offre</h3>
                  <p className="text-sm text-blue-700">Sélectionnez les documents requis et prévisualisez l'offre avant envoi</p>
                </div>
              </>
            )}
          </div>
          <button
            onClick={() => setShowPreview(!showPreview)}
            className="px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            {showPreview ? "Masquer" : "Afficher"} la prévisualisation
          </button>
        </div>
      </div>

      {/* Prévisualisation du formulaire (Admin seulement) */}
      {showPreview && (
        <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200">
          <h3 className="text-xl font-semibold mb-4 text-gray-900">Prévisualisation de l'offre</h3>
          
          <div className="grid grid-cols-2 gap-6">
            {/* Informations de l'entreprise */}
            <div className="space-y-3">
              <h4 className="font-medium text-gray-900 border-b pb-2">Informations de l'entreprise</h4>
              <div>
                <p className="text-sm text-gray-500">Nom de l'entreprise</p>
                <p className="font-medium">{quote.companyData?.companyName || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">SIRET</p>
                <p className="font-medium">{quote.companyData?.siret || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Forme juridique</p>
                <p className="font-medium">{quote.companyData?.legalForm || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Dirigeant</p>
                <p className="font-medium">{quote.companyData?.directorName || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Adresse</p>
                <p className="font-medium">{quote.companyData?.address || 'N/A'}</p>
                <p className="font-medium">{quote.companyData?.postalCode} {quote.companyData?.city}</p>
              </div>
            </div>

            {/* Calcul de la prime */}
            <div className="space-y-3">
              <h4 className="font-medium text-gray-900 border-b pb-2">Calcul de la prime</h4>
              {calculationResult ? (
                <>
                  <div>
                    <p className="text-sm text-gray-500">Prime de base</p>
                    <p className="font-medium">{calculationResult.primeBase?.toFixed(2) || 'N/A'} €</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Prime nette</p>
                    <p className="font-medium">{calculationResult.primeNette?.toFixed(2) || 'N/A'} €</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Taxes</p>
                    <p className="font-medium">{calculationResult.totalTaxes?.toFixed(2) || 'N/A'} €</p>
                  </div>
                  <div className="pt-2 border-t">
                    <p className="text-sm text-gray-500">Prime TTC</p>
                    <p className="text-xl font-bold text-indigo-600">{calculationResult.primeTTC?.toFixed(2) || 'N/A'} €</p>
                  </div>
                </>
              ) : (
                <p className="text-gray-500 text-sm">Aucun calcul disponible</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Liste des documents à cocher */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold text-gray-900">Pièces justificatives requises</h3>
          <div className="text-sm text-gray-600">
            {selectedDocuments.size} document{selectedDocuments.size > 1 ? 's' : ''} sélectionné{selectedDocuments.size > 1 ? 's' : ''}
          </div>
        </div>

        {Object.entries(DOCUMENT_CHECKLIST).map(([categoryKey, category]) => (
          <div key={categoryKey} className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium text-gray-800">{category.label}</h4>
              <div className="flex space-x-2">
                <button
                  onClick={() => handleSelectAll(categoryKey as keyof typeof DOCUMENT_CHECKLIST)}
                  className="text-xs px-2 py-1 text-indigo-600 hover:bg-indigo-50 rounded"
                >
                  Tout sélectionner
                </button>
                <button
                  onClick={() => handleDeselectAll(categoryKey as keyof typeof DOCUMENT_CHECKLIST)}
                  className="text-xs px-2 py-1 text-gray-600 hover:bg-gray-50 rounded"
                >
                  Tout désélectionner
                </button>
              </div>
            </div>
            <div className="space-y-2 pl-4">
              {category.items.map((item) => (
                <label key={item.id} className="flex items-start space-x-3 cursor-pointer hover:bg-gray-50 p-2 rounded">
                  <input
                    type="checkbox"
                    checked={selectedDocuments.has(item.id)}
                    onChange={() => handleDocumentToggle(item.id)}
                    className="mt-1 h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    disabled={offerSent && !isAdmin}
                  />
                  <span className="text-sm text-gray-700 flex-1">{item.label}</span>
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Documents sélectionnés (résumé) */}
      {selectedDocuments.size > 0 && (
        <div className="bg-indigo-50 rounded-lg p-4 border border-indigo-200">
          <h4 className="font-medium text-indigo-900 mb-3">Documents qui seront demandés au courtier</h4>
          <ul className="space-y-1">
            {Array.from(selectedDocuments).map((docId) => (
              <li key={docId} className="text-sm text-indigo-800 flex items-center">
                <svg className="w-4 h-4 mr-2 text-indigo-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
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
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Envoi en cours...
            </>
          ) : offerSent ? (
            <>
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Offre envoyée
            </>
          ) : (
            <>
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
              Envoyer l'offre au courtier
            </>
          )}
        </button>
      </div>
    </div>
  );
}
