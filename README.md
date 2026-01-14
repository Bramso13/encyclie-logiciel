# Encyclie Construction - CRM Assurance

<div align="center">

![License](https://img.shields.io/badge/license-Private-blue)
![Next.js](https://img.shields.io/badge/Next.js-15.4-black)
![React](https://img.shields.io/badge/React-19.1-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)
![Prisma](https://img.shields.io/badge/Prisma-6.12-2D3748)

**Plateforme CRM moderne de gestion d'assurances construction pour courtiers et administrateurs**

[Fonctionnalités](#fonctionnalités) • [Technologies](#technologies) • [Installation](#installation) • [Configuration](#configuration) • [Documentation](#documentation)

</div>

---

## 📋 À propos

Encyclie Construction est une plateforme CRM complète conçue pour simplifier la gestion des assurances construction. Elle facilite la relation entre Encyclie et ses courtiers partenaires, en automatisant la gestion des devis, contrats d'assurance et commissions.

### Cas d'usage principaux

- 🏗️ **RC Décennale** : Responsabilité Civile Décennale pour les professionnels du bâtiment
- 🛡️ **RC Professionnelle** : Assurance Responsabilité Civile Professionnelle
- 🏢 **Multi-Risques** : Assurance Multi-Risques pour les entreprises de construction
- 📊 **Gestion personnalisée** : Système de produits d'assurance configurable

---

## ✨ Fonctionnalités

### 🔐 Gestion des utilisateurs

- **Authentification sécurisée** avec Better-auth
  - Connexion par email/mot de passe
  - OAuth 2.0 (Google)
  - Vérification email
  - Réinitialisation de mot de passe
- **Système multi-rôles** : Courtier, Administrateur, Souscripteur
- **Profils courtiers** avec codes uniques
- **Système d'invitation** pour nouveaux courtiers

### 📝 Gestion des devis

- **Processus de devis multi-étapes** personnalisable par produit
- **Formulaires dynamiques** configurables via JSON
- **Calcul automatique des primes** basé sur des règles métier
- **Suivi de statut complet** :
  - Brouillon → Incomplet → Soumis → En cours → Complément requis
  - Offre prête → Offre envoyée → Accepté/Rejeté/Expiré
- **Messagerie intégrée** entre courtiers et administrateurs
- **Système de demande de documents** supplémentaires
- **Upload et validation de documents** (KBIS, bilans, attestations, etc.)

### 📄 Gestion des contrats

- **Conversion automatique** devis → contrat
- **Génération de documents** :
  - Attestations d'assurance
  - Conditions particulières
  - Notes de couverture
  - Contrats complets
- **Suivi des renouvellements**
- **Alertes d'expiration** automatiques
- **Gestion des avenants**

### 💰 Gestion financière

- **Échéanciers de paiement** personnalisables
  - Paiement comptant ou fractionné
  - Périodes de validité des attestations
  - Détail des primes (RCD, Protection Juridique, Frais, Reprise)
- **Suivi des paiements** avec validation admin
- **Méthodes de paiement multiples** : Espèces, Chèque, Virement, Carte, Prélèvement SEPA
- **Gestion des commissions courtiers**
- **Relances automatiques** pour paiements en retard

### ⚙️ Système de workflow

- **Étapes personnalisées** pour chaque devis
- **Formulaires dynamiques** avec validation
- **Templates réutilisables** (Vérification documents, Analyse risques, etc.)
- **Messagerie par étape** avec pièces jointes
- **Drag & drop** pour réorganiser les étapes
- **Assignation et échéances** pour chaque étape

### 🔔 Notifications

- Expiration de contrat
- Paiements dus
- Offre prête
- Complément requis
- Renouvellement à venir
- Notifications générales

### 📊 Tableaux de bord

- **Dashboard courtier** : Mes devis, contrats, commissions
- **Dashboard admin** : Vue d'ensemble, devis en attente, validation documents
- **Statistiques** et métriques de performance

---

## 🛠 Technologies

### Frontend

- **[Next.js 15](https://nextjs.org/)** - Framework React avec App Router
- **[React 19](https://react.dev/)** - Bibliothèque UI
- **[TypeScript 5](https://www.typescriptlang.org/)** - Typage statique
- **[Tailwind CSS 4](https://tailwindcss.com/)** - Framework CSS utility-first
- **[Lucide React](https://lucide.dev/)** - Icônes modernes
- **[@dnd-kit](https://dndkit.com/)** - Drag and drop accessible

### Backend & Base de données

- **[Prisma 6](https://www.prisma.io/)** - ORM moderne pour PostgreSQL
- **[PostgreSQL](https://www.postgresql.org/)** - Base de données relationnelle
- **[Better-auth](https://www.better-auth.com/)** - Authentification moderne

### Services & Intégrations

- **[Supabase](https://supabase.com/)** - Stockage de fichiers
- **[Nodemailer](https://nodemailer.com/)** - Envoi d'emails
- **[@react-pdf/renderer](https://react-pdf.org/)** - Génération PDF côté serveur

### État & Validation

- **[Zustand](https://zustand-demo.pmnd.rs/)** - Gestion d'état légère
- **[Zod](https://zod.dev/)** - Validation de schémas TypeScript

---

## 🚀 Installation

### Prérequis

- **Node.js** 20.x ou supérieur
- **PostgreSQL** 14.x ou supérieur
- **npm** ou **pnpm** ou **yarn**

### 1. Cloner le repository

```bash
git clone <repository-url>
cd dune-assurances
```

### 2. Installer les dépendances

```bash
npm install
# ou
pnpm install
# ou
yarn install
```

### 3. Configuration de l'environnement

Créer un fichier `.env` à la racine du projet :

```env
# Base de données
DATABASE_URL="postgresql://user:password@localhost:5432/encyclie_crm"

# Better-auth
BETTER_AUTH_SECRET="your-secret-key-here"
BETTER_AUTH_URL="http://localhost:3000"

# OAuth Google (optionnel)
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# Supabase (stockage fichiers)
NEXT_PUBLIC_SUPABASE_URL="your-supabase-url"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-supabase-anon-key"

# Email (Nodemailer)
SMTP_HOST="smtp.example.com"
SMTP_PORT="587"
SMTP_USER="your-email@example.com"
SMTP_PASSWORD="your-email-password"
SMTP_FROM="noreply@encyclie.com"

# Application
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### 4. Initialiser la base de données

```bash
# Générer le client Prisma
npx prisma generate

# Exécuter les migrations
npx prisma migrate deploy

# (Optionnel) Seeder la base avec des données de test
npm run db:seed
```

### 5. Lancer le serveur de développement

```bash
npm run dev
```

L'application sera accessible sur [http://localhost:3000](http://localhost:3000)

---

## 📖 Configuration

### Produits d'assurance

Les produits d'assurance sont configurables via la table `insurance_products`. Chaque produit contient :

- **formFields** : Configuration des champs du formulaire (JSON)
- **stepConfig** : Configuration des étapes multi-pages (JSON)
- **pricingRules** : Règles de calcul des primes (JSON)
- **requiredDocs** : Documents requis (JSON)
- **workflowConfig** : Workflow personnalisé (JSON)

Exemple de configuration dans `prisma/seed.ts`.

### Templates de workflow

Les templates réutilisables sont créés via l'interface admin ou en base de données. Types de champs supportés :

- `TEXT` - Champ texte simple
- `TEXTAREA` - Zone de texte multiligne
- `SELECT` - Liste déroulante
- `DATE` - Sélecteur de date
- `FILE` - Upload de fichier
- `CHECKBOX` - Case à cocher

### Configuration SMTP

Pour l'envoi d'emails (invitations, notifications), configurer un service SMTP dans `.env` :

```env
SMTP_HOST="smtp.gmail.com"  # Exemple avec Gmail
SMTP_PORT="587"
SMTP_USER="your-email@gmail.com"
SMTP_PASSWORD="your-app-password"
```

---

## 📚 Documentation

### Structure du projet

```
📦 dune-assurances/
├── 📂 prisma/
│   ├── schema.prisma           # Schéma de base de données
│   ├── seed.ts                 # Script de seeding
│   └── migrations/             # Migrations Prisma
├── 📂 public/                  # Assets statiques
├── 📂 src/
│   ├── 📂 app/                 # Pages Next.js (App Router)
│   │   ├── api/                # Routes API
│   │   ├── auth/               # Pages d'authentification
│   │   ├── dashboard/          # Dashboard principal
│   │   ├── quotes/             # Gestion des devis
│   │   ├── layout.tsx          # Layout racine
│   │   └── page.tsx            # Page d'accueil
│   ├── 📂 components/
│   │   ├── admin/              # Composants admin
│   │   ├── messages/           # Système de messagerie
│   │   ├── modals/             # Modales
│   │   ├── pdf/                # Génération PDF
│   │   ├── quotes/             # Composants devis
│   │   └── workflow/           # Système de workflow
│   └── 📂 lib/
│       ├── api/                # Utilitaires API
│       ├── stores/             # Stores Zustand
│       ├── tarificateurs/      # Moteurs de calcul
│       ├── types/              # Types TypeScript
│       ├── auth.ts             # Configuration Better-auth
│       ├── auth-client.ts      # Client auth
│       ├── prisma.ts           # Client Prisma
│       ├── supabase-client.ts  # Client Supabase
│       ├── nodemailer.ts       # Configuration email
│       ├── utils.ts            # Utilitaires
│       └── validations.ts      # Schémas Zod
├── 📂 web-bundles/             # Documentation système
├── WORKFLOW_SYSTEM.md          # Documentation workflow
├── package.json
├── tsconfig.json
└── next.config.ts
```

### Scripts disponibles

```bash
# Développement
npm run dev          # Démarrer le serveur de dev

# Build
npm run build        # Build pour production
npm run start        # Démarrer en mode production

# Qualité code
npm run lint         # Linter ESLint

# Base de données
npm run db:seed      # Seeder la base
npx prisma studio    # Interface graphique Prisma
npx prisma migrate dev  # Créer une migration
```

### API Routes

L'API REST est organisée par domaine :

- `/api/auth/*` - Authentification
- `/api/users/*` - Gestion utilisateurs
- `/api/brokers/*` - Gestion courtiers
- `/api/products/*` - Produits d'assurance
- `/api/quotes/*` - Gestion devis
- `/api/quotes/[id]/messages/*` - Messagerie devis
- `/api/quotes/[id]/documents/*` - Documents devis
- `/api/quotes/[id]/payment-schedule/*` - Échéanciers
- `/api/workflow/*` - Système de workflow
- `/api/notifications/*` - Notifications
- `/api/payment-installments/*` - Paiements
- `/api/generate-pdf/*` - Génération PDF
- `/api/email/*` - Envoi emails

Voir `WORKFLOW_SYSTEM.md` pour la documentation détaillée du système de workflow.

---

## 🔒 Sécurité

- ✅ Authentification sécurisée avec Better-auth
- ✅ Validation des données avec Zod
- ✅ Protection CSRF intégrée
- ✅ Gestion des sessions sécurisée
- ✅ Stockage sécurisé des mots de passe (bcrypt)
- ✅ Validation côté serveur de tous les uploads
- ✅ Système de permissions basé sur les rôles (RBAC)

---

## 🤝 Contribution

Ce projet est privé et maintenu par l'équipe Encyclie. Pour toute question ou suggestion, contactez l'équipe de développement.

---

## 📄 License

Propriétaire - © 2025 Encyclie. Tous droits réservés.

---

## 🆘 Support

Pour obtenir de l'aide :

1. Consulter la [documentation du workflow](./WORKFLOW_SYSTEM.md)
2. Vérifier les logs de l'application
3. Contacter l'équipe technique Encyclie

---

<div align="center">

**Développé avec ❤️ par l'équipe Encyclie**

</div>
