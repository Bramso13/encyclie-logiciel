"use client";

import { useEffect, useState } from "react";
import { Button, inputClassName } from "@/components/ui/Controls";
import { DataTable } from "@/components/ui/DataDisplay";
import { EmptyState, ErrorBanner, LoadingState, KpiCard } from "@/components/ui/Feedback";
import { Modal } from "@/components/ui/Modal";
import { formatDateFr } from "@/lib/ui/labels";

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

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  SENT: { label: "Envoyé", className: "bg-emerald-100 text-emerald-800" },
  FAILED: { label: "Échec", className: "bg-rose-100 text-rose-800" },
  PENDING: { label: "En attente", className: "bg-amber-100 text-amber-900" },
};

const TYPE_LABELS: Record<string, string> = {
  OFFER_LETTER: "Lettre d'offre",
  BROKER_INVITATION: "Invitation courtier",
  PAYMENT_REMINDER: "Rappel de paiement",
  DOCUMENT_REQUEST: "Demande de document",
  GENERAL: "Général",
};

function Badge({
  label,
  className,
}: {
  label: string;
  className: string;
}) {
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${className}`}
    >
      {label}
    </span>
  );
}

export default function CorrespondanceTab({
  loading: _initialLoading,
}: {
  loading?: boolean;
}) {
  const [emails, setEmails] = useState<EmailLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedEmail, setSelectedEmail] = useState<EmailLog | null>(null);
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterType, setFilterType] = useState("all");

  const fetchEmails = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch("/api/emails/logs");
      if (!response.ok) {
        throw new Error("Impossible de charger la correspondance.");
      }
      const data = await response.json();
      setEmails(data.emails || []);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Impossible de charger la correspondance.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmails();
  }, []);

  const filteredEmails = emails.filter((email) => {
    const q = searchTerm.trim().toLowerCase();
    const matchesSearch =
      !q ||
      email.to.toLowerCase().includes(q) ||
      email.subject.toLowerCase().includes(q) ||
      (email.relatedQuoteId &&
        email.relatedQuoteId.toLowerCase().includes(q));
    const matchesStatus =
      filterStatus === "all" || email.status === filterStatus;
    const matchesType = filterType === "all" || email.type === filterType;
    return matchesSearch && matchesStatus && matchesType;
  });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard label="E-mails" value={emails.length} />
        <KpiCard
          label="Envoyés"
          value={emails.filter((e) => e.status === "SENT").length}
        />
        <KpiCard
          label="Échecs"
          value={emails.filter((e) => e.status === "FAILED").length}
        />
        <KpiCard
          label="En attente"
          value={emails.filter((e) => e.status === "PENDING").length}
        />
      </div>

      {error ? <ErrorBanner>{error}</ErrorBanner> : null}

      <DataTable
        toolbar={
          <>
            <input
              className={`${inputClassName} max-w-sm`}
              placeholder="Rechercher (destinataire, sujet, dossier)"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              aria-label="Rechercher dans la correspondance"
            />
            <select
              className={inputClassName}
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              aria-label="Filtrer par statut"
            >
              <option value="all">Tous les statuts</option>
              <option value="SENT">Envoyés</option>
              <option value="FAILED">Échecs</option>
              <option value="PENDING">En attente</option>
            </select>
            <select
              className={inputClassName}
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              aria-label="Filtrer par type"
            >
              <option value="all">Tous les types</option>
              {Object.entries(TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <Button
              variant="secondary"
              className="ml-auto"
              onClick={fetchEmails}
            >
              Actualiser
            </Button>
          </>
        }
      >
        {loading ? (
          <LoadingState active label="Chargement de la correspondance" />
        ) : filteredEmails.length === 0 ? (
          <EmptyState
            title={
              searchTerm || filterStatus !== "all" || filterType !== "all"
                ? "Aucun e-mail ne correspond"
                : "Aucun e-mail envoyé"
            }
            description="Les envois (offres, invitations, rappels) apparaîtront ici."
          />
        ) : (
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Destinataire</th>
                <th>Sujet</th>
                <th>Type</th>
                <th>Statut</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredEmails.map((email) => {
                const status =
                  STATUS_LABELS[email.status] ?? {
                    label: email.status,
                    className: "bg-zinc-100 text-zinc-700",
                  };
                return (
                  <tr key={email.id}>
                    <td className="whitespace-nowrap">
                      {formatDateFr(email.sentAt ?? email.createdAt)}
                    </td>
                    <td>
                      <div className="font-medium text-ink">{email.to}</div>
                      {email.cc ? (
                        <div className="text-xs text-ink-muted">CC : {email.cc}</div>
                      ) : null}
                    </td>
                    <td>
                      <div className="max-w-xs truncate">{email.subject}</div>
                    </td>
                    <td>{TYPE_LABELS[email.type] ?? email.type}</td>
                    <td>
                      <Badge label={status.label} className={status.className} />
                    </td>
                    <td>
                      <Button
                        variant="ghost"
                        className="!text-ink hover:!bg-surface"
                        onClick={() => setSelectedEmail(email)}
                      >
                        Ouvrir
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </DataTable>

      <Modal
        open={!!selectedEmail}
        title="Détail de l'e-mail"
        size="xl"
        onClose={() => setSelectedEmail(null)}
        footer={
          <Button variant="secondary" onClick={() => setSelectedEmail(null)}>
            Fermer
          </Button>
        }
      >
        {selectedEmail ? (
          <div className="space-y-4">
            <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <dt className="text-xs font-medium uppercase text-ink-muted">
                  Destinataire
                </dt>
                <dd>{selectedEmail.to}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase text-ink-muted">
                  Date d&apos;envoi
                </dt>
                <dd>
                  {selectedEmail.sentAt
                    ? formatDateFr(selectedEmail.sentAt)
                    : "Non envoyé"}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-xs font-medium uppercase text-ink-muted">
                  Sujet
                </dt>
                <dd>{selectedEmail.subject}</dd>
              </div>
            </dl>
            {selectedEmail.relatedQuoteId ? (
              <p className="text-sm">
                Dossier associé :{" "}
                <a
                  href={`/quotes/${selectedEmail.relatedQuoteId}`}
                  className="font-medium underline decoration-brand underline-offset-2"
                >
                  {selectedEmail.relatedQuoteId}
                </a>
              </p>
            ) : null}
            {selectedEmail.errorMessage ? (
              <ErrorBanner>{selectedEmail.errorMessage}</ErrorBanner>
            ) : null}
            {selectedEmail.htmlContent ? (
              <div className="max-h-96 overflow-auto rounded-md border border-line bg-white p-4 [&_img]:max-w-full [&_table]:max-w-full">
                <div
                  dangerouslySetInnerHTML={{
                    __html: selectedEmail.htmlContent,
                  }}
                />
              </div>
            ) : selectedEmail.textContent ? (
              <pre className="max-h-96 overflow-auto whitespace-pre-wrap rounded-md border border-line bg-surface p-4 text-sm">
                {selectedEmail.textContent}
              </pre>
            ) : null}
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
