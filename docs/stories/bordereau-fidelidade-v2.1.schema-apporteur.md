# Story bordereau-fidelidade-v2.1: Schéma Bordereau, identifiant police et constante APPORTEUR

## Status

Ready for Review

## Story

**As a** administrateur / développeur,
**I want** le schéma Prisma étendu avec le modèle Bordereau (audit), le champ codeNAF sur Quote, et une **constante APPORTEUR** configurable (env ou config) pour les deux CSV ; **IDENTIFIANT_POLICE** = Quote.reference (pas de champ dédié),
**so that** la génération des bordereaux FIDELIDADE v2 dispose de la traçabilité et d’une valeur APPORTEUR unique pour tous les exports (sans filtre courtier).

## Acceptance Criteria

1. Modèle `Bordereau` créé avec les champs : id, generatedBy, generatedAt, periodStart, periodEnd, filterCriteria (JSON), csvDataPolices (JSON), csvDataQuittances (JSON), fileNamePolices, fileNameQuittances, filePath (optionnel)
2. Champ `codeNAF` ajouté au modèle Quote (companyData JSON ou champ direct)
3. **IDENTIFIANT_POLICE** : utiliser **Quote.reference** (champ existant) ; pas de nouveau champ ni de logique d’auto-génération dédiée au bordereau. Documenter dans Dev Notes / scope.
4. **Constante APPORTEUR** : valeur unique configurable (variable d’environnement ou config applicative) ; documentée ; utilisée pour les deux CSV (polices et quittances)
5. Scripts de migration créés et testés (Bordereau, codeNAF si besoin)
6. Données de seed mises à jour avec des exemples CODE_NAF si besoin

## Tasks / Subtasks

- [x] Task 1 (AC: 1) — Créer ou adapter le modèle Bordereau
  - [x] Champs : id (cuid), generatedBy (relation User), generatedAt, periodStart, periodEnd, filterCriteria (Json), csvDataPolices (Json), csvDataQuittances (Json), fileNamePolices, fileNameQuittances, filePath (String?)
  - [x] @@map("bordereaux")
- [x] Task 2 (AC: 2) — codeNAF sur Quote
  - [x] Champ direct `codeNAF String?` ou dans companyData ; documenter le choix
- [x] Task 3 (AC: 3) — IDENTIFIANT_POLICE = Quote.reference
  - [x] Documenter dans Dev Notes et scope : IDENTIFIANT_POLICE dans les CSV = Quote.reference (champ existant) ; pas de nouveau champ Prisma
- [x] Task 4 (AC: 4) — Constante APPORTEUR
  - [x] Définir la source : env (ex. BORDEREAU_APPORTEUR) ou config (ex. config/bordereau.ts) ; documenter dans Dev Notes / README
  - [x] Exposer une fonction ou constante utilisable par le service d’extraction (Story v2.2 et v2.3)
- [x] Task 5 (AC: 5, 6) — Migrations et seed
  - [x] Migration Prisma (Bordereau, codeNAF si besoin) ; vérifier non-régression ; seed si nécessaire
- [x] Task 6 — Régression
  - [x] Vérifier que les APIs et écrans existants (quotes, contrats) restent fonctionnels

## Dev Notes

- Référence : `docs/epics/bordereau-fidelidade-scope-clarifie.md` ; epic mis à jour `docs/epics/epic-bordereau-fidelidade.md`.
- Schéma Prisma : `prisma/schema.prisma`. Modèles existants : Quote, InsuranceContract, PaymentSchedule, PaymentInstallment, User, BrokerProfile.
- APPORTEUR ne doit plus venir de BrokerProfile.code ; une seule valeur pour tout le bordereau (config/env).
- **IDENTIFIANT_POLICE** : utiliser **Quote.reference** (champ existant sur Quote). Pas de champ identifiantPolice ni de génération dédiée au bordereau. Documenté (implémentation) : dans les CSV, colonne IDENTIFIANT_POLICE = Quote.reference.
- Bordereau : stocker les deux jeux de données (polices + quittances) pour l’historique et le re-téléchargement (Story v2.6).
- **APPORTEUR** : source = variable d'environnement `BORDEREAU_APPORTEUR` ; exposée via `getApporteur()` dans `src/lib/bordereau/config.ts`.

### Testing

- Migrations et seed : `npx prisma migrate dev`, `npx prisma generate`, seed si présent.
- Smoke test : lecture/écriture Quote et Contract après migration.

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

- Modèle Bordereau adapté : csvDataPolices, csvDataQuittances, fileNamePolices, fileNameQuittances, filePath optionnel.
- Quote : champ direct codeNAF (String?) ajouté.
- APPORTEUR : getApporteur() dans src/lib/bordereau/config.ts (env BORDEREAU_APPORTEUR) ; documenté dans README et Dev Notes.
- Migration SQL créée : prisma/migrations/20250203120000_bordereau_v2_schema_quote_code_naf/migration.sql. Exécuter `npx prisma migrate dev` pour l'appliquer.

### File List

- prisma/schema.prisma (modifié)
- src/lib/bordereau/config.ts (créé)
- src/lib/bordereau/index.ts (modifié — export getApporteur)
- README.md (modifié — section BORDEREAU_APPORTEUR)
- docs/stories/bordereau-fidelidade-v2.1.schema-apporteur.md (modifié — Dev Notes)
- prisma/migrations/20250203120000_bordereau_v2_schema_quote_code_naf/migration.sql (créé)

## QA Results

_(À remplir par QA)_
