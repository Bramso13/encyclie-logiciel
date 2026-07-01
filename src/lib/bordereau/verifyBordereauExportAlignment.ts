import type { FidelidadeQuittancesRow } from "./types";
import {
  detectEch1Prorata,
} from "./prorata";
import {
  computeBordereauQuittanceAmounts,
  findSecondInstallment,
  hasAnnualSupplements,
  type InstallmentAmountFields,
} from "./quittanceAmountsV2";

const TAUX_COMMISSION = 0.24;
const AMOUNT_TOLERANCE = 0.01;

export interface BordereauQuittanceAmounts {
  primeHT: number;
  primeTTC: number;
  taxAmount: number;
  commission: number;
}

export interface ScheduleContext {
  quoteReference: string;
  installments: InstallmentAmountFields[];
  modifieAlaMain: boolean;
  tauxTaxeDecimal: number | null;
  fraisGestionGlobal: number | null;
  formData: Record<string, unknown>;
}

export type VerificationSeverity = "error" | "info";

export interface ScheduleExportIssue {
  severity: VerificationSeverity;
  quoteReference: string;
  reason: "MONTANTS_DIFFERENTS" | "ECART_PRORATA" | "TAUX_TAXE_MANQUANT";
  ech1: BordereauQuittanceAmounts;
  ech2: BordereauQuittanceAmounts | null;
  diffs: Partial<Record<keyof BordereauQuittanceAmounts, number>>;
  prorata: boolean;
}

