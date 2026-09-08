"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Controls";
import { EmptyState, LoadingState } from "@/components/ui/Feedback";
import { formatDateFr, formatEur } from "@/lib/ui/labels";
import { notify } from "@/lib/ui/notify";
import { calendarYear } from "@/lib/quotes/exercise-year-filter";

type DebitNote = {
  id: string;
  periodStart: string;
  periodEnd: string;
  annualAmount: number;
  totalCommission: number;
  lines: Array<{
    id: string;
    periodDate: string;
    amountTTC: number;
    primeRcdHT: number;
    commission: number;
    netHorsCom: number;
    paymentDate: string | null;
  }>;
};

export default function DebitNoteTab({
  quoteId,
  isAdmin,
  preferredYear,
}: {
  quoteId: string;
  isAdmin: boolean;
  preferredYear?: number | null;
}) {
  const [year, setYear] = useState(preferredYear || calendarYear());
  const [notes, setNotes] = useState<DebitNote[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/quotes/${quoteId}/debit-notes`);
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Chargement impossible");
      setNotes(data.data.notes || []);
    } catch (error) {
      notify(
        error instanceof Error ? error.message : "Chargement impossible",
        "error",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [quoteId]);

  useEffect(() => {
    if (preferredYear) setYear(preferredYear);
  }, [preferredYear]);

  const generate = async () => {
    setGenerating(true);
    try {
      const res = await fetch(`/api/quotes/${quoteId}/debit-notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ year }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Génération impossible");
      notify(data.message || "Note de débit générée.", "success");
      await load();
    } catch (error) {
      notify(
        error instanceof Error ? error.message : "Génération impossible",
        "error",
      );
    } finally {
      setGenerating(false);
    }
  };

  const current = notes.find(
    (note) => new Date(note.periodStart).getUTCFullYear() === year,
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-ink">Note de débit</h2>
          <p className="text-sm text-ink-muted">
            Tableau calé sur l&apos;Excel SET (TTC, Prime RCD HT, commission 10
            %, NET hors com).
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-sm text-ink-muted">
            Exercice
            <input
              type="number"
              className="ml-2 w-24 rounded-md border border-line px-2 py-1.5"
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
            />
          </label>
          {isAdmin ? (
            <Button onClick={generate} disabled={generating}>
              {generating ? "Génération…" : "Générer / actualiser"}
            </Button>
          ) : null}
        </div>
      </div>

      {loading ? (
        <LoadingState active label="Chargement des notes de débit" />
      ) : !current ? (
        <EmptyState
          title={`Aucune note de débit ${year}`}
          description={
            isAdmin
              ? "Générez la note à partir des échéances de l'exercice."
              : "La note de débit n'a pas encore été générée."
          }
        />
      ) : (
        <div className="overflow-hidden rounded-lg border border-line bg-white">
          <div className="flex flex-wrap items-center justify-between gap-3 bg-amber-500 px-4 py-3 text-ink">
            <p className="font-semibold">NOTE DE DEBIT {year}</p>
            <p className="text-sm">
              Montant annuel (somme TTC) {formatEur(current.annualAmount)} —
              commissions {formatEur(current.totalCommission)}
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-amber-100 text-left text-xs uppercase tracking-wide text-ink-muted">
                  <th className="px-3 py-2">Période Date</th>
                  <th className="px-3 py-2">Montant TTC</th>
                  <th className="px-3 py-2">Date règlement</th>
                  <th className="px-3 py-2">Prime RCD HT</th>
                  <th className="px-3 py-2">Commissions</th>
                  <th className="px-3 py-2">NET hors com</th>
                </tr>
              </thead>
              <tbody>
                {current.lines.map((line) => (
                  <tr key={line.id} className="border-t border-line">
                    <td className="px-3 py-2">{formatDateFr(line.periodDate)}</td>
                    <td className="px-3 py-2">{formatEur(line.amountTTC)}</td>
                    <td className="px-3 py-2">
                      {line.paymentDate ? formatDateFr(line.paymentDate) : "—"}
                    </td>
                    <td className="px-3 py-2">{formatEur(line.primeRcdHT)}</td>
                    <td className="px-3 py-2">{formatEur(line.commission)}</td>
                    <td className="px-3 py-2">{formatEur(line.netHorsCom)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex gap-3 border-t border-line px-4 py-3">
            <a
              className="text-sm font-semibold underline decoration-brand underline-offset-4"
              href={`/api/quotes/${quoteId}/debit-notes/${current.id}/pdf`}
            >
              Télécharger le PDF
            </a>
            <a
              className="text-sm font-semibold underline decoration-brand underline-offset-4"
              href={`/api/quotes/${quoteId}/debit-notes/${current.id}/excel`}
            >
              Export Excel (CSV)
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
