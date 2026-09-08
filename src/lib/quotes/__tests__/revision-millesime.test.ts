import { describe, expect, it } from "vitest";
import { genererEcheancier } from "@/lib/tarificateurs/rcd";
import type { FormData } from "@/lib/types";
import {
  assertFormDataUnchanged,
  buildRevision2027FormData,
  shiftDateToYear,
  yearFromFormData,
} from "../revision-millesime";

function mkFormData(overrides: Partial<FormData> = {}): FormData {
  return {
    honoraireCourtier: "0",
    enCreation: false,
    city: "Paris",
    postalCode: "75002",
    directorName: "Dupont",
    siret: "12345678900011",
    address: "10 rue de Louvois",
    includePJ: true,
    legalForm: "SARL",
    territory: "metropole",
    activities: [{ code: "1", caSharePercent: 100 }],
    companyName: "SET",
    periodicity: "trimestriel",
    nombreSalaries: "3",
    tradingPercent: "0",
    chiffreAffaires: "500000",
    experienceMetier: "5",
    hasQualification: false,
    previousRcdStatus: "",
    dateDeffet: "2026-03-15",
    companyCreationDate: "2018-01-01",
    subContractingPercent: "0",
    ...overrides,
  };
}

describe("revision-millesime", () => {
  it("bascule la date d'effet au 15/03/2027 sans muter l'original", () => {
    expect(shiftDateToYear("2026-03-15", 2027)).toBe("2027-03-15");
    const original = mkFormData();
    const snapshot = structuredClone(original);
    const next = buildRevision2027FormData(original, {
      chiffreAffaires: "750000",
      activities: [
        { code: "1", caSharePercent: 60 },
        { code: "2", caSharePercent: 40 },
      ],
    });

    expect(original).toEqual(snapshot);
    expect(next.chiffreAffaires).toBe("750000");
    expect(next.activities).toEqual([
      { code: "1", caSharePercent: 60 },
      { code: "2", caSharePercent: 40 },
    ]);
    expect(next.dateDeffet).toBe("2027-03-15");
    expect(original.chiffreAffaires).toBe("500000");
    expect(original.dateDeffet).toBe("2026-03-15");
  });

  it("conserve le CA / les activités 2026 si non fournis", () => {
    const original = mkFormData();
    const next = buildRevision2027FormData(original, {});
    expect(next.chiffreAffaires).toBe("500000");
    expect(next.activities).toEqual([{ code: "1", caSharePercent: 100 }]);
    expect(next.dateDeffet).toBe("2027-03-15");
  });

  it("lit l'année d'effet en ISO et en date française", () => {
    expect(yearFromFormData({ dateDeffet: "2026-03-15" })).toBe(2026);
    expect(yearFromFormData({ dateDeffet: "15/03/2025" })).toBe(2025);
  });

  it("détecte une altération du formData 2026", () => {
    const before = mkFormData();
    const after = mkFormData({ chiffreAffaires: "1" });
    expect(() => assertFormDataUnchanged(before, after)).toThrow(
      /CA 2026/,
    );
  });

  it("génère un échéancier 2027 sans modifier un échéancier 2026 déjà calculé", () => {
    const params2026 = {
      dateDebut: new Date(2026, 0, 1),
      taxe: 90,
      tauxTaxe: 0.09,
      totalTTC: 1266,
      rcd: 1000,
      frais: 20,
      reprise: 0,
      fraisGestion: 50,
      periodicite: "trimestriel" as const,
      taxeN1: 90,
      totalTTCN1: 1266,
      rcdN1: 1000,
      fraisN1: 20,
      fraisGestionN1: 50,
    };
    const echeancier2026 = genererEcheancier(params2026);
    const snapshot2026 = structuredClone(echeancier2026);

    const echeancier2027 = genererEcheancier({
      ...params2026,
      dateDebut: new Date(2027, 0, 1),
      rcd: 1200,
    });

    expect(echeancier2026).toEqual(snapshot2026);
    expect(echeancier2027.echeances.length).toBeGreaterThan(0);
    expect(echeancier2027.echeances[0].date.startsWith("2027")).toBe(true);
    expect(echeancier2026.echeances[0].date.startsWith("2026")).toBe(true);
  });
});
