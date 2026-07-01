import { computeBordereauEch1FromCalculationTabRow } from "@/lib/quotes/echeance-row-values";
import { detectEch1Prorata } from "./prorata";

export interface InstallmentAmountFields {
  installmentNumber: number;
  periodStart: Date;
  periodEnd?: Date;
  amountHT: number;
  amountTTC: number;
  taxAmount: number;
  rcdAmount: number | null;
  pjAmount: number | null;
  feesAmount: number | null;
  resumeAmount: number | null;
}

export type ScheduleSibling = Pick<
  InstallmentAmountFields,
  "installmentNumber" | "periodStart"
>;

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function hasAmountBreakdown(inst: InstallmentAmountFields): boolean {
  return (
    inst.rcdAmount != null ||
    inst.pjAmount != null ||
    inst.feesAmount != null ||
    inst.resumeAmount != null
  );
}

/** Frais de gestion implicites (nécessite rcdAmount renseigné). */
export function inferFraisGestion(inst: InstallmentAmountFields): number {
  const rcd = inst.rcdAmount ?? 0;
  const pj = inst.pjAmount ?? 0;
  const fees = inst.feesAmount ?? 0;
  const reprise = inst.resumeAmount ?? 0;
  return round2(Math.max(0, inst.amountHT - rcd - pj - fees - reprise));
}

function resolveFraisGestion(inst: InstallmentAmountFields): number {
  if (inst.rcdAmount == null || !hasAmountBreakdown(inst)) return 0;
  return inferFraisGestion(inst);
}

export function resolveFraisGestionGlobal(
  inst: InstallmentAmountFields,
  fraisGestionGlobal?: number | null,
): number {
  if (fraisGestionGlobal != null && fraisGestionGlobal > 0.005) {
    return round2(fraisGestionGlobal);
  }
  return resolveFraisGestion(inst);
}

/** RCD HT : champ dédié ou repli sur le HT total si pas de décomposition. */
export function resolveRcdAmount(inst: InstallmentAmountFields): number {
  if (inst.rcdAmount != null) return inst.rcdAmount;
  if (!hasAmountBreakdown(inst)) return inst.amountHT;
  const pj = inst.pjAmount ?? 0;
  const fees = inst.feesAmount ?? 0;
  const reprise = inst.resumeAmount ?? 0;
  const fraisGestion = resolveFraisGestion(inst);
  return round2(Math.max(0, inst.amountHT - pj - fees - reprise - fraisGestion));
}

function resolveFeesAmount(inst: InstallmentAmountFields): number {
  return inst.feesAmount ?? 0;
}

/** Première échéance de l'année civile (aligné sur estPremierPaiementAnnee du tarificateur). */
export function isPremierPaiementAnnee(
  inst: Pick<InstallmentAmountFields, "installmentNumber" | "periodStart">,
  schedulePayments: ScheduleSibling[],
): boolean {
  if (schedulePayments.length === 0) {
    return inst.installmentNumber === 1;
  }
  const year = inst.periodStart.getFullYear();
  const installmentsInYear = schedulePayments.filter(
    (p) => p.periodStart.getFullYear() === year,
  );
  if (installmentsInYear.length === 0) return false;
  const minNumber = Math.min(
    ...installmentsInYear.map((p) => p.installmentNumber),
  );
  return inst.installmentNumber === minNumber;
}

/** PJ ou frais de gestion sur l'échéance (reprise exclue). */
export function hasAnnualSupplements(inst: InstallmentAmountFields): boolean {
  if ((inst.pjAmount ?? 0) > 0.005) return true;
  return resolveFraisGestion(inst) > 0.005;
}

export function shouldDeductAnnualSupplements(
  inst: InstallmentAmountFields,
  _schedulePayments: ScheduleSibling[],
  enabled: boolean,
): boolean {
  return (
    enabled && inst.installmentNumber === 1 && hasAnnualSupplements(inst)
  );
}

