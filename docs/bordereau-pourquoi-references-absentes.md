# Pourquoi une référence devis/contrat n’apparaît pas dans les CSV du bordereau

## Règle d’inclusion (polices et quittances)

Une référence n’apparaît dans les CSV **que si** toutes les conditions suivantes sont remplies :

1. Le **devis** a le statut **ACCEPTED** (Accepté).
2. Le devis a un **échéancier** (PaymentSchedule) en base.
3. Cet échéancier a **au moins une échéance** (PaymentInstallment).
4. **Au moins une échéance** est dans la période du filtre :
   - soit la **date d’échéance** (`dueDate`) est entre `début période` et `fin période` (inclus),
   - soit la **période de l’échéance** (`periodStart` / `periodEnd`) chevauche la période du filtre (`periodStart ≤ fin période` ET `periodEnd ≥ début période`).

Les deux tableaux (polices et quittances) sont construits à partir de ces **mêmes échéances** ; donc si une référence est absente, elle l’est dans les deux CSV.

---

## Raisons possibles d’absence (récap clair et précis)

Une référence de ta liste **n’est pas dans les CSV** pour **une et une seule** des raisons suivantes :

| # | Raison | Explication courte |
|---|--------|--------------------|
| 1 | **Devis non accepté** | Le devis n’a pas le statut `ACCEPTED` (ex. brouillon, soumis, offre envoyée, refusé, expiré). |
| 2 | **Pas d’échéancier** | Aucun enregistrement `PaymentSchedule` n’est lié à ce devis (échéancier jamais créé après calcul). |
| 3 | **Échéancier vide** | Un `PaymentSchedule` existe mais il n’a **aucune** `PaymentInstallment` (aucune échéance créée). |
| 4 | **Aucune échéance dans la période** | Des échéances existent, mais **ni** la date d’échéance **ni** la période (début/fin) des échéances ne tombent dans la plage de dates choisie dans le filtre du bordereau. |

En résumé : **la référence est absente soit parce que le devis n’est pas accepté, soit parce qu’il n’y a pas d’échéances, soit parce qu’aucune échéance ne tombe dans la période sélectionnée.**

---

## Comment savoir la raison exacte pour une référence

Tu peux lancer le script de diagnostic (voir ci‑dessous) qui interroge la base et affiche, pour chaque référence, la raison précise (1, 2, 3 ou 4).

```bash
npx ts-node --compiler-options '{"module":"CommonJS"}' src/scripts/check-bordereau-references.ts
```

(En adaptant le chemin si le script est ailleurs.)
