import { describe, expect, it } from "vitest";
import {
  buildPortfolioRecap,
  fraisGestionListFromCalculatedPremium,
  managementFeesFromInstallments,
} from "../portfolio-recap";
import { buildPortfolioCsvLines } from "../portfolio-export";
import { overdueThresholdActions } from "../overdue-threshold";
import { toRecapQuoteInput } from "../portfolio-recap-source";

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
    expect(recap.annualPremiumExcludingFees).toBe(1500);
  });

  it("déduit les frais de gestion de la prime annuelle, au global et par répartition", () => {
    const recap = buildPortfolioRecap(
      [
        {
          id: "q1",
          territory: "mayotte",
          periodicity: "trimestriel",
          brokerId: "b1",
          brokerName: "DGAC",
          annualPremium: 1000,
          managementFees: 80,
          installments: [],
          debitNotes: [],
        },
        {
          id: "q2",
          territory: "st-martin",
          periodicity: "annuel",
          brokerId: "b2",
          brokerName: "JRV",
          annualPremium: 500,
          managementFees: 0,
          installments: [],
          debitNotes: [],
        },
      ],
      2026,
      new Date(2026, 6, 22),
    );

    expect(recap.annualPremium).toBe(1500);
    expect(recap.annualPremiumExcludingFees).toBe(1420);
    expect(recap.annualPremium - 80).toBe(recap.annualPremiumExcludingFees);
    expect(recap.geo.find((row) => row.label === "Mayotte")?.annualPremiumExcludingFees).toBe(920);
    expect(recap.geo.find((row) => row.label === "Saint-Martin")?.annualPremiumExcludingFees).toBe(500);
    const horsFrais = (1420).toLocaleString("fr-FR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    expect(recap.summary[1]).toBe(`soit ${horsFrais} € hors frais de gestion.`);
  });
});

describe("managementFeesFromInstallments", () => {
  it("dérive les frais quand le détail d'échéance est complet", () => {
    expect(
      managementFeesFromInstallments([
        {
          amountHT: 200,
          rcdAmount: 100,
          pjAmount: 20,
          feesAmount: 10,
          resumeAmount: 0,
        },
        {
          amountHT: 80,
          rcdAmount: 80,
          pjAmount: 0,
          feesAmount: 0,
          resumeAmount: 0,
        },
      ]),
    ).toBe(70);
  });

  it("retombe sur le calcul persisté si un composant est null", () => {
    expect(
      managementFeesFromInstallments(
        [
          {
            amountHT: 200,
            rcdAmount: null,
            pjAmount: 20,
            feesAmount: 10,
            resumeAmount: 0,
          },
        ],
        [55],
      ),
    ).toBe(55);
  });

  it("lit fraisGestion dans calculatedPremium.echeancier", () => {
    expect(
      fraisGestionListFromCalculatedPremium({
        echeancier: { echeances: [{ fraisGestion: 40 }, { fraisGestion: 0 }] },
      }),
    ).toEqual([40, 0]);
  });
});

describe("toRecapQuoteInput", () => {
  it("préfère le millésime puis le calcul d'origine quand la dérivation est impossible", () => {
    const mapped = toRecapQuoteInput({
      id: "q1",
      formData: { territory: "mayotte", periodicity: "annuel" },
      calculatedPremium: {
        echeancier: { echeances: [{ fraisGestion: 10 }] },
      },
      broker: { id: "b1", name: "JRV", companyName: null },
      paymentSchedule: [
        {
          totalAmountTTC: 1000,
          payments: [
            {
              id: "p1",
              installmentNumber: 1,
              dueDate: new Date(2026, 0, 1),
              amountHT: 800,
              amountTTC: 1000,
              status: "PENDING",
              rcdAmount: null,
              pjAmount: null,
              feesAmount: null,
              resumeAmount: null,
            },
          ],
        },
      ],
      debitNotes: [],
      vintages: [
        {
          calculatedPremium: {
            echeancier: { echeances: [{ fraisGestion: 90 }] },
          },
        },
      ],
    });

    expect(mapped.managementFees).toBe(90);
    expect(mapped.annualPremium).toBe(1000);
  });
});

describe("buildPortfolioCsvLines", () => {
  const recap = buildPortfolioRecap(
    [
      {
        id: "q1",
        territory: "mayotte",
        periodicity: "annuel",
        brokerId: "b1",
        brokerName: "DGAC",
        annualPremium: 1000,
        managementFees: 100,
        installments: [
          {
            dueDate: new Date(2026, 0, 1),
            amountTTC: 400,
            status: "PAID",
            paidAmount: 400,
          },
        ],
        debitNotes: [],
      },
    ],
    2026,
    new Date(2026, 6, 22),
  );

  it("ajoute la prime hors frais à l'export interne sans retirer la prime cumulée", () => {
    const doc = buildPortfolioCsvLines(recap, "interne").join("\n");
    expect(doc).toContain("Prime annuelle cumulée");
    expect(doc).toContain("Prime annuelle hors frais de gestion");
    expect(doc).toContain("hors frais de gestion.");
  });

  it("n'expose aucune prime frais inclus dans l'export partenaires", () => {
    const doc = buildPortfolioCsvLines(recap, "partenaires").join("\n");
    const inclusive = (1000).toLocaleString("fr-FR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    const inclusiveRounded = (1000).toLocaleString("fr-FR", {
      maximumFractionDigits: 0,
    });
    const excluding = (900).toLocaleString("fr-FR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    expect(doc).toContain("Prime annuelle hors frais de gestion");
    expect(doc).not.toContain("Prime annuelle cumulée");
    expect(doc).not.toContain("Prime annuelle;");
    expect(doc).not.toContain(inclusive);
    expect(doc).not.toContain(`de ${inclusiveRounded} €`);
    expect(doc).toContain(excluding);
    expect(doc).toContain("Janvier");
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
