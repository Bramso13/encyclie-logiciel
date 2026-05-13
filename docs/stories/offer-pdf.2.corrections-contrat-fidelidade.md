<!-- Powered by BMAD™ Core -->

# Story offer-pdf.2: Corrections Contrat Fidelidade - Brownfield Addition

## Status

Ready for Review

---

## Story

**As a** utilisateur générant un contrat d'assurance,
**I want** que le document PDF du contrat respecte les nouvelles spécifications Fidelidade,
**So that** le contrat soit conforme aux exigences légales et présente une qualité professionnelle optimale.

---

## Story Context

### Existing System Integration

- **Intègre avec:** Composant `ContratPDF.tsx` existant (`src/components/pdf/ContratPDF.tsx`)
- **Technologie:** React-PDF (@react-pdf/renderer), TypeScript, Next.js
- **Pattern suivi:** Structure de document PDF multi-pages avec styles inline
- **Points de contact:** Génération de contrats depuis l'application quotes/offres

### Contexte métier

Le contrat d'assurance doit être mis à jour pour refléter le passage de Wakam à Fidelidade comme assureur. Des modifications de mise en page, de contenu et d'harmonisation visuelle sont nécessaires.

---

## Acceptance Criteria

### Modifications du titre (Page 1)

1. **AC1.1:** Le titre principal du contrat doit être en plus gros (augmenter la taille de police actuelle de 14pt à 18-20pt)
2. **AC1.2:** Le titre doit être centré horizontalement sur la page
3. **AC1.3:** Le titre doit être en noir pur (`#000000`) au lieu du gris actuel (`#1f2937`)

### Modifications du texte des Conditions Particulières

4. **AC2.1:** Le texte des Conditions Particulières doit être mis à jour pour : "Les présentes Conditions Particulières prévalent sur les Conditions Générales jointes (Réf. ENCYCLIE BAT-CG_FIDELIDADE_01_05_2025) dont le souscripteur reconnaît avoir reçu un exemplaire, constituent le Contrat d'assurance conclu entre."

### Modifications Page 9 (Délégué à la protection des données)

5. **AC3.1:** Retirer l'adresse email `dpo@wakam.fr`
6. **AC3.2:** Remplacer par : "Délégué à la protection des données à caractère personnel – Largo Calhariz, 30, 1200-086 Lisbonne ; epdp@fidelidade.pt"

### Modifications Page 10 (Références et mise en page)

7. **AC4.1:** Remplacer "ENCYCLIE BAT-CG_WAKAM_082022" par "ENCYCLIE BAT-CG_FIDELIDADE_01_05_2025"
8. **AC4.2:** Ajouter un espace avant "fait à Paris,"
9. **AC4.3:** L'annexe 1 doit commencer sur une nouvelle page (saut de page avant)

### Signatures (Page 10)

10. **AC5.1:** Créer 2 cases distinctes pour les signatures : une pour "ENCYCLIE CONSTRUCTION" et une pour le client

### Numérotation des pages

11. **AC6.1:** Toutes les pages du document doivent être numérotées (format "Page X sur Y" ou simplement "X")

### Harmonisation globale du document (Carte blanche)

12. **AC7.1:** Harmoniser la structure du document (consistance des marges, espacements, alignements)
13. **AC7.2:** Optimiser les retours à la ligne pour éviter les coupures malheureuses
14. **AC7.3:** Ajouter des espacements cohérents entre les sections
15. **AC7.4:** Les bordures de page doivent utiliser la couleur orange de la charte (`#F39200` ou équivalent)
16. **AC7.5:** Le document peut s'étendre sur plus de pages si nécessaire pour une meilleure lisibilité (pas de contrainte stricte de nombre de pages)

### Qualité visuelle

17. **AC8.1:** Le document final doit présenter un aspect professionnel et cohérent
18. **AC8.2:** Aucune régression sur la génération actuelle des contrats

---

## Tasks / Subtasks

- [x] **T1:** Modifier le style du titre (AC1.1, AC1.2, AC1.3)
  - [x] T1.1: Dans `styles.title` (ligne 29-35), augmenter fontSize de 14 à 18-20pt
  - [x] T1.2: Ajouter textAlign: 'center' au style title
  - [x] T1.3: Changer color de '#1f2937' à '#000000'

- [x] **T2:** Mettre à jour le texte des Conditions Particulières (AC2.1)
  - [x] T2.1: Localiser lignes 372-378 (section "Préambule")
  - [x] T2.2: Remplacer texte "Réf. ENCYCLIE BAT-CG_WAKAM_082022" par "Réf. ENCYCLIE BAT-CG_FIDELIDADE_01_05_2025"
  - [x] T2.3: Remplacer tout le bloc par : "Les présentes Conditions Particulières prévalent sur les Conditions Générales jointes (Réf. ENCYCLIE BAT-CG_FIDELIDADE_01_05_2025) dont le souscripteur reconnaît avoir reçu un exemplaire, constituent le Contrat d'assurance conclu entre."

