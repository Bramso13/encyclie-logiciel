# Story: Création d’un InsuranceContract au clic sur « Approuver l’offre »

## Status

Ready for Review

## Story

**As a** administrateur,
**I want** qu’un **InsuranceContract** soit créé lorsque je clique sur le bouton « Approuver l’offre » dans l’onglet Résumé d’un devis (ResumeTab), après avoir choisi la **date de début du contrat** (startDate) dans un pop-up,
**so that** le contrat soit lié au devis avec la date d’effet voulue (celle du devis ou une autre date).

## Acceptance Criteria

1. Au clic sur le bouton « Approuver l’offre » (ResumeTab, admin), un **pop-up (modal)** s’ouvre pour choisir la **startDate** du contrat avant toute création.
2. Dans le pop-up, l’administrateur peut choisir :
   - **Option A** : « Utiliser la date d’effet du devis » — la startDate du contrat est celle du devis (formData.dateDeffet / dateEffet / dateDebut selon le produit).
   - **Option B** : « Choisir une autre date » — un sélecteur de date (date picker) permet de saisir une startDate personnalisée.
3. Le pop-up comporte un bouton de confirmation (ex. « Valider et créer le contrat ») et un bouton d’annulation (ex. « Annuler »). Seul le clic sur confirmation déclenche la mise à jour du statut du quote et la création du contrat.
4. Une requête (après confirmation) met à jour le statut du quote **et** crée l’**InsuranceContract** avec la **startDate** choisie dans le pop-up. L’**endDate** du contrat est dérivée (ex. à partir de la durée du contrat selon le produit — RC Décennale : startDate + 10 ans, ou depuis calculatedPremium / PaymentSchedule).
5. Le contrat est créé avec les champs obligatoires renseignés :
   - `quoteId` = id du quote
   - `brokerId` = quote.brokerId
   - `productId` = quote.productId
   - `reference` = règle à définir (voir Clarifications) — ex. Quote.reference
   - `status` = ACTIVE (ou valeur par défaut du schéma)
   - **`startDate`** = **date choisie dans le pop-up** (date d’effet du devis ou autre date)
   - `endDate` = dérivée de startDate (ex. startDate + durée contrat selon produit — RC Décennale : +10 ans ; ou depuis calculatedPremium / PaymentSchedule)
   - `annualPremium` = dérivé de quote.calculatedPremium (prime totale)
   - `paymentStatus` = PENDING (ou valeur par défaut)
6. Si un contrat existe déjà pour ce quote (relation Quote 1–1 InsuranceContract), ne pas ouvrir le pop-up de création (ou l’ouvrir et afficher une erreur dans le modal) : pas de second contrat.
7. Le statut du quote après confirmation : soit **OFFER_READY**, soit **ACCEPTED** avec `acceptedAt` (voir Clarifications). Comportement cohérent avec le libellé (ex. « Approuver l’offre et créer le contrat »).
8. Côté UI : après succès, fermer le pop-up, informer l’utilisateur (message de succès) et mettre à jour la page (reload ou invalidation) pour afficher le contrat créé ou le nouveau statut.
9. Côté API : la route de création de contrat accepte en body la **startDate** choisie (format ISO ou date) et dérive endDate côté serveur ; soit nouvelle route ex. POST `/api/quotes/[id]/approve-and-create-contract` avec body `{ startDate }`, soit étendre une route existante.

## Tasks / Subtasks

- [x] Task 1 (AC: 1, 2, 3) — Pop-up de choix de la startDate
  - [x] Au clic sur « Approuver l’offre », ouvrir un **modal** (pop-up) au lieu d’appeler directement l’API
  - [x] Dans le modal : **option A** « Utiliser la date d’effet du devis » (afficher la date si disponible : formData.dateDeffet / dateEffet / dateDebut) ; **option B** « Choisir une autre date » avec un **date picker**
  - [x] Boutons « Annuler » (ferme le modal sans rien faire) et « Valider et créer le contrat » (envoie la startDate retenue à l’API)
  - [x] Si le devis n’a pas de date d’effet (formData vide), option A peut être désactivée ou pré-remplir le date picker avec une date par défaut ; documenter le comportement
