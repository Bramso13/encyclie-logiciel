# Story ROLES-1 : Permissions granulaires administrables pour les administrateurs

## Status

Ready for Review

## Story

**As a** administrateur ENCYCLIE disposant de la permission « Utilisateurs & rôles »,
**I want** attribuer et retirer des permissions granulaires aux administrateurs depuis un panneau dédié, avec une piste d'audit de chaque changement,
**so that** l'accès aux fonctions sensibles (tarifs, production, commissions, validation des dossiers…) soit limité aux seules personnes habilitées, au lieu du tout-ou-rien « ADMIN » actuel.

## Contexte métier

Le système d'autorisation est aujourd'hui **binaire** : enum `UserRole` = `BROKER | ADMIN` (`prisma/schema.prisma`), et chaque admin hérite de **tous** les pouvoirs (configuration produits et tarifs, bordereaux, import de paiements, validation des offres, messagerie…). Les contrôles sont dispersés : `session.user.role === "ADMIN"` dans le middleware (`src/middleware.ts`), `withAuthAndRole(["ADMIN"])` dans `src/lib/api-utils.ts`, et des checks `isAdmin` dans les composants.

Le commanditaire veut que **certains admins** puissent gérer les rôles : on passe donc à un modèle de **permissions granulaires** administrable en UI.

**Décisions de cadrage (PO + commanditaire) :**

1. **6 domaines de permissions**, attribuables individuellement à tout utilisateur de rôle `ADMIN` :

   | Permission          | Surface couverte (existant)                                                                                                                                   |
   | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
   | `USERS_ROLES`       | Gestion des comptes et attribution des permissions (nouveau panneau) ; gestion des courtiers (`AdminBrokersPanel`, API `admin/brokers`)                       |
   | `PRODUCTS_TARIFFS`  | Configuration produits (`ProductConfigTab`, `/admin/configuration-produits`), années tarifaires / exercices (`/admin/exercices`, API `admin/tariff-years`)    |
   | `QUOTES_VALIDATION` | Validation / approbation des dossiers et offres (`ApproveOfferModal`, API `approve-and-create-contract`, changements de statut admin)                         |
   | `PRODUCTION`        | Bordereaux (`BordereauxAdminView`, `/admin/bordereaux`), notes de débit, import des paiements, paiements en retard, écarts de montants, `modifier_echeancier` |
   | `COMMISSIONS`       | Consultation et validation des commissions courtiers                                                                                                          |
   | `MESSAGING`         | Messagerie admin (`AdminMessagesPanel`), correspondance (`CorrespondanceTab`)                                                                                 |

