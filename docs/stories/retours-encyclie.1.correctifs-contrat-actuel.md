# Story RETOURS-1 : Correctifs du contrat actuel (attestation RCD, code NAF, compteurs, liste devis, honoraires RCD, contrat PDF)

## Status

Ready for Review

## Story

**As a** administrateur ENCYCLIE,
**I want** que les points ouverts du contrat actuel soient corrigés (mise en page attestation RCD avec logos, remontée automatique du code NAF, compteurs réels, liste des demandes de devis exploitable, honoraires courtier pris en compte dans le calcul RCD, mise en page du contrat),
**so that** les documents générés soient professionnels et fidèles à la marque ENCYCLIE, et les écrans de gestion utilisables au quotidien sans contournements.

## Contexte métier

Ces points sont issus du mail client de septembre 2026 listant « les missions restant à effectuer / corriger dans le cadre du contrat actuel ». Ils sont traités **sans montant supplémentaire** (cf. `docs/devis-missions-nouveau-contrat.md`, section « Hors périmètre »). Les questions « vidéos tuto » et « méthode de calcul de la reprise du passé » sont des demandes d'information client : **hors scope développement**.

## Acceptance Criteria

1. **Attestation RCD** : la mise en page du PDF généré (`AttestationRCDPDF.tsx`) reprend la structure de `docs/attestation-rcd-modele.md` (en-tête, clause L113-3, blocs souscripteur/intermédiaire, assureur, attestation, tableau des garanties, pied de page) et le **logo ENCYCLIE** (`public/couleur_1.png`) est intégré en en-tête et/ou pied de page selon ce modèle.
2. **Code NAF** : lorsqu'un SIRET est saisi dans le formulaire de devis, le **code NAF/APE est remonté automatiquement** via Pappers, **affiché** (champ visible, pré-rempli, saisissable si Pappers ne le renvoie pas) et **persisté** sous la clé canonique `formData.code_naf` (celle déjà lue par les bordereaux). Un dossier créé ou mis à jour via SIRET n'a plus besoin de saisie NAF manuelle pour apparaître dans les exports.
3. **Onglet COURTIERS** : le compteur affiche le **nombre réel total** de courtiers renvoyé par l'API (`pagination.total`), et non `brokers.length` de la page courante (plus de « 10/10 » figé) ; la liste permet d'accéder à tous les courtiers au-delà des 10 premiers (pagination réelle ou limite relevée + total exact).
4. **Onglet DEMANDES DE DEVIS** :
   - le nombre de lignes affichées par défaut passe à **25** (au lieu de 10) ;
   - les boutons **« Voir détails » sont visibles sans défilement horizontal** en 1366×768 (colonnes prioritaires visibles, actions accessibles) ;
   - la recherche fonctionne **par nom d'entreprise (raison sociale)** en plus du numéro de contrat / référence.
5. **Honoraires de gestion courtier** : la valeur saisie sur le dossier (`formData.honoraireCourtier`) **apparaît comme une ligne distincte du détail de calcul RCD** et **modifie les montants** de `calculPrimeRCD` / échéancier / appel de prime (cas 0 € = non-régression). Voir décision PO en Dev Notes — ne pas double-compter avec `honoraireGestion`.
6. **Contrat PDF** : la mise en page de `ContractRCDPDF` (`src/components/pdf/ContratPDF.tsx`, composant à partir de L184) est améliorée — paragraphes espacés, retours à la ligne propres (pas de coupures disgracieuses), hiérarchie visuelle et couleurs cohérentes avec la charte ENCYCLIE.

## Tasks / Subtasks

