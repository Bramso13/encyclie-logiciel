# Story bordereau-fidelidade-v2.2: Service d’extraction — Feuille 1 Polices

## Status

Ready for Review

## Story

**As a** back-office / administrateur,
**I want** un service qui extrait les contrats et quotes avec statut ACCEPTED (filtrés par **période** uniquement) et produit les lignes de la **Feuille 1 Polices** (une ligne = une police), avec APPORTEUR = constante et 8 paires LIBELLÉ_ACTIVITÉ / POIDS_ACTIVITÉ,
**so that** le CSV polices soit correctement alimenté sans sélection de courtier et avec un mapping exhaustif des colonnes.

## Acceptance Criteria

1. Le service accepte **uniquement la période** (dateRange : startDate, endDate). Pas de paramètre brokerIds.
2. **Source des données :** contrats + quotes avec statut ACCEPTED dont la police/le contrat entre dans le périmètre (ex. dates contrat ou dates d’échéance dans la période — à préciser selon règle métier).
3. **Une ligne = une police** (une ligne par contrat ou quote accepté).
4. **APPORTEUR** : valeur constante (depuis config/env, Story v2.1).
5. **IDENTIFIANT_POLICE** : **Quote.reference** (champ existant ; pas de champ dédié).
6. **8 paires** LIBELLÉ_ACTIVITÉ / POIDS_ACTIVITÉ ; mapping depuis formData.activites (codes 1–20, caSharePercent) ; colonnes vides si moins de 8 activités.
7. Toutes les colonnes Feuille 1 mappées depuis Quote, Contract, companyData, formData (voir scope clarifié) : DATE_SOUSCRIPTION, DATE_EFFET_CONTRAT, DATE_FIN_CONTRAT, STATUT_POLICE, NOM_ENTREPRISE_ASSURE, SIREN, CODE_NAF, adresse risque, CA_ENTREPRISE, EFFECTIF_ENTREPRISE, TYPE_CONTRAT, COMPAGNIE, etc. ; avenant : vides.
8. Gestion des données manquantes : valeurs par défaut documentées (ex. chaîne vide pour avenant).
9. Retour d’un tableau d’objets typés (une ligne par police) prêt pour génération CSV.
10. Tests unitaires couvrant le mapping et les cas limites (< 8 activités, companyData partiel).

## Tasks / Subtasks

- [x] Task 1 (AC: 1, 2) — Interface filtres et requêtes
  - [x] Types : BordereauFiltersV2 { dateRange: { startDate, endDate } } ; pas de brokerIds
  - [x] Requêtes Prisma : contrats + quotes ACCEPTED dans le périmètre (période contrat chevauche filtre ; quotes ACCEPTED sans contrat si acceptedAt dans période)
  - [x] Inclure Quote (companyData, formData, submittedAt, codeNAF, reference), InsuranceContract, product
- [x] Task 2 (AC: 3, 4, 5) — Une ligne par police, APPORTEUR constant, IDENTIFIANT_POLICE
  - [x] Boucle sur contrats/quotes retenus ; une ligne par police
  - [x] APPORTEUR depuis getApporteur() (Story v2.1)
  - [x] IDENTIFIANT_POLICE = Quote.reference
- [x] Task 3 (AC: 6, 7) — Mapping des colonnes Feuille 1
  - [x] Dates (souscription, effet, fin), statut police, NOM_ENTREPRISE_ASSURE, SIREN, CODE_NAF, adresse/ville/CP risque, CA_ENTREPRISE, EFFECTIF_ENTREPRISE, TYPE_CONTRAT, COMPAGNIE
  - [x] 8 paires LIBELLÉ_ACTIVITÉ / POIDS_ACTIVITÉ depuis formData.activites ; compléter à 8 avec chaînes vides
  - [x] NUMERO_AVENANT, MOTIF_AVENANT, DATE_EFFET_AVENANT : vides
- [x] Task 4 (AC: 8, 9) — Retour structuré et types
  - [x] Type TypeScript FidelidadePolicesRow avec toutes les colonnes Feuille 1 (scope §6)
  - [x] Retourner tableau de FidelidadePolicesRow
- [x] Task 5 (AC: 10) — Tests unitaires
  - [x] Cas : données complètes, < 8 activités, companyData partiel, pas de codeNAF ; vérifier ordre et noms des colonnes

## Dev Notes

- Référence : `docs/epics/bordereau-fidelidade-scope-clarifie.md` ; colonnes Feuille 1 listées en section 6.
- Code existant : `src/lib/bordereau/` (extractBordereauData.ts, types.ts) — à adapter ou remplacer pour v2 (deux sorties, pas de brokerIds, une ligne = une police).
- Modèles : Quote (companyData, formData, calculatedPremium, codeNAF?, identifiantPolice?), InsuranceContract (startDate, endDate, status), PaymentSchedule, PaymentInstallment.
- Dépendance : Story v2.1 (constante APPORTEUR et identifiantPolice disponibles).

### Testing

- Tests unitaires sur la fonction d’extraction ; mock Prisma ou données en mémoire ; valider structure de sortie et mapping des colonnes.

## Change Log

| Date       | Version | Description                            | Author     |
| ---------- | ------- | -------------------------------------- | ---------- |
| 2025-02-03 | 0.1     | Création (scope clarifié bordereau v2) | Sarah (PO) |

## Dev Agent Record

_(À remplir par l’agent de développement)_

### Agent Model Used

-

### Debug Log References

-

### Completion Notes List

- BordereauFiltersV2 et FidelidadePolicesRow dans types.ts. getPolicesV2 dans extractPolicesV2.ts : filtre période uniquement ; contrats ACCEPTED dont période chevauche filtre + quotes ACCEPTED sans contrat (acceptedAt dans période). Une ligne = une police ; APPORTEUR = getApporteur(), IDENTIFIANT_POLICE = Quote.reference. 8 paires LIBELLE_ACTIVITE / POIDS_ACTIVITE depuis formData.activites ; colonnes vides si donnée manquante. Tests unitaires dans **tests**/extractPolicesV2.test.ts (structure, < 8 activités, companyData partiel, pas de codeNAF). Pas de script "test" dans package.json : exécuter les tests une fois Jest/Vitest configuré.

### File List

- src/lib/bordereau/types.ts (modifié — BordereauFiltersV2, FidelidadePolicesRow)
- src/lib/bordereau/extractPolicesV2.ts (créé)
- src/lib/bordereau/utils.ts (modifié — mapQuoteStatusToStatutPolice)
- src/lib/bordereau/index.ts (modifié — export getPolicesV2, types, mapQuoteStatusToStatutPolice)
- src/lib/bordereau/**tests**/extractPolicesV2.test.ts (créé)
- docs/stories/bordereau-fidelidade-v2.2.extraction-polices.md (modifié — Dev Agent Record)

## QA Results

_(À remplir par QA)_
