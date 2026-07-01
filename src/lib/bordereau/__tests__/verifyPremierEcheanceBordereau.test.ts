import { describe, expect, it } from "vitest";
import {
  formatExportVerificationReport,
  verifyScheduleExportEcheance1Vs2,
} from "../verifyBordereauExportAlignment";
import type { InstallmentAmountFields } from "../quittanceAmountsV2";

const TAUX = 0.09;

function inst(
  n: number,
  periodStart: string,
  overrides: Partial<InstallmentAmountFields> = {},
): InstallmentAmountFields {
  return {
    installmentNumber: n,
    periodStart: new Date(periodStart),
    amountHT: 4100,
    amountTTC: 4469,
    taxAmount: 369,
    rcdAmount: 4000,
    pjAmount: 0,
    feesAmount: 100,
    resumeAmount: 0,
    ...overrides,
  };
}

describe("verifyScheduleExportEcheance1Vs2", () => {
  it("OK quand la 1re échéance annuelle alignée sur la suivante", () => {
    const installments = [
      inst(1, "2026-01-01", {
        amountHT: 5706,
        amountTTC: 6084.54,
        taxAmount: 378.54,
        pjAmount: 106,
        resumeAmount: 500,
        rcdAmount: 4000,
      }),
      inst(2, "2026-04-01"),
    ];

    const issues = verifyScheduleExportEcheance1Vs2({
      quoteReference: "TEST-001",
      installments,
      modifieAlaMain: false,
      tauxTaxeDecimal: TAUX,
    });

    expect(issues).toEqual([]);
  });

  it("signale l'absence de l'échéance #2", () => {
    const installments = [
      inst(1, "2026-01-01", {
        amountHT: 5706,
        amountTTC: 6084.54,
        taxAmount: 378.54,
        pjAmount: 106,
        resumeAmount: 500,
        rcdAmount: 4000,
      }),
    ];

    const issues = verifyScheduleExportEcheance1Vs2({
      quoteReference: "TEST-002",
      installments,
      modifieAlaMain: false,
      tauxTaxeDecimal: TAUX,
    });

    expect(issues).toHaveLength(1);
    expect(issues[0].reason).toBe("PAS_ECHEANCE_2");
  });

  it("ignore les échéances #1 sans PJ ni frais de gestion", () => {
    const installments = [inst(1, "2026-01-01"), inst(2, "2026-04-01")];

    const issues = verifyScheduleExportEcheance1Vs2({
      quoteReference: "TEST-003",
      installments,
      modifieAlaMain: false,
      tauxTaxeDecimal: TAUX,
    });

    expect(issues).toEqual([]);
  });
});

describe("formatExportVerificationReport", () => {
  it("affiche OK sans écarts", () => {
    const report = formatExportVerificationReport({
      periodLabel: "06/2025",
      schedulesChecked: 3,
      ech1WithSupplementsChecked: 2,
      scheduleIssues: [],
      csvRowsTotal: 10,
      csvIssues: [],
    });
    expect(report).toContain("OK");
    expect(report).toContain("06/2025");
  });
});
