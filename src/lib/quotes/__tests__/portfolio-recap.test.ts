import { describe, expect, it } from "vitest";
import { buildPortfolioRecap } from "../portfolio-recap";
import { overdueThresholdActions } from "../overdue-threshold";

describe("buildPortfolioRecap", () => {
  it("calcule les KPI sur mois commencés et la géo dossier", () => {
    const recap = buildPortfolioRecap(
      [
        {
          id: "q1",
          territory: "mayotte",
          periodicity: "trimestriel",
          brokerId: "b1",
          brokerName: "DGAC",
          annualPremium: 1000,
          installments: [
            {
              dueDate: new Date(2026, 0, 1),
              amountTTC: 400,
              status: "PAID",
              paidAmount: 400,
            },
            {
              dueDate: new Date(2026, 3, 1),
              amountTTC: 300,
              status: "PENDING",
            },
            {
              dueDate: new Date(2026, 9, 1),
              amountTTC: 300,
              status: "PENDING",
            },
          ],
          debitNotes: [
            {
              annualAmount: 1000,
              lines: [
                { amountTTC: 400, paymentDate: new Date(2026, 0, 10) },
                { amountTTC: 300, paymentDate: null },
              ],
            },
          ],
        },
        {
          id: "q2",
          territory: "st-martin",
          periodicity: "annuel",
          brokerId: "b2",
          brokerName: "JRV",
          annualPremium: 500,
          installments: [
            {
              dueDate: new Date(2026, 0, 15),
              amountTTC: 500,
              status: "PAID",
              paidAmount: 500,
            },
          ],
          debitNotes: [],
        },
      ],
      2026,
      new Date(2026, 6, 22),
    );

    expect(recap.activeCount).toBe(2);
    expect(recap.annualPremium).toBe(1500);
    expect(recap.paidElapsed).toBe(900);
    expect(recap.dueElapsed).toBe(1200);
    expect(recap.ratioElapsed).toBe(75);
    expect(recap.geo[0].label).toBe("Mayotte");
    expect(recap.geo[1].label).toBe("Saint-Martin");
    expect(recap.debitNotesReceived).toBe(400);
    expect(recap.debitNotesDue).toBe(1000);
    expect(recap.months[0].elapsed).toBe(true);
    expect(recap.months[9].elapsed).toBe(false);
  });
});

describe("overdueThresholdActions", () => {
  it("envoie une fois au franchissement et efface si le dossier redescend", () => {
    expect(
      overdueThresholdActions({ a: 2, b: 1 }, []),
    ).toEqual({ toSend: ["a"], toClear: [] });
    expect(
      overdueThresholdActions({ a: 3, b: 1 }, ["a"]),
    ).toEqual({ toSend: [], toClear: [] });
    expect(
      overdueThresholdActions({ a: 1 }, ["a"]),
    ).toEqual({ toSend: [], toClear: ["a"] });
  });
});
