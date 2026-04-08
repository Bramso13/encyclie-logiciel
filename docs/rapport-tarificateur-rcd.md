# Rapport Technique — Tarificateur RCD (Responsabilité Civile Décennale)

## Module analysé : `src/lib/tarificateurs/rcd.ts`

**Date du rapport :** 08/04/2026
**Objet :** Description exhaustive du fonctionnement algorithmique du moteur de tarification RCD, fonction par fonction, à destination des experts assurance souhaitant vérifier la conformité des calculs.

---

## 1. Vue d'ensemble du moteur de tarification

Ce module constitue le cœur algorithmique de la tarification en Responsabilité Civile Décennale. Il prend en entrée l'ensemble des caractéristiques d'un risque (chiffre d'affaires, activités BTP exercées, profil du dirigeant, historique assurantiel, région d'exercice, etc.) et produit en sortie une tarification complète comprenant : la prime HT, les majorations/minorations, les frais, les taxes, le total TTC, et un échéancier de paiement.

Le processus de tarification se décompose en **six étapes successives** :

1. **Vérification des critères de refus** — Le dossier peut-il être accepté ?
2. **Calcul des majorations et minorations** — Quel est le profil de risque ?
3. **Application des taux par activité et de la dégressivité** — Quelle prime de base ?
4. **Assemblage de la prime totale** — Prime + frais + taxes + protection juridique
5. **Génération de l'échéancier** — Répartition temporelle des paiements
6. **Projection N+1** — Calcul anticipé pour l'année suivante

---

## 2. Étape 1 — Vérification des critères de refus (`verifRefus`)

Avant tout calcul de prime, le système évalue quatre critères rédhibitoires. Si l'un d'entre eux est vérifié, le dossier est refusé et la tarification est marquée comme non-éligible.

### 2.1 Critère 1 — Expérience du dirigeant

**Règle :** Le dirigeant doit justifier d'au moins 1 année d'expérience.

- Si l'expérience du dirigeant est **strictement inférieure à 1 an** → **Refus**.
- Si l'expérience est de 1 an ou plus → Pas de refus sur ce critère.

### 2.2 Critère 2 — Interruption d'assurance

**Règle :** L'entreprise ne doit pas être sans assurance depuis plus de 12 mois.

- Si la valeur `tempsSansActivite` est `"PLUS_DE_12_MOIS"` → **Refus**.
- Toute autre valeur (`"DE 6_A 12_MOIS"`, `"NON"`, `"CREATION"`) → Pas de refus.

### 2.3 Critère 3 — Part de sous-traitance

**Règle :** La part de sous-traitance ne doit pas dépasser 15% du chiffre d'affaires.

Le système gère deux formats d'entrée :
- Si la valeur est supérieure à 1, elle est interprétée comme un **pourcentage brut** (ex: `20` = 20%). Le système la divise alors par 100 avant de la comparer au seuil de 0.15 (15%).
- Si la valeur est inférieure ou égale à 1, elle est interprétée comme un **ratio décimal** (ex: `0.20` = 20%). La comparaison se fait directement contre 0.15.

**Seuil de refus : > 15%** → Refus.

### 2.4 Critère 4 — Part de négoce

**Règle :** La part de négoce ne doit pas dépasser 15% du chiffre d'affaires.

Le mécanisme est rigoureusement identique à celui de la sous-traitance (double format, seuil à 15%).

### 2.5 Résultat

Si au moins un des quatre critères est positif, le dossier est marqué en refus. Le motif du premier critère déclencheur est retourné comme raison du refus (dans l'ordre de priorité : expérience dirigeant > interruption assurance > sous-traitance > négoce).

---

## 3. Étape 2 — Calcul des majorations et minorations (`calculateMajorations`)

Cette fonction évalue dix coefficients qui viennent aggraver ou atténuer la prime de base. Chaque coefficient est un pourcentage additif (positif = aggravation, négatif = réduction). L'ensemble de ces coefficients est ensuite sommé et ajouté à une base de 1 pour former un **multiplicateur global**.

### 3.1 Majoration ETP / Nombre d'activités (`calculMajETP`)

Cette majoration évalue le risque lié à la dispersion des activités par rapport à la taille de l'entreprise (mesurée en Equivalents Temps Plein).

| ETP | Nombre d'activités | Majoration |
|-----|----------------------|------------|
| 1 | ≤ 3 | 0% |
| 1 | 4 à 5 | +10% |
| 2 à 4 | ≤ 5 | 0% |
| 2 à 4 | 6 à 8 | +10% |
| 6 à 8 | (indifférent) | 0% |
| Autre combinaison | | 0% |

**Point d'attention :** La tranche ETP = 5 n'est couverte par aucune condition explicite (ni `< 5`, ni `>= 6`). Le système retombe sur la valeur par défaut de 0%. Si cela pose un problème métier, un réglage peut être envisagé.

### 3.2 Majoration/Minoration Qualification (`qualif`)

- Si l'entreprise dispose d'une qualification reconnue → **-5%** (minoration, réduction de prime)
- Si elle n'en dispose pas → **0%** (pas d'effet)

