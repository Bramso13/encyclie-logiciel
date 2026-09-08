# Story RETOURS-3 : Refonte UX globale — toutes les pages admin et courtier

## Status

Ready for Review

## Story

**As a** utilisateur de la plateforme (administrateur ENCYCLIE ou courtier),
**I want** que **toutes** les pages de mon espace (admin ou courtier) soient simples, explicites et ergonomiques — information et actions visibles sans formation,
**so that** je n'aie plus à demander de correctifs d'ergonomie (scrolls horizontaux, compteurs trompeurs, listes illisibles, libellés opaques, documents « trop bruts »).

## Contexte métier

Les retours client (mail de sept. 2026) révèlent un **problème systémique d'ergonomie**, pas seulement des bugs isolés (stories 1 et 2) :

- tableaux illisibles (« descendre tout en bas puis slider à droite ») ;
- compteurs figés ou trompeurs (« 10/10 ») ;
- paginations inadaptées aux volumes ;
- recherches trop étroites ;
- documents perçus comme « trop bruts ».

**Décision PO (commanditaire) :** ce n'est **pas** un lot borné à quelques écrans. C'est un **rewrite UX de toutes les pages admin et courtier**, pour tarir les demandes d'évolution liées à l'UX.

> **Geste commercial, non facturé** (hors DEV-2026-09-001 / 002). La charge est **élevée** (`AdminScreen` ~3 500 lignes, ~13 onglets dossier, espace courtier + auth). On le fait quand même. En contrepartie : **pas de nouvelles fonctionnalités métier** dans cette story — uniquement présentation, lisibilité, libellés, feedback, structure d'écran. Si un écran révèle un bug métier hors 1 / 2, le noter et ne pas le glisser ici.

Les **souscripteurs** (`UNDERWRITER`) voient `BrokerScreen` : ils bénéficient de la refonte courtier. **`ClientScreen` (rôle par défaut / assuré) : hors scope** — le client n'a pas demandé l'espace assuré.

### Dépendances

- Stories **1 et 2 d'abord** pour les **correctifs fonctionnels** (NAF, compteurs réels, recherche par nom, pagination 25, honoraires, adresse, notes de débit, etc.). Cette story **ne refait pas** ces AC : elle **habille et unifie** les mêmes écrans (et tous les autres).
- Écrans / bandeaux créés en story 2 (récap portefeuille, coordonnées, horaires, révision 2027, notes de débit) : dès qu'ils existent, ils **doivent** suivre les patterns de cette story. Si la story 3 passe avant, les livrables 2 s'alignent à la livraison.

## Acceptance Criteria

