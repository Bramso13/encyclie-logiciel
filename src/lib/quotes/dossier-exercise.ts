import type { ActivityShare, CalculationResult, FormData } from "@/lib/types";
import { calendarYear } from "@/lib/quotes/exercise-year-filter";
import { buildRevision2027FormData } from "@/lib/quotes/revision-millesime";

export type VintagePremiumSource = {
  year: number;
  chiffreAffaires?: string;
  activities?: ActivityShare[];
  calculatedPremium?: CalculationResult | null;
};

export function resolveSelectedDossierYear(input: {
  isAdmin: boolean;
  dossierYear: number | null;
  originalYear: number;
  yearsOnDossier: number[];
  now?: Date;
}): number {
  if (input.isAdmin) return input.dossierYear ?? input.originalYear;
  const current = calendarYear(input.now);
  return input.yearsOnDossier.includes(current) ? current : input.originalYear;
}

/**
 * Hors exercice d'origine, ne jamais replier sur le calcul d'origine.
 * Un brouillon local (édition non enregistrée) prime sur la prime persistée du millésime.
 */
export function resolveDisplayedCalculation(input: {
  selectedYear: number;
  originalYear: number;
  originCalculation: CalculationResult | null;
  vintagePremium?: CalculationResult | null;
  localDraft?: CalculationResult | null;
}): CalculationResult | null {
  if (input.selectedYear === input.originalYear) {
    return input.originCalculation;
  }
  if (input.localDraft) return input.localDraft;
  return input.vintagePremium ?? null;
}

export function formDataForExerciseRecalculation(
  original: FormData,
  vintage: VintagePremiumSource | null | undefined,
  year: number,
  originalYear: number,
  switches: {
    nonFournitureBilanEnabled: boolean;
    reprisePasseEnabled: boolean;
  },
): FormData {
  const base =
    year === originalYear
      ? original
      : buildRevision2027FormData(
          original,
          {
            chiffreAffaires: vintage?.chiffreAffaires,
            activities: vintage?.activities,
          },
          year,
        );

  return {
    ...base,
    dateEffet: base.dateDeffet,
    nonFournitureBilanN_1: switches.nonFournitureBilanEnabled,
    reprisePasse: switches.reprisePasseEnabled,
  } as FormData;
}

type DatedInstallment = {
  vintageYear?: number | null;
  dueDate?: string | Date | null;
  schedule?: { vintageYear?: number | null } | null;
};

export function installmentVintageYear(
  installment: DatedInstallment,
): number | null {
  const explicit =
    installment.vintageYear ?? installment.schedule?.vintageYear ?? null;
  return explicit == null ? null : explicit;
}

export function installmentMatchesExerciseYear(
  installment: DatedInstallment,
  year: number,
): boolean {
  const vintageYear = installmentVintageYear(installment);
  if (vintageYear != null) return vintageYear === year;
  if (!installment.dueDate) return false;
  const date =
    installment.dueDate instanceof Date
      ? installment.dueDate
      : new Date(installment.dueDate);
  if (Number.isNaN(date.getTime())) return false;
  return date.getFullYear() === year;
}
