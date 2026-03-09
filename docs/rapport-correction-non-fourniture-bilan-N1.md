# Rapport technique – Correction du paramètre « Non fourniture bilan N-1 »

**Date :** Mars 2025  
**Contexte :** Application Encyclie – Module devis RCD  
**Référence :** Correction bug – Switch « Non fourniture bilan N-1 » non réactif en position OFF

---

## 1. Résumé

Une anomalie empêchait la désactivation correcte du paramètre « Non fourniture bilan N-1 » dans l’onglet Calcul des devis. L’activation (ON) fonctionnait, mais le passage en OFF ne déclenchait pas la mise à jour du calcul. Le comportement a été harmonisé avec celui des autres paramètres de majoration.

---

## 2. Périmètre fonctionnel

| Élément | Description |
|--------|-------------|
| Fonctionnalité | Switch « Non fourniture bilan N-1 » – Onglet Calcul RCD |
| Impact | Calcul de la prime HT, majorations, échéancier |
| Utilisateurs concernés | Utilisateurs modifiant les paramètres de calcul des devis RCD |

---

## 3. Diagnostic

Le paramètre « Non fourniture bilan N-1 » bénéficiait d’un traitement spécifique distinct des autres majorations. Cette particularité introduisait une incohérence :

- **ON :** La modification était correctement appliquée via un recalcul complet.
- **OFF :** La logique dédiée ne prenait pas en compte la valeur `false`, ce qui bloquait la mise à jour du calcul.

---

## 4. Modifications techniques réalisées

### 4.1 Harmonisation du traitement du paramètre

Le paramètre « Non fourniture bilan N-1 » suit désormais le flux standard des autres paramètres de majoration :

- Passage unique par la fonction `applyCalculationChange`
- Inclusion dans le calcul des majorations totales
- Réactivité identique pour les positions ON et OFF

### 4.2 Fichiers modifiés

| Fichier | Modification |
|---------|--------------|
| `src/lib/calculation-apply.ts` | Inclusion de `nonFournitureBilanN_1` dans le calcul des majorations totales (suppression de l’exception) |
| `src/app/quotes/[id]/page.tsx` | Suppression du traitement spécifique ; routage via le flux commun `handleApplyChange` |
| `src/lib/utils.ts` | Nettoyage des surcharges spécifiques ; utilisation du mapping standard |

### 4.3 Comportement attendu après correction

- Activation du switch (ON) → majoration de 0,5 appliquée, recalcul immédiat.
- Désactivation du switch (OFF) → majoration à 0, recalcul immédiat.
- Comportement aligné avec les autres paramètres (ex. années assurance continue, reprise du passé, etc.).

---

## 5. Vérifications recommandées

1. Ouvrir un devis RCD et accéder à l’onglet **Calcul**.
2. Activer le switch « Non fourniture bilan N-1 » → vérifier que la prime et les majorations se mettent à jour.
3. Désactiver le switch « Non fourniture bilan N-1 » → vérifier que la prime et les majorations reviennent à leur état initial.
4. Utiliser le bouton **Recalcul** et confirmer la cohérence des montants et de l’échéancier.

---

## 6. Conclusion

La correction a été déployée afin de garantir un comportement uniforme et prévisible pour l’ensemble des paramètres de calcul. Le paramètre « Non fourniture bilan N-1 » répond désormais correctement aux changements ON/OFF et s’inscrit dans le même flux que les autres paramètres.

---

*Document interne – Encyclie Logiciel*
