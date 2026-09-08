import { describe, expect, it } from "vitest";
import { resolveHonoraireGestion } from "../honoraires";
import { calculPrimeRCD } from "../rcd";

function baseParams(overrides: Record<string, unknown> = {}) {
  return {
    enCreation: false,
    caDeclared: 200000,
    honoraireGestion: 0,
    etp: 3,
    activites: [{ code: 16, caSharePercent: 100 }],
    dateCreation: new Date("2020-01-01"),
    tempsSansActivite: "NON" as const,
    anneeExperience: 5,
    assureurDefaillant: false,
    nombreAnneeAssuranceContinue: 3,
    qualif: false,
    sansActiviteDepuisPlusDe12MoisSansFermeture: "NON" as const,
    absenceDeSinistreSurLes5DernieresAnnees: "OUI" as const,
    protectionJuridique: true,
    fractionnementPrime: "annuel" as const,
    fraisFractionnementPrime: 40,
    protectionJuridique1an: 106,
    taxeAssurance: 0.09,
    taxeProtectionJuridique: 0.09,
    partSoutraitance: 0,
    partNegoce: 0,
    nonFournitureBilanN_1: false,
    reprisePasse: false,
    txFraisGestion: 0.1,
    dateFinCouverturePrecedente: new Date("2024-12-31"),
    nomDeLAsurreur: "AXA",
    dateEffet: new Date("2026-01-01"),
    ...overrides,
  };
}

describe("resolveHonoraireGestion", () => {
  it("garde le mapping si honoraireCourtier est vide ou 0", () => {
    expect(resolveHonoraireGestion("", 80)).toBe(80);
    expect(resolveHonoraireGestion(undefined, 80)).toBe(80);
    expect(resolveHonoraireGestion("0", 80)).toBe(80);
  });

  it("fait primer honoraireCourtier sur le mapping produit", () => {
    expect(resolveHonoraireGestion("150", 80)).toBe(150);
    expect(resolveHonoraireGestion("150,5", 0)).toBe(150.5);
  });

  it("ne cumule jamais les deux sources", () => {
    expect(resolveHonoraireGestion("40", 60)).toBe(40);
  });
});

describe("calculPrimeRCD honoraires courtier", () => {
  it("cas 0 € : non-régression des totaux", () => {
    const without = calculPrimeRCD(baseParams({ honoraireGestion: 0 }));
    const withZero = calculPrimeRCD(baseParams({ honoraireGestion: 0 }));
    expect(without.honoraireGestion).toBe(0);
    expect(withZero.totalTTC).toBe(without.totalTTC);
    expect(withZero.totalTTCN1).toBe(without.totalTTCN1);
  });

  it("cas > 0 : ligne présente, totaux différents, pas de double comptage", () => {
    const base = calculPrimeRCD(baseParams({ honoraireGestion: 0 }));
    const withFee = calculPrimeRCD(baseParams({ honoraireGestion: 200 }));

    expect(withFee.honoraireGestion).toBe(200);
    expect(withFee.totalTTC).toBeCloseTo(base.totalTTC + 200, 2);
    expect(withFee.totalTTCN1).toBeCloseTo(base.totalTTCN1 + 200, 2);
    expect(withFee.fraisGestion).toBe(base.fraisGestion);
    expect(withFee.totalTTC - base.totalTTC).not.toBe(400);
  });
});
