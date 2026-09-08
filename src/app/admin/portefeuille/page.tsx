"use client";

import { useEffect, useMemo, useState } from "react";
import { useExerciseYearStore } from "@/lib/stores/exercise-year-store";
import { AuthenticatedAppShell } from "@/components/ui/AuthenticatedAppShell";
import { Button } from "@/components/ui/Controls";
import { KpiCard, LoadingState, PageHeader } from "@/components/ui/Feedback";
import { formatEur } from "@/lib/ui/labels";
import {
  formatRatio,
  type PortfolioRecap,
} from "@/lib/quotes/portfolio-recap";
import { notify } from "@/lib/ui/notify";

function BarChart({
  rows,
}: {
  rows: Array<{ key: string; label: string; annualPremium: number }>;
}) {
  const max = Math.max(...rows.map((row) => row.annualPremium), 1);
  return (
    <div className="space-y-2">
      {rows.map((row) => {
        const width = `${Math.max(4, (row.annualPremium / max) * 100)}%`;
        return (
          <div
            key={row.key}
            className="grid grid-cols-[8rem_1fr_auto] items-center gap-2 text-sm"
          >
            <span className="truncate text-ink-muted">{row.label}</span>
            <div className="h-3 overflow-hidden rounded bg-surface">
              <div className="h-full rounded bg-brand" style={{ width }} />
            </div>
            <span className="tabular-nums text-ink">
              {formatEur(row.annualPremium)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function LineBars({ recap }: { recap: PortfolioRecap }) {
  const max = Math.max(
    ...recap.months.map((row) => Math.max(row.due, row.paid)),
    1,
  );
  return (
    <div className="flex h-40 items-end gap-1">
      {recap.months.map((row) => (
        <div key={row.month} className="flex flex-1 flex-col items-center gap-1">
          <div className="flex h-32 w-full items-end justify-center gap-0.5">
            <div
              className="w-1/2 rounded-t bg-ink/30"
              style={{ height: `${(row.due / max) * 100}%` }}
              title={`Due ${formatEur(row.due)}`}
            />
            <div
              className="w-1/2 rounded-t bg-brand"
              style={{ height: `${(row.paid / max) * 100}%` }}
              title={`Réglée ${formatEur(row.paid)}`}
            />
          </div>
          <span className="text-[10px] text-ink-muted">{row.label.slice(0, 3)}</span>
        </div>
      ))}
    </div>
  );
}

export default function PortefeuillePage() {
  const exerciseYear = useExerciseYearStore((state) => state.exerciseYear);
  const [year, setYear] = useState(exerciseYear);
  const [recap, setRecap] = useState<PortfolioRecap | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setYear(exerciseYear);
  }, [exerciseYear]);

  const load = async (target: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/portfolio-recap?year=${target}`);
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Chargement impossible");
      setRecap(data.data);
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
    void load(year);
  }, [year]);

  const asOf = useMemo(() => {
    if (!recap) return "";
    return new Date(recap.asOf).toLocaleDateString("fr-FR");
  }, [recap]);

  return (
    <AuthenticatedAppShell>
      <PageHeader
        title={`Portefeuille RC Décennale ${year}`}
        description={
          recap
            ? `Situation arrêtée au ${asOf}`
            : "Indicateurs du portefeuille souscrit."
        }
        actions={
          <div className="flex items-center gap-2">
            <input
              type="number"
              className="w-24 rounded-md border border-line px-2 py-1.5 text-sm"
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
            />
            <Button
              variant="secondary"
              onClick={() => {
                window.location.href = `/api/admin/portfolio-recap/export?year=${year}`;
              }}
            >
              Export Excel (CSV)
            </Button>
          </div>
        }
      />

      {loading && !recap ? (
        <LoadingState active label="Agrégation du portefeuille" />
      ) : recap ? (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <KpiCard label="Affaires actives" value={recap.activeCount} />
            <KpiCard
              label="Prime annuelle cumulée"
              value={formatEur(recap.annualPremium)}
            />
            <KpiCard
              label="Prime réglée (échu)"
              value={formatEur(recap.paidElapsed)}
            />
            <KpiCard
              label="Ratio règlement / prime"
              value={formatRatio(recap.ratioElapsed)}
              hint={`${formatEur(recap.paidElapsed)} / ${formatEur(recap.dueElapsed)}`}
            />
          </div>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
            <KpiCard
              label="Notes de débit reçues"
              value={formatEur(recap.debitNotesReceived)}
            />
            <KpiCard
              label="Notes de débit dues"
              value={
                recap.debitNotesDue > 0
                  ? formatEur(recap.debitNotesDue)
                  : "N/A"
              }
            />
            <KpiCard
              label="Commissions totales"
              value={formatEur(recap.commissionsTotal)}
            />
          </div>

          <section className="rounded-lg border border-line bg-white p-4">
            <h2 className="mb-3 text-sm font-semibold text-ink">
              1. Suivi mensuel des primes
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase text-ink-muted">
                    <th className="py-2">Mois</th>
                    <th>Prime due</th>
                    <th>Prime réglée</th>
                    <th>Ratio</th>
                  </tr>
                </thead>
                <tbody>
                  {recap.months.map((row) => (
                    <tr key={row.month} className="border-t border-line">
                      <td className="py-2">{row.label}</td>
                      <td>{formatEur(row.due)}</td>
                      <td>{row.elapsed ? formatEur(row.paid) : "—"}</td>
                      <td>{formatRatio(row.ratio)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="rounded-lg border border-line bg-white p-4">
            <h2 className="mb-3 text-sm font-semibold text-ink">
              2. Évolution primes dues / réglées
            </h2>
            <LineBars recap={recap} />
            <p className="mt-2 text-xs text-ink-muted">
              Gris = due, orange = réglée.
            </p>
          </section>

          <section className="rounded-lg border border-line bg-white p-4">
            <h2 className="mb-3 text-sm font-semibold text-ink">
              3. Taux de règlement mensuel
            </h2>
            <div className="flex h-32 items-end gap-1">
              {recap.months.map((row) => (
                <div key={row.month} className="flex flex-1 flex-col items-center gap-1">
                  <div
                    className="w-full rounded-t bg-emerald-700/80"
                    style={{
                      height: `${row.ratio ?? 0}%`,
                      minHeight: row.elapsed ? 2 : 0,
                    }}
                  />
                  <span className="text-[10px] text-ink-muted">
                    {row.label.slice(0, 3)}
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-lg border border-line bg-white p-4">
            <h2 className="mb-3 text-sm font-semibold text-ink">
              4. Répartition géographique
            </h2>
            <BarChart rows={recap.geo} />
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase text-ink-muted">
                    <th className="py-2">Région</th>
                    <th>Prime annuelle</th>
                    <th>Part</th>
                    <th>Nb assurés</th>
                  </tr>
                </thead>
                <tbody>
                  {recap.geo.map((row) => (
                    <tr key={row.key} className="border-t border-line">
                      <td className="py-2">{row.label}</td>
                      <td>{formatEur(row.annualPremium)}</td>
                      <td>{formatRatio(row.share)}</td>
                      <td>{row.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="rounded-lg border border-line bg-white p-4">
            <h2 className="mb-3 text-sm font-semibold text-ink">
              5. Répartition par courtier
            </h2>
            <BarChart rows={recap.brokers} />
          </section>

          <section className="rounded-lg border border-line bg-white p-4">
            <h2 className="mb-3 text-sm font-semibold text-ink">
              6. Répartition par fractionnement
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase text-ink-muted">
                    <th className="py-2">Fractionnement</th>
                    <th>Nb contrats</th>
                    <th>Prime annuelle</th>
                    <th>Due (échu)</th>
                    <th>Réglée</th>
                    <th>Ratio</th>
                  </tr>
                </thead>
                <tbody>
                  {recap.fractionnement.map((row) => (
                    <tr key={row.key} className="border-t border-line">
                      <td className="py-2">{row.label}</td>
                      <td>{row.count}</td>
                      <td>{formatEur(row.annualPremium)}</td>
                      <td>{formatEur(row.dueElapsed)}</td>
                      <td>{formatEur(row.paidElapsed)}</td>
                      <td>{formatRatio(row.ratio)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="rounded-lg border border-line bg-white p-4">
            <h2 className="mb-3 text-sm font-semibold text-ink">7. Synthèse</h2>
            <ul className="list-disc space-y-1 pl-5 text-sm text-ink">
              {recap.summary.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </section>
        </div>
      ) : null}
    </AuthenticatedAppShell>
  );
}
