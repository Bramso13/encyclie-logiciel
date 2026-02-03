# Story bordereau-fidelidade.3: Implement CSV file generation and download for bordereau data

> **Superseded by** bordereau-fidelidade-v2.4 (scope clarifié — deux CSV polices + quittances). Voir stories v2.1–v2.6.

## Status

Draft

## Story

**As a** administrateur,
**I want** une utilitaire de génération CSV qui transforme les données bordereau en fichier FIDELIDADE et un endpoint pour télécharger ce fichier,
**so that** je peux obtenir le bordereau au format attendu par FIDELIDADE et le télécharger en un clic.

## Acceptance Criteria

1. L’utilitaire CSV accepte le tableau de données transformées (sortie du service Story 2)
2. Génération d’un CSV avec exactement la structure 36 colonnes FIDELIDADE
3. Échappement CSV correct pour les champs texte (guillemets, séparateurs, retours à la ligne)
4. Convention de nom de fichier : `BORDEREAU_FIDELIDADE_[MOIS]_[ANNEE].csv`
5. Téléchargement déclenché via un endpoint API retourne le fichier CSV
6. Le CSV généré est validé par rapport à un échantillon de structure FIDELIDADE (si disponible)

## Tasks / Subtasks

- [ ] Task 1 (AC: 1, 2, 3) — Utilitaire de génération CSV
  - [ ] Créer une fonction `generateBordereauCSV(rows: FidelidadeRow[]): string` (ou Buffer)
  - [ ] Définir l’ordre exact des 36 colonnes (aligné sur l’epic et le service Story 2)
  - [ ] Utiliser un séparateur CSV standard (virgule ou point-virgule selon spec FIDELIDADE) et échapper guillemets/doubles guillemets et retours à la ligne
  - [ ] Option : utiliser une lib (ex. csv-stringify, papaparse) si déjà en dépendances ; sinon implémentation légère
- [ ] Task 2 (AC: 4) — Nom de fichier
  - [ ] Construire le nom : `BORDEREAU_FIDELIDADE_${month}_${year}.csv` (ex. BORDEREAU_FIDELIDADE_01_2025.csv)
- [ ] Task 3 (AC: 5) — Endpoint API de téléchargement
  - [ ] Créer route sous `src/app/api/admin/bordereaux/` (ex. `export/route.ts` ou `download/route.ts`)
  - [ ] Vérifier le rôle ADMIN (middleware ou contrôle dans la route) ; récupérer les filtres (query ou body) et/ou les données déjà générées (body) selon design (prévisualisation Story 4 envoie les lignes éditées)
  - [ ] Appeler le service d’extraction (Story 2) si besoin, puis generateBordereauCSV ; retourner le fichier avec headers Content-Type: text/csv, Content-Disposition: attachment; filename="..."
- [ ] Task 4 (AC: 6) — Validation
  - [ ] Si un fichier exemple FIDELIDADE est fourni : comparer structure (nombre de colonnes, noms) ; sinon documenter la structure attendue et ajouter un test sur un jeu de données fixe
- [ ] Task 5 — Non-régression
  - [ ] S’assurer que les routes existantes et l’auth ne sont pas impactées

## Dev Notes

### Contexte projet

- API existantes : `src/app/api/` (quotes, brokers, workflow, etc.). Pas de route admin dédiée aujourd’hui ; à créer sous `src/app/api/admin/bordereaux/`.
- Auth : BetterAuth (voir `src/app/api/auth/`, `src/lib/auth.ts`). Vérifier comment restreindre aux User.role === ADMIN pour les routes admin.
- Structure 36 colonnes (epic) : APPORTEUR, IDENTIFIANT_POLICE, DATE_SOUSCRIPTION, DATE_EFFET_CONTRAT, DATE_FIN_CONTRAT, NUMERO_AVENANT, MOTIF_AVENANT, DATE_EFFET_AVENANT, DATE_ECHEANCE, ETAT_POLICE, DATE_ETAT_POLICE, MOTIF_ETAT, FRANCTIONNEMENT, SIREN, ADRESSE_RISQUE, VILLE_RISQUE, CODE_POSTAL_RISQUE, CA_ENTREPRISE, EFFECTIF_ENTREPRISE, CODE_NAF, LIBELLE_ACTIVITE x8, POID_ACTIVITE x8.

### Fichiers à créer

- `src/lib/bordereau/generateCsv.ts` (ou équivalent) : fonction de génération CSV.
- `src/app/api/admin/bordereaux/export/route.ts` (ou `download/route.ts`) : GET ou POST avec filtres / corps contenant les lignes ; retour CSV en stream ou buffer.
- Types : réutiliser FidelidadeRow depuis Story 2.

### Sécurité et perf

- Réservé aux admins ; ne pas exposer de données sensibles en log.
- Pour gros volumes (epic : > 1000 contrats), envisager pagination/chunk ou réponse streamée pour éviter timeout/mémoire.

### Testing

- Test unitaire : `generateBordereauCSV` avec 1 à N lignes ; vérifier en-tête, ordre des colonnes, échappement.
- Test d’intégration (optionnel) : appel de l’endpoint avec auth admin et vérification des headers et du contenu CSV.

## Testing

- Tests unitaires sur generateBordereauCSV (ordre colonnes, échappement, nom de fichier).
- Test manuel ou E2E : appel API avec session admin → téléchargement d’un CSV valide.
- Vérification de la structure par rapport au spec FIDELIDADE si fichier exemple disponible.

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
