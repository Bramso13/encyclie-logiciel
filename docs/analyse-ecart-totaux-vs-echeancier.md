# Analyse de l’écart entre les totaux (bloc 1) et la somme de l’échéancier

## Contexte

- **Bloc 1 (l.772–817)** : calcul des totaux globaux sur `returnValue` (primeTotal, fraisGestion, autres.*, totalTTC), avec arrondi à 2 décimales à chaque étape.
- **Bloc 2 (l.1186–1222)** : calcul des montants par échéance dans `genererEcheancier`, puis arrondi par ligne via `financial()`.

En théorie, la **somme des totalTTC des échéances** devrait égaler **returnValue.totalTTC**.

---

## Cause principale identifiée : double taxe sur la PJ + mauvais taux

### Bloc 1 – Structure de `totalTTC`

```
autres.taxeAssurance = taxe sur prime + taxe sur frais fractionnement  (sans PJ)
autres.protectionJuridiqueTTC = 106 × (1 + taxeProtectionJuridique)    (PJ déjà TTC)
autres.total = taxeAssurance + protectionJuridiqueTTC + fraisFractionnementPrimeHT
totalTTC = primeTotal + autres.total + fraisGestion
```

Donc : la **PJ est déjà TTC** dans `protectionJuridiqueTTC`. La taxe sur la PJ est incluse dans ce montant, via `taxeProtectionJuridique`.  
`taxeAssurance` ne contient **pas** la taxe sur la PJ.

### Échéancier – Formules actuelles (l.1206–1209)

```ts
const pjEcheance = premierPaiementDeLAnnee ? 106.0 : 0;   // 106 = HT !
const taxeEcheance = (taxeAnnee / nbEcheances) * ratio + pjEcheance * tauxTaxe;
```

Problèmes :

1. **Montant PJ** : le paramètre `pj` (`protectionJuridiqueTTC`) est ignoré et remplacé par `106` (HT).
2. **Taxe sur la PJ** : on ajoute `pjEcheance * tauxTaxe`, soit `106 * taxeAssurance`, donc une **taxe sur la PJ en plus**.
3. **Base incorrecte** : on taxe `106` (HT) alors que dans le bloc 1 la PJ est déjà TTC.
4. **Taux incorrect** : on utilise `tauxTaxe` (= taxeAssurance : 4,5 %, 9 %, etc.) au lieu de `taxeProtectionJuridique` (6,7 %, 13,4 %, etc.).

Conséquences :

- Bloc 1 : `protectionJuridiqueTTC = 106 × (1 + taxeProtectionJuridique)` (ex. 106 × 1,134 ≈ 120,20 € pour Martinique).
- Échéancier : `106 + 106 × taxeAssurance = 106 × (1 + taxeAssurance)` (ex. 106 × 1,09 ≈ 115,54 €).

Écart sur la PJ seule : ~4,66 € (selon région). Sur l’ensemble, avec répartition et arrondis, un écart global de l’ordre de 2 € est cohérent.

### Correction à appliquer

- Utiliser le paramètre `pj` (TTC) et **ne pas** ajouter de taxe dessus :
  ```ts
  const pjEcheance = premierPaiementDeLAnnee ? pjAnnee : 0;  // pjAnnee = pj ou pjN1
  const taxeEcheance = (taxeAnnee / nbEcheances) * ratio;    // sans + pjEcheance * tauxTaxe
  ```
- La PJ étant déjà TTC, elle ne doit pas être re-taxée dans `taxeEcheance`.

---

## 1. Proratisation de la première période (ratio &lt; 1)

**Dans l’échéancier (l.1160–1170)**  
Pour la **première** échéance (`j === i - 1`), un `ratio` est calculé à partir des jours réels de la période :

- `joursTheorique = Math.round(365.25 / nbEcheances) - 1`
- `ratio = min(joursReel / joursTheorique, 1)`

Ensuite :

- `rcdEcheance = (rcdAnnee / nbEcheances) * ratio`
- `taxeEcheance = (taxeAnnee / nbEcheances) * ratio + pjEcheance * tauxTaxe`

**Dans le bloc 1**  
Les totaux sont calculés sur **toute l’année** (pas de proratisation) :

- `primeTotal`, `autres.taxeAssurance`, etc. correspondent à une année pleine.

**Conséquence**  
Dès que la première période est **partielle** (ratio &lt; 1) :

- La somme des `rcdEcheance` sur l’année =  
  `(rcd / nbEcheances) * (ratio + (nbEcheances - 1))` &lt; `rcd` si ratio &lt; 1.
- Idem pour la part de taxe répartie sur les échéances.

Donc **la somme des montants de l’échéancier peut être inférieure au totalTTC du bloc 1** d’une quantité liée à `(1 - ratio) * (part de prime + part de taxe)` sur la première échéance. Pour un ratio proche de 1, ça peut déjà expliquer un écart de l’ordre de quelques euros.

