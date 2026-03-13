# Rapport technique – Harmonisation des totaux TTC et écarts d'affichage

**Date :** Mars 2025  
**Contexte :** Application Encyclie – Module devis RCD  
**Référence :** Correction des décalages de totaux TTC – Appel de prime et onglet Calcul

---

## 1. Résumé

Le présent rapport décrit les corrections effectuées concernant les écarts constatés entre les totaux TTC affichés dans l'application. Les points suivants sont traités :

1. **Correction de bug** : alignement des totaux TTC entre l'Appel de prime et l'onglet Calcul.
2. **Écart prix annuel / total échéancier** : comportement attendu selon la durée de couverture ; adaptation possible de l'affichage à la demande du client.
3. **Évolution en cours** : travaux en cours sur les modifications esthétiques de l'offre.

---

## 2. Périmètre fonctionnel

| Élément                  | Description                                                    |
| ------------------------ | -------------------------------------------------------------- |
| Fonctionnalité concernée | Appel de prime, onglet Calcul, échéancier                      |
| Impact                   | Cohérence des montants TTC affichés, clarté pour l'utilisateur |
| Utilisateurs concernés   | Tous les utilisateurs consultant ou éditant des devis RCD      |

---

## 3. Diagnostic et corrections

### 3.1 Décalages entre l'Appel de prime et l'onglet Calcul

- **Constat** : des différences étaient observées entre les totaux TTC de l'appel de prime et de l'onglet Calcul.
- **Cause** : bug dans l'affichage des montants.
- **Action** : correction du bug.
- **Résultat** : les totaux TTC sont désormais alignés.

### 3.2 Écart entre le prix annuel et le total TTC de l'échéancier

- **Constat** : une différence peut subsister entre le prix annuel affiché et le total TTC de l'échéancier.
- **Explication** : comportement normal selon la durée de couverture.
- **Suite possible** : adaptation de l'affichage à la demande du client.

---

## 4. Comportement attendu après correction

| Élément                                  | Comportement attendu                                                    |
| ---------------------------------------- | ----------------------------------------------------------------------- |
| Appel de prime vs onglet Calcul          | Les totaux TTC affichés sont identiques                                 |
| Prix annuel vs total TTC de l'échéancier | Une différence peut subsister selon la durée de couverture ; adaptation possible à la demande |

---

## 5. Évolutions en cours

Les modifications esthétiques de l'offre sont en cours de développement et seront livrées dans les meilleurs délais. Une mise à jour sera communiquée dès leur disponibilité.

---

## 6. Conclusion

Les corrections apportées garantissent désormais l'alignement des totaux TTC entre l'Appel de prime et l'onglet Calcul. L'écart éventuel entre le prix annuel et le total de l'échéancier est un comportement attendu ; une adaptation d'affichage peut être réalisée à la demande du client.

---

_Document interne – Encyclie Logiciel_
