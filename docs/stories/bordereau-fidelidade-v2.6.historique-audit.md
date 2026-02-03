# Story bordereau-fidelidade-v2.6: Historique et audit des bordereaux générés

## Status

Ready for Review

## Story

**As a** administrateur,
**I want** que chaque génération de bordereau (les deux CSV) soit enregistrée en base avec un audit (qui, quand, période), et pouvoir consulter l’historique et re-télécharger les deux fichiers (polices + quittances),
**so that** je dispose d’une traçabilité complète et puisse récupérer un bordereau passé sans le régénérer.

## Acceptance Criteria

1. Lors de la génération CSV (Story v2.4), enregistrer un enregistrement **Bordereau** en base avec : generatedBy (admin), generatedAt, periodStart, periodEnd, filterCriteria (JSON, ex. période), csvDataPolices (JSON), csvDataQuittances (JSON), fileNamePolices, fileNameQuittances (et optionnellement filePath si stockage fichier).
2. Page ou section « Historique des bordereaux » listant les bordereaux générés avec : date/heure de génération, généré par (nom admin), période couverte, nombre de polices, nombre de quittances, bouton(s) de téléchargement.
3. Re-téléchargement : possibilité de télécharger à nouveau les **deux** CSV (polices + quittances) à partir des données sauvegardées (csvDataPolices, csvDataQuittances) — soit deux liens, soit un ZIP régénéré à la volée.
4. Pagination pour les listes longues (ex. 20 par page).
5. Optionnel : bouton « Régénérer avec les mêmes filtres » (même période) qui relance la génération et enregistre un nouvel enregistrement.

## Tasks / Subtasks

- [x] Task 1 (AC: 1) — Enregistrement à la génération
  - [x] Dans l’endpoint d’export (v2.4), après génération des deux CSV : créer un enregistrement Bordereau avec generatedBy (session admin), generatedAt, periodStart, periodEnd, filterCriteria, csvDataPolices, csvDataQuittances, fileNamePolices, fileNameQuittances
  - [x] Adapter le modèle Bordereau si nécessaire (Story v2.1 : csvDataPolices, csvDataQuittances)
- [x] Task 2 (AC: 2) — Page / section Historique
  - [x] Liste des bordereaux : tableau ou cartes avec date/heure, généré par, période, nb polices, nb quittances
  - [x] Chargement via API (ex. GET /api/admin/bordereaux/history) avec pagination
- [x] Task 3 (AC: 3) — Re-téléchargement
  - [x] Bouton(s) « Télécharger polices » et « Télécharger quittances » (ou « Télécharger ZIP ») par ligne
  - [x] Endpoint (ex. GET /api/admin/bordereaux/[id]/download) qui régénère les CSV à partir de csvDataPolices et csvDataQuittances et retourne les deux fichiers (ou ZIP)
- [x] Task 4 (AC: 4) — Pagination
  - [x] Pagination côté API (limit/offset ou cursor) et côté UI (boutons ou infinite scroll)
- [x] Task 5 (AC: 5) — Optionnel : régénération
  - [x] Bouton « Régénérer » qui appelle l’export avec la même période (filterCriteria) et enregistre un nouvel Bordereau

## Dev Notes

- Modèle Bordereau : Story v2.1 — champs csvDataPolices (Json), csvDataQuittances (Json), fileNamePolices, fileNameQuittances.
- Code existant : s’il existe déjà une page historique bordereaux (Story 5 ancienne), l’adapter pour deux CSV et le nouveau modèle.
- Dépendances : v2.1 (schéma Bordereau), v2.4 (génération CSV et export).

### Testing

- Test manuel : générer un bordereau → vérifier l’apparition dans l’historique → re-télécharger les deux CSV et vérifier le contenu.
- Vérifier pagination si beaucoup d’enregistrements.

## Change Log

| Date       | Version | Description                                           | Author      |
| ---------- | ------- | ----------------------------------------------------- | ----------- |
| 2025-02-03 | 0.1     | Création (scope clarifié bordereau v2)                | Sarah (PO)  |
| 2025-02-03 | 0.2     | Implémentation historique + audit + re-téléchargement | James (Dev) |

## Dev Agent Record

_(À remplir par l’agent de développement)_

### Agent Model Used

- Cursor / Auto (agent dev BMad)

### Debug Log References

- Aucun.

### Completion Notes List

- Enregistrement Bordereau dans POST export-v2 après génération du ZIP (generatedById via withAuthAndRole).
- API GET /api/admin/bordereaux/history avec pagination (page, limit 20 par défaut).
- API GET /api/admin/bordereaux/[id]/download : re-génération ZIP à partir de csvDataPolices et csvDataQuittances.
- Section « Historique des bordereaux » sur la page admin bordereaux : tableau, pagination Précédent/Suivant, boutons « Télécharger ZIP » et « Régénérer » par ligne.
- Modèle Bordereau inchangé (déjà conforme v2.1).

### File List

- src/app/api/admin/bordereaux/export-v2/route.ts (modifié)
- src/app/api/admin/bordereaux/history/route.ts (nouveau)
- src/app/api/admin/bordereaux/[id]/download/route.ts (nouveau)
- src/app/admin/bordereaux/page.tsx (modifié)

## QA Results

_(À remplir par QA)_
