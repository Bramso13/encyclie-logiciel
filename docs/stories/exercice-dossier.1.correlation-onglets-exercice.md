# Story EXERCICE-1 : Onglets du dossier `/quotes/[id]` corrélés à l'exercice sélectionné

## Status

In Progress

## Story

**As a** administrateur ENCYCLIE consultant un dossier,
**I want** que tous les onglets métier du dossier (de « Calcul de prime » à « Commissions ») affichent les données de l'exercice que j'ai sélectionné dans la barre d'exercice,
**so that** je travaille sur un millésime cohérent de bout en bout (ex. 2026 partout, ou 2027 partout) sans mélanger les montants de deux exercices.

## Contexte métier

La barre d'exercice (`DossierExerciseBar`) permet déjà de basculer entre l'exercice d'origine du dossier et ses millésimes (`QuoteVintage`, ex. révision 2027). Le modèle de données est prêt : `QuoteVintage.calculatedPremium` par année, `PaymentSchedule.vintageYear` (« un échéancier par exercice »), et les API `payment-schedule` acceptent déjà un paramètre `year` / `vintageYear`.

**Mais** la page `src/app/quotes/[id]/page.tsx` ne propage l'exercice sélectionné qu'à 3 onglets :

- ✅ `CalculationTab` reçoit `displayedCalculation` (prime du millésime si exercice ≠ origine) ;
- ⚠️ `AppelDePrimeTab` et `DebitNoteTab` reçoivent `preferredYear` (corrélation partielle) ;
- ❌ tous les autres onglets métier reçoivent le calcul **de l'exercice d'origine** : `LetterTab`, `PremiumCallTab` (échéancier), `ContratTab`, `AggravationTab`, `BordereauTab`, `BrokerCommissionsTab`, `OffreTab`.

Résultat : un admin qui sélectionne « 2026 » (ou « 2027 ») voit des montants d'exercices différents selon les onglets — risque d'erreur de lecture et de production documentaire (PDF lettre, contrat, offre).

**Décisions de cadrage (PO + commanditaire) :**

1. **Périmètre** : les groupes « Étude et offre », « Contrat » et « Production » suivent l'exercice. Le groupe « Dossier » (Résumé, Formulaire, Messages) reste **transverse** (pas de dimension année).
2. **État vide explicite** : si un onglet n'a aucune donnée pour l'exercice choisi (ex. pas encore d'échéancier 2027), il affiche un état vide clair (« Aucune donnée pour l'exercice 2027 ») — jamais de repli silencieux sur un autre exercice.
3. **Changement d'exercice réservé aux admins** : comportement actuel conservé — le courtier voit l'année calendaire si elle existe sur le dossier, sinon l'exercice d'origine.
4. **Édition par exercice** : chaque exercice a son propre calcul **modifiable et sauvegardable indépendamment**. Les blocages actuels (`handleRecalculate` et `saveCalculationToDatabase` refusent de s'appliquer hors exercice d'origine) sont levés : sur un millésime, la sauvegarde écrit `QuoteVintage.calculatedPremium` et l'échéancier du `vintageYear` correspondant — sans jamais toucher l'exercice d'origine.

## Acceptance Criteria

