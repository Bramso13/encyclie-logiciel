# Story ecarts-montants.2: Refactoring genererEcheancier, tests d'invariants et script de correction

## Status

Ready for Review

## Story

**As a** développeur / administrateur,
**I want** une fonction `genererEcheancier` refactorée avec une architecture propre, un système de debug conditionnel, des tests unitaires validant les invariants de cohérence (sommes des composantes vs totaux annuels), et un script de correction qui recalcule et met à jour les échéances en base pour les devis non marqués `modifieAlaMain`,
**so that** le découpage de la prime soit fiable, vérifiable, et que les données existantes en base reflètent le calcul correct.

## Acceptance Criteria

1. La fonction `genererEcheancier` est refactorée : logique de dates, calculs financiers et formatage séparés en fonctions distinctes. Aucun `console.log` en dur — un système de debug conditionnel est utilisé à la place.
2. Les paramètres inutilisés sont nettoyés : `pj` et `totalHT` (et leurs équivalents N+1 `pjN1`, `totalHTN1`) sont retirés de `EcheancierParams`. La PJ est fixée à la constante `106` dans la fonction.
3. La variable `totalPaiement` (accumulée mais jamais retournée) est supprimée.
4. **Invariants vérifiés par les tests** — pour chaque périodicité (annuel, semestriel, trimestriel, mensuel) et pour des cas avec/sans prorata :
   - `Σ rcd === rcdAnnuel / nbEcheances × (ratio_1 + ratio_2 + ... + ratio_N)` (prorata pris en compte)
   - `Σ frais === fraisAnnuel / N × N_actual` (les frais ne subissent pas de prorata mais dépendent du nombre réel d'échéances générées ; `N` = nbEcheancesParAn, `N_actual` = nb réel)
   - `Σ pj === 106` (une seule PJ par année)
   - `Σ fraisGestion === fraisGestionAnnuel` (uniquement sur le 1er paiement de l'année)
   - `Σ reprise === reprise` (uniquement sur le 1er paiement)
   - `Σ totalHT === Σ rcd + Σ pj + Σ frais + Σ fraisGestion + Σ reprise` (cohérence interne)
   - `Σ totalTTC === Σ totalHT + Σ taxe` (cohérence interne)
   - `Σ taxe` est cohérent avec `taxeAnnuel` ajusté du prorata + taxe sur PJ
   - Toutes les vérifications à **± 0.02 €** de tolérance (arrondis financiers à 2 décimales)
5. Les tests couvrent aussi le cas **année N + N+1** : quand l'échéancier déborde sur l'année suivante, les paramètres N+1 sont utilisés et les invariants tiennent par année.
6. Un script `src/scripts/recalcul-echeancier.ts` permet de :
   - Sélectionner tous les devis avec `modifieAlaMain === false` ayant un `PaymentSchedule`
   - Pour chaque devis : extraire les paramètres depuis `calculatedPremium`, relancer `genererEcheancier`, comparer l'échéancier recalculé avec les `PaymentInstallment` existants en base
   - **Mode dry-run** (par défaut) : afficher un rapport des écarts détectés (par devis, par échéance, par colonne) sans modifier la base
   - **Mode apply** (flag `--apply`) : écraser les `PaymentInstallment` avec les valeurs recalculées
7. Le refactoring ne change **aucun résultat de calcul** — les tests passent avant et après le refactoring avec les mêmes entrées/sorties.
8. Les deux appelants existants (`calculation-apply.ts` et `ModificationForm.tsx`) sont mis à jour pour retirer les paramètres supprimés (`pj`, `totalHT`, `pjN1`, `totalHTN1`).

## Tasks / Subtasks

> **Ordre d'exécution** : Task 1 (tests) → Task 2 (debug) → Task 3 (refactoring) → Task 4 (appelants) → Task 5 (script)
> **Dépendance** : la Task 5 (script) nécessite que la story `ecarts-montants.1` soit déployée (champ `modifieAlaMain` en base).

- [x] **Task 1 — Tests unitaires d'invariants** (AC: 4, 5, 7)
  - [x] Créer `src/lib/tarificateurs/__tests__/genererEcheancier.test.ts`
  - [x] **Fixtures de test** : définir des jeux de paramètres réalistes pour chaque périodicité (annuel, semestriel, trimestriel, mensuel)
  - [x] **Cas 1 — Année complète (1er janvier)** : ratio = 1 pour toutes les échéances, `N_actual === nbEcheancesParAn` → vérifier égalité stricte (± 0.02 €) entre sommes et totaux annuels
  - [x] **Cas 2 — Année partielle (prorata)** : démarrage en cours de période → `N_actual < nbEcheancesParAn` possible → vérifier que `Σ rcd === rcdAnnuel / N × Σ ratios`, `Σ frais === fraisAnnuel / N × N_actual`, et que la réduction est cohérente avec le prorata
  - [x] **Cas 3 — Année N + N+1** : démarrage en milieu d'année, vérifier que les paramètres N+1 sont utilisés pour les échéances de l'année suivante, et que les invariants tiennent par année
  - [x] **Cas 4 — Cohérence interne** : pour chaque échéance, vérifier que `totalHT === rcd + pj + frais + fraisGestion + reprise` et `totalTTC === totalHT + taxe`
  - [x] **Cas 5 — Composantes à occurrence unique** : vérifier que `pj`, `fraisGestion` et `reprise` n'apparaissent que sur le 1er paiement de l'année (0 sur les autres)
  - [x] Les tests doivent passer **sur la fonction actuelle** (baseline) avant tout refactoring

- [x] **Task 2 — Système de debug conditionnel** (AC: 1)
  - [x] Créer un utilitaire de debug (ex: `const debug = createDebugLogger("echeancier")`) activable via variable d'environnement ou flag
  - [x] Remplacer tous les `console.log` de `genererEcheancier` par des appels au logger conditionnel
  - [x] Le debug doit logguer les mêmes informations utiles qu'aujourd'hui (ratios, montants par échéance, totaux) mais de manière structurée et désactivable

- [x] **Task 3 — Refactoring structurel de `genererEcheancier`** (AC: 1, 2, 3, 7)
  - [x] **Extraire la logique de génération des dates** dans une fonction pure `genererPeriodes(dateDebut, periodicite): Periode[]` qui retourne un tableau de `{ dateDebut, dateFin, ratio, estPremierPaiementAnnee, annee }`. Toute la logique de calcul de dates, prorata, et détection du premier paiement de l'année y vit.
  - [x] **Extraire le calcul financier par échéance** dans une fonction pure `calculerMontantsEcheance(periode, params): Echeance` qui prend une période et les paramètres annuels, et retourne une échéance complète.
  - [x] **Remplacer le hardcode PJ** : définir une constante `const PJ_HT = 106` et l'utiliser. Retirer `pj` et `pjN1` de `EcheancierParams`.
  - [x] **Retirer `totalHT` et `totalHTN1`** de `EcheancierParams` (jamais utilisés dans le calcul).
  - [x] **Supprimer `totalPaiement`** (accumulée mais jamais retournée ni utilisée).
  - [x] **`genererEcheancier` devient un orchestrateur** : appelle `genererPeriodes`, boucle avec `calculerMontantsEcheance`, applique la correction d'arrondi, retourne le résultat.
  - [x] **Vérifier l'iso-fonctionnalité** : relancer les tests de la Task 1 — ils doivent tous passer avec les mêmes résultats.

- [x] **Task 4 — Mise à jour des appelants** (AC: 8)
  - [x] Mettre à jour `src/lib/calculation-apply.ts` (l.74–97) : retirer `pj`, `totalHT`, `pjN1`, `totalHTN1` de l'appel
  - [x] Mettre à jour `src/app/quotes/components/forms/ModificationForm.tsx` : retirer les mêmes paramètres de l'appel `genererEcheancier`

- [x] **Task 5 — Script de recalcul et correction des échéances** (AC: 6) ⚠ Dépend de story .1 (champ `modifieAlaMain`)
  - [x] Créer `src/scripts/recalcul-echeancier.ts` avec commande npm dans `package.json`
  - [x] **Sélection** : récupérer tous les devis avec `modifieAlaMain === false`, ayant un `PaymentSchedule` avec au moins 1 `PaymentInstallment`
  - [x] **Extraction des paramètres** : depuis `quote.calculatedPremium`, reconstruire les `EcheancierParams` (même logique que `calculation-apply.ts` l.75–96)
  - [x] **Recalcul** : appeler `genererEcheancier` avec les paramètres extraits
  - [x] **Comparaison** : pour chaque échéance, comparer les valeurs recalculées vs celles en base (`amountHT`, `taxAmount`, `amountTTC`, `rcdAmount`, `pjAmount`, `feesAmount`, `resumeAmount`). Afficher un rapport clair :
    - Nombre total de devis analysés
    - Nombre de devis avec écarts
    - Pour chaque devis avec écart : référence, nombre d'échéances, détail des écarts par échéance et par colonne (valeur en base → valeur recalculée)
  - [x] **Mode dry-run** (par défaut, sans flag) : affiche le rapport, ne modifie rien
  - [x] **Mode apply** (flag `--apply`) : après affichage du rapport, met à jour les `PaymentInstallment` en base avec les valeurs recalculées (update champ par champ : `amountHT`, `taxAmount`, `amountTTC`, `rcdAmount`, `pjAmount`, `feesAmount`, `resumeAmount`)
  - [x] **Sécurité** : le script doit wraper les updates dans une transaction. En cas d'erreur sur un devis, rollback de ce devis et passage au suivant. Log des erreurs.

## Dev Notes

### Arbre source pertinent

| Fichier | Rôle |
|---------|------|
| `src/lib/tarificateurs/rcd.ts` | Fonction `genererEcheancier` (l.1034–1282), types `EcheancierParams` (l.976–996), `Echeance` (l.998–1010), `EcheancierResult` (l.1012–1032) |
| `src/lib/calculation-apply.ts` | Appelant #1 de `genererEcheancier` (l.74–97) — assemble les params depuis `calculationResult` |
| `src/app/quotes/components/forms/ModificationForm.tsx` | Appelant #2 de `genererEcheancier` — fonction `reDoEcheancier` |
| `src/app/api/quotes/[id]/payment-schedule/route.ts` | Mapping écheance → `PaymentInstallment` (l.168–181) : `amountHT ← totalHT`, `rcdAmount ← rcd`, etc. |
| `src/scripts/update-quotes-from-file.ts` | Modèle de script existant pour mise à jour en masse des échéances (l.107–147) |
| `vitest.config.ts` | Config Vitest : `include: ["src/**/*.test.ts"]`, env `node`, globals `true` |
| `src/lib/quotes/echeance-row-values.ts` | Fonctions pures de calcul des valeurs d'échéance (créé dans story .1) |

### Architecture cible de `genererEcheancier`

```
genererEcheancier(params)
  │
  ├── genererPeriodes(dateDebut, periodicite)
  │     → Periode[] = { dateDebut, dateFin, ratio, estPremierPaiementAnnee, annee }
  │
  ├── for each periode:
  │     calculerMontantsEcheance(periode, paramsAnnuels)
  │       → Echeance { rcd, pj, frais, fraisGestion, reprise, taxe, totalHT, totalTTC, ... }
  │
  ├── correctionArrondiTTC(echeances, totalTTC)
  │     → ajuste taxe de la dernière échéance
  │
  └── return { echeances, nbEcheances }
```

### Paramètres à supprimer de `EcheancierParams`

| Paramètre | Raison |
|-----------|--------|
| `pj` | Jamais utilisé, PJ toujours = 106 HT (hardcodé l.1209) |
| `totalHT` | Destructuré mais jamais référencé dans le calcul |
| `pjN1` | Jamais utilisé (PJ identique N et N+1) |
| `totalHTN1` | Destructuré mais jamais référencé |

### Appelants à mettre à jour

**`calculation-apply.ts` l.75–96** :
```
// À retirer de l'appel :
pj: newResult.autres.protectionJuridiqueTTC,        // ← supprimer
totalHT: newResult.primeTotal,                        // ← supprimer
pjN1: newResult.autresN1.protectionJuridiqueTTC,     // ← supprimer
totalHTN1: newResult.primeTotalN1,                    // ← supprimer
```

**`ModificationForm.tsx`** : même pattern, retirer `pj`, `totalHT`, `pjN1`, `totalHTN1`.

### Construction des params pour le script de recalcul

Depuis `quote.calculatedPremium` (JSON), reconstruire `EcheancierParams` :
```typescript
{
  dateDebut: new Date(quote.formData.dateDeffet),
  tauxTaxe: getTaxeByRegion(quote.formData.territory),
  taxe: cp.autres.taxeAssurance,
  totalTTC: cp.totalTTC,
  rcd: cp.primeTotal,
  frais: cp.autres.fraisFractionnementPrimeHT,
  reprise: cp.reprisePasseResult?.primeReprisePasseTTC ?? 0,
  fraisGestion: cp.fraisGestion,
  periodicite: quote.formData.periodicity,
  // N+1
  taxeN1: cp.autresN1.taxeAssurance,
  totalTTCN1: cp.totalTTCN1,
  rcdN1: cp.primeTotalN1,
  fraisN1: cp.autresN1.fraisFractionnementPrimeHT,
  fraisGestionN1: cp.fraisGestionN1,
}
```

### Système de debug recommandé

```typescript
const DEBUG_ECHEANCIER = process.env.DEBUG_ECHEANCIER === "true";

function debugLog(context: string, data: Record<string, unknown>) {
  if (!DEBUG_ECHEANCIER) return;
  console.log(`[echeancier:${context}]`, JSON.stringify(data, null, 2));
}
```

Activable via `DEBUG_ECHEANCIER=true` dans l'environnement. Pas de dépendance externe.

### Invariants — formules de vérification avec prorata

Soit `N` = `nbEcheancesParAn`, `N_actual` = nombre réel d'échéances générées, `r₁` = ratio de la première échéance (prorata), et `r₂...rₙ = 1` pour les autres.

**Année complète (1er janvier, N_actual = N)** :
```
Σ rcd   = rcdAnnuel/N × (r₁ + N-1) = rcdAnnuel × (r₁ + N-1) / N
Σ frais = fraisAnnuel/N × N = fraisAnnuel
Σ pj    = 106
Σ fraisGestion = fraisGestionAnnuel
Σ reprise = reprise
Σ taxe  = taxeAnnuel × (r₁ + N-1) / N + 106 × tauxTaxe
```

**Année partielle (démarrage en cours d'année, N_actual < N possible)** :
```
Σ rcd   = rcdAnnuel/N × Σ ratios  (somme des ratios des N_actual échéances)
Σ frais = fraisAnnuel/N × N_actual  (pas de prorata, mais moins d'échéances)
Σ pj    = 106  (si le 1er paiement de l'année est inclus)
Σ fraisGestion = fraisGestionAnnuel  (si le 1er paiement est inclus)
Σ reprise = reprise  (si le 1er paiement est inclus)
Σ taxe  = taxeAnnuel/N × Σ ratios + 106 × tauxTaxe  (si PJ incluse)
```

Tolérance : **± 0.02 €** par invariant (effet cumulé des arrondis à 2 décimales).

### Testing

- **Framework** : Vitest (déjà configuré, `npm test`)
- **Emplacement** : `src/lib/tarificateurs/__tests__/genererEcheancier.test.ts`
- **Stratégie** : écrire les tests AVANT le refactoring (les passer sur le code actuel pour établir la baseline), puis vérifier qu'ils passent toujours après.
- **Script de recalcul** : test manuel — exécuter en dry-run, vérifier le rapport, puis appliquer avec `--apply`.

## Change Log

| Date       | Version | Description                              | Author     |
| ---------- | ------- | ---------------------------------------- | ---------- |
| 2026-03-19 | 0.1     | Création de la story                     | Sarah (PO) |
| 2026-03-19 | 0.2     | Validation : P1 (ordre TDD tasks), P2 (invariant frais année partielle), P3 (dépendance story .1) | Sarah (PO) |
| 2026-03-19 | 0.3     | Approbation post-validation              | Sarah (PO) |
| 2026-03-19 | 0.4     | Implémentation complète : tests, debug, refactoring, script | James (Dev) |

## Dev Agent Record

### Agent Model Used

-

### Debug Log References

-

### Completion Notes List

- Tests invariants : Cas semestriel 1er janv utilise un prorata sur la 1ère période (ratio ≈ 181/182), d'où Σ rcd ≈ 1196,7 au lieu de 1200.
- Debug activable via `DEBUG_ECHEANCIER=true`.
- Script `npm run recalcul-echeancier` : dry-run par défaut, `--apply` pour persister les corrections.

### File List

| Fichier | Action |
|---------|--------|
| `src/lib/tarificateurs/__tests__/genererEcheancier.test.ts` | Créé |
| `src/lib/tarificateurs/rcd.ts` | Modifié |
| `src/lib/calculation-apply.ts` | Modifié |
| `src/app/quotes/components/forms/ModificationForm.tsx` | Modifié |
| `src/scripts/recalcul-echeancier.ts` | Créé |
| `package.json` | Modifié (script recalcul-echeancier) |

## QA Results

_(À remplir par QA)_
