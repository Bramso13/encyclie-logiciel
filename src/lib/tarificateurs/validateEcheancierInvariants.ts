/**
 * Validation des invariants de l'échéancier — même logique que genererEcheancier.test.ts
 * Retourne des résultats structurés pour affichage UI.
 */

type Echeance = {
  rcd: number;
  pj: number;
  frais: number;
  reprise: number;
  fraisGestion: number;
  taxe: number;
  totalHT: number;
  totalTTC: number;
};

type EcheancierParams = {
  rcd: number;
  taxe: number;
  frais: number;
  fraisGestion: number;
  reprise: number;
  totalTTC: number;
  periodicite: "annuel" | "semestriel" | "trimestriel" | "mensuel";
};

export type TestResult = {
  nom: string;
  ok: boolean;
  detail: string;
};

const TOLERANCE = 0.02;

function near(a: number, b: number): boolean {
  return Math.abs(a - b) <= TOLERANCE;
}

export function validateEcheancierInvariants(
  echeances: Echeance[],
  params: EcheancierParams
): TestResult[] {
  const results: TestResult[] = [];

  if (echeances.length === 0) {
    results.push({ nom: "Échéances non vides", ok: false, detail: "Aucune échéance générée" });
    return results;
  }

  const nbEcheancesParAn = { annuel: 1, semestriel: 2, trimestriel: 4, mensuel: 12 }[params.periodicite];
  const sumRcd = echeances.reduce((a, e) => a + e.rcd, 0);
  const sumFrais = echeances.reduce((a, e) => a + e.frais, 0);
  const sumPj = echeances.reduce((a, e) => a + e.pj, 0);
  const sumFraisGestion = echeances.reduce((a, e) => a + e.fraisGestion, 0);
  const sumReprise = echeances.reduce((a, e) => a + e.reprise, 0);
  const sumTotalHT = echeances.reduce((a, e) => a + e.totalHT, 0);
  const sumTaxe = echeances.reduce((a, e) => a + e.taxe, 0);
  const sumTotalTTC = echeances.reduce((a, e) => a + e.totalTTC, 0);

  // Σ pj === 106 × nombre d'années civiles couvertes
  const nbPj = echeances.filter(e => e.pj > 0).length;
  const expectedPj = 106 * nbPj;
  const pjOk = near(sumPj, expectedPj);
  results.push({
    nom: `Σ pj === 106 × ${nbPj} année(s)`,
    ok: pjOk,
    detail: pjOk ? `OK (${sumPj.toFixed(2)})` : `ÉCHEC: ${sumPj.toFixed(2)} (attendu ${expectedPj})`,
  });

  // Σ fraisGestion === fraisGestionAnnuel
  const fgOk = near(sumFraisGestion, params.fraisGestion);
  results.push({
    nom: "Σ fraisGestion === fraisGestionAnnuel",
    ok: fgOk,
    detail: fgOk ? `OK (${sumFraisGestion.toFixed(2)})` : `ÉCHEC: ${sumFraisGestion.toFixed(2)} vs ${params.fraisGestion}`,
  });

  // Σ reprise === reprise
  const repOk = near(sumReprise, params.reprise);
  results.push({
    nom: "Σ reprise === reprise",
    ok: repOk,
    detail: repOk ? `OK (${sumReprise.toFixed(2)})` : `ÉCHEC: ${sumReprise.toFixed(2)} vs ${params.reprise}`,
  });

  // Σ totalHT === Σ composantes
  const sumComposantes = sumRcd + sumPj + sumFrais + sumFraisGestion + sumReprise;
  const htOk = near(sumTotalHT, sumComposantes);
  results.push({
    nom: "Σ totalHT === Σ (rcd+pj+frais+fraisGestion+reprise)",
    ok: htOk,
    detail: htOk ? `OK (${sumTotalHT.toFixed(2)})` : `ÉCHEC: ${sumTotalHT.toFixed(2)} vs ${sumComposantes.toFixed(2)}`,
  });

  // Σ totalTTC === Σ totalHT + Σ taxe
  const ttcOk = near(sumTotalTTC, sumTotalHT + sumTaxe);
  results.push({
    nom: "Σ totalTTC === Σ totalHT + Σ taxe",
    ok: ttcOk,
    detail: ttcOk ? `OK (${sumTotalTTC.toFixed(2)})` : `ÉCHEC: ${sumTotalTTC.toFixed(2)} vs ${(sumTotalHT + sumTaxe).toFixed(2)}`,
  });

  // Σ totalTTC === totalTTC attendu (prorata compris)
  // On dérive le ratio de la 1ère période via le RCD réel vs RCD/N
  const N = nbEcheancesParAn;
  const nbActual = echeances.length;
  const rcdParEcheancePlein = params.rcd / N;
  const ratio1 = rcdParEcheancePlein > 0 ? echeances[0].rcd / rcdParEcheancePlein : 1;
  const sumRatios = ratio1 + (nbActual - 1);
  const tauxTaxe = params.rcd > 0 ? params.taxe / params.rcd : 0;

  const expectedRcd = rcdParEcheancePlein * sumRatios;
  const expectedTaxe = (params.taxe / N) * sumRatios + sumPj * tauxTaxe;
  const expectedFrais = (params.frais / N) * nbActual;
  const expectedTTC = expectedRcd + expectedTaxe + expectedFrais + params.fraisGestion + sumPj + params.reprise;

  const ttcToleranceArrondi = nbActual * 0.1;
  const ttcOkVsExpected = Math.abs(sumTotalTTC - expectedTTC) <= ttcToleranceArrondi;
  results.push({
    nom: `Σ totalTTC === primeTTC attendue (${nbActual}/${N} éch., ratio=${ratio1.toFixed(3)})`,
    ok: ttcOkVsExpected,
    detail: ttcOkVsExpected
      ? `OK (${sumTotalTTC.toFixed(2)} ≈ ${expectedTTC.toFixed(2)})`
      : `ÉCHEC: ${sumTotalTTC.toFixed(2)} vs ${expectedTTC.toFixed(2)} attendu`,
  });

  // Cohérence par échéance : totalHT === rcd+pj+frais+fraisGestion+reprise
  let cohHT = true;
  for (let i = 0; i < echeances.length; i++) {
    const e = echeances[i];
    const comp = e.rcd + e.pj + e.frais + e.fraisGestion + (e.reprise ?? 0);
    if (!near(e.totalHT, comp)) {
      cohHT = false;
      break;
    }
  }
  results.push({
    nom: "Chaque échéance : totalHT = rcd+pj+frais+fraisGestion+reprise",
    ok: cohHT,
    detail: cohHT ? `OK (${echeances.length} échéances)` : "ÉCHEC: au moins une échéance incohérente",
  });

  // Cohérence par échéance : totalTTC === totalHT + taxe
  let cohTTC = true;
  for (let i = 0; i < echeances.length; i++) {
    const e = echeances[i];
    if (!near(e.totalTTC, e.totalHT + e.taxe)) {
      cohTTC = false;
      break;
    }
  }
  results.push({
    nom: "Chaque échéance : totalTTC = totalHT + taxe",
    ok: cohTTC,
    detail: cohTTC ? `OK (${echeances.length} échéances)` : "ÉCHEC: au moins une échéance incohérente",
  });

  // PJ, fraisGestion, reprise uniquement sur 1ère
  const avecPj = echeances.filter((e) => e.pj > 0).length;
  const avecFraisGestion = echeances.filter((e) => e.fraisGestion > 0).length;
  const avecReprise = echeances.filter((e) => e.reprise > 0).length;
  const uniqueOk = avecPj <= 1 && avecFraisGestion <= 1 && avecReprise <= 1;
  results.push({
    nom: "pj, fraisGestion, reprise uniquement sur 1er paiement",
    ok: uniqueOk,
    detail: uniqueOk
      ? `OK (pj:${avecPj}, fg:${avecFraisGestion}, rep:${avecReprise})`
      : `ÉCHEC: pj=${avecPj}, fraisGestion=${avecFraisGestion}, reprise=${avecReprise}`,
  });

  return results;
}