export function findSecondInstallment(
  scheduleInstallments: InstallmentAmountFields[],
): InstallmentAmountFields | null {
  return (
    scheduleInstallments.find((p) => p.installmentNumber === 2) ?? null
  );
}

/** @deprecated Préférer findSecondInstallment (référence = échéance #2). */
export function findReferenceNormalInstallment(
  _inst: InstallmentAmountFields,
  scheduleInstallments: InstallmentAmountFields[],
): InstallmentAmountFields | null {
  return findSecondInstallment(scheduleInstallments);
}

/** Montants enregistrés (aligné sur CalculationTab / échéancier sauvegardé). */
export function amountsFromSavedInstallment(
  inst: InstallmentAmountFields,
): { primeHT: number; primeTTC: number; taxAmount: number } {
  return {
    primeHT: round2(inst.amountHT),
    primeTTC: round2(inst.amountTTC),
    taxAmount: round2(inst.taxAmount),
  };
}

export function computeNormalEcheanceAmounts(
  inst: InstallmentAmountFields,
  tauxTaxeDecimal: number,
): { primeHT: number; primeTTC: number; taxAmount: number } {
  const rcd = resolveRcdAmount(inst);
  const fees = resolveFeesAmount(inst);
  const primeHT = round2(rcd + fees);
  const taxAmount = round2((rcd + fees) * tauxTaxeDecimal);
  const primeTTC = round2(primeHT + taxAmount);
  return { primeHT, primeTTC, taxAmount };
}

function computeDeductedPremierEcheanceAmounts(
  inst: InstallmentAmountFields,
  fraisGestionGlobal?: number | null,
  scheduleInstallments?: InstallmentAmountFields[],
  formData?: Record<string, unknown>,
): { primeHT: number; primeTTC: number; taxAmount: number } {
  const ech2 = scheduleInstallments
    ? findSecondInstallment(scheduleInstallments)
    : null;

  const prorata =
    formData != null && detectEch1Prorata(inst, formData);

  if (ech2 && !prorata) {
    return amountsFromSavedInstallment(ech2);
  }

  const fg =
    fraisGestionGlobal != null && fraisGestionGlobal > 0.005
      ? fraisGestionGlobal
      : resolveFraisGestion(inst);
  return computeBordereauEch1FromCalculationTabRow(inst, fg);
}

/**
 * Montants quittance bordereau.
 * Éch. #1 + déduction, période pleine : montants éch. #2 (ligne CalculationTab normale).
 * Éch. #1 + déduction, prorata : Total HT/TTC éch. #1 − PJ − frais de gestion.
 * Autres échéances : montants enregistrés (CalculationTab).
 */
export function computeBordereauQuittanceAmounts(params: {
  inst: InstallmentAmountFields;
  modifieAlaMain: boolean;
  deductAnnualSupplements: boolean;
  schedulePayments: ScheduleSibling[];
  scheduleInstallments?: InstallmentAmountFields[];
  tauxTaxeDecimal: number | null;
  fraisGestionGlobal?: number | null;
  formData?: Record<string, unknown>;
}): { primeHT: number; primeTTC: number; taxAmount: number } {
  const {
    inst,
    modifieAlaMain,
    deductAnnualSupplements,
    schedulePayments,
    scheduleInstallments,
    tauxTaxeDecimal,
    fraisGestionGlobal,
    formData,
  } = params;

  if (deductAnnualSupplements) {
    if (shouldDeductAnnualSupplements(inst, schedulePayments, true)) {
      return computeDeductedPremierEcheanceAmounts(
        inst,
        fraisGestionGlobal,
        scheduleInstallments,
        formData,
      );
    }
    return amountsFromSavedInstallment(inst);
  }

  if (modifieAlaMain) {
    return amountsFromSavedInstallment(inst);
  }

  const rcdHt = resolveRcdAmount(inst);
  return {
    primeHT: rcdHt,
    primeTTC: round2(rcdHt + inst.taxAmount),
    taxAmount: inst.taxAmount,
  };
}
