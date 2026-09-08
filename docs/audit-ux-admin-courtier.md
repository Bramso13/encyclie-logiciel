# Audit UX — espaces admin et courtier

**Story :** RETOURS-3  
**Date :** 2026-09-07  
**Viewport de référence :** 1366×768  
**Hors scope :** `ClientScreen` (rôle assuré), routes API, mise en page PDF.

Direction retenue : **refined / utilitarian** — simple, explicite, vocabulaire assurance, actions à l’infinitif. Charte : orange `#F49301`, noir, blanc (logo `public/couleur_1.png`).

---

## Inventaire des écrans

| Zone | Fichier | Lignes (approx.) | Audité |
| ---- | ------- | ---------------- | ------ |
| Shell | `src/app/layout.tsx` | 40 | [x] |
| Shell | `src/app/dashboard/layout.tsx` | 15 | [x] |
| Shell | `src/app/dashboard/page.tsx` | 89 | [x] |
| Admin | `src/app/dashboard/AdminScreen.tsx` | 3 502 | [x] |
| Admin | `src/components/admin/ProductConfigTab.tsx` | 2 201 | [x] |
| Admin | `src/components/admin/CorrespondanceTab.tsx` | 540 | [x] |
| Admin | `src/components/admin/EcartsMontantsTab.tsx` | 211 | [x] |
| Admin | `src/app/admin/bordereaux/page.tsx` | 1 002 | [x] |
| Admin | `src/app/admin/import-payments/page.tsx` | 719 | [x] |
| Admin | `src/app/modifier_echeancier/page.tsx` | 1 934 | [x] |
| Courtier | `src/app/dashboard/BrokerScreen.tsx` | 749 | [x] |
| Dossier | `src/components/quotes/QuoteForm.tsx` | 1 240 | [x] |
| Dossier | `src/components/quotes/QuotesList.tsx` | 314 | [x] |
| Dossier | `src/components/quotes/QuoteValidationPage.tsx` | 603 | [x] |
| Dossier | `src/components/quotes/QuoteSuccessPage.tsx` | 560 | [x] |
| Dossier | `src/components/quotes/ActivityBreakdown.tsx` | 383 | [x] |
| Dossier | `src/components/quotes/LossHistoryField.tsx` | 115 | [x] |
| Dossier | `src/components/quotes/MultiSelect.tsx` | 137 | [x] |
| Dossier | `src/app/quotes/[id]/page.tsx` | 1 011 | [x] |
| Dossier | `src/app/quotes/tabs/ResumeTab.tsx` | 707 | [x] |
| Dossier | `src/app/quotes/tabs/FormDataTab.tsx` | 588 | [x] |
| Dossier | `src/app/quotes/tabs/CalculationTab.tsx` | 2 441 | [x] |
| Dossier | `src/app/quotes/tabs/LetterTab.tsx` | 267 | [x] |
| Dossier | `src/app/quotes/tabs/PieceJointeTab.tsx` | 977 | [x] |
| Dossier | `src/app/quotes/tabs/OffreTab.tsx` | 1 692 | [x] |
| Dossier | `src/app/quotes/tabs/PremiumCallTab.tsx` | 1 269 | [x] |
| Dossier | `src/app/quotes/tabs/AppelDePrimeTab.tsx` | 1 217 | [x] |
| Dossier | `src/app/quotes/tabs/ContratTab.tsx` | 208 | [x] |
| Dossier | `src/app/quotes/tabs/AggravationTab.tsx` | 130 | [x] |
| Dossier | `src/app/quotes/tabs/BordereauTab.tsx` | 2 590 | [x] |
| Dossier | `src/app/quotes/tabs/ChatTab.tsx` | 211 | [x] |
| Dossier | `src/app/quotes/tabs/BrokerCommissionsTab.tsx` | 275 | [x] |
| Modales | `src/components/modals/AddBrokerModal.tsx` | 252 | [x] |
| Modales | `src/components/modals/ApproveOfferModal.tsx` | 205 | [x] |
| Messages | `src/components/messages/MessageComposer.tsx` | 169 | [x] |
| Auth | `src/app/login/page.tsx` | 153 | [x] |
| Auth | `src/app/register/page.tsx` | 238 (cassé) | [x] |
| Auth | `src/app/forgot-password/page.tsx` | 142 | [x] |
| Auth | `src/app/reset-password/page.tsx` | 245 | [x] |
| Auth | `src/app/auth/setup-account/page.tsx` | 412 | [x] |

