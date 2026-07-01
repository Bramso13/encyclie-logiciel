import { describe, expect, it } from "vitest";
import {
  computeBordereauQuittanceAmounts,
  hasAnnualSupplements,
  inferFraisGestion,
  isPremierPaiementAnnee,
  shouldDeductAnnualSupplements,
} from "../quittanceAmountsV2";

const TAUX = 0.09;
const FG = 1000;

function makeInst(overrides: Partial<{
  installmentNumber: number;
  periodStart: Date;
  periodEnd: Date;
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
    periodEnd: new Date("2026-03-31"),
    amountHT: 6000,
    amountTTC: 6540,
    taxAmount: 540,
    rcdAmount: 4000,
    pjAmount: 106,
    feesAmount: 100,
    resumeAmount: 0,
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
      amountHT: 5206,
      rcdAmount: 4000,
      pjAmount: 106,
      feesAmount: 100,
      resumeAmount: 0,
    });
    expect(inferFraisGestion(inst)).toBe(1000);
    expect(hasAnnualSupplements(inst)).toBe(true);
  });

  it("ne considère pas la reprise seule comme supplément bordereau", () => {
    const inst = makeInst({
      pjAmount: 0,
      resumeAmount: 500,
      amountHT: 4500,
      rcdAmount: 4000,
      feesAmount: 0,
    });
    expect(hasAnnualSupplements(inst)).toBe(false);
  });
});

