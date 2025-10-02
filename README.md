# Encyclie Construction - CRM Assurance

![Next.js](https://img.shields.io/badge/Next.js-15.4.4-black)
![React](https://img.shields.io/badge/React-19.1.0-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)
![Prisma](https://img.shields.io/badge/Prisma-6.12.0-2D3748)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Database-316192)

Plateforme de gestion d'assurances pour les courtiers et les clients. Simplifiez la gestion des devis et contrats d'assurance avec des outils modernes et une interface collaborative.

## 📋 À propos

**Encyclie Construction** est un CRM logiciel conçu pour faciliter la gestion des devis et contrats d'assurance, ainsi que le lien entre Encyclie et ses courtiers partenaires. La plateforme permet de :

- Gérer des devis d'assurance de manière fluide et collaborative
- Suivre les contrats d'assurance et leurs échéances
- Automatiser les workflows de validation
- Centraliser la communication entre courtiers et administrateurs
- Gérer les documents et leur validation
- Suivre les paiements et les commissions

## ✨ Fonctionnalités principales

### 🔐 Gestion des utilisateurs
- **Authentification sécurisée** avec Better-Auth
- **Trois rôles** : Courtier (BROKER), Administrateur (ADMIN), Souscripteur (UNDERWRITER)
- **Invitation de courtiers** avec codes uniques
- **Profils personnalisables** avec informations d'entreprise (SIRET, adresse, etc.)
- **Réinitialisation de mot de passe** sécurisée

### 📊 Gestion des devis (Quotes)
- **Système de devis générique** compatible avec tous types de produits d'assurance
- **Statuts multiples** : Brouillon, Incomplet, Soumis, En cours, Offre prête, Accepté, Rejeté
- **Formulaires dynamiques** configurables par produit
- **Calcul automatique des primes** basé sur des règles métier
- **RC Décennale** (Responsabilité Civile Décennale) - produit phare
- **Validation multi-étapes** avec système de workflow
- **Référence unique** pour chaque devis

### 🏢 Produits d'assurance configurables
- **Système flexible** permettant de créer n'importe quel type d'assurance
- **Configuration JSON** pour les formulaires, règles de tarification et documents requis
- **Étapes multiples** dans les formulaires (stepper)
- **Mapping de champs** pour l'intégration avec des systèmes externes
- **Gestion des documents requis** par type de produit

### 📝 Système de workflow avancé
- **Étapes personnalisées** pour chaque devis
- **Formulaires dynamiques** avec validation
- **Assignation de tâches** aux courtiers avec dates d'échéance
- **Timeline visuelle** avec drag & drop pour réorganiser
- **Templates réutilisables** d'étapes
- **Messagerie intégrée** pour chaque étape
- **Types de champs supportés** : Texte, Zone de texte, Liste déroulante, Date, Fichier, Case à cocher

### 💬 Système de messagerie
- **Chat en temps réel** entre courtiers et administrateurs
- **Messages par devis** pour une communication contextualisée
- **Pièces jointes** supportées
- **Notifications de messages non lus**
- **Historique complet** des conversations

### 📄 Gestion documentaire
- **Upload de documents** par les courtiers
- **Validation par les administrateurs**
- **Types de documents** : KBIS, Bilans financiers, Attestations, Contrats signés
- **Demandes de documents supplémentaires** par les admins
- **Téléchargement sécurisé** des documents
- **Stockage via Supabase**

### 💰 Gestion des paiements
- **Échéanciers personnalisés** par devis
- **Paiements multiples** : Comptant, Chèque, Virement, Carte, Prélèvement SEPA
- **Suivi des échéances** avec notifications
- **Validation des paiements** par les administrateurs
- **Calculs automatiques** : HT, TVA, TTC
- **Historique des transactions**
- **Gestion des relances** automatiques

### 📜 Gestion des contrats
- **Conversion automatique** devis → contrat
- **Statuts multiples** : Actif, Suspendu, Expiré, Annulé
- **Génération de documents** : Attestations, Conditions particulières, Note de couverture
- **Gestion des renouvellements** avec notifications
- **Suivi des commissions** pour les courtiers

### 🔔 Système de notifications
- **Notifications en temps réel** pour les événements importants
- **Types** : Expiration de contrat, Paiement dû, Offre prête, Renouvellement
- **Notifications programmées**
- **Compteur de notifications non lues**
- **Marquage comme lu/non lu**

### 📊 Tableaux de bord
- **Dashboard courtier** : Vue d'ensemble des devis et contrats
- **Dashboard admin** : Gestion globale de la plateforme
- **Statistiques** et indicateurs de performance
- **Listes filtrables** et triables

### 📧 Système d'emails
- **Envoi automatique** d'invitations aux courtiers
- **Lettres d'intention** générées automatiquement
- **Notifications par email** pour les événements importants
- **Templates personnalisables**

### 🎨 Génération de PDF
- **Documents officiels** : Lettres d'intention, Appels de prime
- **Design professionnel** avec React-PDF
- **Génération côté serveur**
- **Téléchargement direct**

## 🛠️ Stack technique

### Frontend
- **Next.js 15.4.4** - Framework React avec App Router
- **React 19.1.0** - Bibliothèque UI
- **TypeScript 5** - Typage statique
- **Tailwind CSS 4** - Framework CSS utilitaire
- **Zustand 5** - Gestion d'état
- **Lucide React** - Icônes
- **@dnd-kit** - Drag & drop
- **@react-pdf/renderer** - Génération de PDF

### Backend
- **Next.js API Routes** - Endpoints REST
- **Prisma 6.12.0** - ORM
- **PostgreSQL** - Base de données
- **Better-Auth 1.3.4** - Authentification
- **Zod 4** - Validation de schémas
- **bcryptjs** - Hachage de mots de passe
- **Nodemailer** - Envoi d'emails

### Stockage
- **Supabase** - Stockage de fichiers
- **Système local** - Documents et pièces jointes

### Intégrations
- **API Pappers** - Récupération d'informations d'entreprise (SIRET)

## 🚀 Installation et démarrage

### Prérequis

- Node.js 20+
- PostgreSQL
- Compte Supabase (pour le stockage de fichiers)

### Installation

```bash
# Cloner le repository
git clone <repository-url>
cd dune-assurances

# Installer les dépendances
npm install

# Configurer les variables d'environnement
cp .env.example .env
# Éditer .env avec vos configurations
```

### Configuration

Créez un fichier `.env` à la racine du projet avec les variables suivantes :

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/encyclie"

# Authentication
BETTER_AUTH_SECRET="your-secret-key"
BETTER_AUTH_URL="http://localhost:3000"

# Supabase
NEXT_PUBLIC_SUPABASE_URL="your-supabase-url"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-supabase-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

# Email (Nodemailer)
EMAIL_HOST="smtp.example.com"
EMAIL_PORT="587"
EMAIL_USER="your-email@example.com"
EMAIL_PASSWORD="your-password"
EMAIL_FROM="noreply@example.com"

# API Keys
PAPPERS_API_KEY="your-pappers-api-key"
```

### Migration de la base de données

```bash
# Exécuter les migrations
npx prisma migrate deploy

# (Optionnel) Peupler la base avec des données de test
npm run db:seed
```

### Lancer l'application

```bash
# Mode développement
npm run dev

# Build de production
npm run build

# Lancer la production
npm start
```

L'application sera accessible sur [http://localhost:3000](http://localhost:3000)

## 📁 Structure du projet

```
dune-assurances/
├── prisma/
│   ├── migrations/          # Migrations de base de données
│   ├── schema.prisma        # Schéma Prisma
│   └── seed.ts             # Script de peuplement
├── public/                  # Fichiers statiques
├── src/
│   ├── app/
│   │   ├── api/            # API Routes
│   │   │   ├── auth/       # Authentification
│   │   │   ├── quotes/     # Gestion des devis
│   │   │   ├── products/   # Produits d'assurance
│   │   │   ├── workflow/   # Système de workflow
│   │   │   ├── notifications/ # Notifications
│   │   │   ├── brokers/    # Gestion des courtiers
│   │   │   └── ...
│   │   ├── dashboard/      # Dashboard
│   │   ├── quotes/         # Pages des devis
│   │   ├── login/          # Connexion
│   │   ├── register/       # Inscription
│   │   └── layout.tsx      # Layout principal
│   ├── components/
│   │   ├── admin/          # Composants admin
│   │   ├── quotes/         # Composants de devis
│   │   ├── workflow/       # Composants de workflow
│   │   ├── messages/       # Messagerie
│   │   ├── modals/         # Modales
│   │   └── pdf/            # Génération PDF
│   └── lib/
│       ├── auth.ts         # Configuration auth
│       ├── auth-client.ts  # Client auth
│       ├── prisma.ts       # Client Prisma
│       ├── supabase-client.ts # Client Supabase
│       ├── nodemailer.ts   # Configuration email
│       ├── stores/         # Stores Zustand
│       ├── types/          # Types TypeScript
│       ├── tarificateurs/  # Calculateurs de prix
│       └── validations.ts  # Schémas de validation
├── web-bundles/            # Bundles web (agents, packs)
├── WORKFLOW_SYSTEM.md      # Documentation du workflow
└── README.md
```

## 🗄️ Modèle de données

### Utilisateurs et authentification
- **User** - Utilisateurs (courtiers, admins, souscripteurs)
- **BrokerProfile** - Profils des courtiers avec code unique
- **Session** - Sessions d'authentification
- **Account** - Comptes liés (OAuth, credentials)
- **Verification** - Vérifications email
- **PasswordReset** - Réinitialisations de mot de passe
- **BrokerInvitation** - Invitations de courtiers

### Gestion des devis et contrats
- **InsuranceProduct** - Produits d'assurance configurables
- **Quote** - Devis d'assurance
- **QuoteDocument** - Documents liés aux devis
- **DocumentRequest** - Demandes de documents supplémentaires
- **InsuranceContract** - Contrats d'assurance
- **ContractDocument** - Documents liés aux contrats

### Workflow et communication
- **WorkflowStep** - Étapes de workflow
- **StepInput** - Champs dynamiques des étapes
- **StepMessage** - Messages dans les étapes
- **StepMessageAttachment** - Pièces jointes
- **StepTemplate** - Templates d'étapes
- **QuoteMessage** - Messages de chat par devis
- **QuoteMessageAttachment** - Pièces jointes des messages

### Paiements
- **PaymentSchedule** - Échéanciers de paiement
- **PaymentInstallment** - Échéances individuelles
- **PaymentTransaction** - Transactions de paiement

### Commissions et notifications
- **Commission** - Commissions des courtiers
- **Notification** - Notifications système

### Legacy (ancienne structure)
- **Project** - Projets (ancien système)
- **Client** - Clients
- **Contract** - Contrats (ancien modèle)
- **Document** - Documents (ancien modèle)
- **Message** - Messages (ancien modèle)
- **Questionnaire** - Questionnaires

## 👥 Rôles utilisateurs

### BROKER (Courtier)
- Créer et soumettre des devis
- Uploader des documents
- Communiquer avec les administrateurs
- Voir et gérer ses propres devis et contrats
- Compléter les étapes de workflow
- Gérer les paiements de ses clients

### ADMIN (Administrateur)
- Voir et gérer tous les devis
- Valider ou rejeter des devis
- Créer et configurer des produits d'assurance
- Gérer les workflows et les étapes
- Valider les documents
- Inviter et gérer les courtiers
- Gérer les paiements et les commissions
- Envoyer des notifications
- Demander des documents supplémentaires

### UNDERWRITER (Souscripteur)
- Analyser les risques
- Participer à la validation des devis
- Communiquer avec les courtiers

## 🔒 Sécurité

- **Authentification robuste** avec Better-Auth
- **Hachage des mots de passe** avec bcryptjs
- **Validation des données** avec Zod
- **Middleware de protection** des routes
- **Gestion des sessions** sécurisée
- **Contrôle d'accès basé sur les rôles** (RBAC)
- **Sanitization des inputs** utilisateur
- **Protection CSRF**

## 📱 Responsive Design

L'application est entièrement responsive et optimisée pour :
- Desktop (1920px+)
- Laptop (1024px+)
- Tablet (768px+)
- Mobile (320px+)

## 🌐 API Endpoints principaux

### Authentification
- `POST /api/auth/sign-in` - Connexion
- `POST /api/auth/sign-up` - Inscription
- `POST /api/auth/verify-invitation-token` - Vérifier invitation
- `POST /api/auth/complete-broker-setup` - Compléter profil courtier

### Devis
- `GET /api/quotes` - Liste des devis
- `POST /api/quotes` - Créer un devis
- `GET /api/quotes/:id` - Détails d'un devis
- `PUT /api/quotes/:id` - Modifier un devis
- `DELETE /api/quotes/:id` - Supprimer un devis
- `POST /api/quotes/:id/documents` - Uploader document
- `GET /api/quotes/:id/messages` - Messages du devis
- `POST /api/quotes/:id/messages` - Envoyer un message

### Workflow
- `GET /api/workflow/steps?quoteId=:id` - Étapes d'un devis
- `POST /api/workflow/steps` - Créer une étape
- `PUT /api/workflow/steps/:id` - Modifier une étape
- `DELETE /api/workflow/steps/:id` - Supprimer une étape
- `POST /api/workflow/steps/:id/messages` - Message dans étape
- `POST /api/workflow/steps/:id/inputs` - Soumettre inputs
- `PUT /api/workflow/steps/reorder` - Réordonner étapes
- `GET /api/workflow/templates` - Templates d'étapes
- `POST /api/workflow/templates` - Créer un template

### Produits
- `GET /api/products` - Liste des produits
- `POST /api/products` - Créer un produit
- `GET /api/products/:id` - Détails d'un produit
- `PUT /api/products/:id` - Modifier un produit
- `DELETE /api/products/:id` - Supprimer un produit

### Paiements
- `GET /api/quotes/:id/payment-schedule` - Échéancier
- `POST /api/quotes/:id/payment-schedule` - Créer échéancier
- `GET /api/payment-installments` - Liste des échéances
- `POST /api/payment-installments/:id/mark-paid` - Marquer payé

### Notifications
- `GET /api/notifications` - Liste des notifications
- `GET /api/notifications/unread-count` - Compteur non lues
- `POST /api/notifications/:id/read` - Marquer comme lue

### Courtiers
- `GET /api/brokers` - Liste des courtiers
- `POST /api/brokers` - Inviter un courtier
- `GET /api/brokers/code` - Générer code unique

### Utilisateurs
- `GET /api/users` - Liste des utilisateurs
- `GET /api/users/:id` - Détails d'un utilisateur
- `PUT /api/users/:id` - Modifier un utilisateur

## 🧪 Tests

```bash
# Lancer les tests (à implémenter)
npm test

# Lancer les tests en mode watch
npm run test:watch

# Coverage
npm run test:coverage
```

## 📦 Scripts disponibles

```bash
npm run dev          # Lancer en mode développement
npm run build        # Build de production
npm start            # Lancer en production
npm run lint         # Linter le code
npm run db:seed      # Peupler la base de données
```

## 🤝 Contribution

Les contributions sont les bienvenues ! Veuillez suivre ces étapes :

1. Fork le projet
2. Créer une branche pour votre fonctionnalité (`git checkout -b feature/AmazingFeature`)
3. Commit vos changements (`git commit -m 'Add some AmazingFeature'`)
4. Push vers la branche (`git push origin feature/AmazingFeature`)
5. Ouvrir une Pull Request

## 📝 Conventions de code

- Utiliser TypeScript pour tout nouveau code
- Suivre les conventions de nommage Next.js/React
- Commenter le code complexe
- Utiliser Prettier pour le formatage
- Écrire des tests pour les nouvelles fonctionnalités

## 🐛 Signaler un bug

Si vous trouvez un bug, veuillez ouvrir une issue avec :
- Description détaillée du problème
- Étapes pour reproduire
- Comportement attendu vs comportement actuel
- Screenshots si pertinent
- Informations sur votre environnement

## 📚 Documentation additionnelle

- [WORKFLOW_SYSTEM.md](./WORKFLOW_SYSTEM.md) - Documentation détaillée du système de workflow
- [Prisma Schema](./prisma/schema.prisma) - Modèle de données complet

## 🗺️ Roadmap

### À court terme
- [ ] Implémentation des tests unitaires
- [ ] Optimisation des performances
- [ ] Amélioration de l'UX mobile
- [ ] Documentation API complète

### À moyen terme
- [ ] Notifications push en temps réel
- [ ] Intégration avec d'autres assureurs
- [ ] Tableau de bord analytique avancé
- [ ] Export de données (Excel, CSV)
- [ ] Signature électronique de documents

### À long terme
- [ ] Application mobile native
- [ ] Intelligence artificielle pour l'analyse de risques
- [ ] Intégration comptable
- [ ] API publique pour partenaires

## 📄 Licence

Ce projet est propriétaire. Tous droits réservés.

## 👨‍💻 Équipe

Développé avec ❤️ par l'équipe Encyclie

## 📞 Support

Pour toute question ou assistance :
- Email : support@encyclie.com
- Documentation : [docs.encyclie.com](https://docs.encyclie.com)

---

**Encyclie Construction** - Simplifiez la gestion de vos assurances construction
