"use client";

import { useState, useEffect } from "react";
import {
  Quote,
  QuoteDocument,
  DocumentUploadResponse,
  DocumentRequest,
} from "@/lib/types";
import { useSession } from "@/lib/auth-client";

interface PieceJointeTabProps {
  quote: Quote;
}

const DOCUMENT_TYPES = [
  { value: "KBIS", label: "KBIS" },
  { value: "FINANCIAL_STATEMENT", label: "Bilan financier" },
  { value: "INSURANCE_CERTIFICATE", label: "Attestation d'assurance" },
  { value: "SIGNED_QUOTE", label: "Devis signé" },
  { value: "ATTESTATION", label: "Attestation" },
  { value: "OTHER", label: "Autre" },
];

export default function PieceJointeTab({ quote }: PieceJointeTabProps) {
  const { data: session } = useSession();
  const [documents, setDocuments] = useState<QuoteDocument[]>([]);
  const [documentRequests, setDocumentRequests] = useState<DocumentRequest[]>(
    []
  );
  const [uploading, setUploading] = useState(false);
  const [uploadingRequestId, setUploadingRequestId] = useState<string | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [selectedDocumentType, setSelectedDocumentType] = useState("OTHER");
  const [newDocumentRequest, setNewDocumentRequest] = useState("");
  const [newDocumentDescription, setNewDocumentDescription] = useState("");
  const [downloadingDocs, setDownloadingDocs] = useState<Set<string>>(
    new Set()
  );
  const [validatingDocs, setValidatingDocs] = useState<Set<string>>(new Set());
  const [validationNotes, setValidationNotes] = useState<
    Record<string, string>
  >({});

  const isAdmin = session?.user?.role === "ADMIN";
  const isBroker = session?.user?.role === "BROKER";

  // Charger les données
  useEffect(() => {
    Promise.all([fetchDocuments(), fetchDocumentRequests()]);
  }, [quote.id]);

  const fetchDocuments = async () => {
    try {
      const response = await fetch(`/api/quotes/${quote.id}/documents`);
      const result = await response.json();
      if (result.success) {
        setDocuments(result.data || []);
      }
    } catch (error) {
      console.error("Erreur lors du chargement des documents:", error);
    }
  };

  const fetchDocumentRequests = async () => {
    try {
      const response = await fetch(`/api/quotes/${quote.id}/document-requests`);
      const result = await response.json();
      if (result.success) {
        setDocumentRequests(result.data || []);
      }
    } catch (error) {
      console.error(
        "Erreur lors du chargement des demandes de documents:",
        error
      );
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
    documentType?: string,
    requestId?: string
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    if (requestId) {
      setUploadingRequestId(requestId);
    }

    try {
      // 1. Upload du fichier vers Supabase
      const formData = new FormData();
      formData.append("file", file);
      formData.append("fileName", `${quote.id}_${Date.now()}_${file.name}`);

      const uploadResponse = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const uploadResult: DocumentUploadResponse = await uploadResponse.json();

      if (!uploadResult.success || !uploadResult.data) {
        throw new Error(uploadResult.error || "Erreur lors de l'upload");
      }

      // 2. Sauvegarder les métadonnées en base
      const documentResponse = await fetch(
        `/api/quotes/${quote.id}/documents`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            fileName: uploadResult.data.fileName,
            originalName: uploadResult.data.originalName,
            filePath: uploadResult.data.publicUrl,
            fileSize: uploadResult.data.fileSize,
            fileType: uploadResult.data.fileType,
            documentType: documentType || selectedDocumentType,
            documentRequestId: requestId,
          }),
        }
      );

      const documentResult = await documentResponse.json();

      if (documentResult.success) {
        // Recharger les données
        await Promise.all([fetchDocuments(), fetchDocumentRequests()]);
        // Reset du formulaire
        event.target.value = "";
        setSelectedDocumentType("OTHER");
      } else {
        throw new Error(documentResult.error || "Erreur lors de la sauvegarde");
      }
    } catch (error) {
      console.error("Erreur lors de l'upload:", error);
      alert("Erreur lors de l'upload du document");
    } finally {
      setUploading(false);
      setUploadingRequestId(null);
    }
  };

  const handleAddDocumentRequest = async () => {
    if (!newDocumentRequest.trim()) return;

    try {
      const response = await fetch(
        `/api/quotes/${quote.id}/document-requests`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            documentType: newDocumentRequest.trim(),
            description: newDocumentDescription.trim() || undefined,
            isRequired: true,
          }),
        }
      );

      const result = await response.json();

      if (result.success) {
        await fetchDocumentRequests();
        setNewDocumentRequest("");
        setNewDocumentDescription("");
      } else {
        throw new Error(
          result.error || "Erreur lors de la création de la demande"
        );
      }
    } catch (error) {
      console.error("Erreur:", error);
      alert("Erreur lors de la création de la demande de document");
    }
  };

  const handleDownloadDocument = async (quoteDocument: QuoteDocument) => {
    // Ajouter le document à la liste des téléchargements en cours
    setDownloadingDocs((prev) => new Set(prev).add(quoteDocument.id));

    try {
      const response = await fetch(
        `/api/quotes/${quote.id}/documents/${quoteDocument.id}/download`
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erreur lors du téléchargement");
      }

      // Créer un blob à partir de la réponse
      const blob = await response.blob();

      // Créer un URL temporaire pour le téléchargement
      const url = window.URL.createObjectURL(blob);

      // Créer un lien de téléchargement et le cliquer
      const link = document.createElement("a");
      link.href = url;
      link.download = quoteDocument.originalName;
      document.body.appendChild(link);
      link.click();

      // Nettoyer
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      // Afficher un message de succès
      alert(
        `Document "${quoteDocument.originalName}" téléchargé avec succès !`
      );
    } catch (error) {
      console.error("Erreur lors du téléchargement:", error);
      alert("Erreur lors du téléchargement du document");
    } finally {
      // Retirer le document de la liste des téléchargements en cours
      setDownloadingDocs((prev) => {
        const newSet = new Set(prev);
        newSet.delete(quoteDocument.id);
        return newSet;
      });
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("fr-FR");
  };

  const handleValidateDocument = async (
    documentId: string,
    isVerified: boolean
  ) => {
    setValidatingDocs((prev) => new Set(prev).add(documentId));

    try {
      const notes = validationNotes[documentId] || "";
      const response = await fetch(
        `/api/quotes/${quote.id}/documents/${documentId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            isVerified,
            validationNotes: notes,
          }),
        }
      );

      const result = await response.json();

      if (result.success) {
        // Recharger les documents
        await fetchDocuments();
        // Réinitialiser les notes pour ce document
        setValidationNotes((prev) => {
          const newNotes = { ...prev };
          delete newNotes[documentId];
          return newNotes;
        });
        alert(`Document ${isVerified ? "accepté" : "refusé"} avec succès !`);
      } else {
        throw new Error(result.error || "Erreur lors de la validation");
      }
    } catch (error) {
      console.error("Erreur lors de la validation:", error);
      alert("Erreur lors de la validation du document");
    } finally {
      setValidatingDocs((prev) => {
        const newSet = new Set(prev);
        newSet.delete(documentId);
        return newSet;
      });
    }
  };

  // Récupérer les documents requis du produit
  const requiredDocs = quote.product?.requiredDocs || [];
  const requiredDocTypes = Array.isArray(requiredDocs) ? requiredDocs : [];

  // Vérifier quels documents sont fournis
  const providedDocumentTypes = documents.map((doc) => doc.documentType);

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="text-gray-500">Chargement des documents...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Documents requis du produit */}
      {/* {requiredDocTypes.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h3 className="font-medium text-yellow-800 mb-3">
            Documents obligatoires pour ce produit
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {requiredDocTypes.map((docType: string) => {
              const isProvided = providedDocumentTypes.includes(docType);
              return (
                <div
                  key={docType}
                  className={`flex items-center space-x-2 p-2 rounded ${
                    isProvided
                      ? "bg-green-100 text-green-800"
                      : "bg-white text-yellow-800"
                  }`}
                >
                  {isProvided ? (
                    <svg
                      className="w-4 h-4 text-green-600"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                  ) : (
                    <svg
                      className="w-4 h-4 text-yellow-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                      />
                    </svg>
                  )}
                  <span className="text-sm">
                    {DOCUMENT_TYPES.find((t) => t.value === docType)?.label ||
                      docType}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )} */}

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Gestion des documents</h2>

        {/* Interface Courtier - Upload de documents */}
        {(isBroker || isAdmin) && (
          <div className="mb-6 p-4 border border-blue-200 rounded-lg bg-blue-50">
            <h3 className="font-medium mb-3">Ajouter un document</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Type de document
                </label>
                <select
                  value={selectedDocumentType}
                  onChange={(e) => setSelectedDocumentType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {DOCUMENT_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fichier
                </label>
                <input
                  type="file"
                  onChange={handleFileUpload}
                  disabled={uploading}
                  accept=".pdf,.jpg,.jpeg,.png,.gif,.doc,.docx"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
              </div>
              {uploading && (
                <div className="text-blue-600 text-sm">Upload en cours...</div>
              )}
            </div>
          </div>
        )}

        {/* Interface Admin - Demande de documents */}
        {isAdmin && (
          <div className="mb-6 p-4 border border-green-200 rounded-lg bg-green-50">
            <h3 className="font-medium mb-3">
              Demander un document additionnel
            </h3>
            <div className="space-y-3">
              <div>
                <input
                  type="text"
                  value={newDocumentRequest}
                  onChange={(e) => setNewDocumentRequest(e.target.value)}
                  placeholder="Type de document à demander..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <textarea
                  value={newDocumentDescription}
                  onChange={(e) => setNewDocumentDescription(e.target.value)}
                  placeholder="Description ou instructions (optionnel)..."
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <button
                onClick={handleAddDocumentRequest}
                disabled={!newDocumentRequest.trim()}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Demander ce document
              </button>
            </div>
          </div>
        )}

        {/* Liste unifiée des documents */}
        <div>
          <h3 className="font-medium mb-3">
            Documents fournis ({documents.length})
          </h3>

          {documents.length === 0 && documentRequests.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Aucun document n'a été uploadé pour ce devis.
            </div>
          ) : (
            <div className="space-y-4">
              {/* Demandes de documents avec leurs documents fournis */}
              {documentRequests.map((request) => {
                // Trouver tous les documents liés à cette demande
                // (soit le fulfilledByDocument, soit les documents avec le même documentType)
                const relatedDocuments = documents.filter(
                  (doc) =>
                    doc.documentType === request.documentType ||
                    request.fulfilledByDocument?.id === doc.id
                );

                // Vérifier s'il y a au moins un document accepté
                const hasAcceptedDocument = relatedDocuments.some(
                  (doc) => doc.isVerified === true
                );

                // Vérifier si tous les documents sont refusés ou s'il n'y en a pas
                const allDocumentsRefused =
                  relatedDocuments.length === 0 ||
                  relatedDocuments.every(
                    (doc) => doc.isVerified === false && doc.validationNotes
                  );

                return (
                  <div
                    key={request.id}
                    className="border border-gray-200 rounded-lg p-4"
                  >
                    {/* En-tête de la demande */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          {hasAcceptedDocument ? (
                            <svg
                              className="w-5 h-5 text-green-600"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path
                                fillRule="evenodd"
                                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                clipRule="evenodd"
                              />
                            </svg>
                          ) : (
                            <svg
                              className="w-5 h-5 text-orange-500"
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
                          )}
                          <span className="font-medium text-gray-900">
                            {request.documentType}
                          </span>
                          {hasAcceptedDocument && (
                            <span className="text-xs text-green-600 font-medium">
                              (Accepté)
                            </span>
                          )}
                        </div>
                        {request.description && (
                          <p className="text-sm text-gray-600 mt-1 ml-7">
                            {request.description}
                          </p>
                        )}
                        <p className="text-xs text-gray-500 ml-7">
                          Demandé par {request.requestedBy.name} le{" "}
                          {formatDate(request.requestedAt)}
                        </p>
                      </div>
                    </div>

                    {/* Documents fournis pour cette demande */}
                    {relatedDocuments.length > 0 && (
                      <div className="ml-7 space-y-2 mt-3">
                        {relatedDocuments.map((document) => (
                          <div
                            key={document.id}
                            className="p-3 bg-gray-50 rounded-lg border border-gray-200"
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center space-x-2">
                                  <svg
                                    className="w-4 h-4 text-blue-600"
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
                                  <span className="text-sm font-medium text-gray-900">
                                    {document.originalName}
                                  </span>
                                  {document.isVerified ? (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                      Accepté
                                    </span>
                                  ) : document.validationNotes ? (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                                      Refusé
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                                      En attente
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center space-x-4 text-xs text-gray-500 mt-1 ml-6">
                                  <span>
                                    {formatFileSize(document.fileSize)}
                                  </span>
                                  <span>
                                    Uploadé le {formatDate(document.uploadedAt)}
                                  </span>
                                  {document.isVerified &&
                                    document.validatedBy && (
                                      <span className="text-gray-500">
                                        par {document.validatedBy.name}
                                      </span>
                                    )}
                                </div>
                                {document.validationNotes && (
                                  <p className="text-xs text-red-600 mt-1 ml-6 italic">
                                    Refusé: {document.validationNotes}
                                  </p>
                                )}
                              </div>
                              <div className="flex items-center space-x-2 ml-4">
                                <button
                                  onClick={() =>
                                    handleDownloadDocument(document)
                                  }
                                  disabled={downloadingDocs.has(document.id)}
                                  className="inline-flex items-center px-2 py-1 border border-gray-300 shadow-sm text-xs leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  <svg
                                    className="w-3 h-3 mr-1"
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
                                  Télécharger
                                </button>
                                {/* Boutons de validation pour l'admin */}
                                {isAdmin && !document.isVerified && (
                                  <>
                                    <div className="ml-2">
                                      <textarea
                                        placeholder="Notes (optionnel)..."
                                        value={
                                          validationNotes[document.id] || ""
                                        }
                                        onChange={(e) =>
                                          setValidationNotes((prev) => ({
                                            ...prev,
                                            [document.id]: e.target.value,
                                          }))
                                        }
                                        rows={2}
                                        className="w-48 px-2 py-1 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                                      />
                                    </div>
                                    <button
                                      onClick={() =>
                                        handleValidateDocument(
                                          document.id,
                                          true
                                        )
                                      }
                                      disabled={validatingDocs.has(document.id)}
                                      className="inline-flex items-center px-2 py-1 border border-transparent text-xs font-medium rounded-md text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                      {validatingDocs.has(document.id)
                                        ? "Validation..."
                                        : "✓ Accepter"}
                                    </button>
                                    <button
                                      onClick={() =>
                                        handleValidateDocument(
                                          document.id,
                                          false
                                        )
                                      }
                                      disabled={validatingDocs.has(document.id)}
                                      className="inline-flex items-center px-2 py-1 border border-transparent text-xs font-medium rounded-md text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                      {validatingDocs.has(document.id)
                                        ? "Validation..."
                                        : "✗ Refuser"}
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Bouton d'upload seulement si tous les documents sont refusés ou s'il n'y en a pas */}
                    {isAdmin && allDocumentsRefused && (
                      <div className="mt-3 ml-7">
                        <label className="inline-flex items-center px-3 py-2 border border-blue-300 shadow-sm text-sm leading-4 font-medium rounded-md text-blue-700 bg-white hover:bg-blue-50 cursor-pointer">
                          {uploadingRequestId === request.id ? (
                            <>
                              <svg
                                className="w-4 h-4 mr-2 animate-spin"
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
                              Upload...
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
                                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                                />
                              </svg>
                              Uploader un document
                            </>
                          )}
                          <input
                            type="file"
                            onChange={(e) =>
                              handleFileUpload(
                                e,
                                request.documentType,
                                request.id
                              )
                            }
                            disabled={uploading}
                            accept=".pdf,.jpg,.jpeg,.png,.gif,.doc,.docx"
                            className="hidden"
                          />
                        </label>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Documents uploadés directement (non liés à une demande) */}
              {documents
                .filter(
                  (doc) =>
                    !documentRequests.some(
                      (req) =>
                        req.documentType === doc.documentType ||
                        req.fulfilledByDocument?.id === doc.id
                    )
                )
                .map((document) => (
                  <div
                    key={document.id}
                    className="border border-gray-200 rounded-lg p-4"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <div className="flex-shrink-0">
                            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                              <svg
                                className="w-6 h-6 text-blue-600"
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
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {document.originalName}
                            </p>
                            <div className="flex items-center space-x-4 text-xs text-gray-500">
                              <span>
                                {DOCUMENT_TYPES.find(
                                  (t) => t.value === document.documentType
                                )?.label || document.documentType}
                              </span>
                              <span>{formatFileSize(document.fileSize)}</span>
                              <span>{formatDate(document.uploadedAt)}</span>
                            </div>
                            {document.isVerified && (
                              <div className="flex items-center space-x-1 mt-1">
                                <svg
                                  className="w-4 h-4 text-green-500"
                                  fill="currentColor"
                                  viewBox="0 0 20 20"
                                >
                                  <path
                                    fillRule="evenodd"
                                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                    clipRule="evenodd"
                                  />
                                </svg>
                                <span className="text-xs text-green-600">
                                  Vérifié
                                </span>
                                {document.validatedBy && (
                                  <span className="text-xs text-gray-500">
                                    par {document.validatedBy.name}
                                  </span>
                                )}
                              </div>
                            )}
                            {!document.isVerified &&
                              document.validationNotes && (
                                <p className="text-xs text-red-600 mt-1 italic">
                                  Refusé: {document.validationNotes}
                                </p>
                              )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleDownloadDocument(document)}
                          disabled={downloadingDocs.has(document.id)}
                          className="inline-flex items-center px-3 py-1 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {downloadingDocs.has(document.id) ? (
                            <>
                              <svg
                                className="w-4 h-4 mr-1 animate-spin"
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
                              Téléchargement...
                            </>
                          ) : (
                            <>
                              <svg
                                className="w-4 h-4 mr-1"
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
                              Télécharger
                            </>
                          )}
                        </button>
                        {/* Boutons de validation pour l'admin */}
                        {isAdmin && !document.isVerified && (
                          <>
                            <div className="ml-2">
                              <textarea
                                placeholder="Notes de validation (optionnel)..."
                                value={validationNotes[document.id] || ""}
                                onChange={(e) =>
                                  setValidationNotes((prev) => ({
                                    ...prev,
                                    [document.id]: e.target.value,
                                  }))
                                }
                                rows={2}
                                className="w-48 px-2 py-1 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                              />
                            </div>
                            <button
                              onClick={() =>
                                handleValidateDocument(document.id, true)
                              }
                              disabled={validatingDocs.has(document.id)}
                              className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {validatingDocs.has(document.id) ? (
                                <>
                                  <svg
                                    className="w-4 h-4 mr-1 animate-spin"
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
                                  Validation...
                                </>
                              ) : (
                                <>
                                  <svg
                                    className="w-4 h-4 mr-1"
                                    fill="currentColor"
                                    viewBox="0 0 20 20"
                                  >
                                    <path
                                      fillRule="evenodd"
                                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                      clipRule="evenodd"
                                    />
                                  </svg>
                                  Accepter
                                </>
                              )}
                            </button>
                            <button
                              onClick={() =>
                                handleValidateDocument(document.id, false)
                              }
                              disabled={validatingDocs.has(document.id)}
                              className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {validatingDocs.has(document.id) ? (
                                "Validation..."
                              ) : (
                                <>
                                  <svg
                                    className="w-4 h-4 mr-1"
                                    fill="currentColor"
                                    viewBox="0 0 20 20"
                                  >
                                    <path
                                      fillRule="evenodd"
                                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                                      clipRule="evenodd"
                                    />
                                  </svg>
                                  Refuser
                                </>
                              )}
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
