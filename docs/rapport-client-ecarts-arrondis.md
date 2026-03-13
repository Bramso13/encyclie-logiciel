# Rapport – Correction des écarts d’affichage

**Date :** Mars 2025  
**Objet :** Correction d’un bug lié aux arrondis dans le calcul des échéanciers  
**Destinataire :** Client Encyclie

---

## 1. Contexte

Suite à un retour de votre part, nous avons identifié un écart de quelques euros entre le total TTC affiché et la somme des montants de l’échéancier sur certains devis.

---

## 2. Diagnostic

Un **bug informatique** a été constaté dans le module de calcul des échéances.  
Ce bug était lié à la gestion des **arrondis** dans l’application : les montants étaient correctement calculés, mais l’affichage pouvait différer légèrement selon la façon dont les arrondis étaient appliqués ligne par ligne.  
Ce type de situation est courant dans les logiciels de facturation et de devis.

---

## 3. Actions réalisées

- Identification précise de la cause du bug
- Mise en place d’une correction pour harmoniser les arrondis
- Contrôle et validation de la correction pour l’ensemble des flux de calcul

Le système est désormais aligné : le total TTC et la somme des échéances correspondent correctement.

---

## 4. Impact

Ce bug ne concernait que **l’affichage** des montants. Les calculs de base étaient corrects.  
Il a pu entraîner l’envoi d’offres sur lesquelles le total affiché ne correspondait pas à la somme des échéances dans quelques cas isolés.

---

## 5. Conclusion

La correction est effective. Les prochains devis et échéanciers ne seront plus impactés par ce problème.

---

*Document interne – Encyclie Logiciel*
