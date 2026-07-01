import { describe, expect, it } from "vitest";
import {
  parseInstallmentNumberFromQuittanceId,
  verifyCsvRowsMatchScheduleExport,
  verifyScheduleExportEcheance1Vs2,
} from "../verifyBordereauExportAlignment";
import type { FidelidadeQuittancesRow } from "../types";
import type { InstallmentAmountFields } from "../quittanceAmountsV2";

const TAUX = 0.09;
const FG = 1000;

function inst(
  n: number,
  periodStart: string,
  periodEnd: string,
  overrides: Partial<InstallmentAmountFields> = {},
): InstallmentAmountFields {
  return {
    installmentNumber: n,
    periodStart: new Date(periodStart),
    periodEnd: new Date(periodEnd),
    amountHT: 4100,
    amountTTC: 4469,
    taxAmount: 369,
    rcdAmount: 4000,
    pjAmount: 0,
    feesAmount: 100,
    resumeAmount: 0,
    ...overrides,
  };
}

function ctx(
  quoteReference: string,
  installments: InstallmentAmountFields[],
  formData: Record<string, unknown> = { periodicity: "trimestriel" },
) {
  return {
    quoteReference,
    installments,
    modifieAlaMain: false,
    tauxTaxeDecimal: TAUX,
    fraisGestionGlobal: FG,
    formData,
  };
}

function quittanceRow(
  police: string,
  quittanceId: string,
  amounts: { ht: number; ttc: number; taxes: number; comm: number },
): FidelidadeQuittancesRow {
  return {
    APPORTEUR: "TEST",
    IDENTIFIANT_POLICE: police,
    NUMERO_AVENANT: "",
    IDENTIFIANT_QUITTANCE: quittanceId,
    DATE_EFFET_QUITTANCE: "01/01/2026",
    DATE_FIN_QUITTANCE: "31/03/2026",
    DATE_EMISSION_QUITTANCE: "01/01/2026",
    DATE_ENCAISSEMENT: "",
    STATUT_QUITTANCE: "EMISE",
    GARANTIE: "RC_RCD",
    PRIME_HT: String(amounts.ht),
    PRIME_TTC: String(amounts.ttc),
    TAXES: String(amounts.taxes),
    TAXE_POURCENTAGE: "9",
    COMMISSIONS: String(amounts.comm),
    MODE_PAIEMENT: "",
  };
}

describe("parseInstallmentNumberFromQuittanceId", () => {
  it("parse les identifiants trimestriel, mensuel et sans lettre", () => {
    expect(
      parseInstallmentNumberFromQuittanceId("POL123", "POL123Q1-2026-EM"),
    ).toBe(1);
    expect(
      parseInstallmentNumberFromQuittanceId("POL123", "POL123M2-2026-RG"),
    ).toBe(2);
  });
});

describe("verifyScheduleExportEcheance1Vs2", () => {
  it("OK période pleine sans écart", () => {
    const installments = [
      inst(1, "2026-01-01", "2026-03-31", {
        amountHT: 5206,
        amountTTC: 5589.2,
        taxAmount: 383.2,
        pjAmount: 106,
      }),
      inst(2, "2026-04-01", "2026-06-30"),
    ];

    expect(verifyScheduleExportEcheance1Vs2(ctx("TEST-001", installments))).toEqual(
      [],
    );
  });

  it("INFO si prorata et écart vs éch. #2", () => {
    const installments = [
      inst(1, "2026-04-01", "2026-05-15", {
        amountHT: 3000,
        taxAmount: 200,
        amountTTC: 3200,
        rcdAmount: 2000,
        pjAmount: 106,
        feesAmount: 50,
      }),
      inst(2, "2026-07-01", "2026-09-30"),
    ];

    const issues = verifyScheduleExportEcheance1Vs2(ctx("TEST-PRORATA", installments));
    expect(issues).toHaveLength(1);
    expect(issues[0].severity).toBe("info");
    expect(issues[0].reason).toBe("ECART_PRORATA");
  });
});

describe("verifyCsvRowsMatchScheduleExport", () => {
  const scheduleCtx = ctx("POL-A", [
    inst(1, "2026-01-01", "2026-03-31", {
      amountHT: 5206,
      amountTTC: 5589.2,
      taxAmount: 383.2,
      pjAmount: 106,
    }),
    inst(2, "2026-04-01", "2026-06-30"),
  ]);

  it("OK quand seule l'éch. #1 est dans le CSV", () => {
    const amounts = { ht: 4100, ttc: 4469, taxes: 369, comm: 984 };
    const rows = [quittanceRow("POL-A", "POL-AQ1-2026-EM", amounts)];
    const map = new Map([["POL-A", scheduleCtx]]);

    expect(verifyCsvRowsMatchScheduleExport(rows, map)).toEqual([]);
  });

  it("ERREUR si CSV incohérent avec l'échéancier", () => {
    const rows = [
      quittanceRow("POL-A", "POL-AQ1-2026-EM", {
        ht: 5000,
        ttc: 5450,
        taxes: 450,
        comm: 1200,
      }),
    ];
    const map = new Map([["POL-A", scheduleCtx]]);

    const issues = verifyCsvRowsMatchScheduleExport(rows, map);
    expect(issues).toHaveLength(1);
    expect(issues[0].severity).toBe("error");
    expect(issues[0].reason).toBe("CSV_NE_CORRESPOND_PAS");
  });
});
