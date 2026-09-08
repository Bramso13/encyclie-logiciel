"use client";

import { useEffect, useMemo, useState } from "react";
import type { ActivityShare, Quote } from "@/lib/types";
import { calendarYear } from "@/lib/quotes/exercise-year-filter";
import { yearFromFormData } from "@/lib/quotes/revision-millesime";
import { useExerciseYearStore } from "@/lib/stores/exercise-year-store";
import { Button, inputClassName } from "@/components/ui/Controls";
import { notify } from "@/lib/ui/notify";

export function dossierOriginalYear(quote: Quote): number {
  return yearFromFormData(quote.formData) ?? 2026;
}

export function DossierExerciseBar({
  quote,
  isAdmin,
  selectedYear,
  onSelectYear,
  onAdded,
}: {
  quote: Quote;
  isAdmin: boolean;
  selectedYear: number;
  onSelectYear: (year: number) => void;
  onAdded: () => void;
}) {
  const tariffYears = useExerciseYearStore((state) => state.years);
  const hydrate = useExerciseYearStore((state) => state.hydrate);
  const loaded = useExerciseYearStore((state) => state.loaded);
  const [open, setOpen] = useState(false);
  const [targetYear, setTargetYear] = useState(calendarYear() + 1);
  const [chiffreAffaires, setChiffreAffaires] = useState(
    quote.formData?.chiffreAffaires ?? "",
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loaded) void hydrate();
  }, [loaded, hydrate]);

  const yearsOnDossier = useMemo(() => {
    const set = new Set<number>([dossierOriginalYear(quote)]);
    for (const vintage of quote.vintages ?? []) set.add(vintage.year);
    return [...set].sort((a, b) => a - b);
  }, [quote]);

  const addableYears = tariffYears
    .map((item) => item.year)
    .filter((year) => year >= 2027 && !yearsOnDossier.includes(year));

  useEffect(() => {
    if (addableYears.length > 0 && !addableYears.includes(targetYear)) {
      setTargetYear(addableYears[0]);
    }
  }, [addableYears, targetYear]);

  const addExercise = async () => {
    setSaving(true);
    try {
      const activities = (quote.formData?.activities ?? []) as ActivityShare[];
      const res = await fetch(`/api/quotes/${quote.id}/revision-2027`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          year: targetYear,
          chiffreAffaires: chiffreAffaires || undefined,
          activities: activities.length ? activities : undefined,
        }),
      });
      const raw = await res.json();
      if (!res.ok) throw new Error(raw.error || "Impossible d'ajouter l'exercice");
      notify(`Exercice ${targetYear} ajouté au dossier.`, "success");
      setOpen(false);
      onSelectYear(targetYear);
      onAdded();
    } catch (error) {
      notify(error instanceof Error ? error.message : "Erreur", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-medium uppercase tracking-wide text-ink-muted">
        Exercice du dossier
      </span>
      {yearsOnDossier.map((year) => (
        <button
          key={year}
          type="button"
          onClick={() => onSelectYear(year)}
          className={`rounded-full px-3 py-1 text-sm ${
            selectedYear === year
              ? "bg-ink text-white"
              : "border border-line bg-white text-ink"
          }`}
        >
          {year}
        </button>
      ))}
      {isAdmin && addableYears.length > 0 ? (
        open ? (
          <div className="flex flex-wrap items-end gap-2 rounded-md border border-line bg-white p-2">
            <label className="text-xs">
              Année
              <select
                value={targetYear}
                onChange={(e) => setTargetYear(Number(e.target.value))}
                className={`${inputClassName} mt-1`}
              >
                {addableYears.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs">
              CA (laisser tel quel pour recopier)
              <input
                value={chiffreAffaires}
                onChange={(e) => setChiffreAffaires(e.target.value)}
                className={`${inputClassName} mt-1 w-36`}
              />
            </label>
            <Button onClick={addExercise} disabled={saving}>
              Retarifer
            </Button>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Annuler
            </Button>
          </div>
        ) : (
          <Button variant="secondary" onClick={() => setOpen(true)}>
            Ajouter un exercice
          </Button>
        )
      ) : null}
    </div>
  );
}
