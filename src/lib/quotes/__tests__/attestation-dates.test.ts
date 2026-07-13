import { describe, expect, it } from "vitest";
import {
  formatRcdContractNumber,
  getAttestationPdfDates,
} from "../attestation-dates";
import { CalculationResult, Quote } from "@/lib/types";

const baseQuote = {
  id: "q1",
  reference: "RCD2645442",
  formData: { dateDeffet: "2026-05-26" },
} as Quote;

describe("formatRcdContractNumber", () => {
  it("ne duplique pas le préfixe RCD", () => {
    expect(formatRcdContractNumber("RCD2645442")).toBe("RCD2645442");
  });

  it("ajoute RCD si absent", () => {
    expect(formatRcdContractNumber("2645442")).toBe("RCD2645442");
  });
});

describe("getAttestationPdfDates", () => {
  it("sépare période contrat et validité attestation", () => {
    const calculationResult = {
      echeancier: {
        echeances: [{ finPeriode: "2026-12-31" }],
      },
    } as CalculationResult;

    const dates = getAttestationPdfDates(
      {
        periodStart: "2026-05-26",
        periodEnd: "2026-05-31",
        paidAt: "2026-07-08",
      },
      baseQuote,
      calculationResult
    );

    expect(dates.contractStartDate.toISOString().slice(0, 10)).toBe("2026-05-26");
    expect(dates.contractEndDate.toISOString().slice(0, 10)).toBe("2026-12-31");
    expect(dates.validityStartDate.toISOString().slice(0, 10)).toBe(
      "2026-05-26"
    );
    expect(dates.validityEndDate.toISOString().slice(0, 10)).toBe("2026-05-31");
    expect(dates.attestationDate.toISOString().slice(0, 10)).toBe("2026-07-08");
  });
});
