# Story: Corrections esthétiques du PDF Offre (OfferLetterPDF)

## Status

Ready for Review

## Story

**As a** administrateur Encyclie,
**I want** que le PDF de proposition d'offre (OfferLetterPDF) soit corrigé esthétiquement et fonctionnellement,
**so that** le document envoyé au courtier soit propre, précis et sans doublons ni champs inutiles.

## Acceptance Criteria

1. **Page 1 — Nom du courtier en haut à droite** : Le nom du courtier (broker) assigné au dossier est affiché en haut à droite de la page 1, à côté ou au-dessus de la référence dossier.
2. **Page 1 — Retrait de « N° code : BRVE… »** : La ligne `N° code : {brokerCode}` est entièrement supprimée de l'en-tête de la page 1.
3. **Page 4 — Retrait de l'espace vide sous « DETAIL DE LA PRIME »** : Le `marginTop: 120` sur le bloc des tableaux 2026 est retiré ou réduit afin de supprimer l'espace vide excessif.
4. **Page 4 — Suppression du doublon de tableau de primes** : Pour chaque année, un seul tableau de primes est affiché (supprimer `renderPrimesAnnuellesTable`, conserver uniquement `renderPrimesTable`).
5. **Page 4 — Ajout de « CFDP » à la ligne PJ** : Dans le tableau de Primes, la ligne 2 « Prime Protection Juridique Complément RCD » est renommée en « Prime Protection Juridique Complément RCD CFDP ».
6. **Page 5 — Nombre d'échéances reprise du passé** : Le champ « Nombre d'échéances pour la reprise du passé si incluse » affiche une valeur : `0` si `garantieReprisePasse` est `false`/non souscrit, `1` si souscrit (la reprise est une prime unique à la souscription).
7. **Page 5 — Suppression de « Dont TTC € **\_\_** »** : Le placeholder `Dont TTC € __________` est supprimé car il n'est connecté à aucune source de données.

## Tasks / Subtasks

- [x] **Task 1 — Passer le nom du courtier au composant PDF** (AC: 1)
  - [x] Modifier l'interface `OfferLetterPDFProps` pour ajouter un champ `brokerName: string`
  - [x] Dans `src/app/api/generate-pdf/route.ts`, récupérer le nom du broker depuis `quote.broker?.name` ou depuis la base via le `brokerId` du quote, et le passer en prop au composant
  - [x] Afficher `brokerName` en haut à droite de la Page 1 dans le `headerRow`

- [x] **Task 2 — Retirer « N° code : {brokerCode} »** (AC: 2)
  - [x] Supprimer la ligne `<Text style={styles.headerText}>N° code : {brokerCode}</Text>` (ligne ~930 actuelle)
  - [x] Évaluer si la prop `brokerCode` peut être retirée de l'interface si elle n'est plus utilisée ailleurs

- [x] **Task 3 — Retirer l'espace vide sous « DETAIL DE LA PRIME »** (AC: 3)
  - [x] Supprimer ou réduire le `marginTop: 120` dans le `<View style={{ marginTop: 120 }}>` (ligne ~1489) qui entoure le rendu des tableaux 2026

- [x] **Task 4 — Supprimer le doublon de tableau de primes** (AC: 4)
  - [x] Supprimer les appels à `renderPrimesAnnuellesTable(2025, ...)` et `renderPrimesAnnuellesTable(2026, ...)`
  - [x] Supprimer la fonction `renderPrimesAnnuellesTable` entièrement (lignes ~616-885)
  - [x] Vérifier que seul `renderPrimesTable` est conservé pour chaque année

- [x] **Task 5 — Ajouter « CFDP » à la ligne PJ dans les tableaux** (AC: 5)
  - [x] Dans `renderPrimesTable`, modifier le texte de la ligne 2 de `Prime Protection Juridique Complément RCD` en `Prime Protection Juridique Complément RCD CFDP`

- [x] **Task 6 — Afficher le nombre d'échéances reprise du passé** (AC: 6)
  - [x] Dans la section « Modalités de gestion » (Page 5), ajouter la valeur après le libellé « Nombre d'échéances pour la reprise du passé si incluse »
  - [x] Logique : si `formData.garantieReprisePasse` est `true` → afficher `1`, sinon → afficher `0`

- [x] **Task 7 — Supprimer « Dont TTC € **\_\_** »** (AC: 7)
  - [x] Supprimer le bloc `<View>` contenant `Dont TTC € __________` (lignes ~1504-1514)

## Dev Notes

### Fichiers impactés

| Fichier                                 | Nature du changement                                                |
| --------------------------------------- | ------------------------------------------------------------------- |
| `src/components/pdf/OfferLetterPDF.tsx` | Composant principal — toutes les modifications esthétiques (AC 1-7) |
| `src/app/api/generate-pdf/route.ts`     | Passage de la prop `brokerName` au composant (AC 1)                 |

