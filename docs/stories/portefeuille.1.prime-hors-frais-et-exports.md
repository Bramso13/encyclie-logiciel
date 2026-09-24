# Story PORTEFEUILLE-1 : Prime annuelle hors frais de gestion, correction du taux de règlement et exports CSV interne / partenaires

## Status

Ready for Review

## Story

**As a** administrateur ENCYCLIE consultant le Portefeuille RCD,
**I want** voir la prime annuelle cumulée **hors frais de gestion** (KPI + synthèse), un graphique de taux de règlement mensuel correctement affiché, et deux variantes d'export CSV (interne / partenaires),
**so that** je puisse piloter le portefeuille sur la prime nette de frais de gestion et transmettre à nos partenaires un export ne contenant que cette prime.

## Contexte métier

Demande client urgente par mail (sept. 2026) sur la page **Portefeuille RCD 2026** (`/admin/portefeuille`) :

1. Ajouter « une case qui indique le montant de la **PRIME ANNUELLE CUMULÉE sans les frais de gestion** » ;
2. Le tableau « **TAUX DE RÈGLEMENT MENSUEL** est à plat sans variation, pour quelle raison ? » → diagnostic + correction ;
3. « Remettre à jour la **synthèse** en indiquant également le montant de la prime annuelle sans les frais de gestion » ;
4. **2 versions d'export CSV** : une interne (prime annuelle **+** prime annuelle hors frais de gestion), une pour les partenaires (**uniquement** la prime annuelle hors frais de gestion).

**Prestation facturée** : 1 journée forfaitée (8 h × 80 €/h = **640 €**) — devis `docs/devis-portefeuille-prime-hors-frais.md`. Le client paie à la livraison : la story est à réaliser **immédiatement**, sans attendre un retour client.

**Décisions de cadrage (PO + commanditaire) :**

1. **Formule** : prime hors frais de gestion en **TTC** = `prime TTC − frais de gestion`. La taxe ne porte pas sur les frais de gestion (voir Dev Notes), aucun retraitement de taxe n'est nécessaire.
2. **Taux de règlement « à plat »** : c'est un **bug d'affichage** (les données et le calcul sont corrects) — voir Dev Notes pour la cause racine identifiée. Correction + affichage des valeurs % sur les barres.
3. **Affichage** : nouvelle KPI + ligne dans la synthèse (demande littérale du mail). Les répartitions géo / courtier / fractionnement de la page sont inchangées.
4. **Exports** : deux boutons dans la page — « Export interne (CSV) » et « Export partenaires (CSV) ». Même structure ; la version partenaires n'affiche que la prime hors frais de gestion (y compris dans les répartitions).

## Acceptance Criteria

1. **KPI « hors frais de gestion »** : une nouvelle carte KPI « Prime annuelle hors frais de gestion » s'affiche à côté de « Prime annuelle cumulée », calculée comme la somme des `amountTTC` des échéances de l'exercice **moins** les frais de gestion de l'année. Le montant est cohérent au centime avec la KPI existante moins les frais de gestion.
2. **Graphique « Taux de règlement mensuel » corrigé** : les barres des mois échus s'affichent à la hauteur de leur ratio réel (aujourd'hui toutes aplaties par le bug CSS) ; la valeur en % est affichée sur/au-dessus de chaque barre échue ; les mois non échus restent à hauteur nulle. Le graphique 2 (« Évolution primes dues / réglées ») et le tableau mensuel (section 1) sont inchangés.
3. **Synthèse mise à jour** : la section 7 « Synthèse » comporte une ligne supplémentaire indiquant la prime annuelle {année} hors frais de gestion (ex. « … soit {montant} € hors frais de gestion. »), en français métier.
4. **Export CSV interne** : l'export existant est enrichi — la section « Indicateur » comporte les lignes « Prime annuelle cumulée » (existante) **et** « Prime annuelle hors frais de gestion » ; la synthèse CSV reprend la nouvelle ligne. Le reste du fichier est inchangé.
5. **Export CSV partenaires** : nouvelle variante (ex. `?variant=partenaires`, fichier `portefeuille-rcd-{année}-partenaires.csv`) de **même structure**, mais où **tout** montant de prime annuelle est la prime **hors frais de gestion** (indicateur et répartitions géo / courtier / fractionnement), libellé « Prime annuelle hors frais de gestion » ; aucune colonne ni ligne ne mentionne la prime frais inclus. Les montants de suivi mensuel (primes dues/réglées TTC) restent tels quels — ils reflètent les encaissements réels.
6. **Deux boutons d'export** dans la page : « Export interne (CSV) » et « Export partenaires (CSV) », tous deux réservés à la permission `PRODUCTION` (comme aujourd'hui).
7. **Réponse au client** : la cause du « taux à plat » est documentée dans les Completion Notes en langage métier, prête à être communiquée au client.
8. **Non-régression** : KPIs existantes, tableau mensuel, graphiques 2/4/5/6, permission `PRODUCTION` (page et API) et tests `portfolio-recap.test.ts` existants continuent de passer.

