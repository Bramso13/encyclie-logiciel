# Story bordereau-fidelidade-v2.5: Admin UI — Filtre période seule, deux préviews, deux CSV

## Status

Ready for Review

## Story

**As a** administrateur (responsable édition bordereau professionnel),
**I want** une interface d’administration avec **uniquement un filtre période** (pas de choix de courtiers), une prévisualisation des **deux** jeux de données (polices + quittances) éditable, et un bouton pour générer/télécharger **les deux** CSV (ou un ZIP),
**so that** je puisse préparer le bordereau FIDELIDADE avec des valeurs correctement remplies par défaut, corriger si besoin, puis lancer l’export en un clic.

## Acceptance Criteria

1. La navigation admin inclut une section « Bordereaux » (ou conserve l’entrée existante sous /admin/bordereaux).
2. Formulaire de filtres : **période uniquement** (plage de dates début/fin). **Pas de multi-sélect courtiers.** Optionnellement statut contrat / type de produit si nécessaire au périmètre.
3. Bouton « Prévisualiser » récupère les données **polices** (contrats + quotes ACCEPTED) et **quittances** (échéances dans la période) via les services v2.2 et v2.3.
4. Prévisualisation : **deux tableaux** (ou deux onglets) — polices (une ligne = une police) et quittances (une ligne = une échéance). Toutes les colonnes affichées ; cellules éditables pour correction ponctuelle.
5. L’état des modifications est conservé jusqu’à « Générer CSV » ou « Réinitialiser ».
6. Bouton « Générer CSV » déclenche le téléchargement des **deux** fichiers CSV (ou un ZIP). APPORTEUR = constante ; pas de sélection de courtier.
7. États de chargement et gestion d’erreurs implémentés.
8. Pas de filtre courtier dans l’UI ni dans les appels API.

## Tasks / Subtasks

- [x] Task 1 (AC: 1) — Navigation admin
  - [x] S’assurer que la section « Bordereaux » existe (ex. /admin/bordereaux) ; protéger la route (rôle ADMIN)
- [x] Task 2 (AC: 2) — Formulaire de filtres
  - [x] Conserver uniquement : plage de dates (periodStart, periodEnd). **Supprimer** le multi-sélect courtiers.
  - [x] Optionnel : statut contrat, type de produit si requis par le scope
- [x] Task 3 (AC: 3) — Prévisualisation
  - [x] Bouton « Prévisualiser » : appel API (ex. POST /api/admin/bordereaux/preview) avec **uniquement** la période ; pas de brokerIds
  - [x] API appelle les services v2.2 et v2.3 ; retourne { polices: FidelidadePolicesRow[], quittances: FidelidadeQuittancesRow[] }
- [x] Task 4 (AC: 4) — Deux tableaux / onglets
  - [x] Afficher deux tableaux (ou deux onglets) : un pour polices, un pour quittances
  - [x] Colonnes = toutes les colonnes Feuille 1 et Feuille 2 ; scroll horizontal si besoin
  - [x] Cellules éditables (inputs texte) pour correction
- [x] Task 5 (AC: 5, 6) — Édition et génération
  - [x] État local pour les données éditées ; conserver jusqu’à « Générer CSV » ou « Réinitialiser »
  - [x] Bouton « Générer CSV » : envoyer les données (polices + quittances, éventuellement éditées) à l’endpoint d’export v2.4 ; déclencher téléchargement des deux CSV ou du ZIP
- [x] Task 6 (AC: 7, 8) — UX et non-régression
  - [x] Loading : indicateurs pendant prévisualisation et génération
  - [x] Erreurs : afficher message en cas d’échec API
  - [x] Vérifier qu’aucun filtre courtier n’apparaît et qu’aucun appel n’envoie brokerIds

## Dev Notes

- Référence : `docs/epics/bordereau-fidelidade-scope-clarifie.md` ; epic mis à jour `docs/epics/epic-bordereau-fidelidade.md`.
- Code existant : `src/app/admin/bordereaux/page.tsx` (et éventuellement composants BordereauFilters, BordereauPreviewTable) — à adapter : **supprimer** le filtre courtiers, **ajouter** le second tableau (quittances), **adapter** l’export pour deux CSV (ou ZIP).
- API : `src/app/api/admin/bordereaux/preview` et `export` — adapter pour accepter uniquement la période et retourner deux jeux de données (preview) / deux fichiers (export).
- Dépendances : Stories v2.2, v2.3 (extraction), v2.4 (génération et export).

### Testing

- Test manuel : filtre période → prévisualisation → vérifier deux tableaux (polices + quittances) ; édition d’une cellule → génération CSV → vérifier que les deux fichiers (ou le ZIP) contiennent les bonnes données.
- Vérifier qu’il n’y a plus de sélection de courtiers.

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

- Nouvelle API preview-v2 : période seule, retourne { polices, quittances }.
- Export-v2 étendu : accepte polices et quittances optionnels (données éditées).
- Page admin refaite : filtre période uniquement, deux onglets Polices/Quittances, cellules éditables inline, bouton Générer CSV (ZIP).

### File List

- src/app/api/admin/bordereaux/preview-v2/route.ts (nouveau)
- src/app/api/admin/bordereaux/export-v2/route.ts (modifié : polices/quittances optionnels)
- src/app/admin/bordereaux/page.tsx (refonte complète)
- src/lib/bordereau/generateCSV.ts (export POLICES_COLUMNS, QUITTANCES_COLUMNS)
- src/lib/bordereau/index.ts (export POLICES_COLUMNS, QUITTANCES_COLUMNS)

## QA Results

_(À remplir par QA)_
