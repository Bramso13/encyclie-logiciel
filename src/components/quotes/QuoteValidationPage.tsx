"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import useQuotesStore from "@/lib/stores/quotes-store";
import { Button, StatusBadge, inputClassName } from "@/components/ui/Controls";
import {
  EmptyState,
  ErrorBanner,
  LoadingState,
  PageHeader,
} from "@/components/ui/Feedback";
import { formatDateFr } from "@/lib/ui/labels";
import { notify } from "@/lib/ui/notify";

interface QuoteValidationPageProps {
  quoteId: string;
}

export default function QuoteValidationPage({
  quoteId,
}: QuoteValidationPageProps) {
  const router = useRouter();
  const [isValidating, setIsValidating] = useState(false);
  const [validationNotes, setValidationNotes] = useState("");
  const [documentValidation, setDocumentValidation] = useState<
    Record<string, { isValid: boolean; notes: string }>
  >({});

  const {
    currentQuote,
    loading,
    error,
    fetchQuote,
    updateQuoteStatus,
    validateDocument,
  } = useQuotesStore();

  useEffect(() => {
    fetchQuote(quoteId);
  }, [fetchQuote, quoteId]);

  useEffect(() => {
    if (currentQuote?.documents) {
      const initialValidation: Record<
        string,
        { isValid: boolean; notes: string }
      > = {};
      currentQuote.documents.forEach((doc) => {
        initialValidation[doc.id] = {
          isValid: doc.isVerified || false,
          notes: "",
        };
      });
      setDocumentValidation(initialValidation);
    }
  }, [currentQuote]);

  const handleDocumentValidation = async (
    docId: string,
    isValid: boolean,
    notes: string,
  ) => {
    if (!currentQuote) return;
    setDocumentValidation((prev) => ({
      ...prev,
      [docId]: { isValid, notes },
    }));
    try {
      await validateDocument(currentQuote.id, docId, isValid, notes);
    } catch {
      setDocumentValidation((prev) => ({
        ...prev,
        [docId]: { isValid: !isValid, notes: "" },
      }));
      notify("La validation du document a échoué.", "error");
    }
  };

  const runStatus = async (status: string, successMessage: string) => {
    if (!currentQuote) return;
    setIsValidating(true);
    try {
      await updateQuoteStatus(currentQuote.id, status);
      notify(successMessage, "success");
      router.push("/dashboard");
    } catch {
      notify("Le changement de statut a échoué.", "error");
    } finally {
      setIsValidating(false);
    }
  };

  if (loading) {
    return <LoadingState active label="Chargement du dossier" />;
  }

  if (error || !currentQuote) {
    return (
      <div className="space-y-4">
        <ErrorBanner>{error || "Dossier introuvable."}</ErrorBanner>
        <Button variant="secondary" onClick={() => router.push("/dashboard")}>
          Retourner au tableau de bord
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Valider le devis ${currentQuote.reference}`}
        description="Vérifiez les informations et les pièces avant de décider."
        actions={
          <>
            <StatusBadge status={currentQuote.status} />
            <Button
              variant="secondary"
              onClick={() => router.push(`/quotes/${currentQuote.id}`)}
            >
              Ouvrir le dossier
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <section className="rounded-lg border border-line bg-white p-5">
            <h2 className="text-sm font-semibold text-ink">Informations générales</h2>
            <dl className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-xs uppercase text-ink-muted">Produit</dt>
                <dd className="font-medium">
                  {currentQuote.product.name}
                  <span className="ml-1 text-sm font-normal text-ink-muted">
                    ({currentQuote.product.code})
                  </span>
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase text-ink-muted">Courtier</dt>
                <dd className="font-medium">{currentQuote.broker.name}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase text-ink-muted">Créé le</dt>
                <dd>{formatDateFr(currentQuote.createdAt)}</dd>
              </div>
            </dl>
          </section>

          <section className="rounded-lg border border-line bg-white p-5">
            <h2 className="text-sm font-semibold text-ink">Données du formulaire</h2>
            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
              {currentQuote.formData
                ? Object.entries(currentQuote.formData).map(([key, value]) => (
                    <div key={key} className="rounded-md bg-surface p-3">
                      <p className="text-xs uppercase text-ink-muted">
                        {key.replace(/_/g, " ")}
                      </p>
                      <p className="mt-1 whitespace-pre-wrap text-sm">
                        {typeof value === "object"
                          ? JSON.stringify(value, null, 2)
                          : String(value)}
                      </p>
                    </div>
                  ))
                : null}
            </div>
          </section>

          <section className="rounded-lg border border-line bg-white p-5">
            <h2 className="text-sm font-semibold text-ink">
              Pièces justificatives ({currentQuote.documents?.length || 0})
            </h2>
            {currentQuote.documents && currentQuote.documents.length > 0 ? (
              <div className="mt-4 space-y-3">
                {currentQuote.documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="rounded-md border border-line p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-ink">{doc.originalName}</p>
                        <p className="text-xs text-ink-muted">
                          {doc.documentType} ·{" "}
                          {(doc.fileSize / 1024 / 1024).toFixed(2)} Mo
                        </p>
                      </div>
                      <a
                        href={`/api/quotes/${currentQuote.id}/documents/${doc.id}/download`}
                        className="text-sm font-medium underline decoration-brand underline-offset-2"
                      >
                        Télécharger
                      </a>
                    </div>
                    <label className="mt-3 flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={documentValidation[doc.id]?.isValid || false}
                        onChange={(e) =>
                          handleDocumentValidation(
                            doc.id,
                            e.target.checked,
                            documentValidation[doc.id]?.notes || "",
                          )
                        }
                      />
                      Document valide
                    </label>
                    <textarea
                      className={`${inputClassName} mt-2`}
                      placeholder="Notes de validation (facultatif)"
                      rows={2}
                      value={documentValidation[doc.id]?.notes || ""}
                      onChange={(e) => {
                        const newValue = e.target.value;
                        setDocumentValidation((prev) => ({
                          ...prev,
                          [doc.id]: {
                            ...prev[doc.id],
                            notes: newValue,
                          },
                        }));
                      }}
                      onBlur={(e) => {
                        handleDocumentValidation(
                          doc.id,
                          documentValidation[doc.id]?.isValid || false,
                          e.target.value,
                        );
                      }}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-4">
                <EmptyState
                  title="Aucune pièce jointe"
                  description="Aucune pièce n'a encore été déposée sur ce dossier."
                />
              </div>
            )}
          </section>
        </div>

        <aside className="h-fit rounded-lg border border-line bg-white p-5 lg:sticky lg:top-24">
          <h2 className="text-sm font-semibold text-ink">Décision</h2>
          <label className="mt-3 block text-sm font-medium text-ink">
            Notes de validation
            <textarea
              className={`${inputClassName} mt-1.5`}
              rows={4}
              value={validationNotes}
              onChange={(e) => setValidationNotes(e.target.value)}
              placeholder="Contexte de la décision…"
            />
          </label>
          <div className="mt-4 space-y-2">
            <Button
              className="w-full"
              disabled={isValidating}
              onClick={() =>
                runStatus("OFFER_READY", "Le devis a été validé.")
              }
            >
              {isValidating ? "Traitement…" : "Valider le devis"}
            </Button>
            <Button
              variant="secondary"
              className="w-full"
              disabled={isValidating}
              onClick={() =>
                runStatus(
                  "COMPLEMENT_REQUIRED",
                  "Un complément a été demandé.",
                )
              }
            >
              Demander un complément
            </Button>
            <Button
              variant="danger"
              className="w-full"
              disabled={isValidating}
              onClick={() => runStatus("REJECTED", "Le devis a été refusé.")}
            >
              Refuser le devis
            </Button>
          </div>
        </aside>
      </div>
    </div>
  );
}
