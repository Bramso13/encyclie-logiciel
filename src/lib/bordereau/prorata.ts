/** Jours calendaires inclus entre deux dates (bornes incluses). */
export function calendarDaysInclusive(start: Date, end: Date): number {
  const s = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const e = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  return Math.round((e.getTime() - s.getTime()) / 86_400_000) + 1;
}

/** 1re échéance au prorata : période plus courte qu’une période pleine (périodicité du contrat). */
export function isPremiereEcheanceProrata(params: {
  ech1: {
    periodStart: Date;
    periodEnd: Date;
  };
  expectedFullPeriodDays?: number | null;
}): boolean {
  if (
    params.expectedFullPeriodDays == null ||
    params.expectedFullPeriodDays <= 0
  ) {
    return false;
  }

  const ech1Days = calendarDaysInclusive(
    params.ech1.periodStart,
    params.ech1.periodEnd,
  );
  return ech1Days < params.expectedFullPeriodDays - 1;
}

/** Prorata éch. #1 à partir du formData contrat (aligné CalculationTab / tarificateur). */
export function detectEch1Prorata(
  ech1: { periodStart: Date; periodEnd?: Date },
  formData: Record<string, unknown>,
): boolean {
  if (!ech1.periodEnd) return false;
  const periodicite = parsePeriodiciteFromFormData(formData);
  const expectedDays =
    periodicite != null
      ? expectedFullPeriodDays(periodicite, ech1.periodStart)
      : null;

  return isPremiereEcheanceProrata({
    ech1: { periodStart: ech1.periodStart, periodEnd: ech1.periodEnd },
    expectedFullPeriodDays: expectedDays,
  });
}

export function parsePeriodiciteFromFormData(
  formData: Record<string, unknown>,
): "annuel" | "semestriel" | "trimestriel" | "mensuel" | null {
  const raw =
    formData.periodicity ?? formData.periodicite ?? formData.fractionnementPrime;
  const s = raw != null ? String(raw).toLowerCase().trim() : "";
  if (s.includes("mensuel") || s === "mensuel") return "mensuel";
  if (s.includes("trimestre") || s === "trimestriel") return "trimestriel";
  if (s.includes("semestre") || s === "semestriel") return "semestriel";
  if (s.includes("annuel") || s === "annuel") return "annuel";
  return null;
}

/** Durée calendaire d’une période pleine pour la périodicité (approx. mois calendaires). */
export function expectedFullPeriodDays(
  periodicite: "annuel" | "semestriel" | "trimestriel" | "mensuel",
  periodStart: Date,
): number {
  const moisParPeriode = {
    annuel: 12,
    semestriel: 6,
    trimestriel: 3,
    mensuel: 1,
  }[periodicite];
  const start = new Date(
    periodStart.getFullYear(),
    periodStart.getMonth(),
    periodStart.getDate(),
  );
  const end = new Date(
    periodStart.getFullYear(),
    periodStart.getMonth() + moisParPeriode,
    periodStart.getDate(),
  );
  end.setDate(end.getDate() - 1);
  return calendarDaysInclusive(start, end);
}
