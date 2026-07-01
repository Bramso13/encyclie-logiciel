import { describe, expect, it } from "vitest";
import {
  calendarDaysInclusive,
  detectEch1Prorata,
  expectedFullPeriodDays,
  isPremiereEcheanceProrata,
} from "../prorata";

describe("isPremiereEcheanceProrata", () => {
  it("détecte une 1re période plus courte que la périodicité", () => {
    const periodStart = new Date("2026-04-01");
    expect(
      isPremiereEcheanceProrata({
        ech1: {
          periodStart,
          periodEnd: new Date("2026-05-15"),
        },
        expectedFullPeriodDays: expectedFullPeriodDays(
          "trimestriel",
          periodStart,
        ),
      }),
    ).toBe(true);
  });

  it("ne détecte pas un trimestre plein même si le RCD diffère de l'éch. #2", () => {
    const periodStart = new Date("2026-01-01");
    expect(
      isPremiereEcheanceProrata({
        ech1: {
          periodStart,
          periodEnd: new Date("2026-03-31"),
        },
        expectedFullPeriodDays: expectedFullPeriodDays(
          "trimestriel",
          periodStart,
        ),
      }),
    ).toBe(false);
  });

  it("ne confond pas 90 et 91 jours calendaires entre trimestres", () => {
    expect(
      isPremiereEcheanceProrata({
        ech1: {
          periodStart: new Date("2026-01-01"),
          periodEnd: new Date("2026-03-31"),
        },
        expectedFullPeriodDays: 90,
      }),
    ).toBe(false);
  });
});

describe("detectEch1Prorata", () => {
  it("202210RCDWAK23 : trimestre plein → pas de prorata", () => {
    expect(
      detectEch1Prorata(
        {
          periodStart: new Date("2026-01-01"),
          periodEnd: new Date("2026-03-31"),
        },
        { periodicity: "trimestriel" },
      ),
    ).toBe(false);
  });

  it("2025158RCDFID : 1re mensualité partielle → prorata", () => {
    expect(
      detectEch1Prorata(
        {
          periodStart: new Date("2026-01-15"),
          periodEnd: new Date("2026-01-31"),
        },
        { periodicity: "mensuel" },
      ),
    ).toBe(true);
  });
});

describe("calendarDaysInclusive", () => {
  it("compte les jours calendaires inclus", () => {
    expect(
      calendarDaysInclusive(
        new Date("2026-01-01"),
        new Date("2026-01-31"),
      ),
    ).toBe(31);
  });
});