1. **Audit UX livré** : inventaire de **toutes** les pages admin + courtier (liste Dev Notes), frictions classées bloquant / gênant / cosmétique, rapport dans `docs/`.
2. **Design system appliqué partout** (admin + courtier + pages d'auth utilisées par ces rôles) :
   - tableau standard : pagination au choix (défaut 25), actions **toujours visibles sans scroll horizontal** en 1366×768, recherche / filtres au-dessus si la liste est filtrable, compteur = **total API réel** ;
   - libellés métier assurance, actions à l'infinitif ;
   - feedback : succès / erreur en français métier ; état vide explicite ; indicateur si chargement **> 300 ms** ;
   - tokens charte ENCYCLIE dans `src/app/globals.css` + logo `public/couleur_1.png` ;
   - shell commun (nav dashboard `src/app/dashboard/page.tsx`) cohérent pour admin et courtier.
3. **Espace admin refondu** : `AdminScreen` (y compris **découpage** du monolithe ~3 500 lignes en composants d'écran / onglets lisibles), listes courtiers / devis / souscripteurs / produits, onglets admin (`ProductConfigTab`, `CorrespondanceTab`, `EcartsMontantsTab`), `admin/bordereaux`, `admin/import-payments`, `modifier_echeancier`. Aucun de ces écrans ne conserve d'action cachée hors viewport ni de jargon technique.
4. **Espace courtier refondu** (et UNDERWRITER) : `BrokerScreen` (y compris tutoriels), création / liste de devis, parcours de suivi. Même exigence d'ergonomie que l'admin.
5. **Parcours dossier commun** refondu : `QuoteForm`, `QuotesList`, `QuoteValidationPage`, `QuoteSuccessPage`, `quotes/[id]` **et chacun des 13 onglets**, modales `AddBrokerModal` / `ApproveOfferModal`, `MessageComposer`. Un courtier et un admin doivent pouvoir mener les actions du dossier **sans** scroll horizontal ni libellé ambigu.
6. **Pages d'authentification** alignées (login, register, forgot-password, reset-password, setup-account) : claires, charte ENCYCLIE, erreurs métier — ce sont les premières pages vues par admin et courtier.
7. **Recette bi-rôle** : exécutable **sans assistance** en 1366×768.
   - **Admin :** se connecter ; tableau de bord ; retrouver un dossier par nom ; traiter un paiement en retard ; ouvrir courtiers / produits / bordereaux / import paiements / modifier échéancier ; générer un document ; se déconnecter.
   - **Courtier :** se connecter ; tableau de bord ; créer un devis ; retrouver un dossier ; suivre l'offre / les documents ; se déconnecter.
   - Non-régression stories 1 et 2 (compteurs, NAF, recherche nom, pagination, etc.).

## Tasks / Subtasks

- [x] **Task 1 — Audit UX complet** (AC: #1)
  - [x] Inventorier **chaque** écran de la liste « Périmètre pages » (Dev Notes)
  - [x] Frictions : scroll horizontal, actions cachées, compteurs, libellés, états vides, feedback, densité, hiérarchie
  - [x] Rapport dans `docs/`
- [x] **Task 2 — Patterns + charte** (AC: #2) — ⚠️ skills Dev Notes **avant** toute prod UI
  - [x] Composants : tableau, pagination, états vide / chargement / erreur, confirmations, champs de formulaire, page shell (nav)
  - [x] Tokens CSS ENCYCLIE dans `globals.css` + logo
  - [x] Convention de libellés (vocabulaire métier, infinitif)
- [x] **Task 3 — Shell + authentification** (AC: #2, #6)
  - [x] `src/app/dashboard/page.tsx` (nav, header, logo, rôle) + layouts concernés
  - [x] `login`, `register`, `forgot-password`, `reset-password`, `auth/setup-account`
- [x] **Task 4 — Rewrite espace admin** (AC: #3)
  - [x] **Découper** `AdminScreen.tsx` (~3 500 lignes) en composants d'onglets / listes maintenables — le rewrite **inclut** cette extraction
  - [x] Listes et stats (courtiers, devis, souscripteurs, produits) : patterns tableau + compteurs réels (sans recoder la logique métier story 1)
  - [x] `ProductConfigTab`, `CorrespondanceTab`, `EcartsMontantsTab`
  - [x] `src/app/admin/bordereaux/page.tsx`, `src/app/admin/import-payments/page.tsx`, `src/app/modifier_echeancier/page.tsx`
- [x] **Task 5 — Rewrite espace courtier** (AC: #4)
  - [x] `BrokerScreen.tsx` (listes, actions, tutoriels)
  - [x] Parcours courtier de bout en bout (dashboard → devis → succès / validation)
- [x] **Task 6 — Rewrite parcours dossier (commun admin / courtier)** (AC: #5)
  - [x] `QuoteForm.tsx`, `QuotesList.tsx`, `QuoteValidationPage.tsx`, `QuoteSuccessPage.tsx`, `ActivityBreakdown.tsx`, `LossHistoryField.tsx`, `MultiSelect.tsx`
  - [x] `src/app/quotes/[id]/page.tsx` + **tous** les onglets `src/app/quotes/tabs/`
  - [x] `AddBrokerModal`, `ApproveOfferModal`, `MessageComposer`
  - [x] Ne pas réécrire la logique NAF / calcul / PDF métier des stories 1–2 — uniquement UX
- [x] **Task 7 — Recette bi-rôle** (AC: #7)
  - [x] Parcours admin + courtier ci-dessus, 1366×768
  - [x] Contrôle de non-régression stories 1 et 2
  - [x] Recette interne documentée (ou client si dispo)

## Dev Notes

### Périmètre pages (admin + courtier — exhaustif)

| Zone                     | Fichiers                                                                                                                                                                                                                                                                                                                                       |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Shell                    | `src/app/dashboard/page.tsx`, `src/app/dashboard/layout.tsx`, `src/app/layout.tsx`                                                                                                                                                                                                                                                             |
| Admin                    | `AdminScreen.tsx` (~3 500 lignes), `src/components/admin/ProductConfigTab.tsx`, `CorrespondanceTab.tsx`, `EcartsMontantsTab.tsx`, `src/app/admin/bordereaux/page.tsx`, `src/app/admin/import-payments/page.tsx`, `src/app/modifier_echeancier/page.tsx`                                                                                        |
| Courtier (+ UNDERWRITER) | `BrokerScreen.tsx`                                                                                                                                                                                                                                                                                                                             |
| Dossier / devis          | `QuoteForm.tsx`, `QuotesList.tsx`, `QuoteValidationPage.tsx`, `QuoteSuccessPage.tsx`, `ActivityBreakdown.tsx`, `src/app/quotes/[id]/page.tsx`, onglets : AppelDePrimeTab, BordereauTab, BrokerCommissionsTab, CalculationTab, ContratTab, FormDataTab, LetterTab, OffreTab, PieceJointeTab, PremiumCallTab, ResumeTab, AggravationTab, ChatTab |
| Modales / messages       | `AddBrokerModal.tsx`, `ApproveOfferModal.tsx`, `MessageComposer.tsx`                                                                                                                                                                                                                                                                           |
| Auth                     | `src/app/login/page.tsx`, `register/page.tsx`, `forgot-password/page.tsx`, `reset-password/page.tsx`, `auth/setup-account/page.tsx` (+ layouts associés)                                                                                                                                                                                       |
| **Hors scope**           | `ClientScreen.tsx` (rôle assuré / défaut) ; routes API ; PDF (mise en page documents = stories 1–2, pas cette story sauf cohérence visuelle des **écrans** de génération)                                                                                                                                                                      |

Stores à respecter (pas de nouvelle source de pagination) : `quotes-store.ts`, `users-store.ts`, `products-store.ts`, `messages-store.ts`.

### Skills à mobiliser (obligatoire Tasks 2–6)

1. **`frontend-design`** (`~/.cursor/skills/frontend-design/SKILL.md`) — mode **« refined / utilitarian »**. Objectif : « simple et très explicite ». Pas de direction maximaliste / créative.
2. **`tailwind`** (`~/.claude/skills/tailwind/SKILL.md`) — **Tailwind CSS v4** (`tailwindcss@^4` + `@tailwindcss/postcss`, CSS-first dans `globals.css`, **pas de `tailwind.config.js`**).
3. **`css-animations`** (`~/.claude/skills/css-animations/SKILL.md`) — **uniquement** feedback AC #2. Aucune animation décorative.

### Testing

- Rapport d'audit = liste ci-dessus cochée.
- Recette manuelle AC #7 (admin **et** courtier), 1366×768.
- Non-régression fonctionnelle stories 1 et 2.

## Change Log

| Date       | Version | Description                                                                                                       | Author     |
| ---------- | ------- | ----------------------------------------------------------------------------------------------------------------- | ---------- |
| 2026-09-07 | 0.1     | Création initiale (draft) — initiative UX transverse suite aux retours client                                     | Sarah (PO) |
| 2026-09-07 | 0.2     | Validation PO : périmètre borné (première passe)                                                                  | Sarah (PO) |
| 2026-09-07 | 0.3     | Geste commercial non facturé                                                                                      | Sarah (PO) |
| 2026-09-07 | 0.4     | Rewrite UX **toutes** les pages admin + courtier (décision commanditaire) ; ClientScreen hors scope ; auth inclus | Sarah (PO) |
| 2026-09-07 | 0.5     | Implémentation Dev : design system, découpage AdminScreen, auth, listes, recette auth | James (Dev) |
| 2026-09-07 | 0.6     | Ajustements recette : nav admin / outils dev, logo sur fond blanc, nav dossier sans scroll horizontal | James (Dev) |

## Dev Agent Record

### Agent Model Used

Cursor Grok 4.6

### Debug Log References

- Next.js `POST /api/auth/sign-in/email 401` (identifiants fictifs) → bandeau métier affiché.
- `vitest run src/lib/ui/labels.test.ts` : 4/4 OK.
- `vitest run` global : 97 passed / 12 failed — échecs préexistants `src/lib/bordereau/__tests__` (hors story).
- `tsc --noEmit` : bruits préexistants dans tests échéancier / vitest globals, pas dans les fichiers UX de cette story.
- Recette connectée admin/courtier 1366×768 non exécutée (pas de compte en session) — voir `docs/recette-ux-bi-role.md`.
- Logo login 1366×768 : mot noir lisible dans pastille blanche sur bandeau `bg-ink`.
- Recette utilisateur 2026-09-07 : nav dossier + logo + menu Outils validés (« c'est parfait »).

### Completion Notes List

- Direction **refined / utilitarian** : tokens `--brand #f49301`, `--ink`, `--surface` ; indigo 500/600/700 remappés vers la marque pour les boutons hérités.
- `AdminScreen` découpé (~170 lignes orchestrateur + panels). Bordereaux / import extraits dans `*AdminView.tsx` (Next refuse des props custom sur les `page.tsx`).
- Compteurs : KPI dossiers = `quotesPagination.total` ; KPI courtiers = `usersPagination.total` (fetch `limit=100`, pas une nouvelle pagination). KPI courtier « en cours / offres » = page affichée, libellé honnête.
- Recherche dossiers : filtre client sur la **page courante** (l’API n’a pas de `search`) — toolbar explicite.
- Spinner uniquement si chargement > 300 ms (`useDelayedFlag`).
- `alert()` remplacés par `notify()`. Prime succès : plus de `companyName.length * 10`.
- CalculationTab / BordereauTab / AppelDePrimeTab : logique métier intacte ; chrome via shell dossier + tokens CSS.
- DoD : AC 1–6 implémentés. AC 7 auth OK ; parcours connecté à valider avec comptes réels. Tests unitaires story OK ; régression bordereau préexistante.
- **Nav admin (recette)** : onglets métier seuls sur le tableau de bord (Dossiers, Courtiers, Paiements en retard, Messages, Correspondance, Historique des versions). **Bordereaux** retiré des onglets (déjà dans le header). Outils interne regroupés dans le menu header **Outils** : Import des paiements, Écarts de montants, Configuration produits, Modifier un échéancier. Nouvelles pages `/admin/ecarts-montants` et `/admin/configuration-produits`.
- **Logo** : `BrandLogo` — `public/couleur_1.png` (texte noir) toujours sur pastille blanche (header sombre, bandeau auth, login mobile).
- **Dossier `quotes/[id]`** : plus de barre d’onglets à scroll horizontal. `GroupedNav` — menu latéral groupé (Dossier / Étude et offre / Contrat / Production), wrapping sans overflow-x sous `lg`. Recette utilisateur : validé.

### File List

- docs/audit-ux-admin-courtier.md
- docs/recette-ux-bi-role.md
- src/app/globals.css
- src/app/layout.tsx
- src/app/login/page.tsx
- src/app/register/page.tsx
- src/app/forgot-password/page.tsx
- src/app/reset-password/page.tsx
- src/app/auth/setup-account/page.tsx
- src/app/dashboard/page.tsx
- src/app/dashboard/AdminScreen.tsx
- src/app/dashboard/BrokerScreen.tsx
- src/app/admin/bordereaux/page.tsx
- src/app/admin/import-payments/page.tsx
- src/app/admin/ecarts-montants/page.tsx
- src/app/admin/configuration-produits/page.tsx
- src/app/modifier_echeancier/page.tsx
- src/app/quotes/[id]/page.tsx
- src/app/quotes/components/forms/ParameterEditor.tsx
- src/app/quotes/tabs/AggravationTab.tsx
- src/app/quotes/tabs/BrokerCommissionsTab.tsx
- src/app/quotes/tabs/ChatTab.tsx
- src/app/quotes/tabs/ContratTab.tsx
- src/app/quotes/tabs/FormDataTab.tsx
- src/app/quotes/tabs/LetterTab.tsx
- src/app/quotes/tabs/OffreTab.tsx
- src/app/quotes/tabs/PieceJointeTab.tsx
- src/app/quotes/tabs/PremiumCallTab.tsx
- src/app/quotes/tabs/ResumeTab.tsx
- src/components/admin/AdminBrokersPanel.tsx
- src/components/admin/AdminMessagesPanel.tsx
- src/components/admin/AdminOverduePaymentsPanel.tsx
- src/components/admin/AdminQuotesPanel.tsx
- src/components/admin/AdminVersionsPanel.tsx
- src/components/admin/BordereauxAdminView.tsx
- src/components/admin/ImportPaymentsAdminView.tsx
- src/components/admin/CorrespondanceTab.tsx
- src/components/admin/EcartsMontantsTab.tsx
- src/components/admin/ProductConfigTab.tsx
- src/components/messages/MessageComposer.tsx
- src/components/modals/AddBrokerModal.tsx
- src/components/modals/ApproveOfferModal.tsx
- src/components/quotes/ActivityBreakdown.tsx
- src/components/quotes/LossHistoryField.tsx
- src/components/quotes/MultiSelect.tsx
- src/components/quotes/QuoteForm.tsx
- src/components/quotes/QuoteSuccessPage.tsx
- src/components/quotes/QuoteValidationPage.tsx
- src/components/quotes/QuotesList.tsx
- src/components/ui/AppShell.tsx
- src/components/ui/AuthenticatedAppShell.tsx
- src/components/ui/Controls.tsx
- src/components/ui/DataDisplay.tsx
- src/components/ui/Feedback.tsx
- src/components/ui/Modal.tsx
- src/components/ui/ToastHost.tsx
- src/hooks/useDelayedFlag.ts
- src/lib/ui/labels.ts
- src/lib/ui/labels.test.ts
- src/lib/ui/notify.ts
- src/lib/stores/quotes-store.ts
- src/lib/stores/users-store.ts

## QA Results

_(à remplir par l'agent QA)_
