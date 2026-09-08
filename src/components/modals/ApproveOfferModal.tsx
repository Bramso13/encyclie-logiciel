"use client";

import { notify } from "@/lib/ui/notify";
import { formatDateFr } from "@/lib/ui/labels";
import { useState, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button, inputClassName } from "@/components/ui/Controls";
import { ErrorBanner } from "@/components/ui/Feedback";

type QuoteForModal = {
  id: string;
  formData?: unknown;
  product?: { name?: string } | null;
};

interface ApproveOfferModalProps {
  isOpen: boolean;
  onClose: () => void;
  quote: QuoteForModal | null;
  onSuccess: () => void;
}

function getQuoteDateEffet(formData: unknown): string | null {
  const fd = formData as Record<string, unknown> | null | undefined;
  if (!fd) return null;
  const raw =
    (fd.dateEffet as string | undefined) ??
    (fd.dateDeffet as string | undefined) ??
    (fd.dateDebut as string | undefined) ??
    (fd.startDate as string | undefined);
  if (!raw) return null;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

export default function ApproveOfferModal({
  isOpen,
  onClose,
  quote,
  onSuccess,
}: ApproveOfferModalProps) {
  const [option, setOption] = useState<"quote" | "other">("quote");
  const [customDate, setCustomDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const quoteDateEffet = quote ? getQuoteDateEffet(quote.formData) : null;
  const hasQuoteDate = !!quoteDateEffet;

  useEffect(() => {
    if (isOpen && quote) {
      const qd = getQuoteDateEffet(quote.formData);
      if (qd) {
        setOption("quote");
        setCustomDate(qd);
      } else {
        setOption("other");
        setCustomDate(new Date().toISOString().slice(0, 10));
      }
      setError(null);
    }
  }, [isOpen, quote]);

  const getEffectiveStartDate = (): string | null => {
    if (option === "quote" && quoteDateEffet) return quoteDateEffet;
    if (option === "other" && customDate) {
      const d = new Date(customDate);
      return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const startDate = getEffectiveStartDate();
    if (!startDate || !quote) {
      setError("Choisissez une date de début de contrat.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/quotes/${quote.id}/approve-and-create-contract`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ startDate }),
        },
      );
      const data = await response.json();
      if (!response.ok) {
        throw new Error(
          data.error || data.message || "La création du contrat a échoué.",
        );
      }
      onClose();
      onSuccess();
      notify(data.message || "Contrat créé.", "success");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "La création du contrat a échoué.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={isOpen}
      title="Approuver l'offre et créer le contrat"
      onClose={loading ? () => undefined : onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Annuler
          </Button>
          <Button
            type="submit"
            form="approve-offer-form"
            disabled={loading || !getEffectiveStartDate()}
          >
            {loading ? "Création…" : "Valider et créer le contrat"}
          </Button>
        </>
      }
    >
      <form id="approve-offer-form" onSubmit={handleSubmit} className="space-y-4">
        {error ? <ErrorBanner>{error}</ErrorBanner> : null}
        <p className="text-ink-muted">
          Choisissez la date d&apos;effet du contrat.
        </p>
        <label className="flex items-start gap-2">
          <input
            type="radio"
            name="dateOption"
            checked={option === "quote"}
            onChange={() => setOption("quote")}
            disabled={!hasQuoteDate}
            className="mt-1"
          />
          <span className={!hasQuoteDate ? "text-ink-muted" : "text-ink"}>
            Utiliser la date d&apos;effet du devis
            {hasQuoteDate && quoteDateEffet
              ? ` (${formatDateFr(quoteDateEffet)})`
              : " (non renseignée)"}
          </span>
        </label>
        <label className="flex items-start gap-2">
          <input
            type="radio"
            name="dateOption"
            checked={option === "other"}
            onChange={() => setOption("other")}
            className="mt-1"
          />
          <span>Choisir une autre date</span>
        </label>
        {option === "other" ? (
          <input
            type="date"
            className={inputClassName}
            value={customDate}
            onChange={(e) => setCustomDate(e.target.value)}
            required={option === "other"}
          />
        ) : null}
      </form>
    </Modal>
  );
}
