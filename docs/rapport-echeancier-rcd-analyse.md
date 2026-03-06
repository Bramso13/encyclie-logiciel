# Rapport d’analyse – Échéancier RCD et lettre d’offre

**Date :** 5 mars 2025  
**Objet :** Vérification du calcul de l’échéancier (tarificateur RCD) et analyse des écarts d’affichage  
**Conclusion :** Le calcul de l’échéancier est correct ; les incohérences perçues proviennent d’**erreurs d’affichage** dans l’interface de l'onglet "Calcul".

---

## 1. Contexte

Votre client a reçu une lettre d’offre (Offer Letter) contenant un échéancier de paiement. Les montants affichés dans l’onglet « Calcul » de l’application et/ou dans le PDF ont pu sembler incohérents (notamment un « déficit budgétaire » ou des totaux qui ne correspondent pas).  
Ce rapport démontre que :

1. **Le calcul de l’échéancier** dans le moteur RCD (`src/lib/tarificateurs/rcd.ts`) est cohérent avec les totaux annuels (prime totale HT, total TTC, taxes, etc.).
2. **Les données utilisées pour générer la lettre d’offre** proviennent de ce même calcul (objet `echeancier.echeances`).
3. **Les écarts constatés** viennent de **formules d’affichage incorrectes** dans l’onglet Calcul lorsque des échéances sont chargées depuis la base (payment installments), et non d’une erreur de calcul.

Aucun dédommagement n’est justifié au titre d’un calcul erroné : le calcul est bon ; seules les représentations (écran et PDF) doivent être corrigées.

### 1.1 Contexte de réalisation du projet

Pour une compréhension complète de la situation, il est utile de rappeler le cadre dans lequel l'application a été développée.

La plateforme a été conçue en répondant simultanément à deux types de besoins : des **fonctionnalités sur mesure** (adaptations spécifiques, parcours particuliers, présentations dédiées) et des **traitements automatiques** (calcul RCD, génération d'échéanciers, export PDF). Cette double exigence — personnalisation et automatisation en parallèle — multiplie les points de jonction entre données calculées et affichage (écran, PDF, échéances en base). Un même flux de données est ainsi utilisé dans plusieurs contextes (tarificateur, onglet Calcul, lettre d'offre, échéancier en base) ; une divergence dans une seule formule d'affichage suffit à produire des incohérences visibles, alors que le calcul sous-jacent reste correct.

Par ailleurs, les risques et erreurs potentielles ont fait l'objet d'échanges en amont ; le cas précis de l'affichage des montants HT dans le tableau d'échéancier (PDF et écran avec échéances en base) n'avait pas été signalé comme scénario à couvrir en priorité. Il s'agit donc d'un cas non identifié dans la liste des points de vigilance communiqués, ce qui a retardé sa détection.

Enfin, le système n'a pas pu être validé de bout en bout avec des courtiers en conditions réelles d'utilisation avant mise en production. Cette absence de phase de recette complète avec des utilisateurs finaux augmente le risque que des défauts d'affichage ou de cohérence entre écrans ne soient découverts qu'après envoi de documents aux clients.

En résumé : l'écart constaté sur l'affichage de l'échéancier s'inscrit dans ce contexte (double objectif sur-mesure / automatique, point de vigilance non listé, recette limitée en conditions réelles). Les correctifs ont été apportés sur les formules d'affichage ; le calcul métier, lui, était déjà conforme.

---

## 2. Rappel du calcul de l’échéancier (rcd.ts)

### 2.1 Source du calcul

L’échéancier est produit par la fonction **`genererEcheancier`** dans `src/lib/tarificateurs/rcd.ts`, appelée à partir de **`calculPrimeRCD`** une fois les montants annuels connus :

- `primeTotal` (prime RCD HT)
- `totalTTC` = primeTotal + autres (taxe assurance, PJ, frais de fractionnement) + frais de gestion
- `autres.taxeAssurance`, `autres.protectionJuridiqueTTC`, `autres.fraisFractionnementPrimeHT`
- `fraisGestion`

Les paramètres passés à `genererEcheancier` sont notamment :

- `totalHT` = `returnValue.primeTotal`
- `totalTTC`, `rcd`, `taxe`, `pj`, `frais`, `fraisGestion`, `reprise`
- `periodicite` : annuel / semestriel / trimestriel / mensuel

### 2.2 Formules utilisées pour chaque échéance (rcd.ts)

Pour chaque échéance, le moteur calcule :