### 3.3 Majoration Ancienneté de l'entreprise (`calculMajAnciennete`)

Le système calcule la différence en années entre la **date d'effet du contrat** et la **date de création de l'entreprise**. La conversion utilise 365.25 jours par année (prise en compte des années bissextiles en moyenne).

| Ancienneté de l'entreprise | Majoration |
|-----------------------------|------------|
| Moins de 1 an | +20% |
| Entre 1 et 3 ans (strictement) | +10% |
| 3 ans ou plus | 0% |

**Point d'attention :** La valeur exacte de 1 an (365.25 jours) n'est couverte ni par `< 1` ni par `> 1 && < 3`. Dans ce cas limite, le système retourne 0% (pas de majoration). Les experts pourront indiquer si un affinage des bornes est nécessaire.

### 3.4 Majoration Temps sans activité (`calculMajTempsSansActivite`)

Cette majoration ne s'applique que si l'entreprise **n'est pas en création**. Pour les entreprises en création, la valeur est forcée à 0%.

| Temps sans activité | Majoration |
|---------------------|------------|
| Entre 6 et 12 mois | +30% |
| Aucune interruption | 0% |
| En création | 0% |

*Note : le cas `"PLUS_DE_12_MOIS"` n'apparaît pas ici car il a déjà provoqué un refus à l'étape 1.*

### 3.5 Majoration/Minoration Expérience du dirigeant (`calculMajExp`)

| Années d'expérience | Majoration |
|----------------------|------------|
| Entre 1 et 3 ans (strictement) | +5% |
| Entre 3 et 5 ans | 0% |
| 5 ans ou plus | -5% (minoration) |

**Point d'attention :** La valeur exacte de 1 an d'expérience ne tombe dans aucune des tranches (`> 1`, `>= 3`, `>= 5`). Le système retourne alors une valeur indéterminée traitée comme 0%. Les experts pourront indiquer si un affinage est nécessaire.

### 3.6 Majoration Assureur défaillant (`assureurDefaillant`)

Si l'entreprise **n'est pas en création**, que son assureur précédent est identifié comme défaillant, **et que** la situation de sinistralité n'est pas déjà prise en compte via le critère `"ASSUREUR_DEFAILLANT"` dans l'absence de sinistres :
- → **+20%**

Sinon → **0%**

La liste des assureurs reconnus comme défaillants est la suivante :
- ACASTA
- ALPHA INSURANCE
- CBL
- EIL
- ELITE
- GABLE
- QUDOS

### 3.7 Majoration Nombre d'années d'assurance continue — NAAC (`calculMajNAAC`)

Cette majoration ne s'applique que si l'entreprise **n'est pas en création** et que l'assureur précédent **n'est pas défaillant**.

| NAAC | Majoration |
|------|------------|
| < 0 (valeur négative) | 0% |
| 0 à 1 an | +10% |
| 1 à 2 ans | +5% |
| > 2 ans | 0% |

### 3.8 Majoration Non-fourniture du bilan N-1 (`nonFournitureBilanN_1`)

Si l'entreprise **n'est pas en création** et que le bilan de l'année précédente n'a pas été fourni :
- → **+50%**

Sinon → **0%**

**Traitement spécifique :** Cette majoration de 50% est **exclue du multiplicateur global** des majorations. Elle est calculée séparément comme une prime d'aggravation additionnelle, appliquée en sus de la prime totale avec ses propres frais de gestion et taxe d'assurance :

```
Prime Aggravation Bilan N-1 = Prime Totale x 0.50 x (1 + Taux Frais Gestion + Taux Taxe Assurance)
```

### 3.9 Majoration Sans activité > 12 mois sans fermeture

Si l'entreprise **n'est pas en création** et est restée sans activité depuis plus de 12 mois **sans avoir fermé** :
- → **+20%**

Sinon → **0%**

