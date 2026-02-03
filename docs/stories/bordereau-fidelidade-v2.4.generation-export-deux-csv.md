# Story bordereau-fidelidade-v2.4: Génération et export des deux CSV (polices + quittances)

## Status

Ready for Review

## Story

**As a** administrateur,
**I want** des utilitaires de génération CSV qui transforment les **deux** jeux de données (polices + quittances) en **deux** fichiers CSV FIDELIDADE, et un moyen de les télécharger (deux fichiers ou un ZIP),
**so that** je puisse obtenir les deux bordereaux au format attendu par FIDELIDADE en un clic.

## Acceptance Criteria

1. Deux utilitaires (ou une fonction avec deux modes) : génération CSV polices et génération CSV quittances, chacun avec la **structure exacte** des colonnes FIDELIDADE (Feuille 1 et Feuille 2).
2. Échappement CSV correct pour les champs texte (guillemets, séparateurs, retours à la ligne).
3. Convention de noms : ex. `BORDEREAU_FIDELIDADE_POLICES_[MOIS]_[ANNEE].csv` et `BORDEREAU_FIDELIDADE_QUITTANCES_[MOIS]_[ANNEE].csv` (ou ZIP contenant les deux).
4. Téléchargement via API : retour des **deux** fichiers (ex. ZIP ou deux téléchargements séparés selon choix technique).
5. Les CSV générés sont validés par rapport à la structure FIDELIDADE (noms et nombre de colonnes).
6. Réutilisation des types FidelidadePolicesRow et FidelidadeQuittancesRow (Stories v2.2 et v2.3).

## Tasks / Subtasks

- [x] Task 1 (AC: 1, 2) — Utilitaires CSV polices et quittances
  - [x] Fonction `generatePolicesCSV(rows: FidelidadePolicesRow[]): string` (ou Buffer)
  - [x] Fonction `generateQuittancesCSV(rows: FidelidadeQuittancesRow[]): string` (ou Buffer)
  - [x] Ordre exact des colonnes Feuille 1 et Feuille 2 (aligné sur scope clarifié)
  - [x] Séparateur CSV standard ; échappement guillemets, virgules, retours à la ligne
- [x] Task 2 (AC: 3) — Noms de fichiers
  - [x] Construire les noms : `BORDEREAU_FIDELIDADE_POLICES_${month}_${year}.csv` et `BORDEREAU_FIDELIDADE_QUITTANCES_${month}_${year}.csv`
  - [x] Option : ZIP nommé ex. `BORDEREAU_FIDELIDADE_[MOIS]_[ANNEE].zip` contenant les deux CSV
- [x] Task 3 (AC: 4) — Endpoint API de téléchargement
  - [x] Route sous `src/app/api/admin/bordereaux/` (ex. `export/route.ts`) : POST avec période (et éventuellement données éditées depuis l’UI)
  - [x] Appeler les services d’extraction v2.2 et v2.3, puis les deux generate*CSV
  - [x] Retourner : soit ZIP (Content-Type application/zip), soit deux réponses séparées (à définir) ; headers Content-Disposition avec noms de fichiers
  - [x] Vérifier rôle ADMIN
- [x] Task 4 (AC: 5) — Validation structure
  - [x] Vérifier nombre et noms des colonnes des deux CSV par rapport au spec FIDELIDADE (scope clarifié)
- [x] Task 5 (AC: 6) — Non-régression
  - [x] S’assurer que les routes existantes et l’auth ne sont pas impactées

## Dev Notes

- Référence : `docs/epics/bordereau-fidelidade-scope-clarifie.md` ; colonnes Feuille 1 et Feuille 2 en section 6.
- Code existant : `src/lib/bordereau/generateCSV.ts` — à adapter pour deux formats (polices vs quittances) ou créer deux modules/fonctions.
- Types : FidelidadePolicesRow (v2.2), FidelidadeQuittancesRow (v2.3).
- Dépendances : Stories v2.1 (constante APPORTEUR), v2.2 (extraction polices), v2.3 (extraction quittances).
- Choix ZIP vs deux téléchargements : documenter dans Dev Notes ; ZIP simplifie l’UX (un seul clic pour tout récupérer).

### Testing

- Tests unitaires : generatePolicesCSV et generateQuittancesCSV avec 1 à N lignes ; vérifier en-tête, ordre des colonnes, échappement.
- Test manuel ou E2E : appel API avec session admin → téléchargement des deux CSV (ou ZIP).

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

- Route POST /api/admin/bordereaux/export-v2 : accepte dateRange, appelle getPolicesV2 + getQuittancesV2, génère ZIP avec les deux CSV. Rôle ADMIN requis via withAuthAndRole.
- generatePolicesCSV et generateQuittancesCSV dans generateCSV.ts ; validatePolicesCSVStructure et validateQuittancesCSVStructure pour AC5.
- Package archiver pour création ZIP.

### File List

- src/lib/bordereau/generateCSV.ts (generatePolicesCSV, generateQuittancesCSV, getPolicesFileName, getQuittancesFileName, getBordereauZipFileName, validatePolicesCSVStructure, validateQuittancesCSVStructure)
- src/lib/bordereau/index.ts (exports)
- src/app/api/admin/bordereaux/export-v2/route.ts (nouveau)
- src/lib/bordereau/__tests__/generateCSV.test.ts (nouveau)
- package.json (archiver, @types/archiver)

## QA Results

_(À remplir par QA)_
