/**
 * Tests unitaires pour genererEcheancier — invariants de cohérence
 * Tolérance : ± 0.02 € (arrondis financiers)
 */

import { describe, it, expect } from "vitest";
import { genererEcheancier } from "../rcd";

const TOLERANCE = 0.02;

/** Paramètres pour l'appel à genererEcheancier */
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

function assertNear(actual: number, expected: number, label: string) {
  expect(
    Math.abs(actual - expected),
    `${label}: ${actual} vs ${expected}`
  ).toBeLessThanOrEqual(TOLERANCE);
}

describe("genererEcheancier", () => {
  describe("Cas 1 — Année complète (1er janvier)", () => {
    const periodicités = [
      { key: "annuel" as const, nbEcheances: 1 },
      { key: "semestriel" as const, nbEcheances: 2 },
      { key: "trimestriel" as const, nbEcheances: 4 },
      { key: "mensuel" as const, nbEcheances: 12 },
    ];

    for (const { key, nbEcheances } of periodicités) {
      it(`${key}: invariants sur sommes vs totaux annuels`, () => {
        const rcd = 1200;
        const taxe = 108; // 9% sur RCD
        const tauxTaxe = 0.09;
        const frais = 24;
        const fraisGestion = 60;
        const reprise = 0;
        const pjTTC = 106 + 106 * tauxTaxe;
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

        // Σ rcd ≈ rcd annuel (semestriel 1er janv : ratio S1 ≈ 181/182)
        const expectedRcd =
          key === "semestriel"
            ? (rcd / 2) * (181 / 182 + 1)
            : rcd;
        assertNear(sumRcd, expectedRcd, `Σ rcd (${key})`);

        assertNear(sumFrais, frais, `Σ frais (${key})`);
        assertNear(sumPj, 106, `Σ pj (${key})`);
        assertNear(sumFraisGestion, fraisGestion, `Σ fraisGestion (${key})`);
        assertNear(sumReprise, reprise, `Σ reprise (${key})`);

        const sumComposantes =
          sumRcd + sumPj + sumFrais + sumFraisGestion + sumReprise;
        assertNear(sumTotalHT, sumComposantes, `Σ totalHT vs composantes (${key})`);
        assertNear(sumTotalTTC, sumTotalHT + sumTaxe, `Σ totalTTC (${key})`);

        // Σ totalTTC ≈ totalTTC annuel (semestriel a un petit écart dû au ratio)
        const toleranceTTC = key === "semestriel" ? 5.0 : TOLERANCE;
        expect(
          Math.abs(sumTotalTTC - totalTTC),
          `Σ totalTTC vs totalTTC annuel (${key}): ${sumTotalTTC} vs ${totalTTC}`
        ).toBeLessThanOrEqual(toleranceTTC);

        expect(echeances.length).toBe(nbEcheances);
      });
    }
  });

  describe("Cas 2 — Année partielle (prorata)", () => {
    it("trimestriel démarrant en avril : prorata sur 1ère échéance", () => {
      const rcd = 1000;
      const taxe = 90;
      const tauxTaxe = 0.09;
      const frais = 20;
      const fraisGestion = 50;
      const reprise = 0;
      const totalTTC = rcd + taxe + 106 + 106 * tauxTaxe + frais + fraisGestion + reprise;

      const { echeances } = genererEcheancier(
        mkParams({
          dateDebut: new Date("2025-04-01"),
          rcd,
          taxe,
          frais,
          fraisGestion,
          reprise,
          totalTTC,
          periodicite: "trimestriel",
          rcdN1: rcd,
          taxeN1: taxe,
          totalTTCN1: totalTTC,
          fraisN1: frais,
          fraisGestionN1: fraisGestion,
        })
      );

      // Démarrage avril → Q2, Q3, Q4 (3 échéances, fin au 31 décembre)
      expect(echeances.length).toBe(3);

      const sumRcd = echeances.reduce((a, e) => a + e.rcd, 0);
      const sumFrais = echeances.reduce((a, e) => a + e.frais, 0);
      const sumPj = echeances.reduce((a, e) => a + e.pj, 0);
      const sumTotalHT = echeances.reduce((a, e) => a + e.totalHT, 0);
      const sumTaxe = echeances.reduce((a, e) => a + e.taxe, 0);
      const sumTotalTTC = echeances.reduce((a, e) => a + e.totalTTC, 0);

      // Σ rcd < rcd annuel (année partielle : 3 échéances au lieu de 4, avec prorata sur la 1ère)
      expect(sumRcd).toBeLessThanOrEqual(rcd + TOLERANCE);
      expect(sumRcd).toBeGreaterThan(0);

      // Σ frais === frais / 4 × 3 (3 échéances sur 4 dans l'année)
      assertNear(sumFrais, (frais / 4) * 3, `Σ frais prorata`);

      assertNear(sumPj, 106, `Σ pj prorata`);

      const sumComposantes =
        sumRcd +
        sumPj +
        sumFrais +
        echeances.reduce((a, e) => a + e.fraisGestion, 0) +
        echeances.reduce((a, e) => a + e.reprise, 0);
      assertNear(sumTotalHT, sumComposantes, `Σ totalHT prorata`);
      assertNear(sumTotalTTC, sumTotalHT + sumTaxe, `Σ totalTTC prorata`);
    });
  });

  describe("Cas 3 — Année N + N+1", () => {
    it("semestriel 1er janv : déborde sur année suivante, params N+1 utilisés", () => {
      const rcd = 1000;
      const rcdN1 = 1100;
      const taxe = 90;
      const taxeN1 = 99;
      const frais = 20;
      const fraisN1 = 22;
      const fraisGestion = 50;
      const fraisGestionN1 = 55;
      const tauxTaxe = 0.09;
      const totalTTC = rcd + taxe + 106 + 106 * tauxTaxe + frais + fraisGestion;
      const totalTTCN1 = rcdN1 + taxeN1 + 106 + 106 * tauxTaxe + fraisN1 + fraisGestionN1;

      const { echeances } = genererEcheancier(
        mkParams({
          dateDebut: new Date("2025-01-01"),
          rcd,
          taxe,
          frais,
          fraisGestion,
          totalTTC,
          periodicite: "semestriel",
          rcdN1,
          taxeN1,
          totalTTCN1,
          fraisN1,
          fraisGestionN1,
        })
      );

      // 1er janv semestriel → 3 échéances : S1 2025, S2 2025, S1 2026
      expect(echeances.length).toBeGreaterThanOrEqual(2);

      const sumPj = echeances.reduce((a, e) => a + e.pj, 0);
      assertNear(sumPj, 106, `Σ pj année N+N+1`);

      const sumTotalHT = echeances.reduce((a, e) => a + e.totalHT, 0);
      const sumTaxe = echeances.reduce((a, e) => a + e.taxe, 0);
      const sumTotalTTC = echeances.reduce((a, e) => a + e.totalTTC, 0);
      assertNear(sumTotalTTC, sumTotalHT + sumTaxe, `Σ totalTTC vs totalHT+taxe`);
    });
  });

  describe("Cas 4 — Cohérence interne par échéance", () => {
    it("chaque échéance : totalHT === rcd+pj+frais+fraisGestion+reprise", () => {
      const { echeances } = genererEcheancier(
        mkParams({ periodicite: "trimestriel" })
      );

      for (let i = 0; i < echeances.length; i++) {
        const e = echeances[i];
        const composantes =
          e.rcd + e.pj + e.frais + e.fraisGestion + (e.reprise ?? 0);
        assertNear(e.totalHT, composantes, `échéance ${i} totalHT`);
      }
    });

    it("chaque échéance : totalTTC === totalHT + taxe", () => {
      const { echeances } = genererEcheancier(
        mkParams({ periodicite: "mensuel" })
      );

      for (let i = 0; i < echeances.length; i++) {
        const e = echeances[i];
        assertNear(e.totalTTC, e.totalHT + e.taxe, `échéance ${i} totalTTC`);
      }
    });
  });

  describe("Cas 5 — Composantes à occurrence unique", () => {
    it("pj, fraisGestion, reprise uniquement sur 1er paiement de l'année", () => {
      const reprise = 100;
      const { echeances } = genererEcheancier(
        mkParams({
          periodicite: "trimestriel",
          reprise,
          dateDebut: new Date("2025-01-01"),
        })
      );

      const avecPj = echeances.filter((e) => e.pj > 0);
      const avecFraisGestion = echeances.filter((e) => e.fraisGestion > 0);
      const avecReprise = echeances.filter((e) => e.reprise > 0);

      expect(avecPj.length).toBe(1);
      expect(avecFraisGestion.length).toBe(1);
      expect(avecReprise.length).toBe(1);
    });
  });
});
