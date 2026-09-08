import type { ActivityShare, FormData } from "@/lib/types";

export const REVISION_MILLESIME_YEAR = 2027;

export type Revision2027Input = {
  chiffreAffaires?: string;
  activities?: ActivityShare[];
};

export function yearFromFormData(formData: unknown): number | undefined {
  const raw = formData as { dateDeffet?: string; dateEffet?: string } | null;
  const value = raw?.dateDeffet || raw?.dateEffet;
  if (!value) return undefined;
  const year = parseLocalDate(value).getFullYear();
  return Number.isFinite(year) ? year : undefined;
}

export function parseLocalDate(value: string | Date | undefined | null): Date {
  if (!value) return new Date();
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? new Date() : value;
  }
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (iso) {
    return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
  }
  const fr = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
  if (fr) {
    return new Date(Number(fr[3]), Number(fr[2]) - 1, Number(fr[1]));
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

export function toIsoDateLocal(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Conserve le jour/mois de la date d'effet d'origine, basculés sur l'année cible. */
export function shiftDateToYear(
  value: string | Date | undefined | null,
  year: number,
): string {
  const source = parseLocalDate(value);
  const day = source.getDate();
  const month = source.getMonth();
  const shifted = new Date(year, month, day);
  if (shifted.getMonth() !== month) {
    return toIsoDateLocal(new Date(year, month + 1, 0));
  }
  return toIsoDateLocal(shifted);
}

export function activitiesShareSum(activities: ActivityShare[]): number {
  return activities.reduce(
    (sum, activity) => sum + Number(activity.caSharePercent || 0),
    0,
  );
}

export function buildRevision2027FormData(
  original: FormData,
  input: Revision2027Input,
  year: number = REVISION_MILLESIME_YEAR,
): FormData {
  const chiffreAffaires =
    input.chiffreAffaires !== undefined && input.chiffreAffaires !== ""
      ? String(input.chiffreAffaires)
      : original.chiffreAffaires;
  const activities = input.activities ?? original.activities ?? [];

  return {
    ...original,
    chiffreAffaires,
    activities: activities.map((activity) => ({
      code: String(activity.code),
      caSharePercent: Number(activity.caSharePercent),
    })),
    dateDeffet: shiftDateToYear(original.dateDeffet, year),
  };
}

export function assertFormDataUnchanged(
  before: FormData,
  after: FormData,
): void {
  if (before.chiffreAffaires !== after.chiffreAffaires) {
    throw new Error("Le CA 2026 a été modifié — opération annulée");
  }
  if (JSON.stringify(before.activities) !== JSON.stringify(after.activities)) {
    throw new Error("Les activités 2026 ont été modifiées — opération annulée");
  }
  if (before.dateDeffet !== after.dateDeffet) {
    throw new Error("La date d'effet 2026 a été modifiée — opération annulée");
  }
}
