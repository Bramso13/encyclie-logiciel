"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useExerciseYearStore } from "@/lib/stores/exercise-year-store";
import { notify } from "@/lib/ui/notify";

export function ExerciseYearSelect() {
  const { exerciseYear, years, setExerciseYear, hydrate, loaded } =
    useExerciseYearStore();
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [percent, setPercent] = useState("3.5");
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!loaded) void hydrate();
  }, [loaded, hydrate]);

  useEffect(() => {
    if (!open) {
      setAdding(false);
      return;
    }
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const options =
    years.length > 0 ? years.map((item) => item.year) : [exerciseYear];
  const latestYear = Math.max(...options);
  const nextYear = Math.max(latestYear + 1, 2027);
  const fromYear = latestYear;

  const createYear = async () => {
    const increasePercent = Number(percent);
    if (!Number.isFinite(increasePercent) || increasePercent < 0) {
      notify("Indique un pourcentage de hausse valide.", "error");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/tariff-years", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          year: nextYear,
          fromYear,
          increasePercent,
        }),
      });
      const raw = await res.json();
      if (!res.ok) throw new Error(raw.error || "Création impossible");
      await hydrate();
      setExerciseYear(nextYear);
      setAdding(false);
      setOpen(false);
      notify(
        `Exercice ${nextYear} créé (copie ${fromYear} + ${increasePercent} %).`,
        "success",
      );
    } catch (error) {
      notify(error instanceof Error ? error.message : "Erreur", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={`Exercice ${exerciseYear}`}
        onClick={() => setOpen((value) => !value)}
        className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-sm font-medium ${
          open
            ? "bg-white/10 text-white"
            : "text-white/70 hover:bg-white/5 hover:text-white"
        }`}
      >
        {exerciseYear}
        <span aria-hidden className="text-[10px] opacity-70">
          {open ? "▴" : "▾"}
        </span>
      </button>
      {open ? (
        <div
          role="listbox"
          aria-label="Exercice"
          className="absolute left-0 z-50 mt-2 w-56 overflow-hidden rounded-md border border-line bg-white py-1 text-ink shadow-lg"
        >
          {options.map((year) => {
            const selected = year === exerciseYear;
            return (
              <button
                key={year}
                type="button"
                role="option"
                aria-selected={selected}
                onClick={() => {
                  setExerciseYear(year);
                  setOpen(false);
                }}
                className={`block w-full px-3 py-2 text-left text-sm ${
                  selected
                    ? "bg-surface font-medium text-ink"
                    : "text-ink hover:bg-surface"
                }`}
              >
                {year}
              </button>
            );
          })}
          <div className="my-1 border-t border-line" />
          {adding ? (
            <div className="space-y-2 px-3 py-2">
              <p className="text-sm font-medium text-ink">
                Ajouter {nextYear}
              </p>
              <p className="text-xs text-ink-muted">
                Copie du barème {fromYear}, puis hausse des taux d&apos;activités.
              </p>
              <label className="block text-xs text-ink-muted">
                Hausse (%)
                <input
                  type="number"
                  min={0}
                  step="0.1"
                  value={percent}
                  onChange={(event) => setPercent(event.target.value)}
                  className="mt-1 w-full rounded-md border border-line bg-white px-2 py-1.5 text-sm text-ink"
                />
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => void createYear()}
                  disabled={saving}
                  className="rounded-md bg-ink px-2.5 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                >
                  Créer
                </button>
                <button
                  type="button"
                  onClick={() => setAdding(false)}
                  className="rounded-md px-2.5 py-1.5 text-xs font-medium text-ink-muted hover:text-ink"
                >
                  Annuler
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setAdding(true)}
              className="block w-full px-3 py-2 text-left text-sm text-ink hover:bg-surface"
            >
              Ajouter {nextYear}…
            </button>
          )}
          <Link
            href="/admin/exercices"
            onClick={() => setOpen(false)}
            className="block px-3 py-2 text-xs text-ink-muted hover:bg-surface hover:text-ink"
          >
            Modifier les barèmes
          </Link>
        </div>
      ) : null}
    </div>
  );
}
