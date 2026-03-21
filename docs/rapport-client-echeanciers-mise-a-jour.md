# Rapport de mise à jour – Échéanciers

**Date :** 19 mars 2026  
**Objet :** Application des modifications d'échéancier et demande de vérification

---

## Synthèse

Ce rapport présente les travaux réalisés sur le module d'échéancier et sollicite votre validation finale ainsi que votre retour sur une question ouverte concernant les devis modifiés manuellement.

---

## Travaux réalisés

### 1. Application des changements

Les nouvelles règles de calcul ont été appliquées à l'ensemble des devis que nous avons modifiés ensemble manuellement. Cette étape a nécessité un traitement spécifique pour garantir la cohérence des montants avec les paramètres convenus.

### 2. Correction des anomalies de génération

Au cours de plusieurs sessions de développement et de tests, nous avons identifié et corrigé les problèmes survenant lors de la création des échéanciers :

- **Tests et validation** : mise en place de tests automatisés et de vérifications manuelles sur différents scénarios (annuel, semestriel, trimestriel, mensuel, prorata, années N et N+1) ;
- **Vérification itérative** : plusieurs cycles de validation ont été réalisés pour confirmer le bon comportement dans les cas limites et les configurations particulières.

### 3. Durée et ampleur des travaux

Ce changement, de portée conséquente, a mobilisé l'équipe pendant plusieurs jours. Les différents aspects techniques – calcul, persistance, affichage – ont fait l'objet de contrôles successifs afin de limiter tout risque de régression.

---

## Demande de vérification

Malgré la rigueur apportée à ces vérifications, nous vous demandons de procéder à une **validation de votre côté** sur vos devis récents et de nous signaler **toute anomalie ou incohérence** que vous pourriez constater.

Votre retour terrain reste essentiel pour valider le bon fonctionnement dans vos usages réels.

**Note :** Des écarts de quelques euros entre la somme des échéances et le total annuel peuvent subsister. Les règles comptables et les contraintes d'affichage imposent des arrondis à deux décimales à chaque échéance ; la propagation de ces arrondis successifs sur plusieurs périodes peut générer des écarts résiduels, ce qui est inhérent au traitement des montants financiers par échéance.

---

## Question en attente de réponse

Pour les **devis modifiés à la main**, quelle présentation souhaitez-vous dans les onglets **« Échéancier »** et **« Appel de prime »** ?

Cette précision nous permettra de finaliser l'affichage en accord avec vos attentes opérationnelles.

---

## Suite

En attendant votre retour et votre réponse sur la question des devis modifiés manuellement, nous restons à votre disposition pour toute précision ou complément d'information.

Nous vous prions d'accepter nos excuses pour le temps que ce changement a pu représenter et vous remercions de votre compréhension.