export interface CsvExportIssue {
  severity: VerificationSeverity;
  quoteReference: string;
  installmentNumber: number;
  reason:
    | "CSV_NE_CORRESPOND_PAS"
    | "ECH1_DIFFERE_REFERENCE_ECH2"
    | "ECART_PRORATA"
    | "INSTALLMENT_INTROUVABLE"
    | "TAUX_TAXE_MANQUANT";
  csv: BordereauQuittanceAmounts;
  expected: BordereauQuittanceAmounts | null;
  referenceEch2: BordereauQuittanceAmounts | null;
  diffs: Partial<Record<keyof BordereauQuittanceAmounts, number>>;
  identifiantQuittance: string;
  prorata: boolean;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function near(a: number, b: number): boolean {
  return Math.abs(a - b) <= AMOUNT_TOLERANCE;
}

function commissionFromPrimeHT(primeHT: number): number {
  return round2(primeHT * TAUX_COMMISSION);
}

export function parseInstallmentNumberFromQuittanceId(
  identifiantPolice: string,
  identifiantQuittance: string,
): number | null {
  if (!identifiantQuittance.startsWith(identifiantPolice)) return null;
  const suffix = identifiantQuittance.slice(identifiantPolice.length);
  const match = suffix.match(/^[QMS]?(\d+)-\d{4}-(EM|RG|RL)$/);
  return match ? parseInt(match[1], 10) : null;
}

export function amountsFromExportRow(
  row: Pick<
    FidelidadeQuittancesRow,
    "PRIME_HT" | "PRIME_TTC" | "TAXES" | "COMMISSIONS"
  >,
): BordereauQuittanceAmounts {
  return {
    primeHT: round2(parseFloat(row.PRIME_HT)),
    primeTTC: round2(parseFloat(row.PRIME_TTC)),
    taxAmount: round2(parseFloat(row.TAXES)),
    commission: round2(parseFloat(row.COMMISSIONS)),
  };
}

export function computeExportAmountsForInstallment(params: {
  inst: InstallmentAmountFields;
  modifieAlaMain: boolean;
  scheduleInstallments: InstallmentAmountFields[];
  tauxTaxeDecimal: number | null;
  fraisGestionGlobal?: number | null;
  formData?: Record<string, unknown>;
}): BordereauQuittanceAmounts {
  const schedulePayments = params.scheduleInstallments.map((p) => ({
    installmentNumber: p.installmentNumber,
    periodStart: p.periodStart,
  }));
  const { primeHT, primeTTC, taxAmount } = computeBordereauQuittanceAmounts({
    inst: params.inst,
    modifieAlaMain: params.modifieAlaMain,
    deductAnnualSupplements: true,
    schedulePayments,
    scheduleInstallments: params.scheduleInstallments,
    tauxTaxeDecimal: params.tauxTaxeDecimal,
    fraisGestionGlobal: params.fraisGestionGlobal,
    formData: params.formData,
  });
  return {
    primeHT,
    primeTTC,
    taxAmount,
    commission: commissionFromPrimeHT(primeHT),
  };
}

function diffAmounts(
  a: BordereauQuittanceAmounts,
  b: BordereauQuittanceAmounts,
): Partial<Record<keyof BordereauQuittanceAmounts, number>> {
  const diffs: Partial<Record<keyof BordereauQuittanceAmounts, number>> = {};
  for (const key of [
    "primeHT",
    "primeTTC",
    "taxAmount",
    "commission",
  ] as const) {
    if (!near(a[key], b[key])) {
      diffs[key] = round2(a[key] - b[key]);
    }
  }
  return diffs;
}

export function detectProrataForEch1(ctx: ScheduleContext): boolean {
  const ech1 = ctx.installments.find((p) => p.installmentNumber === 1);
  if (!ech1?.periodStart || !ech1.periodEnd) return false;
  return detectEch1Prorata(ech1, ctx.formData);
}

/**
 * Vérifie export éch. #1 (CalculationTab − PJ/FG) vs export éch. #2 (BDD).
 * Écart = INFO si prorata, ERROR sinon.
 */
export function verifyScheduleExportEcheance1Vs2(
  ctx: ScheduleContext,
): ScheduleExportIssue[] {
  const { quoteReference, installments, modifieAlaMain, tauxTaxeDecimal } = ctx;
  const ech1 = installments.find((p) => p.installmentNumber === 1);
  if (!ech1 || !hasAnnualSupplements(ech1)) return [];

  const prorata = detectProrataForEch1(ctx);

  const ech1Export = computeExportAmountsForInstallment({
    inst: ech1,
    modifieAlaMain,
    scheduleInstallments: installments,
    tauxTaxeDecimal,
    fraisGestionGlobal: ctx.fraisGestionGlobal,
    formData: ctx.formData,
  });

  if (tauxTaxeDecimal == null) {
    return [
      {
        severity: "error",
        quoteReference,
        reason: "TAUX_TAXE_MANQUANT",
        ech1: ech1Export,
        ech2: null,
        diffs: {},
        prorata,
      },
    ];
  }

  const ech2Inst = findSecondInstallment(installments);
  if (!ech2Inst) return [];

  const ech2Export = computeExportAmountsForInstallment({
    inst: ech2Inst,
    modifieAlaMain,
    scheduleInstallments: installments,
    tauxTaxeDecimal,
    fraisGestionGlobal: ctx.fraisGestionGlobal,
    formData: ctx.formData,
  });

  const diffs = diffAmounts(ech1Export, ech2Export);
  if (Object.keys(diffs).length === 0) return [];

  return [
    {
      severity: prorata ? "info" : "error",
      quoteReference,
      reason: prorata ? "ECART_PRORATA" : "MONTANTS_DIFFERENTS",
      ech1: ech1Export,
      ech2: ech2Export,
      diffs,
      prorata,
    },
  ];
}

export function verifyCsvRowsMatchScheduleExport(
  rows: FidelidadeQuittancesRow[],
  schedulesByPolice: Map<string, ScheduleContext>,
): CsvExportIssue[] {
  const issues: CsvExportIssue[] = [];

  for (const row of rows) {
    const quoteReference = row.IDENTIFIANT_POLICE;
    const installmentNumber = parseInstallmentNumberFromQuittanceId(
      quoteReference,
      row.IDENTIFIANT_QUITTANCE,
    );
    if (installmentNumber == null) continue;

    const ctx = schedulesByPolice.get(quoteReference);
    const csv = amountsFromExportRow(row);

    if (!ctx) {
      issues.push({
        severity: "error",
        quoteReference,
        installmentNumber,
        reason: "INSTALLMENT_INTROUVABLE",
        csv,
        expected: null,
        referenceEch2: null,
        diffs: {},
        identifiantQuittance: row.IDENTIFIANT_QUITTANCE,
        prorata: false,
      });
      continue;
    }

    if (ctx.tauxTaxeDecimal == null) {
      issues.push({
        severity: "error",
        quoteReference,
        installmentNumber,
        reason: "TAUX_TAXE_MANQUANT",
        csv,
        expected: null,
        referenceEch2: null,
        diffs: {},
        identifiantQuittance: row.IDENTIFIANT_QUITTANCE,
        prorata: false,
      });
      continue;
    }

    const inst = ctx.installments.find(
      (p) => p.installmentNumber === installmentNumber,
    );
    if (!inst) {
      issues.push({
        severity: "error",
        quoteReference,
        installmentNumber,
        reason: "INSTALLMENT_INTROUVABLE",
        csv,
        expected: null,
        referenceEch2: null,
        diffs: {},
        identifiantQuittance: row.IDENTIFIANT_QUITTANCE,
        prorata: false,
      });
      continue;
    }

    const expected = computeExportAmountsForInstallment({
      inst,
      modifieAlaMain: ctx.modifieAlaMain,
      scheduleInstallments: ctx.installments,
      tauxTaxeDecimal: ctx.tauxTaxeDecimal,
      fraisGestionGlobal: ctx.fraisGestionGlobal,
      formData: ctx.formData,
    });

    const csvDiffs = diffAmounts(csv, expected);
    if (Object.keys(csvDiffs).length > 0) {
      issues.push({
        severity: "error",
        quoteReference,
        installmentNumber,
        reason: "CSV_NE_CORRESPOND_PAS",
        csv,
        expected,
        referenceEch2: null,
        diffs: csvDiffs,
        identifiantQuittance: row.IDENTIFIANT_QUITTANCE,
        prorata: false,
      });
      continue;
    }

    if (installmentNumber === 1 && hasAnnualSupplements(inst)) {
      const ech2Inst = findSecondInstallment(ctx.installments);
      if (!ech2Inst) continue;

      const prorata = detectProrataForEch1(ctx);
      const referenceEch2 = computeExportAmountsForInstallment({
        inst: ech2Inst,
        modifieAlaMain: ctx.modifieAlaMain,
        scheduleInstallments: ctx.installments,
        tauxTaxeDecimal: ctx.tauxTaxeDecimal,
        fraisGestionGlobal: ctx.fraisGestionGlobal,
        formData: ctx.formData,
      });

      const refDiffs = diffAmounts(csv, referenceEch2);
      if (Object.keys(refDiffs).length > 0) {
        issues.push({
          severity: prorata ? "info" : "error",
          quoteReference,
          installmentNumber,
          reason: prorata ? "ECART_PRORATA" : "ECH1_DIFFERE_REFERENCE_ECH2",
          csv,
          expected,
          referenceEch2,
          diffs: refDiffs,
          identifiantQuittance: row.IDENTIFIANT_QUITTANCE,
          prorata,
        });
      }
    }
  }

  return issues;
}

export function countVerificationErrors(
  scheduleIssues: ScheduleExportIssue[],
  csvIssues: CsvExportIssue[],
): number {
  return (
    scheduleIssues.filter((i) => i.severity === "error").length +
    csvIssues.filter((i) => i.severity === "error").length
  );
}

function formatAmounts(
  label: string,
  amounts: BordereauQuittanceAmounts,
): string {
  return `${label} → HT ${amounts.primeHT} | TTC ${amounts.primeTTC} | taxes ${amounts.taxAmount} | comm. ${amounts.commission}`;
}

function formatDiffs(
  diffs: Partial<Record<keyof BordereauQuittanceAmounts, number>>,
): string {
  return Object.entries(diffs)
    .map(([k, v]) => `${k} ${v! >= 0 ? "+" : ""}${v}`)
    .join(", ");
}

function formatIssueBlock(
  issues: Array<ScheduleExportIssue | CsvExportIssue>,
  label: string,
): string[] {
  if (issues.length === 0) return [`OK — ${label}`];

  const lines = [`${issues.length} signalement(s)`, ""];
  for (const issue of issues) {
    const tag = issue.severity === "info" ? "INFO" : "ERREUR";
    if ("installmentNumber" in issue) {
      lines.push(
        `[${tag}/${issue.reason}] ${issue.quoteReference} éch. #${issue.installmentNumber}${issue.prorata ? " (prorata)" : ""}`,
      );
      lines.push(`  ${formatAmounts("CSV", issue.csv)}`);
      if (issue.expected) {
        lines.push(`  ${formatAmounts("Attendu éch. courante", issue.expected)}`);
      }
      if (issue.referenceEch2) {
        lines.push(
          `  ${formatAmounts("Réf. éch. #2 BDD", issue.referenceEch2)}`,
        );
      }
    } else {
      lines.push(
        `[${tag}/${issue.reason}] ${issue.quoteReference}${issue.prorata ? " (prorata)" : ""}`,
      );
      lines.push(`  ${formatAmounts("Export éch. #1", issue.ech1)}`);
      if (issue.ech2) {
        lines.push(`  ${formatAmounts("Export éch. #2 BDD", issue.ech2)}`);
      }
    }
    if (Object.keys(issue.diffs).length > 0) {
      lines.push(`  Écarts : ${formatDiffs(issue.diffs)}`);
    }
    lines.push("");
  }
  return lines;
}

export function formatExportVerificationReport(params: {
  periodLabel: string;
  schedulesChecked: number;
  ech1WithSupplementsChecked: number;
  scheduleIssues: ScheduleExportIssue[];
  csvRowsTotal: number;
  csvIssues: CsvExportIssue[];
}): string {
  const scheduleErrors = params.scheduleIssues.filter(
    (i) => i.severity === "error",
  );
  const scheduleInfos = params.scheduleIssues.filter(
    (i) => i.severity === "info",
  );
  const csvErrors = params.csvIssues.filter((i) => i.severity === "error");
  const csvInfos = params.csvIssues.filter((i) => i.severity === "info");

  const lines: string[] = [
    "=== Vérification bordereau — éch. #1 (CalculationTab − PJ/FG) ===",
    `Période : ${params.periodLabel}`,
    `Échéanciers : ${params.schedulesChecked} | Éch. #1 avec PJ/FG : ${params.ech1WithSupplementsChecked}`,
    `Lignes exportées : ${params.csvRowsTotal}`,
    `Erreurs : ${scheduleErrors.length + csvErrors.length} | Infos prorata : ${scheduleInfos.length + csvInfos.length}`,
    "",
    "--- Éch. #1 export vs éch. #2 en base (INFO si prorata) ---",
    ...formatIssueBlock(
      params.scheduleIssues,
      "aucun écart bloquant sur l’échéancier.",
    ),
    "",
    "--- Lignes CSV vs montants attendus (échéancier BDD) ---",
    ...formatIssueBlock(
      params.csvIssues,
      "toutes les lignes CSV correspondent à l’échéancier.",
    ),
  ];

  return lines.join("\n");
}
