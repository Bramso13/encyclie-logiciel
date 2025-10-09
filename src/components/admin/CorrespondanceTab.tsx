"use client";

import { useEffect, useState } from "react";

interface EmailLog {
  id: string;
  to: string;
  cc: string | null;
  subject: string;
  type: string;
  status: string;
  htmlContent: string | null;
  textContent: string | null;
  hasAttachments: boolean;
  attachmentNames: string | null;
  relatedQuoteId: string | null;
  relatedUserId: string | null;
  messageId: string | null;
  errorMessage: string | null;
  sentById: string | null;
  sentAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

interface CorrespondanceTabProps {
  loading?: boolean;
}

export default function CorrespondanceTab({
  loading: initialLoading,
}: CorrespondanceTabProps) {
  const [emails, setEmails] = useState<EmailLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedEmail, setSelectedEmail] = useState<EmailLog | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");

  useEffect(() => {
    fetchEmails();
  }, []);

  const fetchEmails = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/emails/logs");
      if (!response.ok)
        throw new Error("Erreur lors de la récupération des emails");
      const data = await response.json();
      setEmails(data.emails || []);
    } catch (error) {
      console.error("Erreur:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<
      string,
      { bg: string; text: string; label: string }
    > = {
      SENT: { bg: "bg-green-100", text: "text-green-800", label: "Envoyé" },
      FAILED: { bg: "bg-red-100", text: "text-red-800", label: "Échec" },
      PENDING: {
        bg: "bg-yellow-100",
        text: "text-yellow-800",
        label: "En attente",
      },
    };
    const config = statusConfig[status] || {
      bg: "bg-gray-100",
      text: "text-gray-800",
      label: status,
    };
    return (
      <span
        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${config.bg} ${config.text}`}
      >
        {config.label}
      </span>
    );
  };

  const getTypeBadge = (type: string) => {
    const typeConfig: Record<
      string,
      { bg: string; text: string; label: string }
    > = {
      OFFER_LETTER: {
        bg: "bg-blue-100",
        text: "text-blue-800",
        label: "Lettre d'offre",
      },
      BROKER_INVITATION: {
        bg: "bg-purple-100",
        text: "text-purple-800",
        label: "Invitation courtier",
      },
      PAYMENT_REMINDER: {
        bg: "bg-orange-100",
        text: "text-orange-800",
        label: "Rappel de paiement",
      },
      DOCUMENT_REQUEST: {
        bg: "bg-indigo-100",
        text: "text-indigo-800",
        label: "Demande de document",
      },
      GENERAL: { bg: "bg-gray-100", text: "text-gray-800", label: "Général" },
    };
    const config = typeConfig[type] || {
      bg: "bg-gray-100",
      text: "text-gray-800",
      label: type,
    };
    return (
      <span
        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${config.bg} ${config.text}`}
      >
        {config.label}
      </span>
    );
  };

  const filteredEmails = emails.filter((email) => {
    const matchesSearch =
      !searchTerm ||
      email.to.toLowerCase().includes(searchTerm.toLowerCase()) ||
      email.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (email.relatedQuoteId &&
        email.relatedQuoteId.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus =
      filterStatus === "all" || email.status === filterStatus;
    const matchesType = filterType === "all" || email.type === filterType;

    return matchesSearch && matchesStatus && matchesType;
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-900">
          Historique de correspondance
        </h3>
        <button
          onClick={fetchEmails}
          className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
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
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          Actualiser
        </button>
      </div>

      {/* Filtres et recherche */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg
                className="h-5 w-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Rechercher par destinataire, sujet, référence..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>
        </div>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
        >
          <option value="all">Tous les statuts</option>
          <option value="SENT">Envoyés</option>
          <option value="FAILED">Échecs</option>
          <option value="PENDING">En attente</option>
        </select>

        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
        >
          <option value="all">Tous les types</option>
          <option value="OFFER_LETTER">Lettre d'offre</option>
          <option value="BROKER_INVITATION">Invitation courtier</option>
          <option value="PAYMENT_REMINDER">Rappel de paiement</option>
          <option value="DOCUMENT_REQUEST">Demande de document</option>
          <option value="GENERAL">Général</option>
        </select>
      </div>

      {/* Stats rapides */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-sm text-gray-500">Total emails</div>
          <div className="text-2xl font-bold text-gray-900">
            {emails.length}
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-sm text-gray-500">Envoyés</div>
          <div className="text-2xl font-bold text-green-600">
            {emails.filter((e) => e.status === "SENT").length}
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-sm text-gray-500">Échecs</div>
          <div className="text-2xl font-bold text-red-600">
            {emails.filter((e) => e.status === "FAILED").length}
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-sm text-gray-500">En attente</div>
          <div className="text-2xl font-bold text-yellow-600">
            {emails.filter((e) => e.status === "PENDING").length}
          </div>
        </div>
      </div>

      {/* Liste des emails */}
      <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
        <table className="min-w-full divide-y divide-gray-300">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                Destinataire
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                Sujet
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                Statut
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-6 py-4 text-center">
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                  </div>
                </td>
              </tr>
            ) : filteredEmails.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                  {searchTerm || filterStatus !== "all" || filterType !== "all"
                    ? "Aucun email ne correspond à vos critères de recherche"
                    : "Aucun email envoyé pour le moment"}
                </td>
              </tr>
            ) : (
              filteredEmails.map((email) => (
                <tr key={email.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {email.sentAt
                      ? new Date(email.sentAt).toLocaleString("fr-FR", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : new Date(email.createdAt).toLocaleString("fr-FR", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {email.to}
                    </div>
                    {email.cc && (
                      <div className="text-sm text-gray-500">
                        CC: {email.cc}
                      </div>
                    )}
                    {email.hasAttachments && (
                      <div className="text-xs text-gray-500 mt-1 flex items-center">
                        <svg
                          className="w-3 h-3 mr-1"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M8 4a3 3 0 00-3 3v4a5 5 0 0010 0V7a1 1 0 112 0v4a7 7 0 11-14 0V7a5 5 0 0110 0v4a3 3 0 11-6 0V7a1 1 0 012 0v4a1 1 0 102 0V7a3 3 0 00-3-3z"
                            clipRule="evenodd"
                          />
                        </svg>
                        Pièce(s) jointe(s)
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900 max-w-md truncate">
                      {email.subject}
                    </div>
                    {email.relatedQuoteId && (
                      <div className="text-xs text-gray-500 mt-1">
                        Devis: {email.relatedQuoteId}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getTypeBadge(email.type)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(email.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => setSelectedEmail(email)}
                      className="text-indigo-600 hover:text-indigo-900"
                    >
                      Voir détails
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal de détails */}
      {selectedEmail && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-2/3 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium leading-6 text-gray-900">
                  Détails de l'email
                </h3>
                <button
                  onClick={() => setSelectedEmail(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Destinataire
                    </label>
                    <div className="mt-1 text-sm text-gray-900">
                      {selectedEmail.to}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Date d'envoi
                    </label>
                    <div className="mt-1 text-sm text-gray-900">
                      {selectedEmail.sentAt
                        ? new Date(selectedEmail.sentAt).toLocaleString("fr-FR")
                        : "Non envoyé"}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Sujet
                  </label>
                  <div className="mt-1 text-sm text-gray-900">
                    {selectedEmail.subject}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Type
                    </label>
                    <div className="mt-1">
                      {getTypeBadge(selectedEmail.type)}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Statut
                    </label>
                    <div className="mt-1">
                      {getStatusBadge(selectedEmail.status)}
                    </div>
                  </div>
                </div>

                {selectedEmail.cc && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      CC
                    </label>
                    <div className="mt-1 text-sm text-gray-900">
                      {selectedEmail.cc}
                    </div>
                  </div>
                )}

                {selectedEmail.hasAttachments &&
                  selectedEmail.attachmentNames && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Pièces jointes
                      </label>
                      <div className="mt-1 text-sm text-gray-900">
                        {selectedEmail.attachmentNames}
                      </div>
                    </div>
                  )}

                {selectedEmail.relatedQuoteId && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Devis associé
                    </label>
                    <div className="mt-1 text-sm text-gray-900">
                      <a
                        href={`/quotes/${selectedEmail.relatedQuoteId}`}
                        className="text-indigo-600 hover:text-indigo-900"
                      >
                        {selectedEmail.relatedQuoteId}
                      </a>
                    </div>
                  </div>
                )}

                {selectedEmail.messageId && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Message ID
                    </label>
                    <div className="mt-1 text-sm text-gray-500 font-mono">
                      {selectedEmail.messageId}
                    </div>
                  </div>
                )}

                {selectedEmail.errorMessage && (
                  <div>
                    <label className="block text-sm font-medium text-red-700">
                      Message d'erreur
                    </label>
                    <div className="mt-1 text-sm text-red-600 bg-red-50 p-3 rounded">
                      {selectedEmail.errorMessage}
                    </div>
                  </div>
                )}

                {selectedEmail.htmlContent && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Contenu de l'email
                    </label>
                    <div className="mt-1 border border-gray-300 rounded p-4 max-h-96 overflow-y-auto bg-gray-50">
                      <div
                        dangerouslySetInnerHTML={{
                          __html: selectedEmail.htmlContent,
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setSelectedEmail(null)}
                  className="px-4 py-2 bg-gray-300 text-gray-700 text-base font-medium rounded-md hover:bg-gray-400"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
