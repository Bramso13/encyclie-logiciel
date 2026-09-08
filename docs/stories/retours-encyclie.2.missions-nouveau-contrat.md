# Story RETOURS-2 : Missions du nouveau contrat (adresse, aggravation 50 %, compteur devis, récap portefeuille, paiements en retard, notes de débit, coordonnées, notifications, horaires, révision millésime 2027)

## Status

Review

## Story

**As a** administrateur ENCYCLIE,
**I want** que les évolutions du nouveau contrat soient livrées (nouvelle adresse sur tous les documents, mention « appel de prime aggravé », compteur devis réel, récapitulatif portefeuille annuel avec export Excel, onglet paiements en retard exploitable, notes de débit avec PDF/Excel, coordonnées du cabinet visibles, notifications automatiques de retard, bandeau horaires des territoires, et révision CA/activités pour le millésime 2027),
**so that** les appels de prime 2027 puissent être émis à temps et le portefeuille piloté avec une vision globale à jour.

## Contexte métier

- Missions chiffrées dans **`docs/devis-missions-nouveau-contrat.md`** (devis n° DEV-2026-09-002, 80 €/h, facturation **par lot à la validation du lot**). Chaque mission reste **livrable et validable isolément** pour la facturation, **sauf** les dépendances listées ci-dessous.
- **Lot 3 (date de naissance du dirigeant) : EXCLU** — réalisé hors de ce backlog.
- **Mission millésime 2027** : devis n° DEV-2026-09-001 **déjà accepté** (`docs/devis-mission-millesime-2027.md`), ici Mission 0. Décisions PO : déclenchement **admin uniquement** ; nouvel appel de prime en **avenant** (l'existant et l'historique 2026 sont conservés).

### Ordre de traitement (PO) — ne pas ignorer

Ce fichier regroupe plusieurs lots facturables (pas de stories supplémentaires). Traiter dans cet ordre :

1. **Mission 0** (indépendante, devis déjà accepté, priorité appels 2027)
2. **Mission 1** (adresse) — prérequis de la Mission 9
3. **Mission 2** (aggravation)
4. **Mission 4** (compteur devis)
5. **Mission 6** (paiements en retard)
6. **Mission 7** puis **Mission 8** (lots liés — le devis recommande de les livrer ensemble)
7. **Mission 5** (récap) — les KPI « notes de débit » restent à 0 / « non disponible » tant que la Mission 7 n'est pas livrée
8. **Mission 9** (coordonnées — réutilise la constante adresse de la Mission 1)
9. **Mission 10** (mails retard)
10. **Mission 11** (bandeau horaires)

Si un lot dépasse le cadre chiffré : **arrêter et informer** avant de poursuivre (conditions du devis).

## Acceptance Criteria

### Mission 0 — Révision millésime 2027 (devis DEV-2026-09-001, accepté)

**Pivot PO livré** : pas d'onglet « Révision 2027 ». Le millésime est un **contexte plateforme** (sélecteur d'année admin + barre d'exercice sur le dossier).

1. **ADMIN** : bandeau sélecteur d'année (défaut = année civile, listes filtrées seulement si année ≠ civile). Sur le dossier : switch d'exercice + « Ajouter un exercice » (copie N-1 + % global, puis édition). Les courtiers restent sur l'année civile, sans bandeau millésime. CA / activités / prime / échéancier 2026 **non écrasés**.
2. Socle : `QuoteVintage` + `PaymentSchedule.vintageYear` (index non unique — **pas** de `@@unique (quote_id, vintage_year)`). `GET /api/quotes/[id]/versions` reste un journal d'audit. Overlays barème DB uniquement `year >= 2027` ; 2025/2026 restent dans le code. Gel dès qu'une année plus récente existe.
3. Nouvel échéancier par `vintageYear` ; règlements sur cet échéancier ; bordereaux inchangés (année de l'échéance).

### Mission 1 — Nouvelle adresse cabinet (lot 1)

4. L'adresse **10 rue de Louvois, 75002 Paris** remplace **toutes** les occurrences de 42 rue Notre-Dame des Victoires (y compris la variante fautive « Victoire ») sur : contrat, offre, appel de prime, attestation, lettre d'intention, e-mails transactionnels. Aucun document ni e-mail ne mélange ancienne / nouvelle adresse. Source unique : constante partagée (voir Task 1).

### Mission 2 — Appel de prime aggravé (lot 2)

5. Si majoration de **50 % pour non-fourniture du bilan**, l'appel de prime porte le titre **« Appel de prime {année} aggravé »** (`année` = millésime de l'appel, pas « 2027 » en dur).
6. Le bouton d'aggravation applique : **prime HT × 50 % × (1 + frais de gestion + taxe)**.

