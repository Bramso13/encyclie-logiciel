/**
 * Calcul pur des lignes d’échéancier pour CalculationTab (débogage / tests).
 */

import type { PaymentInstallment } from "@/lib/types";

export interface EcheanceRowValues {
  rcdHT: number;
  pj: number;
  frais: number;
  fraisGestion: number;
  reprise: number;
  taxe: number;
  totalHT: number;
  totalTTC: number;
}

/** Sous-ensemble des champs lus pour les lignes d’échéancier. */
export type PaymentInstallmentForEcheanceRow = Pick<
  PaymentInstallment,
  | "installmentNumber"
  | "rcdAmount"
  | "pjAmount"
  | "feesAmount"
  | "resumeAmount"
  | "amountHT"
  | "taxAmount"
  | "amountTTC"
>;

const FRAIS_GESTION_RATE = 0.1;

export function computeRowValuesModifieAlaMain(
  inst: PaymentInstallmentForEcheanceRow,
  origIndex: number,
): EcheanceRowValues {
  const rcdHT = inst.amountHT;
  const pj = inst.pjAmount ?? 0;
  const frais = inst.feesAmount ?? 0;
  const reprise = inst.resumeAmount ?? 0;
  const taxe = inst.taxAmount ?? 0;

  const fraisGestionSurEcheance1 = origIndex === 0;
  const fraisGestion = fraisGestionSurEcheance1 ? rcdHT * FRAIS_GESTION_RATE : 0;

  const totalHT = rcdHT + pj + frais + fraisGestion + reprise;
  const totalTTC = totalHT + taxe;

  return {
    rcdHT,
    pj,
    frais,
    fraisGestion,
    reprise,
    taxe,
    totalHT,
    totalTTC,
  };
}

export function computeRowValuesDefault(
  inst: PaymentInstallmentForEcheanceRow | undefined,
  echeance: {
    rcd?: number;
    pj?: number;
    frais?: number;
    reprise?: number;
    taxe?: number;
  },
  origIndex: number,
  fraisGestionGlobal: number,
  useSavedInstallment: boolean,
): EcheanceRowValues {
  const fraisGestionFirstOnly = origIndex === 0;
  const fraisGestion = fraisGestionFirstOnly ? fraisGestionGlobal : 0;

  if (inst && useSavedInstallment) {
    const rcdHT = inst.rcdAmount ?? 0;
    const pj = inst.pjAmount ?? 0;
    const frais = inst.feesAmount ?? 0;
    const reprise = inst.resumeAmount ?? 0;
    const taxe = inst.taxAmount ?? 0;
    const totalHT = inst.amountHT;
    const totalTTC = inst.amountTTC;

    return {
      rcdHT,
      pj,
      frais,
      fraisGestion,
      reprise,
      taxe,
      totalHT,
      totalTTC,
    };
  }

  const rcdHT = echeance.rcd ?? 0;
  const pj = echeance.pj ?? 0;
  const frais = echeance.frais ?? 0;
  const reprise = echeance.reprise ?? 0;
  const taxe = echeance.taxe ?? 0;
  const totalHT = rcdHT + pj + frais + fraisGestion + reprise;
  const totalTTC = totalHT + taxe;

  return {
    rcdHT,
    pj,
    frais,
    fraisGestion,
    reprise,
    taxe,
    totalHT,
    totalTTC,
  };
}

export function buildGetEcheanceRowValues(ctx: {
  modifieAlaMain: boolean;
  paymentInstallments: PaymentInstallment[];
  calculationResult: { fraisGestion?: number } | null | undefined;
  originalCalculationResult: unknown | null;
}) {
  const fraisGestionGlobal = ctx.calculationResult?.fraisGestion ?? 0;

  return function getEcheanceRowValues(
    echeance: {
      rcd?: number;
      pj?: number;
      frais?: number;
      reprise?: number;
      taxe?: number;
    },
    origIndex: number,
  ): EcheanceRowValues {
    const inst = ctx.paymentInstallments.find(
      (p) => p.installmentNumber === origIndex + 1,
    );
    const useSavedInstallment = !ctx.originalCalculationResult && !!inst;

    if (ctx.modifieAlaMain && inst) {
      return computeRowValuesModifieAlaMain(inst, origIndex);
    }

    return computeRowValuesDefault(
      inst,
      echeance,
      origIndex,
      fraisGestionGlobal,
      useSavedInstallment,
    );
  };
}