### 3.10 Majoration/Minoration Absence de sinistre sur les 5 dernières années (`calculAbsenceSinistre`)

Ce calcul combine la réponse à la question de sinistralité avec l'ancienneté de l'entreprise :

**Si l'entreprise déclare une absence totale de sinistres (réponse = `"OUI"`) :**

| Ancienneté (date effet - date création) | Effet |
|---------------------------------------------|-------|
| Moins de 3 ans | 0% (pas d'effet) |
| De 3 à 7 ans | -10% (minoration) |
| 7 ans ou plus | -20% (minoration) |

**Si la réponse est `"ASSUREUR_DEFAILLANT"` et que l'entreprise n'est pas en création :**
- → **+20%** (majoration)

**Si la réponse est `"A_DEFINIR"` :**
- → **0%** (en attente, pas d'effet)

**Tout autre cas :**
- → **0%**

### 3.11 Constitution du multiplicateur global

Le multiplicateur global est calculé en sommant toutes les majorations (hors non-fourniture bilan N-1) et en ajoutant 1 :

```
Multiplicateur = 1 + Maj_ETP + Maj_Qualif + Maj_Ancienneté + Maj_TempsSansActivité
                   + Maj_Expérience + Maj_AssureurDéfaillant + Maj_NAAC
                   + Maj_SansActivité>12mois + Maj_AbsenceSinistre
```

**Exemple :** Si les majorations totalisent +35%, le multiplicateur sera 1.35. Si elles totalisent -10% (grâce aux minorations), le multiplicateur sera 0.90.

---

## 4. Étape 3 — Taux par activité, dégressivité et calcul de la prime de base

### 4.1 Ajustement du chiffre d'affaires (`calculCA`)

Le système impose un **chiffre d'affaires plancher** basé sur le nombre d'ETP :

```
CA plancher = ETP x 70 000 €
```

Si le CA déclaré est inférieur à ce plancher, c'est le plancher qui est utilisé pour tous les calculs de prime. Sinon, c'est le CA déclaré qui est retenu.

**Exemple :** Pour une entreprise de 3 ETP déclarant 180 000 € de CA, le système utilisera 210 000 € (3 x 70 000).

### 4.2 Normalisation des parts d'activité

Les parts de CA de chaque activité arrivent en pourcentage entier (ex: `60` pour 60%). Le système les convertit en ratio décimal (ex: `0.60`) en divisant par 100 toute valeur strictement positive.

### 4.3 Tableau des taux de base par activité (millésime 2025)

Chaque activité BTP est associée à un **taux de base annuel** qui représente le coût de la couverture pour 1 € de CA :

| Code | Activité | Taux 2025 |
|------|----------|-----------|
| 1 | Voiries Réseaux Divers (VRD) | 3,82% |
| 2 | Maçonnerie et béton armé | 4,07% |
| 3 | Charpente et structure en bois | 4,39% |
| 4 | Charpente et structure métallique | 4,39% |
| 5 | Couverture | 3,66% |
| 6 | Menuiseries extérieures bois et PVC | 3,57% |
| 7 | Menuiseries extérieures métalliques | 3,57% |
| 8 | Bardages de façades | 3,79% |
| 9 | Menuiseries intérieures | 3,43% |
| 10 | Plâtrerie – Staff – Stuc – Gypserie | 4,16% |
| 11 | Serrurerie - Métallerie | 2,56% |
| 12 | Vitrerie - Miroiterie | 2,53% |
| 13 | Peinture | 2,96% |
| 14 | Revêtement intérieur (matériaux souples et parquets) | 2,27% |
| 15 | Revêtement (matériaux durs – Chapes et sols coulés) | 3,61% |
| 16 | Isolation thermique et acoustique | 2,51% |
| 17 | Plomberie | 2,93% |
| 18 | Installations thermiques de génie climatique | 2,93% |
| 19 | Installations d'aéraulique et de conditionnement d'air | 2,93% |
| 20 | Electricité - Télécommunications | 2,98% |

### 4.4 Taux millésime 2026

Les taux 2026 sont dérivés des taux 2025 par application d'un **coefficient d'augmentation fixe de +3,5%** :

```
Taux 2026 = Taux 2025 x 1,035
```

Cette valeur est une constante validée et non un paramètre modifiable dynamiquement.

Le système sélectionne automatiquement le bon millésime en fonction de l'année de la date d'effet du contrat :
- Date d'effet en 2025 → Taux 2025
- Date d'effet en 2026 ou au-delà → Taux 2026

### 4.5 Coefficients de dégressivité (`calculDeg`)

La dégressivité réduit le taux applicable lorsque le CA est suffisamment élevé, reflétant l'effet de volume sur le risque. Le système définit deux paliers de dégressivité par activité :

**Paliers de dégressivité :**

| Activités (codes) | Dégressivité palier 1 | Dégressivité palier 2 |
|-------------------|-----------------------|-----------------------|
| 1 à 8 (gros œuvre, couverture, bardage, menuiseries ext.) | 0,85 | 0,75 |
| 9 à 20 (second œuvre, finitions, équipements) | 0,80 | 0,70 |

**Application par tranche de CA :**

Le coefficient de dégressivité varie de façon linéaire (interpolation proportionnelle) en fonction du CA calculé :

| Tranche de CA | Coefficient appliqué | Formule |
|---------------|----------------------|---------|
| 70 000 € à 250 000 € | Égal au palier 1 | `degressivity1` (fixe) |
| 250 001 € à 500 000 € | Interpolé entre 1 et palier 1 | `1 - ((1 - deg1) x (CA - 250 000) / 250 000)` |
| 500 001 € à 1 000 000 € | Interpolé entre palier 1 et palier 2 | `deg1 - ((deg1 - deg2) x (CA - 500 000) / 500 000)` |
| Au-delà de 1 000 000 € | Pas de dégressivité calculée | Le tableau reste vide |

**Point d'attention :** Pour les CA supérieurs à 1 000 000 €, aucun coefficient de dégressivité n'est produit. Le système utilise alors le taux de base sans dégressivité. Si le barème métier prévoit un traitement spécifique pour ces tranches, un affinage pourra être envisagé.

### 4.6 Calcul de la prime par activité

Pour chaque activité déclarée, le système calcule deux composantes :

**a) Prime mini par activité (PrimeMiniAct) — sur les premiers 70 000 € :**

```
PrimeMiniAct = Taux de base x 70 000 x Part CA de l'activité
```

Cette composante utilise toujours le taux de base **sans dégressivité**, car elle porte sur le socle plancher.

**b) Prime au-delà du plancher (Prime100Min) — sur le CA au-delà de 70 000 € :**

