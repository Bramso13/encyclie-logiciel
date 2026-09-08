# Recette interne RETOURS-3 — UX admin + courtier

Viewport : **1366×768**. Sans assistance.

## Administrateur

1. Ouvrir `/login` — labels visibles, logo Encyclie, se connecter.
2. Tableau de bord : header noir, rôle « Administrateur », KPI dossiers = total API.
3. Onglets défilent horizontalement (Dossiers, Courtiers, Paiements en retard, Bordereaux, Import, etc.).
4. Dossiers : rechercher un nom, pagination 25 par défaut, actions « Ouvrir / Supprimer » visibles sans scroller en bas à droite.
5. Paiements en retard : « Envoyer un rappel » / « Marquer comme réglé » visibles.
6. Liens header : Bordereaux, Import des paiements, Modifier un échéancier.
7. Ouvrir un dossier : onglets défilent, libellés avec accents (Échéancier, Étude de dossier).
8. Générer un document (lettre / appel de prime) depuis le dossier.
9. Se déconnecter.

## Courtier

1. Se connecter.
2. Tableau de bord « Espace courtier » — créer une demande de devis.
3. Retrouver un dossier (recherche nom / SIRET / référence).
4. Ouvrir le dossier : suivre offre / documents / messages. Pas d’onglet Bordereau.
5. Se déconnecter.

## Non-régression stories 1 et 2

- Compteurs KPI = totaux API, pas « 10/10 » de page.
- Recherche par nom d’assuré.
- Pagination 25 par défaut, choix 10/25/50/100.
- Pas de recodage NAF / calcul / PDF métier.

## Auth

- `/register` explique l’invitation (plus d’écran cassé).
- Mot de passe oublié / réinitialisation / invitation : erreurs en français métier.

## Exécution interne (2026-09-07)

Navigateur local, `http://localhost:3000`, surface crème + bouton orange `#F49301`.

| Étape | Résultat |
| ----- | -------- |
| `/login` — labels, logo, bouton « Se connecter » | OK |
| Identifiants fictifs → bandeau « Identifiants incorrects… » | OK |
| `/register` — inscription sur invitation uniquement | OK |
| `/forgot-password` — formulaire + retour connexion | OK |
| `/reset-password` et `/auth/setup-account` | Alignés AuthLayout (lien incomplet géré) |
| Parcours admin connecté 1366×768 | **Non exécuté** — pas de compte de recette dans la session |
| Parcours courtier connecté 1366×768 | **Non exécuté** — idem |

La recette bi-rôle connectée reste à faire avec un administrateur et un courtier réels (checklist ci-dessus).
