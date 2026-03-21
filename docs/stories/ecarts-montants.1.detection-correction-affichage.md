# Story ecarts-montants.1: Détection devis à montants égaux, marquage manuel et correction d'affichage

## Status

Ready for Review

## Story

**As a** administrateur,
**I want** un onglet dans l'interface admin listant tous les devis/contrats dont les échéances ont des `amountHT` strictement identiques, pouvoir les marquer comme « modifié à la main » via un toggle, et que l'affichage (CalculationTab et bordereaux) s'adapte en conséquence,
**so that** je puisse identifier les devis mal calculés, les signaler explicitement, et garantir un affichage cohérent des échéanciers et des bordereaux sans altérer les données en base.

## Acceptance Criteria

1. Le modèle Prisma `Quote` possède un nouveau champ `modifieAlaMain` (`Boolean`, default `false`). La migration Prisma est générée (non appliquée automatiquement).
2. L'écran admin (`AdminScreen`) contient un nouvel onglet « Écarts montants » (ou similaire) accessible aux administrateurs.
3. L'onglet affiche la liste de tous les devis dont **toutes** les `PaymentInstallment.amountHT` sont **strictement égales** entre elles.
4. Chaque ligne affiche : référence du devis, statut, nombre d'échéances, montant `amountHT` commun, présence d'un contrat lié (oui/non + référence contrat si existant), et l'état actuel de `modifieAlaMain`.
5. Un champ de recherche/filtre par **référence** de devis est disponible.
6. Un bouton toggle permet d'activer/désactiver `modifieAlaMain` sur chaque devis (persisté en base via API).
7. **CalculationTab** — Pour les devis marqués `modifieAlaMain`, l'affichage des échéanciers est recalculé **à la volée** (sans modifier la base) :
   - `RcdHT` = `amountHT` (la valeur stockée en base pour l'échéance)
   - `pjHT` = `pjAmount` (106 € sur les échéances concernées, 0 sinon)
   - `fraisHT` = `feesAmount` (valeur en base)
   - `fraisGestionHT` = 10% × `RcdHT` **uniquement sur l'échéance 1** (0 pour les autres)
   - `reprise` = `resumeAmount` (valeur en base)
   - `TotalHT` = `RcdHT` + `pjHT` + `fraisHT` + `fraisGestionHT` + `reprise`
   - `TotalTTC` = `TotalHT` + `taxe` (taxe = `taxAmount` en base)
8. **CalculationTab** — Pour les devis **non** marqués `modifieAlaMain`, aucun changement de comportement.
9. **Bordereaux** (extractQuittancesV2 + BordereauTab) — Pour les devis **non** marqués `modifieAlaMain` :
   - `PRIME_HT` = `rcdAmount` (au lieu de `amountHT`)
   - `PRIME_TTC` = `PRIME_HT` + `taxAmount` (au lieu de `amountTTC`)
   - `COMMISSION_HT` = `PRIME_HT` × 0.24
10. **Bordereaux** — Pour les devis marqués `modifieAlaMain`, aucun changement (on garde `amountHT` / `amountTTC` tels quels — le marquage indique que ces montants ont été jugés fiables par l'administrateur).
11. Aucune valeur en base de données n'est modifiée par les AC 7, 9 et 10 : il s'agit uniquement de changements d'**affichage / mapping**.

## Tasks / Subtasks

- [x] **Task 1 — Migration Prisma** (AC: 1)
  - [x] Ajouter le champ `modifieAlaMain Boolean @default(false)` au modèle `Quote` dans `prisma/schema.prisma`
  - [x] Vérifier que le client Prisma est régénéré (`npx prisma generate`)

- [x] **Task 2 — API : liste des devis à amountHT égales** (AC: 3, 4, 5)
  - [x] Créer un endpoint `GET /api/admin/ecarts-montants` qui :
    - Récupère tous les devis ayant un `PaymentSchedule` avec au moins 2 `PaymentInstallment`
    - Filtre ceux dont tous les `amountHT` sont strictement identiques
    - Retourne : `id`, `reference`, `status`, nombre d'échéances, `amountHT` commun, contrat lié (`contract.id`, `contract` existence), `modifieAlaMain`
    - Supporte un query param `?search=` pour filtrer par référence
  - [x] Protéger l'endpoint (rôle ADMIN)

- [x] **Task 3 — API : toggle modifieAlaMain** (AC: 6)
  - [x] Créer un endpoint `PATCH /api/admin/ecarts-montants/[quoteId]` qui toggle le champ `modifieAlaMain` sur le devis
  - [x] Protéger l'endpoint (rôle ADMIN)

- [x] **Task 4 — Onglet admin « Écarts montants »** (AC: 2, 3, 4, 5, 6)
  - [x] Créer le composant `EcartsMontantsTab` (ou dans `src/app/admin/ecarts-montants/`)
  - [x] Intégrer dans `AdminScreen.tsx` comme nouvel onglet (après « Bordereaux » par exemple)
  - [x] Afficher un tableau avec les colonnes : Référence, Statut, Nb échéances, Montant HT commun, Contrat lié (oui/non + réf), modifieAlaMain (toggle)
  - [x] Champ de recherche par référence avec debounce
  - [x] Toggle switch par ligne appelant l'API PATCH
  - [x] États de chargement et gestion d'erreurs

- [x] **Task 5 — CalculationTab : affichage conditionnel** (AC: 7, 8)
  - [x] Dans `CalculationTab.tsx`, récupérer le flag `modifieAlaMain` du devis (via les données déjà chargées ou un appel supplémentaire)
  - [x] **Extraire la logique de calcul dans des fonctions pures dédiées, séparées du rendu.** L'objectif est une architecture maintenable et facilement débugable :
    - [x] Créer une fonction pure `computeRowValuesModifieAlaMain(inst: PaymentInstallment, origIndex: number): EcheanceRowValues` qui encapsule le calcul pour les devis marqués :
      - `rcdHT` = `inst.amountHT`
      - `pj` = `inst.pjAmount ?? 0`
      - `frais` = `inst.feesAmount ?? 0`
      - `fraisGestion` = `origIndex === 0 ? rcdHT * 0.10 : 0` (uniquement sur l'échéance 1)
      - `reprise` = `inst.resumeAmount ?? 0`
      - `totalHT` = `rcdHT + pj + frais + fraisGestion + reprise`
      - `taxe` = `inst.taxAmount`
      - `totalTTC` = `totalHT + taxe`
    - [x] Créer une fonction pure `computeRowValuesDefault(inst: PaymentInstallment, origIndex: number, fraisGestionGlobal: number): EcheanceRowValues` qui encapsule le calcul existant (comportement actuel inchangé). `origIndex` est nécessaire pour déterminer si c'est l'échéance 1 (seule à recevoir fraisGestion dans le comportement actuel), et `fraisGestionGlobal` correspond à `calculationResult?.fraisGestion ?? 0`
    - [x] Typer explicitement les entrées et sorties avec une interface `EcheanceRowValues` (rcdHT, pj, frais, fraisGestion, reprise, taxe, totalHT, totalTTC)
    - [x] `getEcheanceRowValues` devient un simple aiguillage : `modifieAlaMain ? computeRowValuesModifieAlaMain(inst) : computeRowValuesDefault(inst, ...)`
  - [x] **Chaque valeur intermédiaire doit être calculée dans une variable nommée explicitement** (pas de calculs inline imbriqués) pour faciliter le step-through debugging et la lisibilité
  - [x] Si `modifieAlaMain === false`, conserver le comportement actuel inchangé — la refacto en `computeRowValuesDefault` ne doit changer aucun résultat

- [x] **Task 6 — Bordereaux : mapping conditionnel** (AC: 9, 10, 11)
  - [x] Dans `src/lib/bordereau/extractQuittancesV2.ts`, pour chaque échéance, vérifier le flag `modifieAlaMain` du devis associé :
    - Si `modifieAlaMain === false` : `PRIME_HT` = `inst.rcdAmount`, `PRIME_TTC` = `inst.rcdAmount + inst.taxAmount`, commission = `inst.rcdAmount * 0.24`
    - Si `modifieAlaMain === true` : conserver le comportement actuel (`PRIME_HT` = `inst.amountHT`, etc.)
  - [x] Appliquer la même logique dans `src/app/quotes/tabs/BordereauTab.tsx`
  - [x] S'assurer que le flag `modifieAlaMain` est accessible dans le contexte d'extraction (jointure Quote dans la requête bordereaux)

## Dev Notes

### Arbre source pertinent

| Fichier                                             | Rôle                                                                                                                                                           |
| --------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `prisma/schema.prisma`                              | Modèle Quote (l.336–382), PaymentInstallment (l.847–901), PaymentSchedule (l.816–844)                                                                          |
| `src/app/dashboard/AdminScreen.tsx`                 | Écran admin avec onglets (products, brokers, quotes, messages, simulator, productConfig, correspondance, versions, overduePayments, bordereaux, underwriters)  |
| `src/app/quotes/tabs/CalculationTab.tsx`            | Affichage échéanciers — fonction `getEcheanceRowValues` (l.~140–170) : branche PaymentInstallment renvoie `totalHT: inst.amountHT`, `totalTTC: inst.amountTTC` |
| `src/lib/bordereau/extractQuittancesV2.ts`          | Extraction quittances pour bordereaux — `PRIME_HT: String(inst.amountHT)` (l.329), `PRIME_TTC: String(inst.amountTTC)` (l.328)                                 |
| `src/app/quotes/tabs/BordereauTab.tsx`              | Onglet bordereau par devis — `PRIME_HT: String(inst.amountHT)` (l.385), `PRIME_TTC: String(inst.amountTTC)` (l.384), commission = `inst.amountHT * 0.24`       |
| `src/app/api/quotes/[id]/payment-schedule/route.ts` | Création échéances : `amountHT ← echeance.totalHT`                                                                                                             |
| `src/lib/tarificateurs/rcd.ts`                      | Calcul RCD : `totalHTEcheance = rcd + pj + frais + fraisGestion + reprise`, correction écart arrondi l.1257–1273                                               |

### Exigences de qualité de code — CalculationTab

Le fichier `CalculationTab.tsx` est un composant critique et historiquement difficile à débugger. La Task 5 doit produire un code **structuré comme le ferait un expert en ingénierie logicielle** :

1. **Fonctions pures isolées** : les deux chemins de calcul (`modifieAlaMain` vs défaut) doivent vivre dans des fonctions pures séparées, sans effet de bord, sans dépendance à du state React. Cela permet de les tester et débugger indépendamment.
2. **Variables intermédiaires nommées** : chaque étape du calcul doit être assignée à une variable au nom explicite. Interdiction de chaîner des opérations arithmétiques inline (ex: `inst.amountHT + (inst.pjAmount ?? 0) + ...`). On veut pouvoir poser un breakpoint sur chaque ligne et inspecter chaque valeur.
3. **Typage strict** : définir une interface `EcheanceRowValues` avec tous les champs typés `number`. Les fonctions de calcul doivent la retourner explicitement.
4. **Aiguillage clair** : `getEcheanceRowValues` ne doit contenir aucune logique de calcul — c'est un dispatcher qui délègue à la bonne fonction selon le flag.
5. **Pas de duplication** : si des calculs sont communs aux deux chemins (ex: fallback `?? 0`), les extraire dans des helpers.

### Points techniques critiques

- **`amountHT` en base** = `totalHT` du calcul RCD (inclut déjà RCD + PJ + frais + fraisGestion + reprise). Pour les devis « à amountHT égaux », cette valeur est suspecte car elle ne varie pas d'une échéance à l'autre malgré les composantes variables (PJ à 106 € sur 1 échéance/an, fraisGestion sur 1 échéance/an, reprise sur 1ère échéance).
- **`rcdAmount`** en base = la part RCD seule de l'échéance. C'est la valeur correcte pour `PRIME_HT` dans les bordereaux.
- **`fraisGestion`** n'est pas stocké par échéance dans `PaymentInstallment`. Pour le CalculationTab des devis `modifieAlaMain`, il faut le calculer à la volée : `fraisGestionHT = rcdHT * 0.10` (où `rcdHT = amountHT`).
- **Répartition `fraisGestion`** : dans les deux chemins (défaut et `modifieAlaMain`), `fraisGestion` ne s'applique qu'à l'**échéance 1** (`origIndex === 0`). Pour `modifieAlaMain`, la valeur est `rcdHT * 0.10` ; pour le défaut, elle vient de `calculationResult.fraisGestion`.
- **pjHT = 106 €** est un montant fixe (Protection Juridique). En base, `pjAmount` contient déjà cette valeur (106 sur les échéances 1ère de chaque année, 0 sinon).
- Les modifications de bordereaux (Task 6) nécessitent que le flag `modifieAlaMain` soit disponible lors de l'extraction. S'assurer que la requête Prisma dans `extractQuittancesV2` fait une jointure avec `Quote` pour accéder au flag.

### ⚠ Risque : impact global sur les bordereaux au déploiement

L'AC 9 modifie le mapping bordereaux pour **tous** les devis où `modifieAlaMain = false`. Comme le champ default à `false`, **tous les devis existants** seront immédiatement impactés après déploiement : les bordereaux générés après la mise en production utiliseront `rcdAmount` au lieu de `amountHT` pour `PRIME_HT`. Conséquences :
- Un bordereau généré avant le déploiement (avec `amountHT`) et un bordereau généré après (avec `rcdAmount`) pour le même devis auront des valeurs `PRIME_HT` différentes.
- **Mitigation** : l'administrateur doit marquer les devis concernés via l'onglet admin **avant** de régénérer des bordereaux, afin que ceux qui doivent garder l'ancien comportement soient protégés par le flag `modifieAlaMain = true`.

### Formules récapitulatives

**CalculationTab (si `modifieAlaMain = true`)** :

```
RcdHT        = inst.amountHT
pjHT         = inst.pjAmount ?? 0
fraisHT      = inst.feesAmount ?? 0
fraisGestion = (origIndex === 0) ? inst.amountHT * 0.10 : 0
reprise      = inst.resumeAmount ?? 0
TotalHT      = RcdHT + pjHT + fraisHT + fraisGestion + reprise
TotalTTC     = TotalHT + inst.taxAmount
```

**Bordereaux (si `modifieAlaMain = false`)** :

```
PRIME_HT      = inst.rcdAmount
PRIME_TTC     = inst.rcdAmount + inst.taxAmount
COMMISSION_HT = inst.rcdAmount * 0.24
```

### Testing

- **Test manuel — Onglet admin** : vérifier que seuls les devis avec toutes les `amountHT` égales apparaissent. Tester le filtre par référence. Tester le toggle on/off.
- **Test manuel — CalculationTab** : ouvrir un devis marqué `modifieAlaMain`, vérifier que `RcdHT = amountHT`, `fraisGestion = 10% RcdHT`, `TotalHT` = somme des composantes, `TotalTTC = TotalHT + taxe`. Vérifier qu'un devis non marqué reste inchangé.
- **Test manuel — Bordereaux** : générer un bordereau avec des devis non marqués, vérifier que `PRIME_HT = rcdAmount`, `PRIME_TTC = rcdAmount + taxAmount`, `commission = rcdAmount * 0.24`. Vérifier qu'un devis marqué garde l'ancien comportement.
- **Test de non-régression** : s'assurer qu'aucune valeur en base n'est modifiée.

## Change Log

| Date       | Version | Description          | Author     |
| ---------- | ------- | -------------------- | ---------- |
| 2026-03-19 | 0.1     | Création de la story | Sarah (PO) |
| 2026-03-19 | 0.2     | Validation : corrections P1 (AC 10 justification), P2 (signature computeRowValuesDefault), P3 (risque impact bordereaux), P4 (fraisGestion par échéance) | Sarah (PO) |
| 2026-03-19 | 0.3     | Approbation post-validation | Sarah (PO) |
| 2026-03-19 | 0.4     | Implémentation story (écarts montants, APIs, CalculationTab, bordereaux) | James (Dev) |

## Dev Agent Record

### Agent Model Used

Composer (agent dev James)

### Debug Log References

-

### Completion Notes List

- Migration SQL : `prisma/migrations/20260319220000_add_quote_modifie_a_la_main/migration.sql` (à appliquer sur les environnements : `npx prisma migrate deploy`). Client régénéré via `npx prisma generate`.
- Tests unitaires : `src/lib/quotes/echeance-row-values.test.ts` (5 tests OK). La suite Vitest complète comporte des échecs préexistants (`extractPolicesV2.test.ts`, `utils.test.ts`) non liés à cette story.
- Lint : `npm run lint` OK (warnings préexistants sur d’autres fichiers).
- DoD checklist (story-dod-checklist) : exigences fonctionnelles couvertes ; tests E2E / manuels non exécutés dans cet environnement ; à valider en recette (onglet admin, CalculationTab, export bordereau v2).

### File List

- `prisma/schema.prisma`
- `prisma/migrations/20260319220000_add_quote_modifie_a_la_main/migration.sql`
- `src/lib/types.ts`
- `src/lib/quotes/echeance-row-values.ts`
- `src/lib/quotes/echeance-row-values.test.ts`
- `src/app/api/admin/ecarts-montants/route.ts`
- `src/app/api/admin/ecarts-montants/[quoteId]/route.ts`
- `src/components/admin/EcartsMontantsTab.tsx`
- `src/app/dashboard/AdminScreen.tsx`
- `src/app/quotes/tabs/CalculationTab.tsx`
- `src/lib/bordereau/extractQuittancesV2.ts`
- `src/app/quotes/tabs/BordereauTab.tsx`

## QA Results

_(À remplir par QA)_
