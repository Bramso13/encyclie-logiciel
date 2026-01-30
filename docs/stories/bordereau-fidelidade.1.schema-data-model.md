# Story bordereau-fidelidade.1: Add Bordereau schema and extend Quote/Contract models for FIDELIDADE data

## Status

Ready for development

## Story

**As a** administrateur / développeur,
**I want** étendre le schéma Prisma avec le modèle Bordereau, le champ codeNAF sur Quote et l'identifiant police (identifiantPolice),
**so that** la génération de bordereaux FIDELIDADE dispose d'une traçabilité et des données nécessaires (CODE_NAF, identifiant police).

## Acceptance Criteria

1. Modèle `Bordereau` créé avec les champs : id, generatedBy, generatedAt, periodStart, periodEnd, filterCriteria (JSON), csvData (JSON), fileName, filePath
2. Champ `codeNAF` ajouté au modèle Quote (dans companyData JSON ou champ direct)
3. Champ `identifiantPolice` ajouté à Quote et/ou InsuranceContract avec logique d'auto-génération (YYYY+NUMBER+RCDFID)
4. Scripts de migration créés et testés
5. Données de seed mises à jour avec des exemples de CODE_NAF

## Tasks / Subtasks

- [ ] Task 1 (AC: 1) — Créer le modèle Bordereau dans le schéma Prisma
  - [ ] Définir les champs : id (cuid), generatedBy (String, relation User), generatedAt (DateTime), periodStart, periodEnd (DateTime), filterCriteria (Json), csvData (Json), fileName (String), filePath (String?)
  - [ ] Ajouter la relation User (generatedBy) côté User si nécessaire
  - [ ] Utiliser @@map("bordereaux") pour le nom de table
- [ ] Task 2 (AC: 2) — Ajouter codeNAF au modèle Quote
  - [ ] Décider : champ direct `codeNAF String?` ou inclusion dans companyData (documenter dans Dev Notes)
  - [ ] Si champ direct : ajouter codeNAF String? sur Quote
- [ ] Task 3 (AC: 3) — Ajouter identifiantPolice et logique d'auto-génération
  - [ ] Ajouter champ identifiantPolice String? sur Quote et/ou InsuranceContract (selon convention : une seule source de vérité)
  - [ ] Documenter le format : ANNÉE (4 chiffres) + NUMÉRO (séquentiel ou id court) + "RCDFID"
  - [ ] Prévoir génération au moment approprié (soumission quote, création contrat) ou via hook/migration
- [ ] Task 4 (AC: 4) — Migrations et tests
  - [ ] Exécuter `npx prisma migrate dev --name add_bordereau_and_fidelidade_fields`
  - [ ] Vérifier que les migrations s'appliquent sans erreur et que les modèles existants ne régressent pas
- [ ] Task 5 (AC: 5) — Mise à jour du seed
  - [ ] Ajouter des valeurs CODE_NAF d'exemple dans seed.ts pour les quotes/companyData concernés
- [ ] Task 6 — Régression
  - [ ] Vérifier que les APIs et écrans existants (quotes, contrats) fonctionnent toujours après les changements de schéma

## Dev Notes

### Contexte projet

- Next.js 15, React 19, Prisma, PostgreSQL, TypeScript.
- Schéma Prisma : `prisma/schema.prisma`. Modèles existants : `Quote` (companyData Json, formData Json, calculatedPremium Json, pas de codeNAF ni identifiantPolice), `InsuranceContract` (reference, status ContractStatus, startDate, endDate, quoteId, brokerId, productId), `BrokerProfile` (code), `User` (role UserRole : BROKER | ADMIN | UNDERWRITER), `PaymentSchedule`, `PaymentInstallment` (dueDate pour échéances).
- Pas de dossier `docs/architecture` ; les détails techniques sont déduits du schéma et du code existant.

### Data Models (référence schéma actuel)

- **Quote** : id, reference, status, productId, companyData (Json), formData (Json), calculatedPremium (Json), validUntil, offerData, submittedAt, offerReadyAt, offerSentAt, acceptedAt, brokerId, createdAt, updatedAt. À ajouter : codeNAF (recommandation : champ direct `codeNAF String?` pour requêtes et validation), identifiantPolice (String?).
- **InsuranceContract** : id, reference, status (ContractStatus : ACTIVE, SUSPENDED, EXPIRED, CANCELLED, PENDING_RENEWAL), quoteId, startDate, endDate, annualPremium, paymentStatus, brokerId, productId, attestationPath, contractPath, etc. Option : identifiantPolice sur Contract si c’est la référence “police” côté assureur.
- **Bordereau** (nouveau) : id, generatedBy (userId), generatedAt, periodStart, periodEnd, filterCriteria (Json), csvData (Json), fileName, filePath (optionnel). Relation : User hasMany Bordereau (generatedBy).

### Fichiers à modifier/créer

- `prisma/schema.prisma` : ajout modèle Bordereau, champs Quote (codeNAF, identifiantPolice) et éventuellement InsuranceContract (identifiantPolice si une seule source).
- `prisma/migrations/` : nouvelle migration.
- `prisma/seed.ts` : exemples CODE_NAF pour données de test.

### Contraintes

- Changements de schéma additifs uniquement (pas de suppression de colonnes existantes).
- Ne pas casser les APIs existantes (quotes, contrats, dashboard).

### Testing

- Vérifier que `npx prisma generate` et `npx prisma migrate dev` passent.
- Vérifier que le seed s’exécute sans erreur.
- Smoke test : création/lecture Quote et InsuranceContract après migration (ex. via app ou script).

## Testing

- Exécuter les migrations sur une base de dev et valider le schéma généré.
- Exécuter le seed et contrôler la présence de codeNAF / identifiantPolice sur les enregistrements de test.
- S’assurer qu’aucune régression sur les parcours quote/contrat existants.

## Change Log

| Date       | Version | Description                    | Author   |
| ---------- | ------- | ------------------------------ | -------- |
| 2025-01-30 | 0.1     | Création depuis epic bordereau | Bob (SM) |

## Dev Agent Record

_(À remplir par l’agent de développement)_

### Agent Model Used

-

### Debug Log References

-

### Completion Notes List

-

### File List

-

## QA Results

_(À remplir par QA)_
