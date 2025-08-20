"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import useQuotesStore from "@/lib/stores/quotes-store";

interface QuoteValidationPageProps {
  quoteId: string;
}

export default function QuoteValidationPage({ quoteId }: QuoteValidationPageProps) {
  const router = useRouter();
  const [isValidating, setIsValidating] = useState(false);
  const [validationNotes, setValidationNotes] = useState("");
  const [documentValidation, setDocumentValidation] = useState<Record<string, { isValid: boolean; notes: string }>>({});

  const { 
    currentQuote, 
    loading, 
    error, 
    fetchQuote, 
    updateQuoteStatus,
    validateDocument 
  } = useQuotesStore();

  useEffect(() => {
    fetchQuote(quoteId);
  }, [fetchQuote, quoteId]);

  useEffect(() => {
    if (currentQuote?.documents) {
      const initialValidation: Record<string, { isValid: boolean; notes: string }> = {};
      currentQuote.documents.forEach(doc => {
        initialValidation[doc.id] = {
          isValid: doc.isVerified || false,
          notes: ""
        };
      });
      setDocumentValidation(initialValidation);
    }
  }, [currentQuote]);

  const handleDocumentValidation = async (docId: string, isValid: boolean, notes: string) => {
    if (!currentQuote) return;

    // Update local state immediately for UI responsiveness
    setDocumentValidation(prev => ({
      ...prev,
      [docId]: { isValid, notes }
    }));

    try {
      // Save to backend
      await validateDocument(currentQuote.id, docId, isValid, notes);
    } catch (error) {
      // Revert local state if API call fails
      setDocumentValidation(prev => ({
        ...prev,
        [docId]: { isValid: !isValid, notes: "" }
      }));
      console.error("Erreur lors de la validation du document:", error);
    }
  };

  const handleValidateQuote = async () => {
    if (!currentQuote) return;

    setIsValidating(true);
    try {
      await updateQuoteStatus(currentQuote.id, "OFFER_READY");
      router.push("/dashboard");
    } catch (error) {
      console.error("Erreur lors de la validation:", error);
    } finally {
      setIsValidating(false);
    }
  };

  const handleRejectQuote = async () => {
    if (!currentQuote) return;

    setIsValidating(true);
    try {
      await updateQuoteStatus(currentQuote.id, "REJECTED");
      router.push("/dashboard");
    } catch (error) {
      console.error("Erreur lors du rejet:", error);
    } finally {
      setIsValidating(false);
    }
  };

  const handleRequestComplement = async () => {
    if (!currentQuote) return;

    setIsValidating(true);
    try {
      await updateQuoteStatus(currentQuote.id, "COMPLEMENT_REQUIRED");
      router.push("/dashboard");
    } catch (error) {
      console.error("Erreur lors de la demande de complément:", error);
    } finally {
      setIsValidating(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "SUBMITTED": return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "IN_PROGRESS": return "bg-blue-100 text-blue-800 border-blue-200";
      case "OFFER_READY": return "bg-green-100 text-green-800 border-green-200";
      case "ACCEPTED": return "bg-emerald-100 text-emerald-800 border-emerald-200";
      case "REJECTED": return "bg-red-100 text-red-800 border-red-200";
      default: return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "DRAFT": return "Brouillon";
      case "SUBMITTED": return "Soumis";
      case "IN_PROGRESS": return "En cours";
      case "OFFER_READY": return "Offre prête";
      case "ACCEPTED": return "Accepté";
      case "REJECTED": return "Rejeté";
      default: return status;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error || !currentQuote) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-lg font-medium mb-4">
            {error || "Devis non trouvé"}
          </div>
          <button
            onClick={() => router.push("/dashboard")}
            className="text-indigo-600 hover:text-indigo-500"
          >
            Retour au tableau de bord
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push("/dashboard")}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </button>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  Validation du devis {currentQuote.reference}
                </h1>
                <p className="text-gray-600 mt-1">
                  Vérifiez les informations et documents avant validation
                </p>
              </div>
            </div>
            <div className={`px-4 py-2 rounded-full text-sm font-semibold border ${getStatusColor(currentQuote.status)}`}>
              {getStatusLabel(currentQuote.status)}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Informations générales */}
            <div className="bg-white shadow-lg rounded-xl p-6 border border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                <svg className="w-5 h-5 mr-3 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Informations générales
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Référence
                    </label>
                    <p className="text-lg font-semibold text-gray-900">{currentQuote.reference}</p>
                  </div>
                  
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Produit
                    </label>
                    <p className="text-lg font-semibold text-gray-900">{currentQuote.product.name}</p>
                    <p className="text-sm text-gray-500">Code: {currentQuote.product.code}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Courtier
                    </label>
                    <p className="text-lg font-semibold text-gray-900">{currentQuote.broker.name}</p>
                    {currentQuote.broker.companyName && (
                      <p className="text-sm text-gray-500">{currentQuote.broker.companyName}</p>
                    )}
                  </div>
                  
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Date de création
                    </label>
                    <p className="text-lg font-semibold text-gray-900">
                      {new Date(currentQuote.createdAt).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Données du formulaire */}
            <div className="bg-white shadow-lg rounded-xl p-6 border border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                <svg className="w-5 h-5 mr-3 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Données du formulaire
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {currentQuote.formData && Object.entries(currentQuote.formData).map(([key, value]) => (
                  <div key={key} className="p-4 bg-gray-50 rounded-lg">
                    <label className="block text-sm font-medium text-gray-700 mb-1 capitalize">
                      {key.replace(/_/g, ' ')}
                    </label>
                    <p className="text-sm text-gray-900">
                      {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Documents */}
            <div className="bg-white shadow-lg rounded-xl p-6 border border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                <svg className="w-5 h-5 mr-3 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                Pièces justificatives ({currentQuote.documents?.length || 0})
              </h2>
              
              {currentQuote.documents && currentQuote.documents.length > 0 ? (
                <div className="space-y-4">
                  {currentQuote.documents.map((doc) => (
                    <div key={doc.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <div>
                              <h3 className="font-medium text-gray-900">{doc.originalName}</h3>
                              <p className="text-sm text-gray-500">
                                {doc.documentType} • {(doc.fileSize / 1024 / 1024).toFixed(2)} MB
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-4 mt-3">
                            <label className="inline-flex items-center">
                              <input
                                type="checkbox"
                                className="rounded border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                                checked={documentValidation[doc.id]?.isValid || false}
                                onChange={(e) => handleDocumentValidation(
                                  doc.id, 
                                  e.target.checked, 
                                  documentValidation[doc.id]?.notes || ""
                                )}
                              />
                              <span className="ml-2 text-sm text-gray-700">Document valide</span>
                            </label>
                            {documentValidation[doc.id]?.isValid && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                                Validé
                              </span>
                            )}
                          </div>
                          
                          <div className="mt-3">
                            <textarea
                              className="w-full text-sm border border-gray-300 rounded-md px-3 py-2 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                              placeholder="Notes de validation (optionnel)"
                              rows={2}
                              value={documentValidation[doc.id]?.notes || ""}
                              onChange={(e) => {
                                const newValue = e.target.value;
                                setDocumentValidation(prev => ({
                                  ...prev,
                                  [doc.id]: { 
                                    ...prev[doc.id], 
                                    notes: newValue 
                                  }
                                }));
                              }}
                              onBlur={(e) => {
                                // Save notes when user finishes typing
                                handleDocumentValidation(
                                  doc.id, 
                                  documentValidation[doc.id]?.isValid || false, 
                                  e.target.value
                                );
                              }}
                            />
                          </div>
                        </div>
                        
                        <button className="ml-4 text-indigo-600 hover:text-indigo-900 text-sm font-medium">
                          Télécharger
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <svg className="w-12 h-12 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  <p>Aucun document téléchargé</p>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white shadow-lg rounded-xl p-6 border border-gray-200 sticky top-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Actions de validation</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notes de validation
                  </label>
                  <textarea
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    rows={4}
                    placeholder="Ajoutez des notes sur cette validation..."
                    value={validationNotes}
                    onChange={(e) => setValidationNotes(e.target.value)}
                  />
                </div>
                
                <div className="border-t pt-4 space-y-3">
                  <button
                    onClick={handleValidateQuote}
                    disabled={isValidating}
                    className="w-full bg-green-600 text-white px-4 py-3 rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                  >
                    {isValidating ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    ) : (
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                    Valider le devis
                  </button>
                  
                  <button
                    onClick={handleRequestComplement}
                    disabled={isValidating}
                    className="w-full bg-orange-600 text-white px-4 py-3 rounded-lg font-medium hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Demander un complément
                  </button>
                  
                  <button
                    onClick={handleRejectQuote}
                    disabled={isValidating}
                    className="w-full bg-red-600 text-white px-4 py-3 rounded-lg font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Rejeter le devis
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}