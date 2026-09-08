import { describe, expect, it } from "vitest";
import { aggravationAmount, premiumCallTitle } from "../aggravation";
import {
  computeDebitNoteLines,
  debitNoteTotals,
} from "../debit-note";

describe("aggravation 50 %", () => {
  it("applique prime HT × 50 % × (1 + frais + taxe)", () => {
    expect(aggravationAmount(10000, 50, 0.1, 0.09)).toBe(5950);
    expect(premiumCallTitle(2027, true)).toBe("Appel de prime 2027 aggravé");
    expect(premiumCallTitle(2026, false)).toBe("Appel de prime 2026");
  });
});

describe("note de débit SET / Excel", () => {
  it("reproduit les 4 lignes Excel et la commission totale 2 912,84 €", () => {
    const lines = computeDebitNoteLines([
      {
        id: "e1",
        installmentNumber: 1,
        dueDate: "2026-01-01",
        amountHT: 10285,
        amountTTC: 10619.75,
        rcdAmount: 7282.11,
        pjAmount: 106,
        feesAmount: 2896.8,
      },
      {
        id: "e2",
        installmentNumber: 2,
        dueDate: "2026-04-01",
        amountHT: 7282.11,
        amountTTC: 7609.8,
        rcdAmount: 7282.11,
      },
      {
        id: "e3",
        installmentNumber: 3,
        dueDate: "2026-07-01",
        amountHT: 7282.11,
        amountTTC: 7609.8,
        rcdAmount: 7282.11,
      },
      {
        id: "e4",
        installmentNumber: 4,
        dueDate: "2026-10-01",
        amountHT: 7282.11,
        amountTTC: 7609.8,
        rcdAmount: 7282.11,
      },
    ]);

    expect(lines).toHaveLength(4);
    expect(lines.map((line) => line.primeRcdHT)).toEqual([
      7282.11, 7282.11, 7282.11, 7282.11,
    ]);
    expect(lines.map((line) => line.commission)).toEqual([
      728.21, 728.21, 728.21, 728.21,
    ]);
    expect(lines[0].netHorsCom).toBe(9891.54);
    expect(lines[1].netHorsCom).toBe(6881.59);
    expect(lines[2].netHorsCom).toBe(6881.59);
    expect(lines[3].netHorsCom).toBe(6881.59);
    expect(debitNoteTotals(lines).totalCommission).toBe(2912.84);
  });
});