1. **Prop de contexte exercice unique** : `page.tsx` calcule `selectedDossierYear` et `displayedCalculation` (existant) et les propage à **tous** les onglets des groupes « Étude et offre », « Contrat » et « Production » : `CalculationTab` (déjà OK), `LetterTab`, `PieceJointeTab`, `OffreTab`, `PremiumCallTab` (échéancier), `AppelDePrimeTab`, `ContratTab`, `AggravationTab`, `BordereauTab`, `DebitNoteTab`, `BrokerCommissionsTab`. Aucun de ces onglets n'utilise le calcul de l'exercice d'origine quand un autre exercice est sélectionné.
2. **Documents PDF corrélés** : lettre d'intention, offre, contrat et aggravation génèrent leurs PDF à partir de `displayedCalculation` (le calcul de l'exercice affiché), pas de `calculationResult` (origine).
3. **Échéancier par exercice** : `PremiumCallTab` n'affiche que les échéances de l'exercice sélectionné et se recharge/resynchronise au changement d'exercice. Si aucun échéancier n'existe pour cet exercice : état vide explicite « Aucun échéancier pour l'exercice {année} » (avec, pour l'admin, le rappel que la retarification se fait via « Ajouter un exercice » / le recalcul du millésime). **L'auto-création d'échéancier depuis le calcul affiché doit passer explicitement le `vintageYear` de l'exercice consulté** — jamais de création silencieuse sur l'exercice d'origine.
4. **Appel de prime et note de débit synchronisés** : `AppelDePrimeTab` et `DebitNoteTab` suivent `selectedDossierYear` à **chaque** changement d'exercice, y compris quand la liste des années disponibles se recharge après ajout d'un millésime. Leurs sélecteurs d'année internes restent utilisables mais ne peuvent pas afficher une année absente du dossier.
5. **Bordereau et commissions corrélés** : `BordereauTab` et `BrokerCommissionsTab` utilisent `displayedCalculation`. Si le bordereau exploite des données datées (périodes), il filtre sur l'exercice sélectionné et affiche un état vide explicite si rien ne correspond.
6. **Édition et sauvegarde par exercice (admin)** :
   - Sur l'exercice d'origine : comportement actuel inchangé (recalcul + sauvegarde `calculatedPremium` du devis + échéancier d'origine).
   - Sur un millésime : le recalcul et les switches (reprise du passé, non-fourniture bilan) s'appliquent au calcul du millésime ; la sauvegarde persiste `QuoteVintage.calculatedPremium` et crée/met à jour le `PaymentSchedule` du `vintageYear` correspondant (POST/PATCH `payment-schedule` avec `vintageYear`, déjà supportés).
   - L'exercice d'origine (`Quote.formData`, `Quote.calculatedPremium`, échéancier d'origine) n'est **jamais** modifié par une action effectuée sur un millésime.
7. **Bandeau contextuel conservé** : le message « Exercice {année} : le formulaire et la prime enregistrée de l'origine du dossier ne sont pas modifiés » reste affiché hors exercice d'origine, reformulé si besoin pour refléter que le calcul du millésime, lui, est éditable.
8. **Courtier non régressé** : un courtier ne voit pas la barre de sélection d'exercice (comportement actuel) ; ses onglets affichent l'année calendaire si présente sur le dossier, sinon l'origine — avec les mêmes règles de corrélation et d'états vides.
9. **Non-régression** : les parcours existants (calcul initial, sauvegarde origine, retarification 2027 via « Ajouter un exercice », génération PDF, bordereau) fonctionnent comme avant sur l'exercice d'origine.

## Tasks / Subtasks

- [x] **Task 1 — Contrat de props « contexte exercice »** (AC: #1)
  - [x] Définir dans `page.tsx` un objet/props unique `{ selectedYear, isOriginalYear, calculation }` (à partir de `selectedDossierYear` / `displayedCalculation`) et le passer aux 11 onglets métier
  - [x] Remplacer `calculationResult` par le calcul du contexte dans `LetterTab`, `ContratTab`, `AggravationTab`, `OffreTab`, `BordereauTab`, `BrokerCommissionsTab`, `PieceJointeTab` (si elle affiche des montants calculés)
- [x] **Task 2 — Échéancier par exercice** (AC: #3)
  - [x] `PremiumCallTab` : accepter `selectedYear` ; filtrer les échéances par millésime (au choix : filtre client sur `schedule.vintageYear` déjà inclus dans la réponse `/api/payment-installments?quoteId=`, ou extension de cet endpoint avec `?year=`, ou bascule vers `payment-schedule?year=`)
  - [x] **Corriger le piège d'auto-création** : `createPaymentScheduleFromCalculation` POSTe aujourd'hui sans `vintageYear` (→ crée sur l'année d'origine). Passer explicitement le `vintageYear` de l'exercice consulté, et ne jamais auto-créer hors exercice d'origine sans action admin explicite
  - [x] Les PATCH d'échéances doivent passer le `vintageYear` consulté (sinon `findScheduleForQuote` cible le premier schedule = origine)
  - [x] États vides explicites par exercice
- [x] **Task 3 — Synchronisation appel de prime / note de débit** (AC: #4)
  - [x] `AppelDePrimeTab` : appliquer `preferredYear` à chaque changement (pas seulement à l'init) ; contraindre le sélecteur interne aux années du dossier
  - [x] `DebitNoteTab` : vérifier la prise en compte du changement d'année et l'état vide
- [x] **Task 4 — Bordereau & commissions** (AC: #5)
  - [x] `BordereauTab` : calcul du contexte + filtrage par exercice si données datées + état vide
  - [x] `BrokerCommissionsTab` : calcul du contexte + état vide si pas de calcul pour l'exercice
- [x] **Task 5 — Édition / sauvegarde par exercice** (AC: #6, #7)
  - [x] Lever les blocages de `handleRecalculate` et `saveCalculationToDatabase` hors exercice d'origine
  - [x] API : ajouter la sauvegarde du calcul d'un millésime (ex. `PATCH /api/quotes/[id]/revision-2027` acceptant un `calculatedPremium` édité, ou extension du POST existant) — écriture sur `QuoteVintage.calculatedPremium` uniquement
  - [x] Sauvegarde échéancier du millésime : POST/PATCH `payment-schedule` avec `vintageYear` (déjà supporté) ; préserver les paiements validés existants (`regenerateScheduleWithPaymentPreservation`, pattern déjà utilisé par la retarification)
  - [x] Switches et `SimpleParameterEditor` : appliquer au calcul affiché (origine ou millésime)
- [x] **Task 6 — États vides & bandeaux** (AC: #2, #3, #7)
  - [x] Composant d'état vide réutilisable « Aucune donnée pour l'exercice {année} » dans les onglets concernés
  - [x] Reformuler le bandeau contextuel hors origine
- [ ] **Task 7 — Recette bi-rôle** (AC: #8, #9)
  - [ ] Admin : créer un millésime 2027, naviguer dans les 11 onglets sur 2026 puis 2027, vérifier la cohérence des montants, éditer/sauvegarder sur 2027, vérifier que 2026 est inchangé
  - [ ] Courtier : ouvrir le même dossier, vérifier l'affichage année calendaire/origine et l'absence du sélecteur
  - [ ] Non-régression : calcul initial + sauvegarde sur l'origine, retarification via « Ajouter un exercice », PDF lettre/offre/contrat

## Dev Notes

### Points d'intégration clés

- **Orchestrateur** : `src/app/quotes/[id]/page.tsx` — `selectedDossierYear` (L513-522), `selectedVintage`, `displayedCalculation` (L524-529), rendu des onglets (L581-682), blocages actuels dans `handleRecalculate` (L305-316) et `saveCalculationToDatabase` (L407-418).
- **Barre d'exercice** : `src/app/quotes/components/DossierExerciseBar.tsx` — `dossierOriginalYear()`, années du dossier = origine + `quote.vintages[].year`. Ne pas changer la règle non-admin (`selectedDossierYear` forcé côté page).
- **API déjà prêtes** :
  - `GET /api/quotes/[id]/payment-schedule?year={n}` (retourne aussi `availableYears`), `POST`/`PATCH` avec `vintageYear` dans le body — `src/app/api/quotes/[id]/payment-schedule/route.ts` ;
  - `GET/POST /api/quotes/[id]/revision-2027` (paramètre `year` générique malgré le nom) — crée/met à jour `QuoteVintage` + schedule du millésime avec préservation des paiements.
- **⚠️ Échéancier — implémentation actuelle** : `PremiumCallTab` fetch **`/api/payment-installments?quoteId=`** (et non `payment-schedule`) — cet endpoint retourne **toutes les échéances de tous les millésimes** du dossier, avec `schedule.vintageYear` inclus dans la réponse (`src/app/api/payment-installments/route.ts`). Deux pièges à corriger dans cette story : (1) `createPaymentScheduleFromCalculation` POSTe sans `vintageYear` → toute création se fait sur l'année d'origine, même en consultant un millésime ; (2) les PATCH d'échéances sans `vintageYear` ciblent le premier schedule trouvé (origine). Le filtrage par exercice peut se faire côté client sur `schedule.vintageYear` ou en ajoutant un paramètre `year` à cet endpoint.
- **API à créer/étendre** : sauvegarde d'un `calculatedPremium` **édité manuellement** sur un millésime (le POST `revision-2027` recalcule depuis le formData ; il ne persiste pas un calcul modifié via `SimpleParameterEditor`). Recommandation : `PATCH /api/quotes/[id]/revision-2027` `{ year, calculatedPremium }` avec `withAuthAndRole(["ADMIN"])`, écriture sur `QuoteVintage.calculatedPremium` + régénération du schedule du millésime avec `regenerateScheduleWithPaymentPreservation` (pattern existant dans la route POST).
- **Onglets avec sélecteur interne** : `AppelDePrimeTab` (état `selectedYear` interne, `availableYears`, helper `resolveCalcForYear` déjà sensible à l'année) et `DebitNoteTab` (état `year` interne). Les deux ont déjà un `useEffect` de synchronisation sur `preferredYear` (`AppelDePrimeTab` L240-254, `DebitNoteTab` L62-64) — vérifier les cas limites (rechargement de `availableYears` après ajout d'un millésime, année préférée absente de la liste) et contraindre les sélecteurs aux années du dossier.
- **Commissions** : `BrokerCommissionsTab` ne reçoit que `calculationResult` — le passer au calcul du contexte suffit (les commissions dérivent du calcul affiché).
- **Étude de dossier (`PieceJointeTab`)** : onglet documentaire sans dimension année dans le modèle (`QuoteDocument`). Le laisser transverse **sauf** s'il affiche des montants issus du calcul — dans ce cas, utiliser le calcul du contexte.

### Contraintes

- Ne jamais écrire sur `Quote.formData` / `Quote.calculatedPremium` / échéancier d'origine depuis un millésime (garde-fou identique à `assertFormDataUnchanged` dans la route de révision).
- Libellés en français métier, états vides et feedback via les composants `src/components/ui/` (`Feedback.tsx`, `notify()`), conformément au design system de la story RETOURS-3.
- Pas de changement de schéma Prisma : le modèle (`QuoteVintage`, `PaymentSchedule.vintageYear`) suffit.

### Testing

- Tests unitaires : logique de sélection `displayedCalculation` / année (extraire si besoin un helper testable, ex. dans `src/lib/quotes/`), états vides.
- Recette manuelle bi-rôle (AC #7) sur un dossier avec au moins 2 exercices.
- Non-régression : `vitest run` sur les librairies touchées (bordereau, tarificateurs) — échecs préexistants documentés, ne pas les aggraver.

## Change Log

| Date       | Version | Description                                                                                                                                               | Author     |
| ---------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| 2026-09-23 | 0.1     | Création initiale (draft) — corrélation des onglets métier à l'exercice sélectionné, édition par exercice                                                 | Sarah (PO) |
| 2026-09-23 | 0.2     | Validation PO : correction fetch échéancier (`/api/payment-installments`), pièges auto-création/PATCH sans `vintageYear`, synchro `preferredYear` nuancée | Sarah (PO) |
| 2026-09-23 | 0.3     | Implémentation : contexte exercice propagé, échéancier filtré, sauvegarde millésime, états vides. Recette bi-rôle manuelle encore ouverte | James (Dev) |

## Dev Agent Record

### Agent Model Used

Grok 4.7

### Debug Log References

- `npx vitest run src/lib/quotes/__tests__/dossier-exercise.test.ts src/lib/quotes/__tests__/revision-millesime.test.ts` — 12 tests OK
- `npx tsc --noEmit` — aucune erreur sur les fichiers de cette story (erreurs préexistantes ailleurs)

### Completion Notes List

- Contexte `{ selectedYear, isOriginalYear, calculation }` calculé dans `page.tsx` via `resolveDisplayedCalculation` : hors origine, pas de repli sur le calcul d'origine.
- `PieceJointeTab` reçoit le contexte mais reste transverse (aucun montant calculé dans le modèle documentaire).
- Auto-création d'échéancier limitée à l'exercice d'origine, avec `vintageYear` explicite. Les PATCH échéancier / bordereau passent `vintageYear`. Le bordereau ne réécrit plus `formData` depuis un millésime.
- `PATCH /api/quotes/[id]/revision-2027` persiste `QuoteVintage.calculatedPremium` et régénère l'échéancier du millésime (`regenerateScheduleWithPaymentPreservation`) sans toucher l'origine.
- Recette manuelle bi-rôle (tâche 7) non exécutée dans cette session : pas de session admin et courtier dans le navigateur de l'agent. À faire avant revue : dossier avec 2026 et 2027, parcours des 11 onglets, édition 2027, contrôle que 2026 est inchangé, courtier sans barre d'exercice.

### File List

- src/lib/quotes/dossier-exercise.ts
- src/lib/quotes/__tests__/dossier-exercise.test.ts
- src/app/quotes/components/ExerciseEmptyState.tsx
- src/app/quotes/[id]/page.tsx
- src/app/api/quotes/[id]/revision-2027/route.ts
- src/app/quotes/tabs/CalculationTab.tsx
- src/app/quotes/tabs/LetterTab.tsx
- src/app/quotes/tabs/OffreTab.tsx
- src/app/quotes/tabs/PieceJointeTab.tsx
- src/app/quotes/tabs/PremiumCallTab.tsx
- src/app/quotes/tabs/AppelDePrimeTab.tsx
- src/app/quotes/tabs/ContratTab.tsx
- src/app/quotes/tabs/AggravationTab.tsx
- src/app/quotes/tabs/BordereauTab.tsx
- src/app/quotes/tabs/DebitNoteTab.tsx
- src/app/quotes/tabs/BrokerCommissionsTab.tsx

## QA Results

_(à remplir par l'agent QA)_