- [x] Task 2 (AC: 4, 9) — API et création du contrat
  - [x] Créer ou étendre une route ex. POST `/api/quotes/[id]/approve-and-create-contract` acceptant en body `{ startDate: string }` (ISO ou date)
  - [x] Côté serveur : charger le quote ; dériver endDate à partir de startDate (ex. RC Décennale : startDate + 10 ans ; ou depuis calculatedPremium / PaymentSchedule) ; créer InsuranceContract avec startDate reçue et endDate dérivée
  - [x] Mettre à jour le statut du quote (OFFER_READY ou ACCEPTED selon Clarifications)
- [x] Task 3 (AC: 5) — Données du contrat
  - [x] quoteId, brokerId, productId, reference (voir Clarifications), annualPremium depuis calculatedPremium, paymentStatus = PENDING
  - [x] Documenter la règle endDate (durée par type de produit)
- [x] Task 4 (AC: 6) — Idempotence / contrat déjà existant
  - [x] Si un contrat existe déjà pour ce quote : au clic sur « Approuver l’offre », soit ne pas ouvrir le modal et afficher un message (ex. « Un contrat existe déjà pour ce devis »), soit ouvrir le modal et à la validation retourner une erreur 409
  - [x] Documenter le choix
- [x] Task 5 (AC: 8) — UI après succès
  - [x] À la réponse succès de l’API : fermer le modal, afficher un message de succès (toast ou alert), recharger ou invalider les données pour afficher le contrat / le nouveau statut
- [x] Task 6 — Tests et non-régression
  - [x] Cas nominal : quote sans contrat → clic → modal → choisir date d’effet du devis → valider → contrat créé avec cette startDate
  - [x] Cas « autre date » : choisir une date personnalisée → valider → contrat créé avec cette startDate
  - [x] Cas avec contrat existant : pas de doublon (modal non ouvert ou erreur à la validation)
  - [x] Vérifier que les écrans quote et dashboard restent cohérents

## Clarifications à confirmer (PO / métier)

Avant implémentation, valider les points suivants :

1. **Statut du quote après création du contrat**

   - Option A : le quote passe en **OFFER_READY** (comportement actuel du bouton) et on crée quand même le contrat.
   - Option B : le quote passe en **ACCEPTED** avec `acceptedAt` renseigné, et on crée le contrat (le bouton signifie « Approuver l’offre et créer le contrat »).
   - **Recommandation** : Option B (ACCEPTED) pour rester cohérent avec la sémantique « un contrat = une offre acceptée » et avec le bordereau FIDELIDADE (quotes ACCEPTED).

2. **Référence du contrat (`InsuranceContract.reference`)**

   - Option A : même valeur que **Quote.reference** (une quote = un contrat, référence unique).
   - Option B : préfixe distinct, ex. **CONTRACT-** + Quote.reference, pour différencier visuellement devis et contrat.
   - **Recommandation** : Option A (Quote.reference) pour simplicité et alignement avec IDENTIFIANT_POLICE = Quote.reference dans le bordereau.

3. **startDate** : choisie par l’admin dans le pop-up (date d’effet du devis ou autre date). **endDate** : dérivée côté serveur à partir de startDate (ex. RC Décennale : startDate + 10 ans ; ou depuis calculatedPremium / PaymentSchedule). La « date d’effet du devis » correspond à **formData.dateDeffet** (ou dateEffet / dateDebut selon le produit) — voir OffreTab et extractPolicesV2.

## Dev Notes