---

## Frictions classées

### Bloquant

| ID | Friction | Écrans |
| -- | -------- | ------ |
| B1 | Barre d’onglets admin (10) sans défilement — onglets hors viewport | AdminScreen |
| B2 | Barre d’onglets dossier (13) sans défilement — Bordereau / Chat / Commissions invisibles à 1366×768 | quotes/[id] |
| B3 | Page `/register` réduite à un texte brut (formulaire commenté) | register |
| B4 | Tableaux larges sans colonne d’actions collée — actions hors écran après scroll horizontal | AdminScreen, modifier_echeancier, overdue, bordereaux |
| B5 | Compteurs trompeurs : KPI devis = longueur de la page, commissions courtier hardcodées à 0 | AdminScreen, BrokerScreen |

### Gênant

| ID | Friction | Écrans |
| -- | -------- | ------ |
| G1 | Rôle affiché en enum (`ADMIN`, `BROKER`) | dashboard |
| G2 | Pas de shell partagé — nav dupliquée (dashboard vs échéancier) | dashboard, modifier_echeancier |
| G3 | Double chrome quand bordereaux / import sont embarqués (`min-h-screen`) | AdminScreen + admin pages |
| G4 | Recherche devis limitée à la page courante, libellé peu clair | AdminScreen quotes |
| G5 | Statuts / types documents en anglais brut | Ecarts, échéancier, PieceJointe, versions |
| G6 | Feedback via `alert()` (dizaines d’occurrences) | Admin, onglets dossier, ProductConfig |
| G7 | Labels camelCase / « Pappers » / « JSON » / « dry-run » / « Token » | QuoteForm, QuoteValidation, login, import |
| G8 | Palette indigo vs bleu `#1e40af` vs gradients violet | QuotesList, CalculationTab |
| G9 | Geist chargé puis annulé par `body { font-family: Arial }` | globals.css |
| G10 | Onglets Portefeuille / Commissions « bientôt » + FAB aide vide | BrokerScreen |
| G11 | Actions « Modifier » / « Voir détails » sans handler | courtiers, messages |
| G12 | Règles mot de passe incohérentes (8 chars vs majuscule+chiffre+spécial) | reset vs setup-account |
| G13 | Stepper formulaire sans retour à la ligne | QuoteForm |
| G14 | Estimation prime fallback `companyName.length * 10` | QuoteSuccessPage |

### Cosmétique

| ID | Friction | Écrans |
| -- | -------- | ------ |
| C1 | Accents manquants (« Echeancier », « Cree le », « Offre prete ») | dossier |
| C2 | Emoji 🎉 empty state paiements | AdminScreen |
| C3 | Fallback Suspense « Loading... » | layout |
| C4 | Inputs `color: black !important` | globals.css |
| C5 | FAB `animate-pulse` / `animate-bounce` | BrokerScreen |

---

## Patterns cibles (cette story)

1. **Tableau standard** : filtres au-dessus, pagination (défaut 25, choix 10/25/50/100), compteur = total API, actions collées à droite.
2. **Onglets** : défilement horizontal, libellés métier, pas d’icône obligatoire.
3. **Feedback** : toasts FR à la place des `alert()` ; empty states actionnables ; spinner seulement si chargement > 300 ms.
4. **Shell** : header noir + logo, rôle traduit, liens admin explicites (tableau de bord, bordereaux, import, échéancier).
5. **Auth** : mêmes tokens, labels visibles (pas `sr-only` seuls), erreurs métier.

---

## Notes métier (hors story — ne pas corriger ici)

- QuoteValidation : `validationNotes` non envoyées aux actions.
- BrokerScreen commissions : pas d’API (TODO existant).
- QuoteSuccessPage : fallback d’estimation trompeur (bug métier).
- Incohérence règle « activités 1–5 » vs code 1–8 dans ActivityBreakdown.