---

## 2. Arrondi : “somme des arrondis” ≠ “arrondi de la somme”

**Bloc 1**  
Chaque grandeur est arrondie **une fois** avant d’être utilisée pour la suivante :

- `primeTotal = round(PrimeHTSansMajorations * totalMajorations)`
- `fraisGestion = round(primeTotal * txFraisGestion)`
- `autres.taxeAssurance = round(primeTotal * taxeAssurance + fraisFractionnement * taxeAssurance)`
- etc.
- `totalTTC = round(primeTotal + autres.total + fraisGestion)`

**Échéancier**  
On part des **mêmes** totaux (déjà arrondis), on les répartit par échéance (division, ratio), puis on arrondit **chaque ligne** :

- `financial(totalHTEcheance)`, `financial(taxeEcheance)`, `financial(totalTCHEcheance)` → en pratique arrondi à 2 décimales par échéance.

On a donc :

- Total bloc 1 = **arrondi une fois** sur le total.
- Somme échéancier = **somme des arrondis** de chaque échéance.

En général :  
`sum(round(montant_échéance_i)) ≠ round(sum(montant_échéance_i))`.  
Sur 12 échéances, des écarts de quelques centimes par ligne peuvent donner **1 à 2 €** d’écart au total.

---

## 3. Protection juridique (PJ) en dur à 106 €

**Passage des paramètres (l.918–937)**  
L’échéancier reçoit bien la PJ calculée :

- `pj: returnValue.autres.protectionJuridiqueTTC`  
  (avec `protectionJuridiqueTTC = round(protectionJuridique1an * (1 + taxeProtectionJuridique))`).

**Dans la boucle (l.1206)**  
En revanche, le code utilise une valeur fixe :

```ts
const pjEcheance = premierPaiementDeLAnnee ? 106.0 : 0;
```

Donc le paramètre **`pj` (et `pjN1`) n’est pas utilisé** : on affiche toujours 106 € pour la PJ à la première échéance de l’année.

- Si la PJ réelle (TTC) est différente (autre tarif, autre taux de taxe), la **somme de l’échéancier** ne correspondra pas au **total** du bloc 1 (où la vraie PJ est incluse dans `autres.total`).
- Même avec une PJ à 106 €, la **taxe** sur la PJ dans l’échéancier est calculée avec `pjEcheance * tauxTaxe` (l.1208) en prenant 106 ; si le bloc 1 utilise une PJ TTC différente, la taxe globale ne colle pas.

**Recommandation**  
Utiliser les paramètres reçus, par exemple :

- pour l’année N : `pjEcheance = premierPaiementDeLAnnee ? pj : 0`
- pour N+1 : même idée avec `pjN1` selon l’année de l’échéance (comme pour `fraisGestionAnnee` / `rcdAnnee`).

---

## 4. Récap des différences

| Cause | Impact probable sur l’écart |
|-------|------------------------------|
| **Ratio &lt; 1** sur la 1ère période | Prime + taxe de la 1ère échéance réduites → somme échéancier &lt; total bloc 1 (quelques euros selon ratio et montants). |
| **Arrondi par échéance** | Somme des totalTTC arrondis ≠ totalTTC arrondi du bloc 1 (souvent 1–2 € sur 12 échéances). |
| **PJ = 106 en dur** | Si la PJ réelle (TTC) ou la taxe sur PJ diffère, écart additionnel entre total et somme échéancier. |

---

## 5. Piste de correction pour aligner les chiffres

1. **Cohérence sémantique**  
   Décider si le **totalTTC** du bloc 1 doit représenter :
   - l’année pleine (comme aujourd’hui), ou  
   - la **somme des échéances** (proratisée + arrondie).

2. **Si on garde “année pleine”**  
   - Soit on **proratise aussi** les totaux du bloc 1 pour la première période (complexe et à bien définir).  
   - Soit on accepte un écart quand la 1ère période est partielle, et on documente que le total affiché est “année pleine” alors que l’échéancier est proratisé.

3. **Réduire l’écart d’arrondi**  
   - Calculer les montants par échéance **sans** arrondir en cours de route.  
   - Faire **un seul arrondi** sur le total des échéances (ou une répartition d’arrondi sur la dernière échéance) pour que **somme(échéances) = totalTTC** du bloc 1.  
   - Ou au minimum : utiliser les **mêmes** valeurs déjà arrondies du bloc 1 pour construire les lignes (éviter de ré-arrondir des sous-totaux intermédiaires).

4. **PJ**  
   - Remplacer `106.0` par le paramètre `pj` (et `pjN1` pour N+1) pour que l’échéancier utilise exactement les mêmes montants PJ (et taxe PJ) que le bloc 1.

En appliquant (3) et (4), on supprime les écarts dus à l’arrondi et à la PJ ; l’éventuel écart restant ne viendra plus que du **ratio** sur la première période, à traiter selon le choix (2).