- [x] **Task 1 — Attestation RCD : mise en page + logos** (AC: #1)
  - [x] ✅ Modèle de référence : **`docs/attestation-rcd-modele.md`** (attestation client réelle GC2E — en-tête, clause suspension L113-3, bloc souscripteur/intermédiaire 2 colonnes, assureur, attestation, tableau activités garanties, pied de page ENCYCLIE)
  - [x] Refondre `src/components/pdf/AttestationRCDPDF.tsx` pour suivre ce modèle
  - [x] Intégrer le logo — ✅ **`public/couleur_1.png`** (déjà servi par l'app)
  - [ ] Vérifier le rendu sur un dossier réel et comparer visuellement avec le modèle (login requis — à faire en recette)
- [x] **Task 2 — Code NAF : affichage + persistance canonique** (AC: #2)
  - [x] La route `src/app/api/pappers/route.ts` **mappe déjà** `codeNaf` depuis `data.code_naf` (L59–71) — ne pas « ajouter » un mapping inexistant
  - [x] `QuoteForm.tsx` écrit déjà `formData.codeNaf` (camelCase) au fetch SIRET, **sans champ visible** et **sans** `formData.code_naf`
  - [x] Afficher le code NAF dans `QuoteForm.tsx` (pré-rempli, éditable si vide)
  - [x] Persister la clé **`formData.code_naf`** (alignée sur `extractPolicesV2.ts` / `BordereauTab.tsx` / `modifier_echeancier`) ; synchroniser ou abandonner `codeNaf` pour éviter deux clés
  - [x] Ajouter `code_naf` à `FormData` dans `src/lib/types.ts` (aujourd'hui absent)
  - [ ] Tester avec SIRET réel (NAF connu) et SIRET sans NAF (login / Pappers — à faire en recette)
- [x] **Task 3 — Onglet COURTIERS : compteur et liste réels** (AC: #3)
  - [x] Cause réelle : `fetchBrokers()` (`src/lib/stores/users-store.ts` L164–186) appelle `GET /api/users?role=BROKER` **sans** `limit`/`page`. L'API (`src/app/api/users/route.ts` L7) force **`limit=10` par défaut**. `AdminScreen.tsx` affiche `brokers.length` comme total (L764, L860) → « 10/10 »
  - [x] `users-store` L76 (`pagination.limit: 10`) sert `fetchUsers`, pas `fetchBrokers` — ne pas « corriger L76 » en croyant résoudre l'onglet
  - [x] `src/app/api/admin/brokers/route.ts` **n'alimente pas** cet onglet — ne pas s'y brancher sauf décision explicite
  - [x] Faire passer `limit` (ou paginer) et afficher `pagination.total` de l'API comme compteur ; permettre d'accéder à tous les courtiers
- [x] **Task 4 — Onglet DEMANDES DE DEVIS : pagination 25, tableau, recherche par nom** (AC: #4)
  - [x] Passer le défaut à 25 dans `src/lib/stores/quotes-store.ts` (**`pagination.limit` L104**, pas seulement l'appel `fetchQuotes` L146)
  - [x] Restructurer `src/components/quotes/QuotesList.tsx` : colonnes prioritaires, actions « Voir détails » visibles sans scroll horizontal (1366×768)
  - [x] Étendre `QuoteFiltersSchema` (`src/lib/validations.ts` L147 — filtres actuels : `status`, `productId`, `brokerId`, `dateFrom`, `dateTo`) et `src/app/api/quotes/route.ts` avec un paramètre de recherche sur la raison sociale ; champ de saisie UI
- [x] **Task 5 — Honoraires de gestion courtier dans le calcul RCD** (AC: #5)
  - [x] `BrokerCommissionsTab.tsx` est **en lecture seule** (affiche `calculationResult.honoraireGestion` et des commissions 10 %) — on n'y « ajoute » pas d'honoraires
  - [x] Brancher `formData.honoraireCourtier` sur `calculPrimeRCD({ honoraireGestion })` via `calculateWithMapping()` (`src/lib/utils.ts` L39) selon la décision PO ci-dessous
  - [x] Afficher la ligne dans le détail de calcul (`CalculationTab.tsx` — aujourd'hui aucun des deux champs n'y apparaît)
  - [x] Vérifier échéancier (`genererEcheancier()` L1229) et appel de prime
  - [x] Test unitaire : honoraires = 0 (non-régression) + honoraires > 0 (ligne présente, totaux différents, pas de double comptage)
- [x] **Task 6 — Contrat PDF : mise en page** (AC: #6)
  - [x] Améliorer `src/components/pdf/ContratPDF.tsx` — composant **`ContractRCDPDF` à partir de L184** (L172 = commentaire `ContratPdfPageChrome`, pas le composant)
  - [ ] Contrôler sauts de page et veuves/orphelines sur un contrat réel complet (login requis — à faire en recette)

## Dev Notes

### Sources métier

- Mail client (sept. 2026) — section « contrat actuel » : attestation RCD, code NAF, compteur courtiers, onglet demandes de devis, honoraires courtier, mise en page contrat.
- `docs/devis-missions-nouveau-contrat.md` section « Hors périmètre » : ces points sont traités **sans montant supplémentaire** au titre du contrat précédent.
- **Prérequis Task 1 : tous levés** ✅ — modèle : `docs/attestation-rcd-modele.md` ; logo : `public/couleur_1.png`. Un modèle texte existe aussi : `src/app/quotes/tabs/ATTESTATION RCD - XXX.docx.md` (contenu contractuel, pas la mise en page cible).

### Décision PO — honoraires (AC #5)

Deux concepts distincts existent déjà ; ne pas les fusionner à l'aveugle :

| Champ                                 | Où                                                                                                                                                                                   | Rôle actuel                                      |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------ |
| `formData.honoraireCourtier` (string) | saisie dossier (`AdminScreen` défaut `"0"`) ; affiché en **%** dans `OffreTab` et en **€** dans `LetterOfIntentPDF`                                                                  | valeur « ajoutée sur le dossier » au sens client |
| `honoraireGestion` (number)           | paramètre / retour de `calculPrimeRCD()` L477 ; mappé dans `calculateWithMapping()` si le produit a un mapping ; affiché dans `BrokerCommissionsTab` comme « honoraire de courtage » | déjà dans le moteur, souvent 0 si non mappé      |

**Règle à implémenter :**

1. Source métier = `formData.honoraireCourtier` (montant **€** — l'affichage `%` dans `OffreTab` est une incohérence à ne pas reproduire dans le calcul).
2. L'injecter dans `calculPrimeRCD` comme `honoraireGestion`.
3. Si le mapping produit fournit déjà un `honoraireGestion` **et** `honoraireCourtier` est renseigné : **une seule source** — `honoraireCourtier` prime (saisie dossier). Ne jamais additionner les deux.
4. Le détail de calcul montre une ligne « Honoraires de gestion courtier » égale à cette valeur ; l'échéancier et l'appel de prime en tiennent compte.
5. Cas 0 ou vide = comportement actuel (non-régression).

### Cartographie technique (établie via graphify — ne pas re-explorer)

- **PDF** : `src/components/pdf/AttestationRCDPDF.tsx`, `src/components/pdf/ContratPDF.tsx` (`ContractRCDPDF` L184). Génération via `src/app/api/generate-pdf/route.ts`.
- **Pappers / SIRET** : `src/lib/api/pappers.ts` (`PappersCompanyData.codeNaf` L10, `fetchCompanyBySiret()`), route `src/app/api/pappers/route.ts` (mapping `codeNaf` déjà en place). Consommé par `src/components/quotes/QuoteForm.tsx`. Lectures aval en `code_naf` / `codeNAF` : `src/lib/bordereau/extractPolicesV2.ts`, `src/app/quotes/tabs/BordereauTab.tsx`, `src/app/modifier_echeancier/page.tsx`.
- **Courtiers** : `fetchBrokers()` → `/api/users?role=BROKER` (défaut API `limit=10`) ; compteur `AdminScreen` = `brokers.length`. `GET /api/admin/brokers` non utilisé par l'onglet.
- **Devis** : store `src/lib/stores/quotes-store.ts` (`pagination.limit` L104, `fetchQuotes` L146), API `src/app/api/quotes/route.ts`, `QuoteFiltersSchema` `src/lib/validations.ts` L147, liste `src/components/quotes/QuotesList.tsx`.
- **Calcul RCD** : `src/lib/tarificateurs/rcd.ts` — `calculPrimeRCD()` L477, `calculateMajorations()` L51, `genererEcheancier()` L1229, `calculReprisePasseRCD()` L1365. Mapping : `src/lib/utils.ts` (`calculateWithMapping`). Onglet commissions : `src/app/quotes/tabs/BrokerCommissionsTab.tsx`. Application : `src/lib/calculation-apply.ts`, `src/app/quotes/components/forms/recalculateUtils.ts`.
- Types : `src/lib/types.ts` (`Quote` L74, `FormData` L19 — **pas de `code_naf`**, `honoraireCourtier` L21, `CalculationResult` L12, `PaymentInstallment` L107, `PaymentSchedule` L131).

### Testing

- Pattern : `__tests__/` adjacent (ex. `src/lib/tarificateurs/__tests__/genererEcheancier.test.ts`).
- Task 2 : cas SIRET → `formData.code_naf` persisté et non seulement `codeNaf`.
- Task 5 : unitaire calcul **avec** / **sans** honoraires ; assert pas de double comptage.
- PDF (Tasks 1 et 6) : validation visuelle sur dossiers réels + comparaison au modèle.

## Change Log

| Date       | Version | Description                                                                                                   | Author     |
| ---------- | ------- | ------------------------------------------------------------------------------------------------------------- | ---------- |
| 2026-09-07 | 0.1     | Création initiale (draft) depuis le mail client + cartographie graphify                                       | Sarah (PO) |
| 2026-09-07 | 0.2     | Validation PO : diagnostics NAF / courtiers / honoraires corrigés ; L184 ContractRCDPDF ; décision honoraires | Sarah (PO) |
| 2026-09-07 | 1.0     | Implémentation des 6 AC ; honoraires courtier dans le moteur ; NAF canonique ; listes admin                   | James (Dev) |

## Dev Agent Record

### Agent Model Used

Cursor Grok 4.6

### Debug Log References

- Tests honoraires : `npm test -- src/lib/tarificateurs/__tests__/honoraires.test.ts` — 5/5 OK
- Tests échéancier : `genererEcheancier.test.ts` — 9/9 OK
- `extractPolicesV2.test.ts` : mocks incomplets (`paymentSchedule` / événements mois) — échecs préexistants au chemin événements ; un cas `formData.code_naf` a été ajouté

### Completion Notes List

- Attestation RCD refondue sur le modèle client : titre, clause L113-3, 2 colonnes souscripteur/intermédiaire, assureur FIDELIDADE, tableau garanties, logo `couleur_1.png` en-tête + pied, mentions ENCYCLIE. Recette visuelle dossier réel à faire côté QA (session login requise).
- NAF : champ visible/éditable dans `QuoteForm` ; persistance `formData.code_naf` uniquement (plus `codeNaf`) ; lectures bordereaux acceptent encore l’ancien camelCase en fallback.
- Courtiers : `fetchBrokers` envoie `page`/`limit` ; badge et KPI = `pagination.total` ; pagination réelle dans `AdminBrokersPanel`. Pas de branchement sur `/api/admin/brokers`.
- Devis : défaut 25 déjà en store ; recherche serveur `search` sur référence + `companyName` (companyData/formData) ; colonnes réduites + action « Voir détails ».
- Honoraires : `resolveHonoraireGestion` — saisie dossier prime sur mapping, 0/vide = non-régression, jamais de somme des deux. Injecté dans TTC N/N+1 et premier paiement d’année via `fraisGestion` échéancier (appel de prime inclus). Ligne dédiée dans `CalculationTab`.
- Contrat PDF : interligne, titres orange charte, `minPresenceAhead` anti-veuves, encart identification clarifié.

### File List

- src/components/pdf/AttestationRCDPDF.tsx
- src/components/pdf/ContratPDF.tsx
- src/app/quotes/tabs/PremiumCallTab.tsx
- src/components/quotes/QuoteForm.tsx
- src/app/quotes/tabs/FormDataTab.tsx
- src/lib/types.ts
- src/lib/tarificateurs/honoraires.ts
- src/lib/tarificateurs/__tests__/honoraires.test.ts
- src/lib/tarificateurs/rcd.ts
- src/lib/utils.ts
- src/lib/calculation-apply.ts
- src/app/quotes/tabs/CalculationTab.tsx
- src/lib/validations.ts
- src/lib/stores/quotes-store.ts
- src/lib/stores/users-store.ts
- src/app/api/quotes/route.ts
- src/app/api/quotes/[id]/route.ts
- src/components/quotes/QuotesList.tsx
- src/app/dashboard/AdminScreen.tsx
- src/components/admin/AdminBrokersPanel.tsx
- src/lib/bordereau/extractBordereauData.ts
- src/lib/bordereau/__tests__/extractPolicesV2.test.ts
- docs/stories/retours-encyclie.1.correctifs-contrat-actuel.md

## QA Results

_(à remplir par l'agent QA)_
