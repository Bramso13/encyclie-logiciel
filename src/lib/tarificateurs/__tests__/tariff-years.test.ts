import { afterEach, describe, expect, it } from "vitest";
import {
  getBuiltinActivityRates,
  getTableauTaxByYear,
  getTaxeByRegion,
} from "../rcd";
import { setTariffOverlays } from "../tariff-registry";
import { applyIncrease, snapshotRatesForYear } from "../tariff-year-service";

describe("barèmes 2025/2026 et overlays >= 2027", () => {
  afterEach(() => {
    setTariffOverlays([]);
  });

  it("garde 2026 = 2025 × 1.035", () => {
    const rates2025 = getBuiltinActivityRates(2025);
    const rates2026 = getBuiltinActivityRates(2026);
    expect(rates2026).toHaveLength(rates2025.length);
    rates2025.forEach((row, index) => {
      expect(rates2026[index].rate).toBeCloseTo(row.rate * 1.035, 10);
    });
  });

  it("sans overlay, 2027 utilise les mêmes taux que 2026", () => {
    const rates2026 = getTableauTaxByYear(2026);
    const rates2027 = getTableauTaxByYear(2027);
    expect(rates2027).toEqual(rates2026);
  });

  it("un overlay 2027 ne change pas les taux 2025/2026", () => {
    const before2026 = getTableauTaxByYear(2026).map((row) => row.rate);
    setTariffOverlays([
      {
        year: 2027,
        activityRates: getBuiltinActivityRates(2026).map((row) => ({
          ...row,
          rate: row.rate * 2,
        })),
        territoryTaxes: { martinique: 0.5 },
        territoryPjTaxes: { martinique: 0.5 },
        degressivity: [],
      },
    ]);
    expect(getTableauTaxByYear(2026).map((row) => row.rate)).toEqual(before2026);
    expect(getTableauTaxByYear(2025)[0].rate).toBe(
      getBuiltinActivityRates(2025)[0].rate,
    );
    expect(getTableauTaxByYear(2027)[0].rate).toBeCloseTo(
      getBuiltinActivityRates(2026)[0].rate * 2,
      10,
    );
    expect(getTaxeByRegion("martinique")).toBe(0.09);
    expect(getTaxeByRegion("martinique", 2026)).toBe(0.09);
    expect(getTaxeByRegion("martinique", 2027)).toBe(0.5);
  });

  it("ignore un overlay posé sur 2025/2026", () => {
    setTariffOverlays([
      {
        year: 2026,
        activityRates: getBuiltinActivityRates(2026).map((row) => ({
          ...row,
          rate: 99,
        })),
        territoryTaxes: {},
        territoryPjTaxes: {},
        degressivity: [],
      },
    ]);
    expect(getTableauTaxByYear(2026)[0].rate).not.toBe(99);
  });

  it("copie N-1 + % sans toucher aux taxes territoriales", () => {
    const source = snapshotRatesForYear(2026);
    const next = applyIncrease(source, 2027, 3.5);
    expect(next.year).toBe(2027);
    expect(next.activityRates[0].rate).toBeCloseTo(
      source.activityRates[0].rate * 1.035,
      10,
    );
    expect(next.territoryTaxes).toEqual(source.territoryTaxes);
  });
});
