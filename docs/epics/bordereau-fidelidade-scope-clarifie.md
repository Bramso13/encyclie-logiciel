# Bordereau FIDELIDADE — Scope clarifié (février 2025)

Document de synthèse des réponses d’élicitation pour aligner l’epic et les stories sur le besoin réel.

---

## 1. Livrable

- **Deux fichiers CSV** (un par “feuille”), pas un seul fichier Excel.
- Pas de filtre par courtier dans l’UI : l’admin choisit uniquement **une période**.

---

## 2. Feuille 1 — Polices (contrats + devis ACCEPTED)

- **Source** : contrats + quotes avec statut **ACCEPTED** uniquement.
- **APPORTEUR** : **toujours la même valeur** (constante configurable, pas de liste de courtiers).
- **IDENTIFIANT_POLICE** : **référence du quote** (`Quote.reference`). Pas de champ ni génération dédiée.
- **Une ligne = une police** (une ligne par contrat/devis accepté).
- **Activités** : **8 paires** LIBELLÉ_ACTIVITÉ / POIDS_ACTIVITÉ (pas 12, pas variable).

---

## 3. Feuille 2 — Quittances (échéances)

- **Une ligne = une échéance** (une ligne par `PaymentInstallment` dans la période).
- **IDENTIFIANT_QUITTANCE** : identifiant unique par quittance. Règle : **IDENTIFIANT_POLICE + "Q" + numéro d’échéance** (ex. première échéance = `Quote.reference` + `Q1`, puis `Q2`, `Q3`, `Q4`…).
- **GARANTIE** : une seule valeur pour ce bordereau : **"RC_RCD"**.
- **APPORTEUR** : même valeur constante que pour la Feuille 1.

---

## 4. Filtres

- **Période** (date début / date fin) : seul critère de filtrage obligatoire.
- **Pas de sélection de courtiers** : suppression du filtre “courtiers” côté UI et logique (APPORTEUR = constante).

---

## 5. Qualité attendue (responsable édition bordereau professionnel)

- **Toutes les valeurs doivent être correctement remplies** à partir des données système (Quote, Contract, PaymentSchedule, PaymentInstallment, companyData, formData, etc.).
- **Pas de champs laissés vides ou incorrects** sans raison documentée (ex. avenant non géré = vide).
- **Mapping exhaustif et documenté** : chaque colonne des deux CSV doit avoir une source identifiée et un comportement en cas de donnée manquante.

---

## 6. Colonnes cibles (rappel)

### Feuille 1 — Polices (ex. ~25+ colonnes)

AGENT ASSURÉ, IDENTIFIANT_POLICE, DATE_SOUSCRIPTION, DATE_EFFET_CONTRAT, DATE_FIN_CONTRAT, NUMERO_AVENANT, MOTIF_AVENANT, DATE_EFFET_AVENANT, DATE_DEMANDE, STATUT_POLICE, DATE_STAT_POLICE, MOTIF_STATUT, TYPE_CONTRAT, COMPAGNIE, NOM_ENTREPRISE_ASSURE, SIREN, ACTIVITÉ, ADRESSE_RISQUE, VILLE_RISQUE, CODE_POSTAL_RISQUE, CA_ENTREPRISE, EFFECTIF_ENTREPRISE, CODE_NAF, LIBELLÉ_ACTIVITÉ (x8), POIDS_ACTIVITÉ (x8).

### Feuille 2 — Quittances

APPORTEUR, IDENTIFIANT_POLICE, NUMERO_AVENANT, IDENTIFIANT_QUITTANCE, DATE_EMISSION_QUITTANCE, DATE_EFFET_QUITTANCE, DATE_FIN_QUITTANCE, DATE_ENCAISSEMENT, STATUT_QUITTANCE, GARANTIE, PRIME_TTC, PRIME_HT, TAXES, TAUX_COMMISSIONS, COMMISSIONS, MODE_PAIEMENT.

---

## 7. Écarts à corriger dans l’epic / les stories

| Point | Avant (epic/stories) | Après (scope clarifié) |
|-------|----------------------|-------------------------|
| Nombre de fichiers | 1 CSV (36 colonnes) | 2 CSV (polices + quittances) |
| Filtre courtiers | Multi-sélect courtiers | Supprimé ; APPORTEUR = constante |
| Données Feuille 1 | Contrats filtrés par échéance | Contrats + quotes ACCEPTED ; une ligne = une police |
| Données Feuille 2 | Absent | Une ligne = une échéance ; IDENTIFIANT_QUITTANCE = IDENTIFIANT_POLICE + Q1/Q2… |
| Paires activités | Jusqu’à 8 (déjà ok) | Exactement 8 paires |
| Qualité | Prévisualisation + édition manuelle | Mapping exhaustif ; valeurs correctes par défaut ; édition pour correction ponctuelle |

---

*Document rédigé par Sarah (PO) à partir des réponses utilisateur — février 2025.*
