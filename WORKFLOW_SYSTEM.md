# Système de Workflow - Documentation

## Vue d'ensemble

Le système de workflow a été implémenté dans l'onglet "Résumé" de la page des devis. Il permet aux administrateurs de créer et gérer des étapes personnalisées pour chaque devis, avec un système de messaging intégré et des formulaires dynamiques.

## Fonctionnalités implémentées

### 1. Modèles de base de données
- **WorkflowStep** : Étapes principales du workflow
- **StepInput** : Champs dynamiques pour chaque étape
- **StepMessage** : Messages entre admin et broker
- **StepMessageAttachment** : Pièces jointes pour les messages
- **StepTemplate** : Templates réutilisables d'étapes

### 2. Interface Admin
- **WorkflowTimeline** : Timeline visuelle des étapes avec drag & drop
- **StepEditorModal** : Éditeur complet pour créer/modifier les étapes
- **StepMessagingPanel** : Interface de messaging intégrée
- **AdminWorkflowManager** : Composant principal de gestion

### 3. Interface Broker
- **BrokerWorkflowExecutor** : Interface d'exécution des étapes
- **StepInputForm** : Formulaires dynamiques basés sur la configuration
- **BrokerWorkflowExecutor** : Composant principal pour les brokers

### 4. Gestion d'état
- **useWorkflowStore** : Store Zustand pour la gestion de l'état
- Types TypeScript complets pour toutes les interfaces

## Utilisation

### Pour les Administrateurs

1. **Accéder au workflow** : Aller dans l'onglet "Résumé" d'un devis
2. **Créer une étape** : Cliquer sur "Ajouter une étape"
3. **Configurer l'étape** :
   - Titre et description
   - Champs requis (texte, sélection, date, fichier, etc.)
   - Assignation à un broker
   - Date d'échéance
4. **Utiliser les templates** : Sélectionner un template prédéfini
5. **Gérer les messages** : Communiquer avec les brokers via l'interface intégrée

### Pour les Brokers

1. **Voir les étapes** : Timeline des étapes dans l'onglet "Résumé"
2. **Exécuter les étapes** : Remplir les formulaires dynamiques
3. **Communiquer** : Poser des questions via le système de messaging
4. **Suivre la progression** : Voir l'avancement des étapes

## Templates prédéfinis

- **Vérification documents** : Vérification des documents requis
- **Analyse des risques** : Évaluation du profil de risque
- **Validation commerciale** : Validation des conditions commerciales

## Types de champs supportés

- **TEXT** : Champ texte simple
- **TEXTAREA** : Zone de texte multiligne
- **SELECT** : Liste déroulante avec options
- **DATE** : Sélecteur de date
- **FILE** : Upload de fichier
- **CHECKBOX** : Case à cocher

## Statuts des étapes

- **PENDING** : En attente
- **ACTIVE** : En cours
- **COMPLETED** : Terminé
- **SKIPPED** : Ignoré

## Types de messages

- **ADMIN_INSTRUCTION** : Instruction de l'admin
- **BROKER_QUESTION** : Question du broker
- **BROKER_RESPONSE** : Réponse du broker
- **SYSTEM_NOTIFICATION** : Notification système

## Prochaines étapes

### API Endpoints à implémenter
- `GET /api/workflow/steps/:quoteId` - Récupérer les étapes
- `POST /api/workflow/steps` - Créer une étape
- `PUT /api/workflow/steps/:id` - Modifier une étape
- `DELETE /api/workflow/steps/:id` - Supprimer une étape
- `POST /api/workflow/steps/:id/messages` - Ajouter un message
- `POST /api/workflow/steps/:id/inputs` - Soumettre des inputs
- `PUT /api/workflow/steps/reorder` - Réordonner les étapes

### Fonctionnalités avancées
- Notifications en temps réel
- Historique des modifications
- Export des données de workflow
- Intégration avec le système de notifications existant

## Structure des fichiers

```
src/
├── components/workflow/
│   ├── AdminWorkflowManager.tsx
│   ├── BrokerWorkflowExecutor.tsx
│   ├── WorkflowTimeline.tsx
│   ├── StepEditorModal.tsx
│   ├── StepMessagingPanel.tsx
│   └── StepInputForm.tsx
├── lib/
│   ├── types/workflow.ts
│   └── stores/workflow-store.ts
└── app/quotes/[id]/page.tsx (modifié)
```

## Migration de base de données

La migration `20250911205117_add_workflow_system` a été créée et appliquée avec succès. Elle ajoute toutes les tables nécessaires au système de workflow.

## Notes de développement

- Tous les composants utilisent des données de test pour le développement
- Les appels API sont marqués avec "TODO" et doivent être implémentés
- Le système est entièrement fonctionnel côté interface
- La gestion d'état est complète avec Zustand
- Les types TypeScript sont complets et cohérents