```
Si CA > 250 000 :
  Taux appliqué = Taux de base x Coefficient de dégressivité
Sinon :
  Taux appliqué = Taux de base

Prime100Min = Taux appliqué x (CA calculé - 70 000) x Part CA de l'activité
```

### 4.7 Double application de la dégressivité sur le champ `tauxApplique`

Le champ `tauxApplique` dans le tableau de sortie multiplie le taux de base (qui inclut déjà la dégressivité si CA > 250k) une seconde fois par le coefficient de dégressivité. Ce comportement est **intentionnel** et correspond à un affichage spécifique pour les besoins de restitution dans le tableau de résultat, distinct du taux effectivement utilisé dans le calcul de prime.

---

## 5. Étape 4 — Assemblage de la prime totale (`calculPrimeRCD`)

### 5.1 Agrégation des primes par activité

```
PminiHT = Σ PrimeMiniAct (somme de toutes les activités)
PrimeMini = Σ Prime100Min (somme de toutes les activités)
PrimeHTSansMajorations = PminiHT + PrimeMini
```

### 5.2 Application du multiplicateur global

```
PrimeTotal = PrimeHTSansMajorations x Multiplicateur Global
```

Où le multiplicateur global est celui défini à la section 3.11.

### 5.3 Frais de gestion

```
FraisGestion = PrimeTotal x Taux de frais de gestion
```

Le taux de frais de gestion par défaut est de **10%** (`txFraisGestion = 0.10`).

### 5.4 Protection juridique

La protection juridique est un montant forfaitaire fixe de **106 € HT par an**, quel que soit le profil du client. Le montant TTC est calculé en appliquant le taux de taxe spécifique à la protection juridique :

```
PJ TTC = 106 x (1 + Taux Taxe PJ)
```

### 5.5 Frais de fractionnement

Si le paiement est fractionné (mensuel, trimestriel, semestriel), des frais fixes de **40 € par échéance** sont appliqués :

| Périodicité | Nombre d'échéances | Frais totaux |
|-------------|---------------------|--------------|
| Annuel | 1 | 0 € (pas de frais) |
| Semestriel | 2 | 80 € |
| Trimestriel | 4 | 160 € |
| Mensuel | 12 | 480 € |

### 5.6 Taxe d'assurance

La taxe d'assurance s'applique sur la prime totale **et** sur les frais de fractionnement :