- **Fichier UI** : `src/app/quotes/tabs/ResumeTab.tsx` — bouton « Approuver l’offre » (lignes ~253–277). À modifier : au clic, ouvrir un **modal** de choix de startDate (date d’effet du devis ou autre date), puis au confirm appeler l’API avec la date retenue.
- **Date d’effet du devis** : **quote.formData.dateDeffet** (ou dateEffet, dateDebut) — utilisé dans OffreTab, extractPolicesV2, SimpleParameterEditor. Voir `src/app/quotes/tabs/OffreTab.tsx` (dateDeffet), `src/lib/bordereau/extractPolicesV2.ts` (formData.dateEffet ?? dateDeffet ?? dateDebut).
- **Modal** : créer un composant modal (ex. dans `src/components/modals/` ou inline dans ResumeTab) avec deux options (radio ou boutons) + date picker pour « autre date ». Réutiliser les patterns existants (ex. AddBrokerModal, modals du projet).
- **API** : nouvelle route recommandée ex. POST `/api/quotes/[id]/approve-and-create-contract` avec body `{ startDate: string }` ; côté serveur dériver endDate (ex. startDate + 10 ans pour RC Décennale).
- **Schéma** : `prisma/schema.prisma` — `Quote` (reference, brokerId, productId, calculatedPremium, formData, paymentSchedule), `InsuranceContract` (quoteId unique, reference unique, startDate, endDate, annualPremium, brokerId, productId, status, paymentStatus). Relation Quote 1–1 InsuranceContract (`quote.contract`).
- **Calcul prime** : `src/lib/tarificateurs/rcd.ts` — calculatedPremium contient primeTotal, echeancier. PaymentSchedule (si créé) a startDate, endDate.

### Testing

- Test manuel : ouvrir un devis en statut autorisé (ex. IN_PROGRESS), cliquer « Approuver l’offre » → le modal s’ouvre → choisir « Date d’effet du devis » ou « Autre date » → valider → contrat créé avec la startDate choisie.
- Test « autre date » : sélectionner une date au date picker, valider → contrat créé avec cette startDate.
- Test d’idempotence : après création, recliquer sur « Approuver l’offre » → pas de second contrat (modal non ouvert ou erreur).
- Vérifier que le bordereau FIDELIDADE (quotes ACCEPTED + contrats) voit bien le nouveau contrat si statut ACCEPTED.

## Change Log

| Date       | Version | Description                                                        | Author      |
| ---------- | ------- | ------------------------------------------------------------------ | ----------- |
| 2025-02-03 | 0.1     | Création (création contrat au clic Approuver l’offre)              | Sarah (PO)  |
| 2025-02-03 | 0.2     | Ajout pop-up choix startDate (date d’effet du devis ou autre date) | Sarah (PO)  |
| 2025-02-03 | 0.3     | Implémentation modal + API approve-and-create-contract             | James (Dev) |

## Dev Agent Record

_(À remplir par l’agent de développement)_

### Agent Model Used

- Cursor / Auto (agent dev BMad)

### Debug Log References

- Aucun.

### Completion Notes List

- Clarifications appliquées : Option B (ACCEPTED + acceptedAt) ; référence contrat = Quote.reference ; endDate = startDate + durée produit (RC Décennale : 10 ans, sinon 1 an).
- Modal ApproveOfferModal : option A (date d'effet devis : formData.dateEffet ?? dateDeffet ?? dateDebut), option B (date picker). Si pas de date d'effet, option A désactivée et date picker pré-rempli avec aujourd'hui.
- Idempotence : si quote.contract existe, alerte « Un contrat existe déjà pour ce devis » sans ouvrir le modal ; API retourne 409 si quote déjà lié.
- annualPremium extrait de calculatedPremium.primeTotal ou totalTTC.

### File List

- src/app/api/quotes/[id]/approve-and-create-contract/route.ts (nouveau)
- src/components/modals/ApproveOfferModal.tsx (nouveau)
- src/app/quotes/tabs/ResumeTab.tsx (modifié)

## QA Results

_(À remplir par QA)_
