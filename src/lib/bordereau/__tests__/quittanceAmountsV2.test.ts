import { describe, expect, it } from "vitest";
import {
  computeBordereauQuittanceAmounts,
  hasAnnualSupplements,
  inferFraisGestion,
  isPremierPaiementAnnee,
  shouldDeductAnnualSupplements,
} from "../quittanceAmountsV2";

const TAUX = 0.09;

function makeInst(overrides: Partial<{
  installmentNumber: number;
  periodStart: Date;
  amountHT: number;
  amountTTC: number;
  taxAmount: number;
  rcdAmount: number | null;
  pjAmount: number | null;
  feesAmount: number | null;
  resumeAmount: number | null;
}> = {}) {
  return {
    installmentNumber: 1,
    periodStart: new Date("2026-01-01"),
    amountHT: 6000,
    amountTTC: 6540,
    taxAmount: 540,
    rcdAmount: 4000,
    pjAmount: 106,
    feesAmount: 100,
    resumeAmount: 500,
    ...overrides,
  };
}

describe("isPremierPaiementAnnee", () => {
  const schedule = [
    { installmentNumber: 1, periodStart: new Date("2026-01-01") },
    { installmentNumber: 2, periodStart: new Date("2026-04-01") },
    { installmentNumber: 3, periodStart: new Date("2026-07-01") },
    { installmentNumber: 4, periodStart: new Date("2026-10-01") },
    { installmentNumber: 5, periodStart: new Date("2027-01-01") },
  ];

  it("identifie la 1re échéance de chaque année civile", () => {
    expect(isPremierPaiementAnnee(schedule[0], schedule)).toBe(true);
    expect(isPremierPaiementAnnee(schedule[1], schedule)).toBe(false);
    expect(isPremierPaiementAnnee(schedule[4], schedule)).toBe(true);
  });
});

describe("inferFraisGestion", () => {
  it("déduit frais de gestion implicites du HT", () => {
    const inst = makeInst({
      amountHT: 5706,
      rcdAmount: 4000,
      pjAmount: 106,
      feesAmount: 100,
      resumeAmount: 500,
    });
    expect(inferFraisGestion(inst)).toBe(1000);
    expect(hasAnnualSupplements(inst)).toBe(true);
  });
});

describe("computeBordereauQuittanceAmounts", () => {
  it("aligne la 1re échéance annuelle sur une échéance standard (ex. 4800 TTC)", () => {
    const inst1 = makeInst({
      installmentNumber: 1,
      periodStart: new Date("2026-01-01"),
      rcdAmount: 4000,
      feesAmount: 100,
      pjAmount: 106,
      resumeAmount: 500,
      amountHT: 5706,
      taxAmount: 378.54,
      amountTTC: 6084.54,
    });
    const inst2 = makeInst({
      installmentNumber: 2,
      periodStart: new Date("2026-04-01"),
      rcdAmount: 4000,
      feesAmount: 100,
      pjAmount: 0,
      resumeAmount: 0,
      amountHT: 4100,
      taxAmount: 369,
      amountTTC: 4469,
    });
    const schedule = [
      { installmentNumber: 1, periodStart: inst1.periodStart },
      { installmentNumber: 2, periodStart: inst2.periodStart },
    ];

    const adjusted = computeBordereauQuittanceAmounts({
      inst: inst1,
      modifieAlaMain: false,
      deductAnnualSupplements: true,
      schedulePayments: schedule,
      tauxTaxeDecimal: TAUX,
    });

    expect(adjusted).toEqual({
      primeHT: 4100,
      taxAmount: 369,
      primeTTC: 4469,
    });
  });

  it("n'ajuste pas si l'option est désactivée", () => {
    const inst = makeInst();
    const legacy = computeBordereauQuittanceAmounts({
      inst,
      modifieAlaMain: false,
      deductAnnualSupplements: false,
      schedulePayments: [],
      tauxTaxeDecimal: TAUX,
    });
    expect(legacy.primeHT).toBe(4000);
    expect(legacy.primeTTC).toBe(4540);
  });

  it("ne met pas à 0 une échéance sans détail de décomposition (données anciennes)", () => {
    const inst = makeInst({
      rcdAmount: null,
      pjAmount: null,
      feesAmount: null,
      resumeAmount: null,
      amountHT: 4800,
      taxAmount: 432,
      amountTTC: 5232,
    });
    const result = computeBordereauQuittanceAmounts({
      inst,
      modifieAlaMain: false,
      deductAnnualSupplements: true,
      schedulePayments: [],
      tauxTaxeDecimal: TAUX,
    });
    expect(result.primeHT).toBe(4800);
    expect(result.primeTTC).toBe(5232);
    expect(result.taxAmount).toBe(432);
  });

  it("déduit avec rcdAmount absent mais autres composantes renseignées", () => {
    const inst1 = makeInst({
      rcdAmount: null,
      pjAmount: 106,
      feesAmount: 100,
      resumeAmount: 500,
      amountHT: 5706,
      taxAmount: 378.54,
      amountTTC: 6084.54,
    });
    const inst2 = makeInst({
      installmentNumber: 2,
      periodStart: new Date("2026-04-01"),
      rcdAmount: 4000,
      pjAmount: 0,
      resumeAmount: 0,
      feesAmount: 100,
      amountHT: 4100,
      taxAmount: 369,
      amountTTC: 4469,
    });
    const schedule = [
      { installmentNumber: 1, periodStart: inst1.periodStart },
      { installmentNumber: 2, periodStart: inst2.periodStart },
    ];
    const result = computeBordereauQuittanceAmounts({
      inst: inst1,
      modifieAlaMain: false,
      deductAnnualSupplements: true,
      schedulePayments: schedule,
      scheduleInstallments: [inst1, inst2],
      tauxTaxeDecimal: TAUX,
    });
    expect(result).toEqual({
      primeHT: 4100,
      taxAmount: 369,
      primeTTC: 4469,
    });
  });

  it("applique la déduction aux devis modifieAlaMain quand l'option est active", () => {
    const inst = makeInst();
    expect(shouldDeductAnnualSupplements(inst, [], true)).toBe(true);

    const adjusted = computeBordereauQuittanceAmounts({
      inst,
      modifieAlaMain: true,
      deductAnnualSupplements: true,
      schedulePayments: [],
      tauxTaxeDecimal: TAUX,
    });
    expect(adjusted.primeHT).toBe(4100);
    expect(adjusted.primeTTC).toBe(4469);
  });

  it("conserve amountHT/TTC bruts pour modifieAlaMain sans option", () => {
    const inst = makeInst();
    const result = computeBordereauQuittanceAmounts({
      inst,
      modifieAlaMain: true,
      deductAnnualSupplements: false,
      schedulePayments: [],
      tauxTaxeDecimal: TAUX,
    });
    expect(result.primeHT).toBe(inst.amountHT);
    expect(result.primeTTC).toBe(inst.amountTTC);
  });
});