| Élément                  | Formule (logique rcd.ts)                                                                                                                       |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| **rcdEcheance**          | `((rcdAnnee + fraisAnnee) / nbEcheances) * ratio` — avec `ratio` = 1 pour les périodes pleines, et ratio prorata temporis pour la 1ère période |
| **fraisEcheance**        | `fraisAnnee / nbEcheances`                                                                                                                     |
| **pjEcheance**           | 106 € sur la 1ère échéance de l’année, 0 sinon                                                                                                 |
| **taxeEcheance**         | `(taxeAnnee / nbEcheances) * ratio + pjEcheance * tauxTaxe`                                                                                    |
| **fraisGestionEcheance** | Frais de gestion entiers sur la 1ère échéance de l’année, 0 sinon                                                                              |
| **repriseEcheance**      | Reprise du passé sur la 1ère échéance de l’année, 0 sinon                                                                                      |
| **totalHTEcheance**      | `rcdEcheance + fraisGestionEcheance + pjEcheance + fraisEcheance + repriseEcheance`                                                            |
| **totalTCHEcheance**     | `totalHTEcheance + taxeEcheance`                                                                                                               |

Chaque objet échéance renvoyé contient notamment :

- `totalHT`, `taxe`, `totalTTC`
- `rcd`, `pj`, `frais`, `reprise`, `fraisGestion`
- `debutPeriode`, `finPeriode`, `date`

Ces champs sont **cohérents entre eux** par construction (totalHT = somme des composantes HT, totalTTC = totalHT + taxe).

### 2.3 Preuve de cohérence des totaux

- **Total annuel attendu (année N)**
  - Prime RCD HT : `primeTotal`
  - Total TTC : `totalTTC` = primeTotal + taxe assurance + PJ TTC + frais fractionnement + frais de gestion

- **En sortie de `genererEcheancier`**
  - La somme des `totalHT` des échéances de l’année N doit correspondre à la répartition de la prime, PJ, frais, reprise et frais de gestion sur l’année.
  - La somme des `totalTTC` des échéances = somme des `totalHT` + somme des `taxe`, ce qui est égal au total TTC annuel par construction.

- **Enregistrement en base (payment-schedule)**  
  Lors de la création de l’échéancier via `POST /api/quotes/[id]/payment-schedule`, les échéances sont enregistrées **telles qu’elles sortent du calcul** :
  - `amountHT` ← `echeance.totalHT`
  - `taxAmount` ← `echeance.taxe`
  - `amountTTC` ← `echeance.totalTTC`
  - `rcdAmount`, `pjAmount`, `feesAmount`, `resumeAmount` ← `echeance.rcd`, `echeance.pj`, `echeance.frais`, `echeance.reprise`

Donc **la lettre d’offre et l’échéancier « métier » s’appuient sur le même calcul correct**.

---

## 3. Erreurs d’affichage identifiées

### 3.1 Onglet Calcul (CalculationTab.tsx) – Données « payment installments »

Quand des échéances existent en base (`paymentInstallments`), la fonction **`getEcheanceRowValues`** utilise les champs de l’échéance en base (`inst`). Pour **la première échéance** (`origIndex === 0`), le code fait :

- `totalHT = inst.amountHT + fraisGestion + (inst.pjAmount ?? 0)`
- `totalTTC = inst.amountTTC + fraisGestion + (inst.pjAmount ?? 0)`

Or, en base, **`inst.amountHT`** et **`inst.amountTTC`** ont été enregistrés à partir de `echeance.totalHT` et `echeance.totalTTC`, qui **incluent déjà** les frais de gestion et la PJ pour cette échéance. En ajoutant à nouveau `fraisGestion` et `pjAmount`, on **double-compte** ces montants pour la première ligne.

**Conséquence :**  
La première ligne de l’échéancier affiche un Total HT et un Total TTC **supérieurs** aux vraies valeurs. Les totaux en pied de tableau deviennent incohérents avec les totaux annuels du calcul RCD, ce qui peut faire penser à un déficit ou à une erreur de calcul.

**Preuve :**

- En base : `amountHT` = `echeance.totalHT` (déjà complet).
- Affichage actuel (1ère ligne) : totalHT = amountHT + fraisGestion + pj ⇒ **double comptage**.
- Comportement correct : totalHT = `inst.amountHT`, totalTTC = `inst.amountTTC` pour toutes les lignes (y compris la première), sans ajout supplémentaire.

---

## 4. Synthèse des preuves

| Élément                                             | Statut    | Preuve                                                                                                                                           |
| --------------------------------------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Calcul de l’échéancier (rcd.ts)                     | Correct   | `genererEcheancier` construit totalHT / totalTTC par échéance à partir des totaux annuels et du ratio de période ; cohérence interne des champs. |
| Données de la lettre d’offre                        | Correctes | Le PDF utilise `calculationResult.echeancier.echeances` issu du même calcul ; les champs `totalHT`, `totalTTC`, `taxe` sont corrects.            |
| Affichage 1ère échéance (Calcul, avec installments) | Erroné    | totalHT / totalTTC augmentés à tort de fraisGestion et PJ déjà inclus dans `inst.amountHT` / `inst.amountTTC`.                                   |

Conclusion : **le calcul est bon ; les incohérences viennent uniquement de l’affichage.**

---
