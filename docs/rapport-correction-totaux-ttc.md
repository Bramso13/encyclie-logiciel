# Rapport technique – Harmonisation des totaux TTC et écarts d’affichage

**Date :** Mars 2025  
**Contexte :** Application Encyclie – Module devis RCD  
**Référence :** Correction des décalages de totaux TTC entre l’Appel de prime et l’onglet Calcul – Précisions sur les écarts liés au prorata

---

## 1. Résumé

Le présent rapport décrit les corrections effectuées concernant les écarts constatés entre les totaux TTC affichés dans l’application. Les points suivants sont traités :

1. **Correction d’anomalie** : alignement des totaux TTC entre l’Appel de prime et l’onglet Calcul suite à la résolution d’un défaut de calcul.
2. **Précisions techniques** : justification de l’écart entre le prix annuel de la prime et le total TTC de l’échéancier, lié à l’application d’un prorata en cas de prime calculée sur une année incomplète.
3. **Évolution en cours** : travaux en cours sur les modifications esthétiques de l’offre.

---

## 2. Périmètre fonctionnel

| Élément | Description |
|--------|-------------|
| Fonctionnalité concernée | Appel de prime, onglet Calcul, échéancier |
| Impact | Cohérence des montants TTC affichés, clarté pour l’utilisateur |
| Utilisateurs concernés | Tous les utilisateurs consultant ou éditant des devis RCD |

---

## 3. Diagnostic et corrections

### 3.1 Décalages entre l’Appel de prime et l’onglet Calcul

- **Constat** : des différences étaient observées entre les totaux TTC affichés dans l’appel de prime et ceux de l’onglet Calcul.
- **Cause identifiée** : anomalie dans le calcul ou l’agrégation des montants de l’appel de prime.
- **Action réalisée** : correction du défaut de calcul afin d’assurer la cohérence des totaux TTC entre ces deux espaces.
- **Résultat** : les montants sont désormais alignés entre l’Appel de prime et l’onglet Calcul.

### 3.2 Écart entre le prix annuel de la prime et le total TTC de l’échéancier

- **Constat** : une différence peut subsister entre le prix annuel de la prime affiché en haut de l’onglet Calcul et le total TTC de l’échéancier.
- **Explication** : cet écart est attendu et provient de l’**application d’un prorata temporis** lorsque la prime est calculée sur une période inférieure à une année complète. Le prix annuel correspond à la projection sur douze mois, tandis que l’échéancier reflète les montants effectivement dus sur la période couverte.
- **Conclusion** : aucune anomalie à corriger ; l’affichage reflète correctement la logique de calcul. Une adaptation de la présentation est possible si le client le souhaite.

---

## 4. Comportement attendu après correction

| Élément | Comportement attendu |
|--------|----------------------|
| Appel de prime vs onglet Calcul | Les totaux TTC affichés sont identiques |
| Prix annuel vs total TTC de l’échéancier | Une différence peut subsister lorsque le calcul porte sur une période inférieure à une année complète ; elle est cohérente avec l’application du prorata |

---

## 5. Évolutions en cours

Les modifications esthétiques de l’offre sont en cours de développement et seront livrées dans les meilleurs délais. Une mise à jour sera communiquée dès leur disponibilité.

---

## 6. Conclusion

Les corrections apportées garantissent désormais l’alignement des totaux TTC entre l’Appel de prime et l’onglet Calcul. L’écart entre le prix annuel et le total TTC de l’échéancier, lorsqu’il existe, est explicable par l’application du prorata sur une période partielle et peut faire l’objet d’adaptations d’affichage à la demande du client.

---

*Document interne – Encyclie Logiciel*
