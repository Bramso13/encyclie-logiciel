import {
  computeBordereauQuittanceAmounts,
  findReferenceNormalInstallment,
  hasAnnualSupplements,
  isPremierPaiementAnnee,
  type InstallmentAmountFields,
  type ScheduleSibling,
} from "./quittanceAmountsV2";

const TAUX_COMMISSION = 0.24;
const AMOUNT_TOLERANCE = 0.01;

export interface BordereauQuittanceAmounts {
  primeHT: number;
  primeTTC: number;
  taxAmount: number;
  commission: number;
}

export interface PremierEcheanceVerificationIssue {
  quoteReference: string;
  premierInstallmentNumber: number;
  premierPeriodStart: string;
  referenceInstallmentNumber: number | null;
  reason:
    | "MONTANTS_DIFFERENTS"
    | "PAS_DE_REFERENCE"
    | "TAUX_TAXE_MANQUANT";
  premier: BordereauQuittanceAmounts;
  reference: BordereauQuittanceAmounts | null;
  diffs: Partial<Record<keyof BordereauQuittanceAmounts, number>>;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function near(a: number, b: number): boolean {
  return Math.abs(a - b) <= AMOUNT_TOLERANCE;
}

function toScheduleRefs(installments: InstallmentAmountFields[]): ScheduleSibling[] {
  return installments.map((p) => ({
    installmentNumber: p.installmentNumber,
    periodStart: p.periodStart,
  }));
}

export function computeBordereauQuittanceAmountsWithCommission(params: {
  inst: InstallmentAmountFields;
  modifieAlaMain: boolean;
  scheduleInstallments: InstallmentAmountFields[];
  tauxTaxeDecimal: number | null;
}): BordereauQuittanceAmounts {
  const schedulePayments = toScheduleRefs(params.scheduleInstallments);
  const { primeHT, primeTTC, taxAmount } = computeBordereauQuittanceAmounts({
    inst: params.inst,
    modifieAlaMain: params.modifieAlaMain,
    deductAnnualSupplements: true,
    schedulePayments,
    scheduleInstallments: params.scheduleInstallments,
    tauxTaxeDecimal: params.tauxTaxeDecimal,
  });
  return {
    primeHT,
    primeTTC,
    taxAmount,
    commission: round2(primeHT * TAUX_COMMISSION),
  };
}

function diffAmounts(
  premier: BordereauQuittanceAmounts,
  reference: BordereauQuittanceAmounts,
): Partial<Record<keyof BordereauQuittanceAmounts, number>> {
  const diffs: Partial<Record<keyof BordereauQuittanceAmounts, number>> = {};
  for (const key of [
    "primeHT",
    "primeTTC",
    "taxAmount",
    "commission",
  ] as const) {
    if (!near(premier[key], reference[key])) {
      diffs[key] = round2(premier[key] - reference[key]);
    }
  }
  return diffs;
}

/**
 * Vérifie que chaque 1re échéance annuelle (avec suppléments) d'un échéancier
 * produit les mêmes montants bordereau qu'une échéance « normale » de référence,
 * avec l'option deductPremierEcheanceSupplements activée.
 */
export function verifySchedulePremierEcheances(params: {
  quoteReference: string;
  installments: InstallmentAmountFields[];
  modifieAlaMain: boolean;
  tauxTaxeDecimal: number | null;
}): PremierEcheanceVerificationIssue[] {
  const { quoteReference, installments, modifieAlaMain, tauxTaxeDecimal } =
    params;
  const schedulePayments = toScheduleRefs(installments);
  const issues: PremierEcheanceVerificationIssue[] = [];

  for (const inst of installments) {
    if (!isPremierPaiementAnnee(inst, schedulePayments)) continue;
    if (!hasAnnualSupplements(inst)) continue;

    if (tauxTaxeDecimal == null) {
      issues.push({
        quoteReference,
        premierInstallmentNumber: inst.installmentNumber,
        premierPeriodStart: inst.periodStart.toISOString().slice(0, 10),
        referenceInstallmentNumber: null,
        reason: "TAUX_TAXE_MANQUANT",
        premier: computeBordereauQuittanceAmountsWithCommission({
          inst,
          modifieAlaMain,
          scheduleInstallments: installments,
          tauxTaxeDecimal,
        }),
        reference: null,
        diffs: {},
      });
      continue;
    }

    const reference = findReferenceNormalInstallment(inst, installments);
    const premier = computeBordereauQuittanceAmountsWithCommission({
      inst,
      modifieAlaMain,
      scheduleInstallments: installments,
      tauxTaxeDecimal,
    });

    if (!reference) {
      issues.push({
        quoteReference,
        premierInstallmentNumber: inst.installmentNumber,
        premierPeriodStart: inst.periodStart.toISOString().slice(0, 10),
        referenceInstallmentNumber: null,
        reason: "PAS_DE_REFERENCE",
        premier,
        reference: null,
        diffs: {},
      });
      continue;
    }

    const referenceAmounts = computeBordereauQuittanceAmountsWithCommission({
      inst: reference,
      modifieAlaMain,
      scheduleInstallments: installments,
      tauxTaxeDecimal,
    });

    const diffs = diffAmounts(premier, referenceAmounts);
    if (Object.keys(diffs).length > 0) {
      issues.push({
        quoteReference,
        premierInstallmentNumber: inst.installmentNumber,
        premierPeriodStart: inst.periodStart.toISOString().slice(0, 10),
        referenceInstallmentNumber: reference.installmentNumber,
        reason: "MONTANTS_DIFFERENTS",
        premier,
        reference: referenceAmounts,
        diffs,
      });
    }
  }

  return issues;
}

export function formatVerificationReport(params: {
  periodLabel: string;
  schedulesChecked: number;
  premierEcheancesChecked: number;
  issues: PremierEcheanceVerificationIssue[];
}): string {
  const lines: string[] = [
    "=== Vérification 1res échéances annuelles (bordereau) ===",
    `Période : ${params.periodLabel}`,
    `Échéanciers vérifiés : ${params.schedulesChecked}`,
    `1res échéances annuelles avec suppléments : ${params.premierEcheancesChecked}`,
    "",
  ];

  if (params.issues.length === 0) {
    lines.push("OK — toutes les 1res échéances annuelles alignées sur l'échéance de référence.");
    return lines.join("\n");
  }

  lines.push(`Écarts détectés : ${params.issues.length}`, "");

  for (const issue of params.issues) {
    lines.push(`[${issue.reason}] ${issue.quoteReference} — éch. #${issue.premierInstallmentNumber} (${issue.premierPeriodStart})`);
    if (issue.referenceInstallmentNumber != null) {
      lines.push(`  Référence : éch. #${issue.referenceInstallmentNumber}`);
    }
    lines.push(
      `  Premier  → HT ${issue.premier.primeHT} | TTC ${issue.premier.primeTTC} | taxes ${issue.premier.taxAmount} | comm. ${issue.premier.commission}`,
    );
    if (issue.reference) {
      lines.push(
        `  Référence → HT ${issue.reference.primeHT} | TTC ${issue.reference.primeTTC} | taxes ${issue.reference.taxAmount} | comm. ${issue.reference.commission}`,
      );
    }
    if (Object.keys(issue.diffs).length > 0) {
      lines.push(
        `  Écarts : ${Object.entries(issue.diffs)
          .map(([k, v]) => `${k} ${v! >= 0 ? "+" : ""}${v}`)
          .join(", ")}`,
      );
    }
    lines.push("");
  }

  return lines.join("\n");
}
