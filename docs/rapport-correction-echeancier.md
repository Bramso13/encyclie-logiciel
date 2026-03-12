# Rapport technique – Mise à jour et sauvegarde de l’échéancier RCD

**Date :** Mars 2025  
**Contexte :** Application Encyclie – Module devis RCD  
**Référence :** Correction – Échéancier non mis à jour à la modification des majorations, non sauvegardé lors de l’enregistrement du calcul

---

## 1. Résumé

Deux dysfonctionnements ont été identifiés et corrigés concernant l’échéancier des devis RCD :

1. **Mise à jour de l’affichage** : l’échéancier ne se mettait pas à jour lorsque l’utilisateur modifiait une majoration ou un paramètre de calcul (éditeur de paramètres, switches).
2. **Sauvegarde** : les montants recalculés de l’échéancier n’étaient pas persistés en base de données lors de la sauvegarde du calcul.

---

## 2. Périmètre fonctionnel

| Élément | Description |
|--------|-------------|
| Fonctionnalité | Échéancier de paiement – Onglet Calcul RCD |
| Impact | Affichage en temps réel, persistance des données, cohérence devis/échéances |
| Utilisateurs concernés | Tous les utilisateurs modifiant les paramètres de calcul d’un devis RCD |

---

## 3. Diagnostic

### 3.1 Mise à jour de l’échéancier

- **Symptôme** : modification d’une majoration ou d’un paramètre sans mise à jour de l’échéancier affiché.
- **Cause** : l’échéancier affiché priorisait les données issues de l’API (`paymentInstallments`) plutôt que le résultat du calcul local (`calculationResult.echeancier`), alors que des modifications non encore sauvegardées étaient en cours.

### 3.2 Sauvegarde de l’échéancier

- **Symptôme** : après sauvegarde du calcul, les échéances de paiement en base ne reflétaient pas les montants recalculés.
- **Cause** : la fonction de sauvegarde du calcul ne mettait pas à jour les enregistrements d’échéances (`paymentInstallments`) avec les montants issus du calcul.

---

## 4. Modifications techniques réalisées

### 4.1 Mise à jour de l’échéancier à l’écran

- Priorisation de `calculationResult.echeancier` sur `paymentInstallments` lorsque des modifications locales existent (détection via `originalCalculationResult`).
- Regénération de l’échéancier à chaque application d’une modification (via `applyCalculationChange`) afin que l’affichage reste cohérent avec le calcul courant.

### 4.2 Sauvegarde de l’échéancier

- Lors de la sauvegarde du calcul (`saveCalculationToDatabase`) :
  - sauvegarde du résultat de calcul (`calculatedPremium`) ;
  - extraction des échéances à partir de `calculationResult.echeancier` ;
  - mise à jour des enregistrements `paymentInstallments` en base avec les montants recalculés (PATCH des échéances existantes).

### 4.3 Fichiers modifiés

| Fichier | Modification |
|---------|--------------|
| `CalculationTab.tsx` | Priorisation de `calculationResult.echeancier` sur `paymentInstallments` en cas de modifications locales |
| `calculation-apply.ts` | Regénération de l’échéancier dans `applyCalculationChange` à chaque modification de paramètre/majoration |
| `page.tsx` | Mise à jour de `paymentInstallments` dans `saveCalculationToDatabase` avec les échéances du calcul |

---

## 5. Comportement attendu après correction

| Action | Résultat attendu |
|--------|------------------|
| Modification d’une majoration | L’échéancier se met à jour immédiatement à l’écran |
| Modification d’un paramètre (éditeur) | L’échéancier se met à jour immédiatement à l’écran |
| Sauvegarde du calcul | Les échéances sont enregistrées en base avec les montants recalculés |
| Rechargement du devis | Les échéances affichées correspondent aux données sauvegardées |

---

## 6. Vérifications recommandées

1. Ouvrir un devis RCD et accéder à l’onglet **Calcul**.
2. Modifier une majoration ou un paramètre → vérifier que l’échéancier se met à jour immédiatement.
3. Cliquer sur **Sauvegarder le calcul** → vérifier l’absence d’erreur.
4. Recharger la page ou rouvrir le devis → vérifier que les montants de l’échéancier correspondent au dernier calcul sauvegardé.

---

## 7. Conclusion

Les correctifs assurent désormais une mise à jour cohérente de l’échéancier à l’écran lors des modifications de paramètres et des majorations, ainsi qu’une persistance correcte des montants lors de la sauvegarde du calcul.

---

*Document interne – Encyclie Logiciel*