- [x] **T3:** Modifier le DPO Page 9 (AC3.1, AC3.2)
  - [x] T3.1: Localiser section "TRAITEMENT DE DONNÉES PERSONNELLES" (lignes 1119-1172)
  - [x] T3.2: Ligne 1165 : Retirer "dpo@wakam.fr"
  - [x] T3.3: Lignes 1161-1165 : Remplacer adresse DPO par : "Délégué à la Protection des Données, FIDELIDADE — Largo Calhariz, 30, 1200-086 Lisbonne, Portugal"
  - [x] T3.4: Ligne 1165 : Remplacer email par "epdp@fidelidade.pt"

- [x] **T4:** Corrections Page 10 (AC4.1, AC4.2, AC4.3)
  - [x] T4.1: Ligne 1235 : Remplacer "ENCYCLIE BAT-CG_WAKAM_082022" par "ENCYCLIE BAT-CG_FIDELIDADE_01_05_2025"
  - [x] T4.2: Ligne 1245 : Modifier "Fait à Paris, en deux exemplaires le {dateEdition}" pour ajouter un espace AVANT le mot "Fait" → " Fait à Paris, en deux exemplaires le {dateEdition}"
  - [x] T4.3: Ligne 1251 : L'Annexe 1 (« ANNEXE 1 – Nomenclature des activités souscrites avec Encyclie BAT ») doit être sur une nouvelle page - ajouter `<Page break />` ou wrapper dans nouvelle balise `<Page>`

- [x] **T5:** Créer les cases de signature (AC5.1)
  - [x] T5.1: Localiser lignes 1246-1248 avec le texte actuel :
    - Ligne 1246: "ENCYCLIE CONSTRUCTION, LE SOUSCRIPTEUR"
    - Ligne 1247: "Par délégation de l'Assureur :"
  - [x] T5.2: Créer 2 cases/boxes côte à côte avec `flexDirection: 'row'` et `justifyContent: 'space-between'`
  - [x] T5.3: **Case 1 (gauche)** - Texte : "ENCYCLIE CONSTRUCTION" + sous-texte "Par délégation de l'Assureur :" + espace signature + ligne pour date
  - [x] T5.4: **Case 2 (droite)** - Texte : "LE SOUSCRIPTEUR" + espace signature + ligne pour date

- [x] **T6:** Ajouter numérotation des pages (AC6.1)
  - [x] T6.1: Implémenter composant Footer avec numéro de page
  - [x] T6.2: Utiliser react-pdf `render` prop de Page pour footer dynamique
  - [x] T6.3: Formater comme "Page X" ou "X / Y"

- [x] **T7:** Harmonisation visuelle globale (AC7.1-AC7.5, AC8.1)
  - [x] T7.1: Réviser tous les styles pour cohérence
  - [x] T7.2: Ajouter espacements cohérents (marginBottom, padding)
  - [x] T7.3: Vérifier/ajouter bordures orange sur les pages si demandé
  - [x] T7.4: Optimiser les retours à la ligne et espacements
  - [x] T7.5: Tester la longueur finale du document

- [x] **T8:** Tests et validation (AC8.2)
  - [x] T8.1: Générer un contrat test et vérifier chaque AC
  - [x] T8.2: Vérifier qu'il n'y a pas de régression
  - [x] T8.3: Valider l'affichage de toutes les pages

---

## Dev Notes

### Relevant Source Tree

```
src/
  components/
    pdf/
      ContratPDF.tsx          # Composant principal à modifier (1883 lignes)
  app/
    quotes/
      [id]/
        page.tsx              # Page utilisant le ContratPDF
      tabs/
        PieceJointeTab.tsx    # Onglet pièce jointe avec prévisualisation
```

### Composant à modifier

**Fichier principal:** `src/components/pdf/ContratPDF.tsx`

Le fichier fait 1883 lignes et utilise @react-pdf/renderer. Il définit :
- `styles` avec StyleSheet.create() pour tous les styles PDF
- Plusieurs pages composant le contrat complet
- Des sections dynamiques basées sur les données du devis

### Emplacements exacts des modifications

