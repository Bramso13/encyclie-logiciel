export interface InstallmentAmountFields {
  installmentNumber: number;
  periodStart: Date;
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

export function hasAnnualSupplements(inst: InstallmentAmountFields): boolean {
  if ((inst.pjAmount ?? 0) > 0.005) return true;
  if ((inst.resumeAmount ?? 0) > 0.005) return true;
  return resolveFraisGestion(inst) > 0.005;
}

export function shouldDeductAnnualSupplements(
  inst: InstallmentAmountFields,
  schedulePayments: ScheduleSibling[],
  enabled: boolean,
): boolean {
  return (
    enabled &&
    isPremierPaiementAnnee(inst, schedulePayments) &&
    hasAnnualSupplements(inst)
  );
}

function findReferenceNormalInstallment(
  inst: InstallmentAmountFields,
  scheduleInstallments: InstallmentAmountFields[],
): InstallmentAmountFields | null {
  const siblings = scheduleInstallments.filter(
    (p) => p.installmentNumber !== inst.installmentNumber,
  );
  if (siblings.length === 0) return null;

  const scheduleRefs: ScheduleSibling[] = scheduleInstallments.map((p) => ({
    installmentNumber: p.installmentNumber,
    periodStart: p.periodStart,
  }));

  const isNormal = (p: InstallmentAmountFields) =>
    !isPremierPaiementAnnee(p, scheduleRefs) && !hasAnnualSupplements(p);

  const sameYear = siblings.find(
    (p) =>
      p.periodStart.getFullYear() === inst.periodStart.getFullYear() &&
      isNormal(p),
  );
  if (sameYear) return sameYear;

  return siblings.find(isNormal) ?? null;
}

function computeNormalEcheanceAmounts(
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
  scheduleInstallments: InstallmentAmountFields[],
  tauxTaxeDecimal: number,
): { primeHT: number; primeTTC: number; taxAmount: number } {
  if (inst.rcdAmount != null) {
    return computeNormalEcheanceAmounts(inst, tauxTaxeDecimal);
  }

  const reference = findReferenceNormalInstallment(inst, scheduleInstallments);
  if (reference) {
    return computeNormalEcheanceAmounts(reference, tauxTaxeDecimal);
  }

  const pj = inst.pjAmount ?? 0;
  const reprise = inst.resumeAmount ?? 0;
  const fees = inst.feesAmount ?? 0;
  const primeHT = round2(Math.max(0, inst.amountHT - pj - reprise - fees));
  const taxAmount = round2(primeHT * tauxTaxeDecimal);
  return { primeHT, primeTTC: round2(primeHT + taxAmount), taxAmount };
}

/**
 * Montants quittance bordereau : RCD + frais de fractionnement + taxe associée.
 * Les suppléments (PJ, reprise, frais de gestion) sont exclus sur demande.
 */
export function computeBordereauQuittanceAmounts(params: {
  inst: InstallmentAmountFields;
  modifieAlaMain: boolean;
  deductAnnualSupplements: boolean;
  schedulePayments: ScheduleSibling[];
  scheduleInstallments?: InstallmentAmountFields[];
  tauxTaxeDecimal: number | null;
}): { primeHT: number; primeTTC: number; taxAmount: number } {
  const {
    inst,
    modifieAlaMain,
    deductAnnualSupplements,
    schedulePayments,
    scheduleInstallments = [],
    tauxTaxeDecimal,
  } = params;

  if (
    shouldDeductAnnualSupplements(inst, schedulePayments, deductAnnualSupplements) &&
    tauxTaxeDecimal != null
  ) {
    return computeDeductedPremierEcheanceAmounts(
      inst,
      scheduleInstallments.length > 0 ? scheduleInstallments : [inst],
      tauxTaxeDecimal,
    );
  }

  if (modifieAlaMain) {
    return {
      primeHT: inst.amountHT,
      primeTTC: inst.amountTTC,
      taxAmount: inst.taxAmount,
    };
  }

  const rcdHt = resolveRcdAmount(inst);
  return {
    primeHT: rcdHt,
    primeTTC: round2(rcdHt + inst.taxAmount),
    taxAmount: inst.taxAmount,
  };
}