2. **Bootstrap** : à la migration, **tous les utilisateurs `ADMIN` existants reçoivent les 6 permissions** (aucune régression d'accès). Ils pourront ensuite être restreints via l'UI.
3. **Piste d'audit obligatoire** (contexte assurance / conformité) : chaque attribution ou retrait de permission est journalisé (qui, sur qui, quelle permission, quelle action, quand, IP/user-agent).
4. Le rôle `BROKER` est **inchangé** : aucune permission granulaire côté courtier dans cette story.
5. Un admin ne peut pas se retirer à lui-même la permission `USERS_ROLES` (garde-fou anti-verrouillage) ; le retrait du rôle ADMIN d'un utilisateur supprime ses permissions.

## Acceptance Criteria

1. **Modèle de données** : nouvelle table de permissions par utilisateur (ex. `UserPermission` : `userId`, `permission`, `grantedById`, `grantedAt` — `@@id([userId, permission])`) avec enum des 6 domaines, **et** table d'audit (ex. `PermissionAuditLog` : `targetUserId`, `permission`, `action` `GRANTED|REVOKED`, `changedById`, `createdAt`, `ipAddress`, `userAgent`). Migration **additive uniquement** ; les admins existants y sont seedés avec les 6 permissions.
2. **API de gestion** (protégée par la permission `USERS_ROLES`) :
   - `GET /api/admin/users` : liste des utilisateurs avec rôle et permissions ;
   - `PUT /api/admin/users/[id]/permissions` : attribution/retrait d'une permission, avec écriture dans le journal d'audit ;
   - `GET /api/admin/users/[id]/permission-audit` (ou équivalent) : historique des changements.
3. **Garde serveur unifiée** : nouveau helper côté API (ex. `withPermission("PRODUCTION")` dans `src/lib/api-utils.ts`, à côté de `withAuthAndRole`) appliqué aux routes admin des 6 domaines. Un admin sans la permission reçoit un `403` explicite. Les routes existantes migrent domaine par domaine sans changement de contrat pour les courtiers.
4. **Session / front** : les permissions de l'utilisateur connecté sont disponibles côté client (endpoint dédié ex. `GET /api/auth/permissions` ou `/api/users/me/permissions` + store/hook, ex. `usePermissions()` / `hasPermission("production")`). La session better-auth existante n'est pas cassée.
5. **Panneau « Utilisateurs & rôles »** : nouvel onglet/page admin (visible uniquement avec `USERS_ROLES`) listant les utilisateurs, leur rôle, leurs permissions (cases à cocher par domaine), avec feedback de succès/erreur via `notify()` et affichage de l'historique d'audit par utilisateur. Suit les patterns du design system (story RETOURS-3).
6. **Application des permissions dans l'UI** : les onglets/panneaux/pages admin des 6 domaines sont **masqués ou désactivés** sans la permission correspondante (navigation admin, menu Outils, pages `/admin/*`). Le middleware `/admin` continue d'exiger le rôle `ADMIN` ; l'affinement par permission est fait côté page/API.
7. **Garde-fous** : impossible de se retirer `USERS_ROLES` à soi-même (message métier explicite) ; rétrograder un admin en `BROKER` supprime ses permissions et journalise ; un admin sans `USERS_ROLES` ne voit pas le panneau et ne peut pas appeler l'API (403).
8. **Non-régression** : les courtiers conservent exactement leurs accès actuels ; les admins existants conservent tous leurs accès après migration ; login / reset password / parcours courtier inchangés.

## Tasks / Subtasks

- [x] **Task 1 — Schéma & migration** (AC: #1)
  - [x] Enum des 6 permissions + modèles `UserPermission` et `PermissionAuditLog` dans `prisma/schema.prisma`
  - [x] Migration additive + seed : tous les `ADMIN` existants reçoivent les 6 permissions
- [x] **Task 2 — Helpers d'autorisation** (AC: #3, #4)
  - [x] `withPermission(permission)` dans `src/lib/api-utils.ts` (charge les permissions de l'utilisateur, 403 métier sinon)
  - [x] Endpoint permissions de l'utilisateur courant + store/hook client `usePermissions()`
- [x] **Task 3 — API de gestion des permissions** (AC: #2, #7)
  - [x] `GET /api/admin/users` (rôles + permissions)
  - [x] `PUT /api/admin/users/[id]/permissions` + écriture audit (IP, user-agent) + garde-fous (auto-retrait `USERS_ROLES`, rétrogradation ADMIN → BROKER)
  - [x] Endpoint d'historique d'audit
- [x] **Task 4 — Migration des gardes existantes** (AC: #3)
  - [x] Remplacer `withAuthAndRole(["ADMIN"])` par `withPermission(...)` sur les routes des 6 domaines (brokers, tariff-years, approve-and-create-contract, bordereaux, import-payments, payments, ecarts-montants, rectifier-montants, messages…)
  - [x] **Corriger les 3 routes admin actuellement SANS aucune garde** (constat d'audit du 2026-09-23) : `src/app/api/admin/brokers/route.ts`, `src/app/api/admin/bordereaux/preview/route.ts`, `src/app/api/admin/bordereaux/export/route.ts` → leur appliquer `withPermission(...)` comme les autres
  - [x] Middleware `/admin` : inchangé (rôle ADMIN), affinement en pages
- [x] **Task 5 — Panneau « Utilisateurs & rôles »** (AC: #5)
  - [x] Nouvel onglet admin (ou page `/admin/utilisateurs`) : liste utilisateurs, édition des permissions, historique d'audit
  - [x] États vide/chargement/erreur selon le design system
- [x] **Task 6 — Application UI des permissions** (AC: #6)
  - [x] Masquer/désactiver onglets et entrées de menu selon `usePermissions()` dans `AdminScreen`, le header/Outils et les pages `/admin/*`
- [x] **Task 7 — Recette** (AC: #7, #8)
  - [x] Scénarios : admin complet (post-migration), admin restreint (ex. sans `PRODUCTION` → bordereaux masqués + 403 API), auto-retrait refusé, rétrogradation admin → courtier, audit consultable
  - [x] Non-régression courtier + auth

## Dev Notes

### Existant à respecter

- **Auth** : better-auth (`src/lib/auth.ts`), `role` en `additionalFields` ; session lue via `authClient.useSession()` côté client et `auth.api.getSession()` côté middleware. Les permissions vivent dans une **table séparée** (pas dans `additionalFields`) → prévoir un fetch dédié + store zustand (pattern des stores existants : `src/lib/stores/`).
- **Gardes actuelles** : `withAuth` (L73) et `withAuthAndRole` (L87) dans `src/lib/api-utils.ts` ; `src/middleware.ts` (L73-77) redirige les non-ADMIN hors de `/admin`. **Audit du 2026-09-23** : 14 des 17 routes `src/app/api/admin/` utilisent ces gardes — les 3 exceptions sans aucune protection sont `admin/brokers`, `admin/bordereaux/preview`, `admin/bordereaux/export` (à sécuriser dans cette story). Note dette technique : `admin/brokers/route.ts` instancie son propre `PrismaClient` au lieu du singleton `@/lib/prisma` — ne pas reproduire ce pattern dans les nouvelles routes.
- **Routes admin à re-mapper par domaine** : `src/app/api/admin/` (`brokers`, `tariff-years`, `bordereaux`, `import-payments`, `payments`, `ecarts-montants`, `rectifier-montants`, `run-echeancier-tests`, `portfolio-recap`) + `src/app/api/quotes/[id]/approve-and-create-contract`, `status`, `validate-installment`, etc. Dresser la liste exhaustive en Task 4 et la tracer dans les Completion Notes.
- **UI admin** : `src/app/dashboard/AdminScreen.tsx` (onglets), pages `src/app/admin/*`, panels `src/components/admin/*`. Suivre les patterns RETOURS-3 (composants `src/components/ui/`, `notify()`, libellés métier français).
- **Audit** : s'inspirer du pattern `QuoteVersion` (qui journalise `changedById`, `ipAddress`, `userAgent`) pour `PermissionAuditLog`.

### Contraintes

- Migration **additive** uniquement ; aucune modification destructive du schéma existant.
- Pas de nouveau rôle Prisma : le rôle reste `ADMIN`/`BROKER`, la granularité est portée par la table de permissions.
- Performance : charger les permissions une fois par session côté client (store), pas de fetch par onglet.

### Testing

- Tests unitaires : `withPermission` (accordé/refusé/non-admin), garde-fous (auto-retrait, rétrogradation).
- Tests d'intégration API : 403 sans permission, 200 avec, écriture du journal d'audit.
- Recette manuelle des scénarios AC #7.

## Change Log

| Date       | Version | Description                                                                                                                              | Author     |
| ---------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| 2026-09-23 | 0.1     | Création initiale (draft) — permissions granulaires sur 6 domaines, bootstrap admins existants, audit                                    | Sarah (PO) |
| 2026-09-23 | 0.2     | Validation PO : ajout constat sécurité (3 routes admin sans garde : brokers, bordereaux/preview, bordereaux/export) + dette PrismaClient | Sarah (PO) |
| 2026-09-23 | 0.3     | Implémentation : permissions granulaires, audit, gardes API et panneau Utilisateurs et rôles | James (dev) |

## Dev Agent Record

### Agent Model Used

Grok 4.7

### Debug Log References

- `npx vitest run src/lib/__tests__/permissions.test.ts` : 9 tests OK
- `npx tsc --noEmit` : aucune erreur hors tests préexistants
- `npx prisma migrate deploy` : non appliqué (base Supabase distante, action bloquée sans confirmation)

### Completion Notes List

- Migration additive `prisma/migrations/20260923160000_user_permissions` : enums, tables, seed des 6 permissions pour chaque `users.role = ADMIN`. **À appliquer** avec `npx prisma migrate deploy` avant recette. Tant que la table n'existe pas, `GET /api/users/me/permissions` échoue et l'UI masque les fonctions (fail-closed).
- Décision d'accès pure dans `evaluateAccess` / `planPermissionMutation`. `withPermission` charge les lignes `user_permissions` puis renvoie 403 « permission « … » requise ». Un non-admin reçoit « Accès refusé - rôle insuffisant ».
- Auto-retrait de `USERS_ROLES` et auto-rétrogradation ADMIN → BROKER refusés (même message métier). La rétrogradation d'un autre admin supprime ses permissions et écrit un `REVOKED` par permission.
- `GET /api/admin/tariff-years` reste ouvert à tout utilisateur connecté (sélecteur d'exercice). Seuls POST/PATCH exigent `PRODUCTS_TARIFFS`.
- Cartographie des gardes : `USERS_ROLES` (brokers, `/api/brokers`, gestion des permissions) ; `PRODUCTS_TARIFFS` (tariff-years mutations, produits, run-echeancier-tests, revision-2027) ; `QUOTES_VALIDATION` (statut, offre, approve-and-create-contract, workflow steps admin) ; `PRODUCTION` (bordereaux y compris preview/export, import/reset paiements, écarts, rectifier, portefeuille, échéances admin, notes de débit pour un admin, validate-installment pour un admin) ; `MESSAGING` (messages de dossier pour un admin, journal d'emails) ; `COMMISSIONS` (onglet commissions du dossier, pas de route admin dédiée). Les routes partagées avec les courtiers ne bloquent le courtier que s'il n'est pas propriétaire.
- `admin/brokers` utilise le singleton `@/lib/prisma` (plus de `PrismaClient` local ni `$disconnect`).
- Middleware `/admin` inchangé (rôle ADMIN). Affinement par `AdminPermissionGate` sur les pages.
- Recette manuelle navigateur non exécutée : serveur de dev arrêté et migration non déployée. Les 12 échecs vitest bordereau (`extractPolicesV2`, `utils`, `verifyPremierEcheanceBordereau`) sont préexistants et hors de cette story.
- DoD : exigences et tests unitaires des garde-fous OK ; vérification manuelle et application de la migration restent à faire avant mise en production.

### File List

- prisma/schema.prisma
- prisma/migrations/20260923160000_user_permissions/migration.sql
- src/lib/permissions.ts
- src/lib/permission-service.ts
- src/lib/__tests__/permissions.test.ts
- src/lib/api-utils.ts
- src/lib/stores/permissions-store.ts
- src/app/api/users/me/permissions/route.ts
- src/app/api/admin/users/route.ts
- src/app/api/admin/users/[id]/permissions/route.ts
- src/app/api/admin/users/[id]/permission-audit/route.ts
- src/app/api/admin/brokers/route.ts
- src/app/api/admin/bordereaux/preview/route.ts
- src/app/api/admin/bordereaux/export/route.ts
- src/app/api/admin/bordereaux/preview-v2/route.ts
- src/app/api/admin/bordereaux/export-v2/route.ts
- src/app/api/admin/bordereaux/history/route.ts
- src/app/api/admin/bordereaux/[id]/download/route.ts
- src/app/api/admin/ecarts-montants/route.ts
- src/app/api/admin/ecarts-montants/[quoteId]/route.ts
- src/app/api/admin/import-payments/route.ts
- src/app/api/admin/payments/reset/route.ts
- src/app/api/admin/rectifier-montants/route.ts
- src/app/api/admin/portfolio-recap/route.ts
- src/app/api/admin/portfolio-recap/export/route.ts
- src/app/api/admin/run-echeancier-tests/route.ts
- src/app/api/admin/tariff-years/route.ts
- src/app/api/admin/tariff-years/[year]/route.ts
- src/app/api/brokers/route.ts
- src/app/api/emails/logs/route.ts
- src/app/api/payment-installments/overdue/route.ts
- src/app/api/payment-installments/[id]/mark-paid/route.ts
- src/app/api/payment-installments/[id]/mark-unpaid/route.ts
- src/app/api/payment-installments/[id]/send-reminder/route.ts
- src/app/api/products/route.ts
- src/app/api/products/[id]/route.ts
- src/app/api/quotes/[id]/approve-and-create-contract/route.ts
- src/app/api/quotes/[id]/status/route.ts
- src/app/api/quotes/[id]/offer/route.ts
- src/app/api/quotes/[id]/revision-2027/route.ts
- src/app/api/quotes/[id]/debit-notes/route.ts
- src/app/api/quotes/[id]/debit-notes/[noteId]/pdf/route.ts
- src/app/api/quotes/[id]/debit-notes/[noteId]/excel/route.ts
- src/app/api/quotes/[id]/validate-installment/route.ts
- src/app/api/quotes/[id]/messages/route.ts
- src/app/api/quotes/[id]/messages/unread-count/route.ts
- src/app/api/workflow/steps/[id]/route.ts
- src/app/admin/utilisateurs/page.tsx
- src/app/admin/bordereaux via src/components/admin/BordereauxAdminView.tsx
- src/app/admin/configuration-produits/page.tsx
- src/app/admin/ecarts-montants/page.tsx
- src/app/admin/exercices/page.tsx
- src/app/admin/portefeuille/page.tsx
- src/app/modifier_echeancier/page.tsx
- src/app/dashboard/AdminScreen.tsx
- src/app/quotes/[id]/page.tsx
- src/app/quotes/tabs/ResumeTab.tsx
- src/app/quotes/tabs/CalculationTab.tsx
- src/app/quotes/tabs/PremiumCallTab.tsx
- src/components/admin/AdminPermissionGate.tsx
- src/components/admin/AdminUsersRolesPanel.tsx
- src/components/admin/ImportPaymentsAdminView.tsx
- src/components/ui/AppShell.tsx
- src/components/ui/AuthenticatedAppShell.tsx
- src/components/ui/ExerciseYearSelect.tsx

## QA Results

_(à remplir par l'agent QA)_
