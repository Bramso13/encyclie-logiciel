# Mail d'accompagnement – Mise à jour et sauvegarde de l’échéancier

**Objet :** Correction – Mise à jour de l’échéancier lors des modifications de majorations et sauvegarde

---

Bonjour,

Suite à votre retour, nous avons corrigé une anomalie affectant l’échéancier dans l’onglet Calcul des devis RCD.

**Constat :**
Lors de la modification d’une majoration ou d’un paramètre de calcul (via l’éditeur de paramètres ou les switches), l’échéancier affiché ne se mettait pas à jour en temps réel. Par ailleurs, lors de la sauvegarde du calcul, les montants de l’échéancier n’étaient pas correctement enregistrés en base de données.

**Corrections apportées :**
1. **Mise à jour immédiate de l’échéancier** : toute modification d’un paramètre ou d’une majoration recalcule et met à jour l’échéancier affiché dans l’onglet Calcul.
2. **Sauvegarde de l’échéancier** : lors de l’enregistrement du calcul, l’échéancier calculé est désormais sauvegardé dans les échéances de paiement associées au devis.

Un rapport technique détaillant les modifications réalisées est joint au présent mail. Nous restons à votre disposition pour toute question ou pour organiser une démonstration.

Cordialement,
