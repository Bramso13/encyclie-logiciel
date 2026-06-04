import { describe, it, expect } from "vitest";
import {
  pickInstallmentForResiliation,
  expandMonthEvents,
  endOfResiliationMonth,
  getEmissionBordereauDate,
} from "../bordereauMonthEventsV2";

describe("pickInstallmentForResiliation", () => {
  it("retourne la dernière échéance dont periodStart <= fin du mois de résiliation", () => {
    const resiliation = new Date("2026-01-15");
    const insts = [
      { installmentNumber: 1, periodStart: new Date("2025-09-01") },
      { installmentNumber: 2, periodStart: new Date("2025-10-01") },
      { installmentNumber: 3, periodStart: new Date("2026-04-01") },
    ];
    const picked = pickInstallmentForResiliation(insts, resiliation);
    expect(picked?.installmentNumber).toBe(2);
  });
});

describe("expandMonthEvents", () => {
  const start = new Date("2026-01-01T00:00:00.000Z");
  const end = new Date("2026-02-01T00:00:00.000Z");

  it("EMISSION seule si appel dans le mois et pas encore payé", () => {
    const inst = {
      emissionDate: new Date("2026-01-05"),
      paidAt: null,
      periodStart: new Date("2026-01-01"),
      installmentNumber: 2,
      schedule: { quote: { reference: "Q1" } },
    };
    const events = expandMonthEvents([inst], start, end);
    expect(events).toHaveLength(1);
    expect(events[0].eventType).toBe("EMISSION");
  });

  it("REGLEMENT seul si échéance payée dans le mois (pas d’EMISSION)", () => {
    const inst = {
      emissionDate: null,
      paidAt: new Date("2026-01-12"),
      periodStart: new Date("2026-01-01"),
      installmentNumber: 1,
      schedule: { quote: { reference: "Q1" } },
    };
    const events = expandMonthEvents([inst], start, end);
    expect(events).toHaveLength(1);
    expect(events[0].eventType).toBe("REGLEMENT");
  });

  it("REGLEMENT seul même si emissionDate tombe aussi dans le mois", () => {
    const inst = {
      emissionDate: new Date("2026-01-05"),
      paidAt: new Date("2026-01-20"),
      periodStart: new Date("2026-01-01"),
      installmentNumber: 1,
      schedule: { quote: { reference: "Q1" } },
    };
    const events = expandMonthEvents([inst], start, end);
    expect(events).toHaveLength(1);
    expect(events[0].eventType).toBe("REGLEMENT");
  });

  it("EMISSION en janv. et REGLEMENT en févr. si appel puis paiement mois suivant", () => {
    const inst = {
      emissionDate: new Date("2026-01-05"),
      paidAt: new Date("2026-02-10"),
      periodStart: new Date("2026-01-01"),
      installmentNumber: 2,
      schedule: { quote: { reference: "Q1" } },
    };
    const jan = expandMonthEvents(
      [inst],
      new Date("2026-01-01T00:00:00.000Z"),
      new Date("2026-02-01T00:00:00.000Z"),
    );
    const fev = expandMonthEvents(
      [inst],
      new Date("2026-02-01T00:00:00.000Z"),
      new Date("2026-03-01T00:00:00.000Z"),
    );
    expect(jan).toHaveLength(1);
    expect(jan[0].eventType).toBe("EMISSION");
    expect(fev).toHaveLength(1);
    expect(fev[0].eventType).toBe("REGLEMENT");
  });

  it("pas d'EMISSION si seul periodStart tombe dans le mois (échéance impayée)", () => {
    const inst = {
      emissionDate: null,
      paidAt: null,
      periodStart: new Date("2026-04-01"),
      installmentNumber: 2,
      schedule: { quote: { reference: "Q1" } },
    };
    const events = expandMonthEvents(
      [inst],
      new Date("2026-04-01T00:00:00.000Z"),
      new Date("2026-05-01T00:00:00.000Z"),
    );
    expect(events).toHaveLength(0);
  });

  it("EMISSION au mois de periodStart si appel avant le début de période", () => {
    const inst = {
      emissionDate: new Date("2026-04-02"),
      paidAt: null,
      periodStart: new Date("2026-07-01"),
      installmentNumber: 3,
      schedule: { quote: { reference: "Q1" } },
    };
    expect(getEmissionBordereauDate(inst)?.toISOString().slice(0, 10)).toBe(
      "2026-07-01",
    );
    const avril = expandMonthEvents(
      [inst],
      new Date("2026-04-01T00:00:00.000Z"),
      new Date("2026-05-01T00:00:00.000Z"),
    );
    const juillet = expandMonthEvents(
      [inst],
      new Date("2026-07-01T00:00:00.000Z"),
      new Date("2026-08-01T00:00:00.000Z"),
    );
    expect(avril).toHaveLength(0);
    expect(juillet).toHaveLength(1);
    expect(juillet[0].eventType).toBe("EMISSION");
    expect(juillet[0].eventDate.toISOString().slice(0, 10)).toBe("2026-04-02");
  });

  it("REGLEMENT seul si émission et paiement le même jour", () => {
    const sameDay = new Date("2026-01-15T12:00:00.000Z");
    const inst = {
      emissionDate: sameDay,
      paidAt: sameDay,
      periodStart: new Date("2026-01-01"),
      installmentNumber: 1,
      schedule: { quote: { reference: "Q1" } },
    };
    const events = expandMonthEvents([inst], start, end);
    expect(events).toHaveLength(1);
    expect(events[0].eventType).toBe("REGLEMENT");
  });
});

describe("endOfResiliationMonth", () => {
  it("couvre le dernier jour du mois de résiliation", () => {
    const end = endOfResiliationMonth(new Date("2026-01-01"));
    expect(end.getMonth()).toBe(0);
    expect(end.getDate()).toBe(31);
  });
});
