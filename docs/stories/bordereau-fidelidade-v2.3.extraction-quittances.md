# Story bordereau-fidelidade-v2.3: Service d’extraction — Feuille 2 Quittances

## Status

Ready for Review

## Story

**As a** back-office / administrateur,
**I want** un service qui extrait les échéances (PaymentInstallment) dont la date d’échéance ou la période tombe dans la **période** choisie, et produit les lignes de la **Feuille 2 Quittances** (une ligne = une échéance), avec IDENTIFIANT_QUITTANCE = IDENTIFIANT_POLICE + "Q" + numéro d’échéance et GARANTIE = "RC_RCD",
**so that** le CSV quittances soit correctement alimenté pour FIDELIDADE.

## Acceptance Criteria

1. Le service accepte **uniquement la période** (dateRange). Pas de brokerIds. APPORTEUR = même constante que Feuille 1.
2. **Source :** PaymentInstallment dont dueDate (ou periodStart/periodEnd) est dans la période ; remonter Quote pour **Quote.reference** (= IDENTIFIANT_POLICE) et données contrat.
3. **Une ligne = une échéance** (une ligne par PaymentInstallment).
4. **IDENTIFIANT_QUITTANCE** : IDENTIFIANT_POLICE + "Q" + numéro d’échéance (ex. Q1, Q2, Q3, Q4 pour échéances 1, 2, 3, 4).
5. **GARANTIE** : toujours "RC_RCD".
6. **APPORTEUR** : même constante que Feuille 1.
7. Colonnes Feuille 2 mappées : IDENTIFIANT_POLICE, NUMERO_AVENANT (vide si pas d’avenant), DATE_EMISSION_QUITTANCE, DATE_EFFET_QUITTANCE, DATE_FIN_QUITTANCE, DATE_ENCAISSEMENT, STATUT_QUITTANCE, PRIME_TTC, PRIME_HT, TAXES, TAUX_COMMISSIONS, COMMISSIONS, MODE_PAIEMENT. Sources : PaymentInstallment (amountTTC, amountHT, taxAmount, periodStart, periodEnd, paidAt, status, paymentMethod), Quote/calculatedPremium pour taux et montant commissions.
8. Gestion des données manquantes : valeurs par défaut documentées.
9. Retour d’un tableau d’objets typés (une ligne par échéance) prêt pour génération CSV.
10. Tests unitaires couvrant le mapping et IDENTIFIANT_QUITTANCE (Q1, Q2, …).

## Tasks / Subtasks

- [x] Task 1 (AC: 1, 2) — Requêtes et périmètre
  - [x] Requête PaymentInstallment avec dueDate (ou periodStart/periodEnd) dans dateRange
  - [x] Inclure schedule → quote → identifiantPolice ; Contract si besoin
  - [x] Pas de filtre broker ; APPORTEUR depuis constante
- [x] Task 2 (AC: 3, 4, 5, 6) — Une ligne par échéance, identifiants
  - [x] Une ligne par PaymentInstallment
  - [x] IDENTIFIANT_QUITTANCE = Quote.reference + "Q" + installmentNumber (ex. 1 → Q1, 2 → Q2)
  - [x] GARANTIE = "RC_RCD" ; APPORTEUR = constante
- [x] Task 3 (AC: 7) — Mapping colonnes Feuille 2
  - [x] DATE_EFFET_QUITTANCE, DATE_FIN_QUITTANCE ← periodStart, periodEnd
  - [x] DATE_EMISSION_QUITTANCE, DATE_ENCAISSEMENT ← paidAt ou dueDate/createdAt selon règle métier
  - [x] PRIME_TTC, PRIME_HT, TAXES ← amountTTC, amountHT, taxAmount
  - [x] TAUX_COMMISSIONS, COMMISSIONS ← depuis quote/calculatedPremium ou config ; documenter la source
  - [x] STATUT_QUITTANCE ← mapping depuis PaymentInstallment.status (ex. PAID → ENCAISSE)
  - [x] MODE_PAIEMENT ← paymentMethod (ex. VIREMENT)
- [x] Task 4 (AC: 8, 9) — Types et retour
  - [x] Type FidelidadeQuittancesRow avec toutes les colonnes Feuille 2
  - [x] Retourner tableau de FidelidadeQuittancesRow
- [x] Task 5 (AC: 10) — Tests unitaires
  - [x] Cas : échéances dans la période, ordre Q1/Q2 ; vérifier structure et valeurs

## Dev Notes

- Référence : `docs/epics/bordereau-fidelidade-scope-clarifie.md` ; colonnes Feuille 2 en section 6.
- Modèle PaymentInstallment : `prisma/schema.prisma` — installmentNumber, dueDate, amountHT, taxAmount, amountTTC, periodStart, periodEnd, status, paidAt, paymentMethod.
- TAUX_COMMISSIONS / COMMISSIONS : à clarifier si stockés sur Quote, BrokerProfile ou calculés ; documenter dans Dev Notes à l’implémentation.
- Dépendances : Story v2.1 (constante APPORTEUR, identifiantPolice), v2.2 (alignement période et source Quote/Contract).

### Testing

- Tests unitaires : mock PaymentInstallment + Quote ; vérifier IDENTIFIANT_QUITTANCE (Q1, Q2…) et mapping des montants/dates.

## Change Log

| Date       | Version | Description                                  | Author   |
| ---------- | ------- | -------------------------------------------- | -------- |
| 2025-02-03 | 0.1     | Création (scope clarifié bordereau v2)       | Sarah (PO) |

## Dev Agent Record

_(À remplir par l’agent de développement)_

### Agent Model Used

-

### Debug Log References

-

### Completion Notes List

- extractQuittancesV2.ts : requête PaymentInstallment avec dueDate OU (periodStart/periodEnd) chevauchant la période ; Quote ACCEPTED uniquement. TAUX_COMMISSIONS/COMMISSIONS : 10% depuis calculatedPremium.echeancier.echeances si dispo, sinon amountHT*0.1.
- mapPaymentStatusToStatutQuittance et mapPaymentMethodToModePaiement dans utils.ts.
- Vitest ajouté au projet pour exécuter les tests.

### File List

- src/lib/bordereau/types.ts (FidelidadeQuittancesRow)
- src/lib/bordereau/utils.ts (mapPaymentStatusToStatutQuittance, mapPaymentMethodToModePaiement)
- src/lib/bordereau/extractQuittancesV2.ts (nouveau)
- src/lib/bordereau/index.ts (export getQuittancesV2, FidelidadeQuittancesRow)
- src/lib/bordereau/__tests__/extractQuittancesV2.test.ts (nouveau)
- package.json (script test), vitest.config.ts (nouveau)

## QA Results

_(À remplir par QA)_
