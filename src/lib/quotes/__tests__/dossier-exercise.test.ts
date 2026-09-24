import { describe, expect, it } from "vitest";
import {
  formDataForExerciseRecalculation,
  installmentMatchesExerciseYear,
  resolveDisplayedCalculation,
  resolveSelectedDossierYear,
} from "../dossier-exercise";
import type { FormData } from "@/lib/types";

const originCalc = { primeTotal: 1000, label: "origine" };
const vintageCalc = { primeTotal: 2027, label: "millesime" };
const draftCalc = { primeTotal: 3000, label: "brouillon" };

const formData = {
  chiffreAffaires: "100000",
  activities: [{ code: "1", caSharePercent: 100 }],
  dateDeffet: "2026-03-01",
} as FormData;

describe("resolveSelectedDossierYear", () => {
  it("laisse l'admin sur l'année choisie, sinon l'origine", () => {
    expect(
      resolveSelectedDossierYear({
        isAdmin: true,
        dossierYear: 2027,
        originalYear: 2026,
        yearsOnDossier: [2026, 2027],
      }),
    ).toBe(2027);
    expect(
      resolveSelectedDossierYear({
        isAdmin: true,
        dossierYear: null,
        originalYear: 2026,
        yearsOnDossier: [2026, 2027],
      }),
    ).toBe(2026);
  });

  it("aligne le courtier sur l'année civile si elle est sur le dossier", () => {
    const now = new Date(2026, 8, 23);
    expect(
      resolveSelectedDossierYear({
        isAdmin: false,
        dossierYear: 2027,
        originalYear: 2026,
        yearsOnDossier: [2026, 2027],
        now,
      }),
    ).toBe(2026);
    expect(
      resolveSelectedDossierYear({
        isAdmin: false,
        dossierYear: null,
        originalYear: 2025,
        yearsOnDossier: [2025, 2027],
        now,
      }),
    ).toBe(2025);
  });
});

describe("resolveDisplayedCalculation", () => {
  it("sur l'origine, renvoie le calcul d'origine", () => {
    expect(
      resolveDisplayedCalculation({
        selectedYear: 2026,
        originalYear: 2026,
        originCalculation: originCalc,
        vintagePremium: vintageCalc,
        localDraft: draftCalc,
      }),
    ).toBe(originCalc);
  });

  it("sur un millésime, ne replie jamais sur l'origine", () => {
    expect(
      resolveDisplayedCalculation({
        selectedYear: 2027,
        originalYear: 2026,
        originCalculation: originCalc,
        vintagePremium: null,
        localDraft: null,
      }),
    ).toBeNull();
    expect(
      resolveDisplayedCalculation({
        selectedYear: 2027,
        originalYear: 2026,
        originCalculation: originCalc,
        vintagePremium: vintageCalc,
      }),
    ).toBe(vintageCalc);
    expect(
      resolveDisplayedCalculation({
        selectedYear: 2027,
        originalYear: 2026,
        originCalculation: originCalc,
        vintagePremium: vintageCalc,
        localDraft: draftCalc,
      }),
    ).toBe(draftCalc);
  });
});

describe("formDataForExerciseRecalculation", () => {
  it("décale la date d'effet sur le millésime sans changer le CA d'origine en entrée", () => {
    const next = formDataForExerciseRecalculation(
      formData,
      { year: 2027, chiffreAffaires: "150000", activities: formData.activities },
      2027,
      2026,
      { nonFournitureBilanEnabled: true, reprisePasseEnabled: false },
    );
    expect(formData.chiffreAffaires).toBe("100000");
    expect(formData.dateDeffet).toBe("2026-03-01");
    expect(next.chiffreAffaires).toBe("150000");
    expect(next.dateDeffet).toBe("2027-03-01");
    expect((next as { nonFournitureBilanN_1?: boolean }).nonFournitureBilanN_1).toBe(
      true,
    );
  });
});

describe("installmentMatchesExerciseYear", () => {
  it("filtre sur vintageYear et ignore l'échéance d'un autre millésime", () => {
    expect(
      installmentMatchesExerciseYear(
        { vintageYear: 2027, dueDate: "2026-06-01" },
        2027,
      ),
    ).toBe(true);
    expect(
      installmentMatchesExerciseYear(
        { schedule: { vintageYear: 2026 }, dueDate: "2027-06-01" },
        2027,
      ),
    ).toBe(false);
  });

  it("retombe sur l'année d'échéance seulement sans vintageYear", () => {
    expect(
      installmentMatchesExerciseYear({ dueDate: "2027-01-15" }, 2027),
    ).toBe(true);
    expect(installmentMatchesExerciseYear({ dueDate: null }, 2027)).toBe(false);
  });
});
