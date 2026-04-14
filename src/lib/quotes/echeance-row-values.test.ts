import { describe, it, expect } from "vitest";
import {
  computeRowValuesModifieAlaMain,
  computeRowValuesDefault,
  buildGetEcheanceRowValues,
} from "./echeance-row-values";

const baseInst = {
  installmentNumber: 1,
  rcdAmount: 100,
  pjAmount: 106,
  feesAmount: 10,
  resumeAmount: 5,
  amountHT: 500,
  taxAmount: 45,
  amountTTC: 545,
};

describe("computeRowValuesModifieAlaMain", () => {
  it("applique 10% frais de gestion uniquement sur la première échéance", () => {
    const row0 = computeRowValuesModifieAlaMain(baseInst, 0);
    expect(row0.fraisGestion).toBe(50);
    const row1 = computeRowValuesModifieAlaMain({ ...baseInst, installmentNumber: 2 }, 1);
    expect(row1.fraisGestion).toBe(0);
  });

  it("totalHT est la somme des composantes avec rcdHT = amountHT", () => {
    const row = computeRowValuesModifieAlaMain(baseInst, 0);
    expect(row.rcdHT).toBe(500);
    expect(row.totalHT).toBe(500 + 106 + 10 + 50 + 5);
    expect(row.totalTTC).toBe(row.totalHT + 45);
  });
});

describe("computeRowValuesDefault", () => {
  it("depuis échéance en base : totalHT = amountHT (inchangé)", () => {
    const row = computeRowValuesDefault(
      baseInst,
      {},
      0,
      25,
      true,
    );
    expect(row.rcdHT).toBe(100);
    expect(row.fraisGestion).toBe(25);
    expect(row.totalHT).toBe(500);
    expect(row.totalTTC).toBe(545);
  });

  it("depuis calcul local : somme des lignes", () => {
    const row = computeRowValuesDefault(
      undefined,
      { rcd: 10, pj: 20, frais: 3, reprise: 0, taxe: 5 },
      0,
      7,
      false,
    );
    expect(row.totalHT).toBe(10 + 20 + 3 + 7);
    expect(row.totalTTC).toBe(row.totalHT + 5);
  });
});

describe("buildGetEcheanceRowValues", () => {
  it("ignore modifieAlaMain : chemin défaut (fraisGestion global sur échéance 1)", () => {
    const get = buildGetEcheanceRowValues({
      modifieAlaMain: true,
      paymentInstallments: [baseInst],
      calculationResult: { fraisGestion: 99 },
      originalCalculationResult: null,
    });
    const row = get({}, 0);
    expect(row.rcdHT).toBe(100);
    expect(row.fraisGestion).toBe(99);
  });
});