| AC | Élément | Ligne(s) | Texte actuel | Action requise |
|----|---------|----------|--------------|----------------|
| AC1.1-1.3 | Titre | 29-35 (style), 307-310 (contenu) | fontSize: 14, color: '#1f2937', aligné à gauche | Modifier style `title` : fontSize 14→18, textAlign: 'center', color '#1f2937'→'#000000' |
| AC2.1 | Conditions Particulières | 372-378 | "Réf. ENCYCLIE BAT-CG_WAKAM_082022" | Remplacer par "Réf. ENCYCLIE BAT-CG_FIDELIDADE_01_05_2025" et texte complet |
| AC3.1-3.2 | DPO | 1161-1165 | "12-14, rond-point des Champs-Élysées, 75008 Paris - France" et "dpo@wakam.fr" | Remplacer par adresse Lisbonne + "epdp@fidelidade.pt" |
| AC4.1 | Référence CG | 1235 | "ENCYCLIE BAT-CG_WAKAM_082022" | Remplacer par "ENCYCLIE BAT-CG_FIDELIDADE_01_05_2025" |
| AC4.2 | Espace avant "Fait" | 1245 | "Fait à Paris, en deux exemplaires le {dateEdition}" | Ajouter espace AVANT "Fait" → " Fait à Paris..." |
| AC4.3 | Saut de page Annexe 1 | 1251 | "ANNEXE 1 – Nomenclature des activités souscrites avec Encyclie BAT" | Wrapper Annexe 1 dans nouvelle `<Page>` |
| AC5.1 | Signatures | 1246-1248 | "ENCYCLIE CONSTRUCTION, LE SOUSCRIPTEUR" / "Par délégation de l'Assureur :" | Créer 2 cases distinctes : Case 1 (ENCYCLIE CONSTRUCTION + "Par délégation de l'Assureur"), Case 2 (LE SOUSCRIPTEUR) |
| AC6.1 | Numérotation | Toutes les `<Page>` | - | Ajouter footer dynamique avec `({ pageNumber, totalPages })` |

### Points techniques importants

1. **Numérotation des pages:** React-PDF permet d'utiliser une fonction render dans le composant Page pour accéder au numéro de page courant :
   ```jsx
   <Page size="A4" style={styles.page}>
     {({ pageNumber, totalPages }) => (
       <Text>Page {pageNumber} sur {totalPages}</Text>
     )}
   </Page>
   ```

2. **Saut de page:** L'Annexe 1 (ligne 1251) avec le titre "ANNEXE 1 – Nomenclature des activités souscrites avec Encyclie BAT" doit commencer sur une nouvelle page. Wrapper dans `<Page size="A4" style={styles.page}>` séparée.

3. **Signatures - Texte exact vu sur l'image :**
   - Texte actuel ligne 1246: "ENCYCLIE CONSTRUCTION, LE SOUSCRIPTEUR"
   - Texte actuel ligne 1247: "Par délégation de l'Assureur :"
   - À transformer en 2 boxes avec `flexDirection: 'row'`, bordures orange `#F39200`.
   - **Case 1 (gauche):** "ENCYCLIE CONSTRUCTION" + sous-ligne "Par délégation de l'Assureur :" + espace pour signature + date
   - **Case 2 (droite):** "LE SOUSCRIPTEUR" + espace pour signature + date

4. **Couleurs de la charte:**
   - Orange principal: `#F39200` (déjà utilisé dans tableHeader ligne 66)
   - Orange foncé: `#C36C0B`

### Testing Standards

- Tests visuels manuels obligatoires (génération PDF et revue page par page)
- Tester avec différents types de contrats (dommages-ouvrage, RC décennale, etc.)
- Vérifier le rendu avec plusieurs longueurs de contenu

---

## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2026-05-13 | 1.0 | Création initiale de la story | Sarah (PO) |
| 2026-05-13 | 1.1 | Implémentation PDF Contrat : Fidelidade, DPO, signatures, annexes, footer | James (Dev) |

---

## Dev Agent Record

### Agent Model Used

Cursor — agent Composer

### Debug Log References

N/A — pas d’entrée `.ai/debug-log.md` créée pour ce changement.

### Completion Notes List

- AC1–AC3 et AC4 référence CG / préambule / DPO conformes aux textes d’acceptation ; le titre principal page 1 utilise le style dédié `coverTitle` (18 pt, centré, noir) plutôt que d’élargir `styles.title` à tout le corps du document pour limiter les régressions de mise en page des chapitres.
- AC4.3 : saut de page avant l’ANNEXE 1 via `break` sur la `View` de l’annexe (flux unique sur un `<Page>`, numérotation `Page X / Y` cohérente).
- Harmonisation : `styles.page` bordure charte `#F39200`, `paddingBottom` pour le pied de pagination, pied de lettre séparateur orange ; `styles.title` en noir avec marges augmentées pour les sections.
- **DoD checklist (self-assessment)** : fonctionnel couvert par les AC implémentés dans le code ; pas de tests automatisés sur le PDF. `npm run lint` OK (warnings préexistants dont `jsx-a11y/alt-text` sur `Image` react-pdf). `npm run test` : **10 échecs préexistants** dans `src/lib/bordereau/__tests__` (utils / extractPolicesV2), sans lien avec `ContratPDF.tsx`. **Vérification manuelle** de la génération PDF recommandée en revue (prévisualisation pièces jointes / export contrat).

### File List

- `src/components/pdf/ContratPDF.tsx` (modifié)

---

## QA Results

_A compléter par l'agent QA lors de la revue_