### Contexte technique

- **Framework PDF** : `@react-pdf/renderer` — les composants utilisent `<Document>`, `<Page>`, `<View>`, `<Text>`, `<Image>` avec des `StyleSheet`.
- **Interface actuelle** : `OfferLetterPDFProps` contient `quote`, `formData`, `calculationResult`, `brokerCode`, `selectedDocuments`, `baseUrl`.
- **Données broker disponibles** : `quote.broker` contient `{ id, name, email, role }` (voir `src/lib/types.ts` ligne 87-92). Le nom est donc accessible via `quote.broker?.name`.
- **Doublon identifié** : `renderPrimesTable` et `renderPrimesAnnuellesTable` ont exactement la même structure de calcul et le même nombre de lignes. Seul le titre diffère (« PRIMES pour la période » vs « PRIMES annuelles pour la période »).
- **Reprise du passé** : La reprise est calculée comme prime unique à la souscription (`repriseEcheance = periode.estPremierPaiementAnnee ? params.reprise : 0`). Le champ `formData.garantieReprisePasse` (boolean) indique si elle est souscrite.
- **API generate-pdf** : Le `brokerCode` est récupéré depuis `brokerProfile.code`. Pour le `brokerName`, on peut soit :
  - Utiliser `quote.broker?.name` (déjà dans le payload `quote` envoyé au frontend)
  - Faire un `prisma.user.findUnique` sur le `brokerId` du quote côté API

### Structure des pages PDF (correspondance code ↔ document)

| Page PDF | Contenu                                       | Début dans le code (ligne approx.) |
| -------- | --------------------------------------------- | ---------------------------------- |
| Page 1   | Déclaration du proposant                      | L.910                              |
| Page 2   | Activités garanties                           | L.1219                             |
| Page 3   | Montant des garanties et des franchises       | L.1269                             |
| Page 4   | Produits d'assurances + Détails de la prime   | L.1447                             |
| Page 5   | Échéancier et modalités                       | L.1497                             |
| Page 6   | Conditions et déclarations + RGPD + Signature | L.1701                             |

### Testing

- Vérifier visuellement le PDF généré après les modifications sur un dossier de test
- Vérifier que le nom du courtier s'affiche correctement en haut à droite (Page 1)
- Vérifier qu'il n'y a plus de « N° code » sur la Page 1
- Vérifier l'absence d'espace vide sous « DETAIL DE LA PRIME » (Page 4)
- Vérifier qu'il n'y a plus qu'un seul tableau de primes par année (Page 4)
- Vérifier que « CFDP » apparaît bien sur la ligne PJ (Page 4)
- Vérifier que le nombre d'échéances reprise du passé affiche 0 ou 1 selon le cas (Page 5)
- Vérifier que « Dont TTC € » n'apparaît plus (Page 5)

## Dev Agent Record

### Agent Model Used

Cursor agent (Claude)

### Debug Log References

— (aucun fichier de debug utilisé)

### Completion Notes List

- Les 7 critères d’acceptation sont couverts dans `OfferLetterPDF.tsx` et `generate-pdf/route.ts` : `brokerName` (prop + résolution `quote.broker?.name` puis fallback `brokerId` / Prisma), en-tête page 1, retrait `N° code`, `marginTop` 2026 à 16, suppression `renderPrimesAnnuellesTable`, libellé PJ « CFDP », échéances reprise 0/1, retrait « Dont TTC ».
- `brokerCode` retiré des props PDF offre uniquement (toujours utilisé ailleurs, ex. lettre d’intention).
- Validations : `npm run lint` (warnings préexistants uniquement) ; `npm run build` OK ; `npm test` : 11 échecs préexistants hors périmètre (bordereau, tarificateur, utils statut police).

### Story DoD checklist (self-assessment)

1. Requirements / AC : [x] implémentés comme spécifié.
2. Coding standards : [x] aligné au code existant ; pas de secrets ; [N/A] guidelines architecture (fichiers manquants dans le repo).
3. Testing : [ ] suite Vitest complète verte (échecs préexistants) ; story demande surtout vérif visuelle PDF.
4. Fonctionnalité : [ ] non vérifié manuellement dans un navigateur dans cette session ; à valider sur un dossier réel.
5. Story admin : [x] tâches cochées, fichier et changelog mis à jour.
6. Build : [x] `next build` sans erreur ; pas de nouvelle dépendance.

### File List

- `src/components/pdf/OfferLetterPDF.tsx` (modifié)
- `src/app/api/generate-pdf/route.ts` (modifié)

## Change Log

| Date       | Version | Description                                                             | Author     |
| ---------- | ------- | ----------------------------------------------------------------------- | ---------- |
| 2026-03-25 | 1.0     | Création initiale de la story                                           | PO (Sarah) |
| 2026-03-25 | 1.1     | Implémentation corrections esthétiques / fonctionnelles PDF offre (dev) | Dev Agent  |
