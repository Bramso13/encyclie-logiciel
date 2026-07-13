import { describe, expect, it } from "vitest";
import { computePrimesTableAmounts } from "../primes-table-calculations";

describe("computePrimesTableAmounts", () => {
  it("affiche la PJ en HT (106) et calcule le TTC avec le taux PJ", () => {
    const amounts = computePrimesTableAmounts(
      [
        {
          rcd: 6521.45,
          pj: 106,
          fraisGestion: 1087.88,
          taxe: 629.93,
          totalTTC: 8665.26,
        },
      ],
      "martinique"
    );

    expect(amounts.primePJHT).toBe(106);
    expect(amounts.primePJTaxes).toBeCloseTo(14.2, 2);
    expect(amounts.primePJTTC).toBeCloseTo(120.2, 2);
    expect(amounts.primePJTTC).not.toBe(106);
  });
});