```
Taxe Assurance = (PrimeTotal + Frais Fractionnement) x Taux Taxe Régionale
```

Les taux de taxe par région (DOM-TOM) sont les suivants :

| Région | Taux taxe assurance | Taux taxe PJ |
|--------|---------------------|--------------|
| Martinique | 9% | 13,4% |
| Guadeloupe | 9% | 13,4% |
| Réunion | 9% | 13,4% |
| Guyane | 4,5% | 6,7% |
| Mayotte | 4,5% | 6,7% |
| St-Martin | 5% | 5% |
| St-Barth | 0% | 0% |

*Note : les taux pour la métropole ne sont pas gérés par ces fonctions ; ils sont passés directement en paramètre lors de l'appel au tarificateur.*

### 5.7 Calcul du Total TTC

```
Total "Autres" = Taxe Assurance + PJ TTC + Frais Fractionnement
Total TTC = PrimeTotal + Total "Autres" + Frais Gestion
```

### 5.8 Prime au-delà du minimum

```
PrimeAuDelà = PrimeTotal - (PminiHT x Multiplicateur Global)
```

Ce montant représente la portion de prime générée par le CA excédant le plancher de 70 000 €.

### 5.9 Prime d'aggravation non-fourniture bilan N-1

Comme indiqué à la section 3.8, cette prime est calculée séparément :

```
Si non-fourniture bilan N-1 :
  Prime Aggravation = PrimeTotal x 50% x (1 + Taux Frais Gestion + Taux Taxe Assurance)
Sinon :
  0
```

---

## 6. Étape 5 — Projection de l'année N+1

Le système effectue un deuxième calcul complet, identique dans sa mécanique, mais en utilisant les **taux 2026** (taux 2025 x 1,035). Cela permet de fournir une vision prospective du coût de la couverture pour l'année suivante.

Les éléments recalculés pour N+1 sont :
- Le tableau détaillé par activité (avec taux 2026)
- La prime mini HT N+1
- La prime HT sans majorations N+1
- La prime totale N+1 (avec le même multiplicateur global)
- Les frais de gestion N+1
- Les taxes N+1
- Le total TTC N+1
- La prime d'aggravation bilan N-1 pour N+1

**Important :** Le multiplicateur global (majorations) et les coefficients de dégressivité restent identiques entre N et N+1. Seuls les taux de base des activités changent (+3,5%).

---

## 7. Étape 6 — Génération de l'échéancier (`genererEcheancier`)

L'échéancier décompose le coût total en échéances temporelles selon la périodicité choisie. Le processus se déroule en deux sous-étapes.

### 7.1 Génération des périodes (`genererPeriodes`)

Le système découpe l'année civile en périodes régulières selon la périodicité :

| Périodicité | Découpage |
|-------------|-----------|
| Annuel | 1 période de 12 mois |
| Semestriel | 2 périodes de 6 mois |
| Trimestriel | 4 périodes de 3 mois |
| Mensuel | 12 périodes de 1 mois |

