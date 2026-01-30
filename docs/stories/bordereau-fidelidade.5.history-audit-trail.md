# Story bordereau-fidelidade.5: Implement bordereau generation history with re-generation capability

## Status

Draft

## Story

**As a** administrateur,
**I want** que chaque génération de bordereau soit enregistrée en base (qui, quand, quels critères, quelles données) et qu’une page liste l’historique avec possibilité de re-télécharger (et optionnellement de relancer avec les mêmes filtres),
**so that** je dispose d’une traçabilité complète et peux retrouver ou re-télécharger un bordereau passé.

## Acceptance Criteria

1. Lors de la génération CSV, enregistrer un enregistrement Bordereau en base : generatedBy (id admin), generatedAt, filterCriteria (JSON), csvData (JSON), fileName, filePath (si stockage fichier)
2. Page historique listant tous les bordereaux : date/heure de génération, généré par (nom admin), période couverte, nombre de contrats, bouton télécharger
3. Re-téléchargement : récupération des données CSV sauvegardées (csvData) pour régénérer le fichier ou servir le fichier stocké
4. Optionnel : bouton « Régénérer avec les mêmes filtres » pour relancer la génération avec filterCriteria
5. Pagination pour les listes longues (20 par page)

## Tasks / Subtasks

- [ ] Task 1 (AC: 1) — Enregistrement à la génération
  - [ ] Dans l’endpoint d’export CSV (Story 3), après génération : créer un enregistrement Bordereau avec generatedBy (userId de la session), generatedAt (now()), filterCriteria (filtres utilisés), csvData (lignes exportées en JSON), fileName (nom du fichier généré), filePath (optionnel si on stocke le fichier sur disque)
  - [ ] Utiliser le modèle Prisma Bordereau (Story 1) ; relation User via generatedBy
- [ ] Task 2 (AC: 2) — Page historique
  - [ ] Créer une page « Historique des bordereaux » (ex. `src/app/admin/bordereaux/history/page.tsx` ou onglet dans la page bordereaux)
  - [ ] API : GET `/api/admin/bordereaux` ou `/api/admin/bordereaux/history` avec pagination (skip/take, 20 par page) ; retourner liste des Bordereau avec generatedBy (include User pour le nom)
  - [ ] Afficher : date/heure (generatedAt), nom de l’admin (User.name ou email), période (periodStart–periodEnd), nombre de lignes/contrats (dérivé de csvData.length), bouton « Télécharger »
- [ ] Task 3 (AC: 3) — Re-téléchargement
  - [ ] Endpoint GET `/api/admin/bordereaux/[id]/download` (ou équivalent) : récupérer le Bordereau par id ; régénérer le CSV à partir de csvData (réutiliser generateBordereauCSV Story 3) et retourner le fichier avec le fileName sauvegardé
- [ ] Task 4 (AC: 4) — Optionnel : régénération avec mêmes filtres
  - [ ] Bouton « Régénérer » sur une ligne : appeler le service d’extraction (Story 2) avec filterCriteria sauvegardé, puis renvoyer le CSV (sans forcément créer un nouveau Bordereau, ou en créer un nouveau selon règle métier)
- [ ] Task 5 (AC: 5) — Pagination
  - [ ] Côté API : accepter query params page (ou offset) et limit (20) ; Prisma orderBy generatedAt desc, skip/take
  - [ ] Côté UI : afficher 20 éléments par page avec contrôles « Précédent » / « Suivant » ou numéros de page
- [ ] Task 6 — Sécurité et perf
  - [ ] Vérifier que seuls les admins peuvent lister et télécharger ; filtrer par utilisateur si besoin (tous les bordereaux vs seulement les siens selon spec).
  - [ ] Pour csvData volumineux : éviter de charger tout en mémoire si on n’en a pas besoin pour la liste (liste : pas besoin de csvData, seulement count ou longueur stockée).

## Dev Notes

### Contexte projet

- Modèle Bordereau (Story 1) : id, generatedBy (userId), generatedAt, periodStart, periodEnd, filterCriteria (Json), csvData (Json), fileName, filePath. Relation : Bordereau.generatedBy → User.
- API existantes : pattern dans `src/app/api/` ; routes avec [id] : ex. `src/app/api/quotes/[id]/route.ts`. Créer `src/app/api/admin/bordereaux/route.ts` (GET list avec pagination), `src/app/api/admin/bordereaux/[id]/download/route.ts` (GET pour re-téléchargement).
- Dashboard admin : même zone que Story 4 ; lien « Historique » ou onglet depuis la page Bordereaux.

### Fichiers à créer / modifier

- `src/app/api/admin/bordereaux/route.ts` : GET avec pagination, retour liste Bordereau (sans csvData ou avec count seulement pour alléger).
- `src/app/api/admin/bordereaux/[id]/download/route.ts` : GET par id, lecture csvData, génération CSV, retour fichier.
- Modifier l’endpoint d’export (Story 3) : après génération du CSV, créer l’enregistrement Bordereau (même route ou fonction partagée).
- `src/app/admin/bordereaux/history/page.tsx` (ou intégré dans bordereaux avec onglet) : tableau + pagination + boutons Télécharger / Régénérer.

### Données

- filterCriteria : stocker tel quel (objet JSON) pour permettre une future « régénération avec mêmes filtres ».
- csvData : tableau JSON des lignes ; suffisant pour re-générer le CSV sans refaire l’extraction. Attention taille : si très gros, envisager compression ou stockage fichier (filePath) et ne pas dupliquer en csvData.

### Testing

- Créer un bordereau via l’UI (Story 4) → vérifier qu’un enregistrement Bordereau existe en base.
- Page historique : vérifier liste, pagination, ordre par date.
- Re-téléchargement : clic sur Télécharger pour un bordereau existant → fichier CSV identique (ou cohérent) avec les données sauvegardées.

## Testing

- Test de bout en bout : génération → apparition dans l’historique → re-téléchargement du même fichier.
- Vérifier la pagination avec plus de 20 enregistrements.
- Vérifier les droits : un non-admin ne peut pas accéder à la liste ni au téléchargement.

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