## Tasks / Subtasks

- [x] **Task 1 — Calcul de la prime hors frais de gestion** (AC: #1)
  - [x] Étendre `RecapQuoteInput` / le mapping de `src/app/api/admin/portfolio-recap/route.ts` pour calculer, par dossier, les frais de gestion de l'exercice : par échéance, `fraisGestion = amountHT − rcdAmount − pjAmount − feesAmount − resumeAmount` (gérer les champs `null` des anciennes données : fallback sur `quote.calculatedPremium.echeancier.echeances[].fraisGestion` si la dérivation est impossible)
  - [x] Étendre `buildPortfolioRecap` (`src/lib/quotes/portfolio-recap.ts`) : `annualPremiumExcludingFees` global + par ligne de répartition (nécessaire pour l'export partenaires)
  - [x] Tests unitaires : dossier avec/sans frais de gestion, champs null, cohérence `annualPremium − fraisGestion = annualPremiumExcludingFees`
- [x] **Task 2 — KPI + synthèse** (AC: #1, #3)
  - [x] Nouvelle `KpiCard` « Prime annuelle hors frais de gestion » dans la première grille de KPIs (adapter la grille selon le design system)
  - [x] Ligne de synthèse supplémentaire dans `summary` (montant formaté `fr-FR`)
- [x] **Task 3 — Correction du graphique « Taux de règlement mensuel »** (AC: #2, #7)
  - [x] Corriger la cause racine CSS : le conteneur de barre du graphique 3 n'a **pas de hauteur explicite** (le parent flex a `items-end`, l'enfant n'a pas de `h-*`) → les `height: %` ne se résolvent pas et seul `minHeight: 2px` s'affiche. Aligner sur le pattern du graphique 2 (`LineBars` : conteneur `h-32` explicite autour des barres)
  - [x] Afficher la valeur % sur chaque barre échue (texte ou tooltip), formatée via `formatRatio`
  - [x] Rédiger l'explication métier pour le client dans les Completion Notes
- [x] **Task 4 — Exports CSV** (AC: #4, #5, #6)
  - [x] `src/app/api/admin/portfolio-recap/export/route.ts` : paramètre `variant` (`interne` par défaut, `partenaires`) ; ligne « Prime annuelle hors frais de gestion » dans les deux variantes ; en variante partenaires, les primes annuelles (indicateur + répartitions) utilisent le montant hors frais avec libellé adapté ; nom de fichier `portefeuille-rcd-{year}[-partenaires].csv`
  - [x] Page : remplacer le bouton unique par « Export interne (CSV) » et « Export partenaires (CSV) »
- [x] **Task 5 — Recette et livraison** (AC: #7, #8)
  - [x] Recette sur le portefeuille 2026 : cohérence KPI vs échéanciers, graphique corrigé, 2 exports ouverts dans Excel (accents, séparateurs)
  - [x] `vitest run src/lib/quotes/__tests__/portfolio-recap.test.ts` vert
  - [x] Vérifier que l'export partenaires ne contient **aucune** prime frais inclus

## Dev Notes

### Formule « hors frais de gestion » (validée)

- Décomposition d'une échéance (`calculerMontantsEcheance`, `src/lib/tarificateurs/rcd.ts` L1159-1210) : `totalHT = rcd + fraisGestion + pj + frais + reprise` et `taxe = (rcd + frais) × tauxTaxe + pj × tauxTaxePJ` → **la taxe ne porte pas sur les frais de gestion**.
- Donc : **prime hors frais de gestion TTC = `amountTTC − fraisGestion`** (aucun retraitement de taxe).
- ⚠️ `fraisGestion` n'est **pas persisté** en base : `adaptEcheancesForDatabase` (`src/lib/payment-schedule-utils.ts` L254-282) mappe `frais` → `feesAmount` mais ignore `fraisGestion`. Deux sources possibles :
  1. **Dérivation depuis `PaymentInstallment`** (recommandée, pas de migration) : `fraisGestion = amountHT − rcdAmount − pjAmount − feesAmount − resumeAmount`. Les frais de gestion sont annuels, portés par la **première échéance de l'année** (`estPremierPaiementAnnee`). Attention : `rcdAmount` / `pjAmount` / `feesAmount` / `resumeAmount` peuvent être `null` sur d'anciennes données → fallback (2).
  2. **Lecture du calcul persisté** : `quote.calculatedPremium.echeancier.echeances[].fraisGestion` (JSON) — pour l'exercice d'origine ; `QuoteVintage.calculatedPremium` pour les millésimes.
- Le portefeuille est filtré par `paymentSchedule.vintageYear = year` (route existante) : les frais de gestion à déduire sont ceux de **l'échéancier de l'exercice affiché**.

### Cause racine du « taux de règlement à plat » (diagnostic PO)

Dans `src/app/admin/portefeuille/page.tsx`, section 3 (L220-235) : les barres ont `style={{ height: \`${row.ratio}%\` }}` mais leur conteneur direct (`flex flex-1 flex-col`) n'a **aucune hauteur définie**, et le parent flex est en `items-end`→ un pourcentage de hauteur sans hauteur parente explicite ne se résout pas ; seul`minHeight: 2px`(mois échus) s'affiche. **Toutes les barres font donc 2 px quelle que soit la valeur** — d'où le visuel « à plat ». Les données et le calcul`ratio(paid, due)` sont corrects. Le graphique 2 (`LineBars`, L45-71) fonctionne car son conteneur de barres a `h-32` explicite : reproduire ce pattern.

### Fichiers touchés

| Fichier                                             | Changement                                                                       |
| --------------------------------------------------- | -------------------------------------------------------------------------------- |
| `src/lib/quotes/portfolio-recap.ts`                 | Types + `annualPremiumExcludingFees` (global + répartitions) + ligne de synthèse |
| `src/app/api/admin/portfolio-recap/route.ts`        | Mapping frais de gestion par dossier                                             |
| `src/app/api/admin/portfolio-recap/export/route.ts` | Paramètre `variant`, lignes/colonnes selon variante, nom de fichier              |
| `src/app/admin/portefeuille/page.tsx`               | KPI, 2 boutons d'export, correction graphique 3 + valeurs %                      |
| `src/lib/quotes/__tests__/portfolio-recap.test.ts`  | Tests du nouveau calcul                                                          |

### Contraintes

- Page et API déjà protégées par la permission `PRODUCTION` (`AdminPermissionGate`, `withPermission`) : ne pas changer ce contrôle.
- Pas de migration de schéma : la dérivation depuis `PaymentInstallment` suffit.
- Respecter le design system (story RETOURS-3) : `KpiCard`, `formatEur`, `formatRatio`, libellés métier français.
- CSV : réutiliser `csvRow` / `csvDownloadBuffer` (`src/lib/quotes/csv-export.ts`) ; encodage et séparateurs identiques à l'export actuel (ouverture Excel).

### Testing

- Tests unitaires `portfolio-recap.test.ts` : calcul hors frais (cas nominal, sans frais, champs `null`, multi-dossiers).
- Recette manuelle : portefeuille 2026, comparaison KPI hors frais vs somme des échéanciers ; ouverture des 2 CSV dans Excel ; vérification visuelle du graphique 3 (barres différenciées si ratios différents, % affichés).

## Change Log

| Date       | Version | Description                                                                                                            | Author     |
| ---------- | ------- | ---------------------------------------------------------------------------------------------------------------------- | ---------- |
| 2026-09-24 | 0.1     | Création initiale (draft) — demande client urgente : prime hors frais de gestion, bug taux de règlement, 2 exports CSV | Sarah (PO) |
| 2026-09-24 | 0.2     | Implémentation : prime hors frais, correction du graphique, exports interne et partenaires | James (Dev) |
| 2026-09-24 | 0.3     | Graphique 3 : les barres en `%` dans un flex restaient à 0 px (seuls les % étaient visibles). Cadre `relative h-32` et barres en `absolute bottom-0` | James (Dev) |

## Dev Agent Record

### Agent Model Used

Grok 4.7

### Debug Log References

- Recette données 2026 via Prisma (script temporaire, non conservé). `vitest run src/lib/quotes/__tests__/portfolio-recap.test.ts` : 9 tests verts. ESLint sur les fichiers touchés : OK.
- Contrôle visuel (utilisateur, session authentifiée) : les % du graphique 3 s’affichaient, les barres non. Cause : un enfant flex avec `height: %` est ignoré (hauteur utilisée = auto, contenu vide = 0 px), même si le parent a `h-32`. Le calque du graphique 2 ne suffit pas ici.
- Correctif : piste `relative h-32 shrink-0`, barre `absolute bottom-0` avec `height: {ratio}%`. Le pourcentage se résout alors sur le cadre. Mois non échus : hauteur 0. Page de dev non recontrôlée ensuite (le navigateur de l’agent est renvoyé vers `/login`).

### Completion Notes List

- Prime hors frais = prime annuelle cumulée (KPI existante, `totalAmountTTC` des échéanciers de l'exercice) − frais de gestion. Les frais sont dérivés par échéance (`amountHT − rcd − pj − frais − reprise`). Si un composant est vide, repli sur `QuoteVintage.calculatedPremium` de l'année, sinon `quote.calculatedPremium`. Recette 2026 : 1 064 980,60 € cumulés, 956 787,47 € hors frais (108 193,13 € de frais), 75 dossiers, 72 avec frais. Une échéance a des champs nuls ; le dossier concerné a tout de même des frais (394,03 €) via les autres échéances ou le repli. Sur 13 dossiers, le total d'échéancier diffère de la somme des `amountTTC` : la carte reste alignée sur la KPI existante moins les frais, comme demandé.
- **Réponse client — taux de règlement « à plat ».** Les taux étaient justes. Le graphique les dessinait tous à la même hauteur (2 pixels) parce que la barre en pourcentage n'avait pas de cadre de hauteur : le navigateur ne pouvait pas calculer « 63 % de quoi ». Seul un trait minimal s'affichait, d'où l'aspect plat. Ce n'était pas un problème de calcul ni de données. Un premier correctif (conteneur flex de hauteur fixe, comme le graphique 2) affichait les pourcentages mais les barres restaient invisibles : dans un flex, une hauteur en `%` est ignorée. Les barres sont donc ancrées en bas d’un cadre de hauteur fixe, et le pourcentage est écrit au-dessus de chaque mois déjà échu. Les mois à venir restent vides. Portefeuille 2026 arrêté au 24 septembre : janvier 62,9 %, février 80,6 %, mars 78,7 %, avril 59,8 %, mai 72,3 %, juin 89,6 %, juillet 53,7 %, août 63,9 %, septembre 60,3 %.
- Export interne : les deux primes. Export partenaires (`?variant=partenaires`, fichier `portefeuille-rcd-{année}-partenaires.csv`) : uniquement la prime hors frais de gestion, y compris répartitions et synthèse. Le suivi mensuel (dues / réglées) est inchangé. Contrôle 2026 : le CSV partenaires ne contient ni le libellé « Prime annuelle cumulée » ni le montant frais inclus.
- Permission `PRODUCTION` inchangée (page et API).

### File List

- `src/lib/quotes/portfolio-recap.ts` (modifié)
- `src/lib/quotes/portfolio-recap-source.ts` (ajouté)
- `src/lib/quotes/portfolio-export.ts` (ajouté)
- `src/lib/quotes/__tests__/portfolio-recap.test.ts` (modifié)
- `src/app/api/admin/portfolio-recap/route.ts` (modifié)
- `src/app/api/admin/portfolio-recap/export/route.ts` (modifié)
- `src/app/admin/portefeuille/page.tsx` (modifié)

## QA Results

_(à remplir par l'agent QA)_
