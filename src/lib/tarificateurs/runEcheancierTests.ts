/**
 * Exécute les mêmes vérifications que genererEcheancier.test.ts
 * Retourne les résultats pour affichage (API / UI).
 */

import { genererEcheancier, getTaxePJByTauxTaxe } from "./rcd";

const TOLERANCE = 0.02;

export type UnitTestResult = {
  suite: string;
  test: string;
  ok: boolean;
  detail: string;
};

function assertNear(actual: number, expected: number): boolean {
  return Math.abs(actual - expected) <= TOLERANCE;
}

function mkParams(overrides: Record<string, unknown> = {}) {
  return {
    dateDebut: new Date("2025-01-01"),
    taxe: 90,
    tauxTaxe: 0.09,
    totalTTC: 1266,
    rcd: 1000,
    frais: 20,
    reprise: 0,
    fraisGestion: 50,
    periodicite: "annuel" as const,
    taxeN1: 90,
    totalTTCN1: 1266,
    rcdN1: 1000,
    fraisN1: 20,
    fraisGestionN1: 50,
    ...overrides,
  };
}

export function runEcheancierUnitTests(): UnitTestResult[] {
  const results: UnitTestResult[] = [];

  const periodicités = [
    { key: "annuel" as const, nbEcheances: 1 },
    { key: "semestriel" as const, nbEcheances: 2 },
    { key: "trimestriel" as const, nbEcheances: 4 },
    { key: "mensuel" as const, nbEcheances: 12 },
  ] as const;

  for (const { key, nbEcheances } of periodicités) {
    try {
      const rcd = 1200;
      const tauxTaxe = 0.09;
      const tauxTaxePJ = getTaxePJByTauxTaxe(tauxTaxe);
      const frais = 24;
      const fraisGestion = 60;
      const reprise = 0;
      const taxe = (rcd + frais) * tauxTaxe;
      const pjTTC = 106 + 106 * tauxTaxePJ;
      const totalTTC = rcd + taxe + pjTTC + frais + fraisGestion + reprise;

      const { echeances } = genererEcheancier(
        mkParams({
          dateDebut: new Date("2025-01-01"),
          rcd,
          taxe,
          frais,
          fraisGestion,
          reprise,
          totalTTC,
          periodicite: key,
          rcdN1: rcd,
          taxeN1: taxe,
          totalTTCN1: totalTTC,
          fraisN1: frais,
          fraisGestionN1: fraisGestion,
        })
      );

      const sumRcd = echeances.reduce((a, e) => a + e.rcd, 0);
      const sumFrais = echeances.reduce((a, e) => a + e.frais, 0);
      const sumPj = echeances.reduce((a, e) => a + e.pj, 0);
      const sumFraisGestion = echeances.reduce((a, e) => a + e.fraisGestion, 0);
      const sumReprise = echeances.reduce((a, e) => a + e.reprise, 0);
      const sumTotalHT = echeances.reduce((a, e) => a + e.totalHT, 0);
      const sumTaxe = echeances.reduce((a, e) => a + e.taxe, 0);
      const sumTotalTTC = echeances.reduce((a, e) => a + e.totalTTC, 0);

      const expectedRcd = rcd;
      const ttcTolerance = TOLERANCE;
      const ok =
        assertNear(sumRcd, expectedRcd) &&
        assertNear(sumFrais, frais) &&
        assertNear(sumPj, 106) &&
        assertNear(sumFraisGestion, fraisGestion) &&
        assertNear(sumReprise, reprise) &&
        assertNear(sumTotalHT, sumRcd + sumPj + sumFrais + sumFraisGestion + sumReprise) &&
        assertNear(sumTotalTTC, sumTotalHT + sumTaxe) &&
        Math.abs(sumTotalTTC - totalTTC) <= ttcTolerance &&
        echeances.length === nbEcheances;

      results.push({
        suite: "Cas 1 — Année complète",
        test: `${key}: invariants`,
        ok,
        detail: ok
          ? `✓ ${echeances.length} échéances, Σ rcd=${sumRcd.toFixed(1)}, Σ TTC=${sumTotalTTC.toFixed(1)}`
          : `Σ rcd=${sumRcd.toFixed(2)} (attendu≈${expectedRcd.toFixed(0)}), Σ TTC=${sumTotalTTC.toFixed(2)}`,
      });
    } catch (err) {
      results.push({
        suite: "Cas 1 — Année complète",
        test: `${key}: invariants`,
        ok: false,
        detail: String(err),
      });
    }
  }

  // Cas 2 — Prorata
  try {
    const { echeances } = genererEcheancier(
      mkParams({
        dateDebut: new Date("2025-04-01"),
        rcd: 1000,
        taxe: 90,
        frais: 20,
        fraisGestion: 50,
        reprise: 0,
        totalTTC: 1000 + 90 + 106 + 20 + 50,
        periodicite: "trimestriel",
        rcdN1: 1000,
        taxeN1: 90,
        totalTTCN1: 1000 + 90 + 106 + 20 + 50,
        fraisN1: 20,
        fraisGestionN1: 50,
      })
    );
    const sumPj = echeances.reduce((a, e) => a + e.pj, 0);
    const ok = echeances.length === 3 && assertNear(sumPj, 106);
    results.push({
      suite: "Cas 2 — Prorata",
      test: "trimestriel avril",
      ok,
      detail: ok ? `✓ 3 échéances, Σ pj=106` : `nb=${echeances.length}, Σ pj=${sumPj}`,
    });
  } catch (err) {
    results.push({ suite: "Cas 2 — Prorata", test: "trimestriel avril", ok: false, detail: String(err) });
  }

  // Cas 4 — Cohérence interne
  try {
    const { echeances } = genererEcheancier(mkParams({ periodicite: "trimestriel" }));
    let coh = true;
    for (let i = 0; i < echeances.length; i++) {
      const e = echeances[i];
      const comp = e.rcd + e.pj + e.frais + e.fraisGestion + (e.reprise ?? 0);
      if (!assertNear(e.totalHT, comp)) coh = false;
    }
    results.push({
      suite: "Cas 4 — Cohérence",
      test: "totalHT = composantes",
      ok: coh,
      detail: coh ? `✓ ${echeances.length} échéances OK` : "ÉCHEC",
    });
  } catch (err) {
    results.push({ suite: "Cas 4 — Cohérence", test: "totalHT = composantes", ok: false, detail: String(err) });
  }

  // Cas 5 — Composantes uniques
  try {
    const { echeances } = genererEcheancier(mkParams({ periodicite: "trimestriel", reprise: 100 }));
    const avecPj = echeances.filter((e) => e.pj > 0).length;
    const avecFg = echeances.filter((e) => e.fraisGestion > 0).length;
    const avecRep = echeances.filter((e) => e.reprise > 0).length;
    const ok = avecPj === 1 && avecFg === 1 && avecRep === 1;
    results.push({
      suite: "Cas 5 — Occurrence unique",
      test: "pj, fraisGestion, reprise",
      ok,
      detail: ok ? `✓` : `pj=${avecPj}, fg=${avecFg}, rep=${avecRep}`,
    });
  } catch (err) {
    results.push({ suite: "Cas 5 — Occurrence unique", test: "pj, fraisGestion, reprise", ok: false, detail: String(err) });
  }

  return results;
}