### Mission 4 — Compteur de devis (lot 4)

7. Le compteur du tableau de bord admin affiche **`quotesPagination.total`** (total API), actualisé à chaque création et suppression — plus `quotes.length` de la page courante (cause actuelle du « 10/10 »).

### Mission 5 — Récapitulatif portefeuille 202X + Excel (lot 5)

8. Une interface admin pour l'**année sélectionnée** (défaut = année en cours) affiche les **indicateurs du devis** : affaires actives ; prime annuelle des dossiers souscrits ; règlements reçus ; ratio reçus / dus (mois échus uniquement) ; ratio réglé / dû **mensuel** ; répartition géographique ; répartition par courtier ; notes de débit reçues / dues + ratio (0 / N/A tant que Mission 7 absente) ; commissions totales.
9. Un **export Excel** restitue ces indicateurs. La présentation cible est `docs/recap-portefeuille-rcd-2026.md` (blocs 1–8, y compris graphiques et fractionnement — voir Dev Notes). Si le lot dépasse 18 h : **stop et devis complémentaire**, ne pas réduire le périmètre en silence.

### Mission 6 — Onglet paiements en retard (lot 6)

10. La liste est **paginée** (`page` / `limit`, défaut 25) et lisible **sans défilement horizontal** en 1366×768 (colonnes d'action visibles). Tri par ancienneté conservé.

### Mission 7 — Notes de débit (lot 7)

11. Une catégorie **« Note de débit »** existe (modèle Prisma lié au dossier et aux échéances), avec **PDF** et **export Excel par période**.
12. Le calcul et le document **reproduisent l'onglet Excel** `docs/tarificateur-note-de-debit-exemple.png` (dossier **2024125RCDWAK / SET / WAKAM**). Formule et cas de test figés en Dev Notes. Les arrondis du tableau Excel font foi.

### Mission 8 — Date de règlement reportée (lot 8, après lot 7)

13. Quand un règlement est marqué **effectué** (`mark-paid`), la **date de règlement** apparaît sur la ligne de note de débit de la même échéance.

### Mission 9 — Coordonnées du cabinet (lot 9)

14. Un espace dédié **admin + courtiers** affiche, depuis la **même constante** que la Mission 1 :
    - adresse : 10 rue de Louvois, 75002 Paris
    - e-mail : **contact@encyclie-construction.com**
    - téléphone : **01 85 09 42 06**
    - site : **https://www.encyclie-construction.com** (décision PO : domaine canonique `.com` ; pas d'URL ailleurs dans le code)

### Mission 10 — Notification mail de retard (lot 10)

15. Dès qu'un dossier a **au moins 2 échéances échues impayées**, un e-mail part **automatiquement** (une fois par franchissement de seuil, pas à chaque cron) :
    - **To** : e-mail du courtier du dossier (comme `send-reminder`)
    - **Cc** : `contact@encyclie-construction.com`
    - **Déclenchement** : route cron quotidienne à créer (aucune infra cron n'existe aujourd'hui — pas de `vercel.json`)

### Mission 11 — Bandeau horaires (lot 11)

16. Bandeau haut de page **admin + courtiers**, heure locale en direct : France métropolitaine (`Europe/Paris`), Martinique, Guadeloupe, Guyane, Réunion, Mayotte. Saint-Martin / Saint-Barthélemy : **hors bandeau** (absents du devis lot 11).

## Tasks / Subtasks

- [x] **Task 0 — Révision millésime 2027** (AC: #1–3)
  - [x] Barre d'exercice dossier (`DossierExerciseBar`) + sélecteur année admin (`ExerciseYearSelect`) — **pas** d'onglet « Révision 2027 » (pivot PO)
  - [x] Socle millésimé : `QuoteVintage`, `PaymentSchedule.vintageYear` (index non unique). `GET /api/quotes/[id]/versions` non réutilisé comme stockage
  - [x] API `POST /api/quotes/[id]/revision-2027` généralisée (`year` ≥ 2027), hydrate overlays, ne touche pas `formData` 2026
  - [x] Retarifer via `calculPrimeRCD()` + `genererEcheancier()` avec overlay année
  - [x] Barèmes : `TariffYear`, `/admin/exercices`, gel des années passées ; 2025/2026 builtin
- [x] **Task 1 — Nouvelle adresse sur tous les documents** (AC: #4)
  - [x] Constante `src/lib/cabinet.ts`
  - [x] Remplacement contrat / offre / appel / attestation / lettre d'intention / e-mails (grep `Notre-Dame` / `Victoire` à zéro dans `src/`)
  - [x] `send-contrat` et `send-premium-call` : pas d'adresse en dur (PDF en PJ)
  - [x] `contact@encyclie-construction.fr` → `.com` (`send-letter-intent`). `reclamation@` et `cotisation.encycliebat@` inchangés
- [x] **Task 2 — Mention « appel de prime aggravé » + formule 50 %** (AC: #5–6)
  - [x] `AggravationTab` : `aggravationAmount(prime HT × % × (1 + frais + taxe))` + bouton 50 %
  - [x] `calculateMajorations()` **non modifié** (reste le coefficient tarifaire 0,5 en prod) ; la formule complète est déjà dans `primeAggravationBilanN_1NonFourni` (`rcd.ts`)
  - [x] Titre PDF `premiumCallTitle(année, aggravé)` dans `PremiumCallPDF.tsx`
- [x] **Task 3 — Compteur de devis total** (AC: #7)
  - [x] `AdminScreen` KPI / badge = `quotesPagination.total` ; `addQuote` / `removeQuote` mettent à jour `pagination.total` ; refetch après création / suppression
- [x] **Task 4 — Interface récap portefeuille 202X + Excel** (AC: #8–9)
  - [x] `GET /api/admin/portfolio-recap?year=` + `/admin/portefeuille`
  - [x] KPI devis + suivi mensuel + barres CSS (évolution / taux / courtier / géo) + fractionnement + synthèse
  - [x] Géographie = `formData.territory` (st-martin / st-barth inclus)
  - [x] Export CSV BOM (`;`) via `/api/admin/portfolio-recap/export` — pas de lib xlsx dans le projet
- [x] **Task 5 — Onglet paiements en retard : pagination + lisibilité** (AC: #10)
  - [x] `overdue/route.ts` : `page` / `limit` (défaut 25), tri `dueDate` asc, `total` global pour le KPI
  - [x] Tableau compact 5 colonnes + actions sticky ; `PaginationBar`
- [x] **Task 6 — Notes de débit : catégorie + calcul + PDF + Excel** (AC: #11–12)
  - [x] Prisma `DebitNote` / `DebitNoteLine` (`installmentId` unique) + migration additive
  - [x] Tests unitaires 4 lignes Excel SET + commission **2 912,84 €**
  - [x] PDF orange + CSV colonnes Excel ; onglet dossier « Note de débit »
- [x] **Task 7 — Synchro date de règlement → note de débit** (AC: #13)
  - [x] `mark-paid` écrit `DebitNoteLine.paymentDate` pour l'`installmentId`
- [x] **Task 8 — Coordonnées du cabinet** (AC: #14)
  - [x] `/cabinet` admin + courtiers, constante Task 1 ; lien nav AppShell
- [x] **Task 9 — Notification mail retard ≥ 2 échéances** (AC: #15)
  - [x] Cron `GET /api/cron/overdue-multi-reminder` + `vercel.json` quotidien 08:00 UTC
  - [x] To = `broker.email` ; Cc = `CABINET.email` ; type `PAYMENT_REMINDER`
  - [x] Flag `OverdueThresholdMail` (1 envoi au franchissement ; suppression si redescend sous 2)
  - [x] `CRON_SECRET` Bearer — **à poser en env Vercel**, pas écrit dans `.env`
- [x] **Task 10 — Bandeau horaires territoires** (AC: #16)
  - [x] `TerritoryClocks` : Paris, Martinique, Guadeloupe, Guyane, Réunion, Mayotte — admin + courtiers

## Dev Notes

### Sources métier

- `docs/devis-missions-nouveau-contrat.md` (DEV-2026-09-002) : lots, formules, chiffrage.
- `docs/devis-mission-millesime-2027.md` (DEV-2026-09-001, accepté) : **socle de données millésimé** (lot 2 du devis 001) — CA / activités / prime / échéancier séparés par exercice.
- Capture Excel NOTE DE DEBIT : `docs/tarificateur-note-de-debit-exemple.png`.
- Récap : `docs/recap-portefeuille-rcd-2026.md` (et le PDF d'origine pour les graphiques perdus en MD).

### Notes de débit — source de vérité (Mission 7)

**Document de référence :** capture Excel SET, contrat **2024125RCDWAK**, compagnie WAKAM, période 01/01/2026–31/12/2026. Ne pas utiliser le n° « 2025302RCDFID » (mélange avec un autre exemple mail).

Le mail client donne la **dérivation du HT net** (Prime RCD HT) :

`Prime RCD HT = montant HT − frais de gestion − PJ HT`  
Exemple mail : 10 285 − 2 896,80 − 106 = **7 282,11 €** (même HT que l'Excel, toutes échéances).

L'Excel fixe le **NET à reverser** et le TTC par échéance :

`Commission = 10 % × Prime RCD HT` → **728,21 €** sur chaque ligne  
`NET hors com = TTC de l'échéance − Commission`

| Période    | TTC         | Prime RCD HT | Commission | NET hors com   |
| ---------- | ----------- | ------------ | ---------- | -------------- |
| 01/01/2026 | 10 619,75 € | 7 282,11 €   | 728,21 €   | **9 891,54 €** |
| 01/04/2026 | 7 609,80 €  | 7 282,11 €   | 728,21 €   | **6 881,59 €** |
| 01/07/2026 | 7 609,80 €  | 7 282,11 €   | 728,21 €   | **6 881,59 €** |
| 01/10/2026 | 7 609,80 €  | 7 282,11 €   | 728,21 €   | **6 881,59 €** |

Le 1er TTC est plus élevé (frais de gestion + PJ portés sur l'échéance 1). Le libellé Excel « Montant HT ANNUEL » (33 449,15 €) est la **somme des TTC** — ne pas recopier cette erreur HT/TTC.

Tests unitaires : ces 4 lignes + commission totale **2 912,84 €**.

### Structure du récap (Mission 5 — `docs/recap-portefeuille-rcd-2026.md`)

1. En-tête KPI (affaires actives, prime annuelle, prime réglée, ratio sur mois échus)
2. Suivi mensuel (tableau mois × due × réglée × ratio)
3. Graphique évolution primes dues / réglées (perdu en MD — présent dans le PDF)
4. Graphique taux de règlement mensuel
5. Répartition géographique (région × prime × part × nb assurés) — **données dossiers** ; le portefeuille réel inclut Saint-Martin et Saint-Barthélemy
6. Répartition courtier/apporteur (graphique + synthèse)
7. Répartition par fractionnement (trim. / mens. / sem. / ann.)
8. Synthèse textuelle automatique

Blocs 3, 4, 6, 7 sont dans le PDF client : ils font partie du lot. Risque de dépassement des 18 h → informer avant de poursuivre.

### Cartographie technique (établie via graphify — ne pas re-explorer)

- **PDF** : `src/components/pdf/` — `ContratPDF.tsx`, `PremiumCallPDF.tsx`, `AttestationRCDPDF.tsx`, `LetterOfIntentPDF.tsx`, `OfferLetterPDF.tsx` L489, `OfferLetterPreview.tsx`. Route : `src/app/api/generate-pdf/route.ts`.
- **E-mails avec adresse en dur** : `send-attestation`, `send-offer-letter`, `send-letter-intent`. Autres : `send-contrat`, `send-premium-call`, `invite-broker`.
- **E-mail canonique** : `contact@encyclie-construction.com`. Occurrences `.fr` à corriger (dont `send-letter-intent` L158). Tél. déjà en dur : 01 85 09 42 06.
- **Calcul RCD** : `calculPrimeRCD()` L477, `calculateMajorations()` L51, `genererEcheancier()` L1229, `getTaxeByRegion()` L442, `getTaxeProtectionJuridiqueByRegion()` L455. Territoires taxes : martinique, guadeloupe, reunion (9 % / PJ 13,4 %), guyane, mayotte (4,5 % / 6,7 %), **`st-martin` (5 %)**, **`st-barth` (0 %)** — déjà dans le code.
- **Paiements** : `overdue/route.ts` (admin, sans pagination, `daysOverdue`), `mark-paid`, `mark-unpaid`, `send-reminder` (To = courtier), `src/lib/payment-schedule-utils.ts`.
- **E-mails** : `src/lib/nodemailer.ts` `sendEmail()` L691.
- **QuoteVersion** : `src/app/api/quotes/[id]/versions/route.ts` — historique de modifications, **pas** un millésime.
- **Compteur devis** : `AdminScreen.tsx` L769 `totalQuotes: quotes.length` vs `quotesPagination.total` déjà utilisé vers L1795.
- **Exports** : `src/app/api/admin/bordereaux/export-v2/route.ts` + `src/lib/bordereau/generateCSV.ts`.
- Types : `src/lib/types.ts` (`Quote` L74, `PaymentInstallment` L107, `PaymentSchedule` L131, `CalculationResult` L12).

### Testing

- Pattern `__tests__/` adjacent.
- **Obligatoire** : notes de débit (4 lignes Excel + total commissions) ; aggravation 50 %.
- Mission 0 : non-régression `genererEcheancier` ; assert 2026 intact après avenant 2027.
- PDF (1, 2, 7) : contrôle visuel sur dossiers réels + grep « Notre-Dame » / « Victoire » à zéro après Mission 1.

## Change Log

| Date       | Version | Description                                                                                                                                                               | Author     |
| ---------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| 2026-09-07 | 0.1     | Création initiale (draft) depuis le devis DEV-2026-09-002 + mail client + cartographie graphify                                                                           | Sarah (PO) |
| 2026-09-07 | 0.2     | Validation PO : formule note de débit calée sur l'Excel ; millésime ≠ versions ; ordre et dépendances ; destinataires / site / cron ; st-martin déjà dans getTaxeByRegion | Sarah (PO) |
| 2026-09-08 | 0.3     | Implémentation Dev : lots 0–2, 4–11 livrés (lot 3 exclu). Status Review. Pivot millésime (barre d'exercice, pas d'onglet). Export récap/note = CSV BOM. | James (Dev) |

## Dev Agent Record

### Agent Model Used

Cursor Grok 4.6

### Debug Log References

- Tests : `debit-note.test.ts`, `portfolio-recap.test.ts`, `tariff-years.test.ts`, `exercise-year-filter.test.ts`, `revision-millesime.test.ts` (16/16 OK).
- Grep `src/` : zéro `Notre-Dame` / `Victoire`.
- `npx prisma generate` OK. **`migrate deploy` non exécuté** (à lancer par l'humain).

### Completion Notes List

- Mission 0 : sélecteur d'année admin + barre dossier ; overlays DB ≥ 2027 ; pas d'unicité dangereuse sur les échéanciers.
- Mission 1 : `CABINET` unique ; e-mails / PDF branchés ; `reclamation@` et `cotisation.encycliebat@` laissés en `.fr`.
- Mission 2 : onglet calculateur formule complète + bouton 50 % ; titre PDF si `nonFournitureBilanN_1 === 0.5`. Coefficient tarifaire `calculateMajorations` inchangé (prod).
- Mission 4 : KPI déjà sur `quotesPagination.total` ; store incrémente/décrémente `total` à la création/suppression.
- Mission 5 : `/admin/portefeuille` + graphiques CSS + export CSV. Affaires actives = ACCEPTED / PRIME_CALL_EMITTED / INSTALLMENT_IN_PROGRESS. Recette visuelle PDF client non faite (login).
- Mission 6 : pagination 25, 5 colonnes compactes.
- Missions 7–8 : modèles Prisma + onglet + PDF/CSV ; `mark-paid` → `paymentDate`. **Tables absentes tant que la migration n'est pas déployée.**
- Mission 9 : `/cabinet` pour ADMIN et BROKER.
- Mission 10 : cron 08:00, `CRON_SECRET` Bearer. Variable d'env à créer sur Vercel (non écrite dans `.env`).
- Mission 11 : bandeau 6 fuseaux sous le header AppShell.
- Lot 3 date de naissance : hors périmètre.

### File List

- `src/lib/cabinet.ts`
- `src/lib/quotes/aggravation.ts`
- `src/lib/quotes/debit-note.ts`
- `src/lib/quotes/debit-note-from-quote.ts`
- `src/lib/quotes/csv-export.ts`
- `src/lib/quotes/territory.ts`
- `src/lib/quotes/portfolio-recap.ts`
- `src/lib/quotes/overdue-threshold.ts`
- `src/lib/quotes/exercise-year-filter.ts`
- `src/lib/quotes/revision-millesime.ts`
- `src/lib/cron-auth.ts`
- `src/lib/quotes/__tests__/debit-note.test.ts`
- `src/lib/quotes/__tests__/portfolio-recap.test.ts`
- `src/components/pdf/DebitNotePDF.tsx`
- `src/components/pdf/PremiumCallPDF.tsx`
- `src/components/pdf/ContratPDF.tsx`
- `src/components/pdf/LetterOfIntentPDF.tsx`
- `src/components/pdf/OfferLetterPDF.tsx`
- `src/components/pdf/OfferLetterPreview.tsx`
- `src/components/pdf/AttestationRCDPDF.tsx`
- `src/components/ui/AppShell.tsx`
- `src/components/ui/TerritoryClocks.tsx`
- `src/components/ui/ExerciseYearSelect.tsx`
- `src/components/ui/DataDisplay.tsx`
- `src/components/admin/AdminOverduePaymentsPanel.tsx`
- `src/app/quotes/tabs/AggravationTab.tsx`
- `src/app/quotes/tabs/DebitNoteTab.tsx`
- `src/app/quotes/components/DossierExerciseBar.tsx`
- `src/app/quotes/[id]/page.tsx`
- `src/app/cabinet/page.tsx`
- `src/app/admin/portefeuille/page.tsx`
- `src/app/admin/exercices/page.tsx`
- `src/app/api/quotes/[id]/debit-notes/route.ts`
- `src/app/api/quotes/[id]/debit-notes/[noteId]/pdf/route.ts`
- `src/app/api/quotes/[id]/debit-notes/[noteId]/excel/route.ts`
- `src/app/api/admin/portfolio-recap/route.ts`
- `src/app/api/admin/portfolio-recap/export/route.ts`
- `src/app/api/cron/overdue-multi-reminder/route.ts`
- `src/app/api/payment-installments/overdue/route.ts`
- `src/app/api/payment-installments/[id]/mark-paid/route.ts`
- `src/app/api/email/send-attestation/route.ts`
- `src/app/api/email/send-offer-letter/route.ts`
- `src/app/api/email/send-letter-intent/route.ts`
- `src/lib/stores/quotes-store.ts`
- `src/middleware.ts`
- `src/app/globals.css`
- `prisma/schema.prisma`
- `prisma/migrations/20260907170000_quote_vintage_millesime/migration.sql`
- `prisma/migrations/20260908120000_tariff_years/migration.sql`
- `prisma/migrations/20260908140000_debit_notes_overdue_mail/migration.sql`
- `vercel.json`

## QA Results

_(à remplir par l'agent QA)_