**Période pleine :** Lorsque la date d'effet coïncide avec le premier jour de la période calendaire (ex: 01/01, 01/04, 01/07...), le ratio appliqué est exactement `1 / nombre d'échéances par an`. Cela garantit que les montants d'une période pleine sont toujours rigoureusement proportionnels à l'annuel, sans écart dû au nombre de jours variable des mois.

**Période partielle (première échéance) :** Lorsque la date d'effet tombe en cours de période, le ratio est calculé au prorata de la période calendaire concernée :

```
Ratio = (Nombre de jours couverts / Nombre de jours de la période calendaire complète) x (1 / Nombre d'échéances par an)
```

**Exemple concret :** Pour un contrat démarrant le 27/03 en périodicité mensuelle :
- La période calendaire de mars compte 31 jours
- Les jours couverts sont 5 (du 27 au 31 mars)
- Ratio = (5 / 31) x (1 / 12) = 0,01344
- La période suivante (avril, pleine) aura un ratio de 1/12 = 0,08333

Ce mécanisme, mis en place conformément aux travaux de Luc, assure la cohérence entre périodes pleines et partielles : une période partielle ne peut jamais générer un montant supérieur à celui d'une période pleine de même périodicité.

Chaque période porte un marqueur indiquant s'il s'agit du **premier paiement de l'année** (important pour le calcul de certains postes).

### 7.2 Calcul des montants par échéance (`calculerMontantsEcheance`)

Pour chaque période, le système distingue s'il s'agit de l'année N ou N+1 et utilise les montants correspondants (prime, taxe, frais, frais de gestion).

**Postes de l'échéance :**

| Poste | Calcul | Quand |
|-------|--------|-------|
| RCD | Prime annuelle x Ratio de la période | Chaque échéance |
| Protection Juridique (PJ) | 106 € HT | Premier paiement de chaque année uniquement |
| Frais de fractionnement | Frais annuels / Nombre d'échéances | Chaque échéance |
| Frais de gestion | Total annuel des frais de gestion | Premier paiement de chaque année uniquement |
| Taxe | (RCD échéance + Frais fractionnement échéance) x Taux taxe + PJ x Taux taxe PJ | Chaque échéance |

```
Total HT échéance = RCD + PJ + Frais fractionnement + Frais gestion + Reprise
Total TTC échéance = Total HT + Taxe
```

Tous les montants sont arrondis à 2 décimales.

---

## 8. Fonctions utilitaires

### 8.1 `getTaxeByRegion` et `getTaxeProtectionJuridiqueByRegion`

Ces fonctions retournent les taux de taxe applicable selon la région d'exercice. Elles ne couvrent que les territoires d'outre-mer (Martinique, Guadeloupe, Réunion, Guyane, Mayotte, St-Martin, St-Barth). Le taux métropole est géré en amont et passé directement en paramètre.

### 8.2 `getTaxePJByTauxTaxe`

Cette fonction déduit le taux de taxe sur la protection juridique à partir du taux de taxe d'assurance général :

| Taux taxe assurance | Taux taxe PJ déduit |
|---------------------|--------------------|
| 9% (Martinique, Guadeloupe, Réunion) | 13,4% |
| 4,5% (Guyane, Mayotte) | 6,7% |
| 5% (St-Martin) | 5% |
| 0% (St-Barth) | 0% |

### 8.3 `parseISO`

Fonction de conversion d'une chaîne de caractères au format ISO en objet date. Si la chaîne est invalide, le système produit une erreur explicite.

### 8.4 `financial` et `roundToTwoDecimals`

Deux fonctions d'arrondi monétaire à 2 décimales utilisées systématiquement dans l'ensemble du module pour garantir la précision financière des résultats.

---

## 9. Résumé des flux de calcul

```
Entrées client
      │
      ├──▶ Vérification Refus (4 critères)
      │         │
      │    [Refus ?] ── OUI ─▶ FIN (dossier non éligible)
      │         │
      │        NON
      │         │
      ├──▶ Ajustement CA (plancher ETP x 70k)
      │
      ├──▶ Calcul des 10 majorations/minorations
      │         │
      │    Multiplicateur global = 1 + Σ majorations (hors bilan N-1)
      │
      ├──▶ Pour chaque activité :
      │     ├─ Taux de base (millésime N)
      │     ├─ Coefficient de dégressivité
      │     ├─ Prime mini (sur 70k)
      │     └─ Prime au-delà (sur CA - 70k)
      │
      ├──▶ Assemblage :
      │     PrimeHT = (PminiHT + PrimeMini) x Multiplicateur
      │     + Frais de gestion (10%)
      │     + Taxes régionales
      │     + PJ (106 € HT)
      │     + Frais de fractionnement
      │     = Total TTC
      │
      ├──▶ Projection N+1 (même logique, taux +3,5%)
      │
      └──▶ Génération échéancier (prorata temporis + périodicité)
```

---

## 10. Points soumis à validation des experts

Les points suivants sont signalés pour examen et retour éventuel. Ils correspondent à des comportements précis du système qui pourraient nécessiter un **affinage ou un réglage mineur** selon les règles métier exactes :

1. **ETP = 5 :** Cette valeur ne tombe dans aucune tranche explicite du barème ETP/activités (section 3.1). Majoration appliquée : 0%. À confirmer.

2. **Expérience du dirigeant = 1 an exactement :** La valeur de 1 an ne déclenche aucune majoration (section 3.5), car les bornes sont `> 1` et `>= 3`. Majoration appliquée : 0%. À confirmer.

3. **Ancienneté de l'entreprise = 1 an exactement :** La valeur de 1 an ne déclenche aucune majoration (section 3.3), car les bornes sont `< 1` et `> 1`. Majoration appliquée : 0%. À confirmer.

4. **CA > 1 000 000 € :** Aucun coefficient de dégressivité n'est calculé pour cette tranche (section 4.5). Le taux de base est appliqué sans réduction. À confirmer si un traitement spécifique est attendu.
