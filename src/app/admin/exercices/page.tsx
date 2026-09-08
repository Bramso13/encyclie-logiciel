"use client";

import { useEffect, useState } from "react";
import { useExerciseYearStore } from "@/lib/stores/exercise-year-store";
import { Button, inputClassName } from "@/components/ui/Controls";
import { AuthenticatedAppShell } from "@/components/ui/AuthenticatedAppShell";
import { notify } from "@/lib/ui/notify";

export default function AdminExercicesPage() {
  const { years, hydrate } = useExerciseYearStore();
  const [fromYear, setFromYear] = useState(2026);
  const [newYear, setNewYear] = useState(2027);
  const [percent, setPercent] = useState("3.5");
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const [ratesDraft, setRatesDraft] = useState<string>("");

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  const current = years.find((item) => item.year === selected) ?? years.at(-1);

  useEffect(() => {
    if (current) {
      setRatesDraft(
        current.rates.activityRates
          .map((row) => `${row.code}\t${row.title}\t${row.rate}`)
          .join("\n"),
      );
    }
  }, [current?.year]);

  const createYear = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/tariff-years", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          year: newYear,
          fromYear,
          increasePercent: Number(percent),
        }),
      });
      const raw = await res.json();
      if (!res.ok) throw new Error(raw.error || "Création impossible");
      notify(`Exercice ${newYear} créé.`, "success");
      await hydrate();
      setSelected(newYear);
    } catch (error) {
      notify(error instanceof Error ? error.message : "Erreur", "error");
    } finally {
      setSaving(false);
    }
  };

  const saveRates = async () => {
    if (!current || current.frozen || current.builtin) return;
    const activityRates = ratesDraft
      .split("\n")
      .map((line) => line.split("\t"))
      .filter((cols) => cols.length >= 3)
      .map((cols) => ({
        code: Number(cols[0]),
        title: cols[1],
        rate: Number(cols[2]),
      }));
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/tariff-years/${current.year}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activityRates }),
      });
      const raw = await res.json();
      if (!res.ok) throw new Error(raw.error || "Enregistrement impossible");
      notify(`Barème ${current.year} enregistré.`, "success");
      await hydrate();
    } catch (error) {
      notify(error instanceof Error ? error.message : "Erreur", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AuthenticatedAppShell>
      <h1 className="text-xl font-semibold text-ink">Exercices et barèmes</h1>
      <p className="mt-1 max-w-3xl text-sm text-ink-muted">
        2025 et 2026 restent ceux du moteur de calcul actuel. Une nouvelle année
        copie N-1 + un pourcentage, puis tu ajustes. Dès qu&apos;une année plus
        récente existe, la précédente est gelée.
      </p>

      <section className="mt-6 rounded-lg border border-line bg-white p-4">
        <h2 className="text-sm font-semibold">Créer un exercice</h2>
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <label className="text-sm">
            Année
            <input
              type="number"
              min={2027}
              value={newYear}
              onChange={(e) => setNewYear(Number(e.target.value))}
              className={`${inputClassName} mt-1 w-28`}
            />
          </label>
          <label className="text-sm">
            Copier depuis
            <input
              type="number"
              min={2025}
              value={fromYear}
              onChange={(e) => setFromYear(Number(e.target.value))}
              className={`${inputClassName} mt-1 w-28`}
            />
          </label>
          <label className="text-sm">
            Hausse des taux d&apos;activités (%)
            <input
              type="number"
              min={0}
              step="0.1"
              value={percent}
              onChange={(e) => setPercent(e.target.value)}
              className={`${inputClassName} mt-1 w-28`}
            />
          </label>
          <Button onClick={createYear} disabled={saving}>
            Créer
          </Button>
        </div>
      </section>

      <section className="mt-6 rounded-lg border border-line bg-white p-4">
        <h2 className="text-sm font-semibold">Barèmes</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {years.map((item) => (
            <button
              key={item.year}
              type="button"
              onClick={() => setSelected(item.year)}
              className={`rounded-full px-3 py-1 text-sm ${
                current?.year === item.year
                  ? "bg-ink text-white"
                  : "bg-surface text-ink"
              }`}
            >
              {item.year}
              {item.frozen ? " · gelé" : ""}
            </button>
          ))}
        </div>
        {current ? (
          <div className="mt-4">
            <p className="text-sm text-ink-muted">
              {current.builtin
                ? "Barème intégré (production). Non modifiable."
                : current.frozen
                  ? "Gelé : un exercice plus récent existe."
                  : "Modifiable. Une ligne par activité : code, libellé, taux (séparés par tabulation)."}
            </p>
            <textarea
              value={ratesDraft}
              onChange={(e) => setRatesDraft(e.target.value)}
              readOnly={current.frozen || current.builtin}
              rows={16}
              className={`${inputClassName} mt-2 font-mono text-xs`}
            />
            {!current.frozen && !current.builtin ? (
              <Button className="mt-3" onClick={saveRates} disabled={saving}>
                Enregistrer les taux {current.year}
              </Button>
            ) : null}
          </div>
        ) : null}
      </section>
    </AuthenticatedAppShell>
  );
}