describe("computeBordereauQuittanceAmounts", () => {
  it("éch. #1 sans prorata = montants éch. #2 (ligne CalculationTab normale)", () => {
    const inst1 = makeInst({
      installmentNumber: 1,
      amountHT: 5206,
      taxAmount: 383.2,
      amountTTC: 5589.2,
      pjAmount: 106,
      rcdAmount: 4000,
      feesAmount: 100,
    });
    const inst2 = makeInst({
      installmentNumber: 2,
      periodStart: new Date("2026-04-01"),
      periodEnd: new Date("2026-06-30"),
      amountHT: 4100,
      taxAmount: 369,
      amountTTC: 4469,
      pjAmount: 0,
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
      scheduleInstallments: [inst1, inst2],
      tauxTaxeDecimal: TAUX,
      fraisGestionGlobal: FG,
      formData: { periodicity: "trimestriel" },
    });

    expect(adjusted).toEqual({
      primeHT: 4100,
      taxAmount: 369,
      primeTTC: 4469,
    });
  });

  it("202377RCDWAK : sans prorata → TTC 358,82 (éch. #2 CalculationTab)", () => {
    const inst1 = makeInst({
      amountHT: 675.7,
      amountTTC: 697.8,
      taxAmount: 22.1,
      rcdAmount: 188.91,
      pjAmount: 106,
      feesAmount: 40,
      periodStart: new Date("2026-01-01"),
      periodEnd: new Date("2026-01-31"),
    });
    const inst2 = makeInst({
      installmentNumber: 2,
      periodStart: new Date("2026-02-01"),
      periodEnd: new Date("2026-02-28"),
      amountHT: 343.37,
      amountTTC: 358.82,
      taxAmount: 15.45,
      rcdAmount: 188.91,
      pjAmount: 0,
      feesAmount: 40,
    });

    const result = computeBordereauQuittanceAmounts({
      inst: inst1,
      modifieAlaMain: false,
      deductAnnualSupplements: true,
      schedulePayments: [],
      scheduleInstallments: [inst1, inst2],
      tauxTaxeDecimal: 0.045,
      fraisGestionGlobal: 226.69605,
      formData: { periodicity: "mensuel" },
    });

    expect(result).toEqual({
      primeHT: 343.37,
      taxAmount: 15.45,
      primeTTC: 358.82,
    });
  });

  it("202210RCDWAK23 : trimestre plein → montants éch. #2", () => {
    const inst1 = makeInst({
      amountHT: 1345.3,
      amountTTC: 1397.4,
      taxAmount: 52.1,
      rcdAmount: 917.22,
      pjAmount: 106,
      feesAmount: 40,
      periodStart: new Date("2026-01-01"),
      periodEnd: new Date("2026-03-31"),
    });
    const inst2 = makeInst({
      installmentNumber: 2,
      periodStart: new Date("2026-04-01"),
      periodEnd: new Date("2026-06-30"),
      amountHT: 991.07,
      amountTTC: 1035.67,
      taxAmount: 44.6,
      rcdAmount: 930.59,
      pjAmount: 0,
      feesAmount: 40,
    });

    const result = computeBordereauQuittanceAmounts({
      inst: inst1,
      modifieAlaMain: false,
      deductAnnualSupplements: true,
      schedulePayments: [],
      scheduleInstallments: [inst1, inst2],
      tauxTaxeDecimal: 0.045,
      fraisGestionGlobal: 356.23665,
      formData: { periodicity: "trimestriel" },
    });

    expect(result).toEqual({
      primeHT: 991.07,
      taxAmount: 44.6,
      primeTTC: 1035.67,
    });
  });

  it("2025158RCDFID prorata : Total HT/TTC éch. #1 − PJ − Frais Gestion", () => {
    const inst1 = makeInst({
      amountHT: 2678.91,
      amountTTC: 2766.3,
      taxAmount: 87.38,
      rcdAmount: 804.22,
      pjAmount: 106,
      feesAmount: 40,
      periodStart: new Date("2026-01-15"),
      periodEnd: new Date("2026-01-31"),
    });
    const inst2 = makeInst({
      installmentNumber: 2,
      periodStart: new Date("2026-02-01"),
      periodEnd: new Date("2026-02-28"),
      amountHT: 1506.51,
      amountTTC: 1642.1,
      taxAmount: 135.59,
      rcdAmount: 1466.51,
      pjAmount: 0,
      feesAmount: 40,
    });
    const fg = 1759.81183;

    const result = computeBordereauQuittanceAmounts({
      inst: inst1,
      modifieAlaMain: false,
      deductAnnualSupplements: true,
      schedulePayments: [],
      scheduleInstallments: [inst1, inst2],
      tauxTaxeDecimal: TAUX,
      fraisGestionGlobal: fg,
      formData: { periodicity: "mensuel" },
    });

    expect(result).toEqual({
      primeHT: 813.1,
      taxAmount: 87.39,
      primeTTC: 900.49,
    });
  });

  it("éch. #1 prorata (période partielle) : retrait PJ/FG sur la ligne éch. #1", () => {
    const inst1 = makeInst({
      amountHT: 3000,
      taxAmount: 200,
      amountTTC: 3200,
      rcdAmount: 2000,
      pjAmount: 106,
      feesAmount: 50,
      periodStart: new Date("2026-04-01"),
      periodEnd: new Date("2026-05-15"),
    });
    const inst2 = makeInst({
      installmentNumber: 2,
      periodStart: new Date("2026-07-01"),
      periodEnd: new Date("2026-09-30"),
      amountHT: 4100,
      taxAmount: 369,
      amountTTC: 4469,
      rcdAmount: 4000,
      pjAmount: 0,
    });

    const ech1 = computeBordereauQuittanceAmounts({
      inst: inst1,
      modifieAlaMain: false,
      deductAnnualSupplements: true,
      schedulePayments: [],
      scheduleInstallments: [inst1, inst2],
      tauxTaxeDecimal: TAUX,
      fraisGestionGlobal: FG,
      formData: { periodicity: "trimestriel" },
    });
    const ech2 = computeBordereauQuittanceAmounts({
      inst: inst2,
      modifieAlaMain: false,
      deductAnnualSupplements: true,
      schedulePayments: [],
      scheduleInstallments: [inst1, inst2],
      tauxTaxeDecimal: TAUX,
      fraisGestionGlobal: FG,
      formData: { periodicity: "trimestriel" },
    });
    expect(ech1).toEqual({
      primeHT: 1894,
      taxAmount: 200,
      primeTTC: 2094,
    });
    expect(ech1.primeHT).not.toBe(ech2.primeHT);
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
