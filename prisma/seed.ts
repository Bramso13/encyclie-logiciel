import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create admin user first
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@dune-assurances.fr' },
    update: {},
    create: {
      name: 'Administrateur Dune',
      email: 'admin@dune-assurances.fr',
      emailVerified: true,
      role: 'ADMIN',
      companyName: 'Dune Assurances',
      phone: '01 23 45 67 89',
      address: '123 Avenue des Assurances, 75001 Paris',
      isActive: true
    }
  });

  console.log('✅ Admin user created:', adminUser.email);

  // Create RC Décennale product
  const rcDecennaleProduct = await prisma.insuranceProduct.upsert({
    where: { code: 'RC_DECENNALE' },
    update: {},
    create: {
      name: 'RC Décennale',
      code: 'RC_DECENNALE',
      description: 'Responsabilité Civile Décennale pour les professionnels du bâtiment',
      isActive: true,
      formFields: {
        // Company information
        companyCreationDate: {
          type: 'date',
          label: 'Date de création de l\'entreprise',
          required: true,
          help: 'Date de création de votre entreprise'
        },
        legalForm: {
          type: 'select',
          label: 'Forme juridique',
          required: true,
          options: [
            { value: 'SARL', label: 'SARL' },
            { value: 'SAS', label: 'SAS' },
            { value: 'SA', label: 'SA' },
            { value: 'EURL', label: 'EURL' },
            { value: 'SNC', label: 'SNC' },
            { value: 'AUTO_ENTREPRENEUR', label: 'Auto-entrepreneur' },
            { value: 'ARTISAN', label: 'Artisan' }
          ]
        },
        
        // Business information
        chiffreAffaires: {
          type: 'number',
          label: 'Chiffre d\'affaires annuel (€)',
          required: true,
          min: 0,
          help: 'Chiffre d\'affaires de l\'année précédente ou prévisionnel'
        },
        
        // Activities
        activities: {
          type: 'multiselect',
          label: 'Activités exercées',
          required: true,
          options: [
            { value: 'GROS_OEUVRE', label: 'Gros œuvre' },
            { value: 'SECOND_OEUVRE', label: 'Second œuvre' },
            { value: 'CHARPENTE', label: 'Charpente' },
            { value: 'COUVERTURE', label: 'Couverture' },
            { value: 'PLOMBERIE', label: 'Plomberie' },
            { value: 'ELECTRICITE', label: 'Électricité' },
            { value: 'MACONNERIE', label: 'Maçonnerie' },
            { value: 'CARRELAGE', label: 'Carrelage' },
            { value: 'PEINTURE', label: 'Peinture' },
            { value: 'MENUISERIE', label: 'Menuiserie' },
            { value: 'ISOLATION', label: 'Isolation' },
            { value: 'TERRASSEMENT', label: 'Terrassement' }
          ]
        },
        
        // Risk factors
        nombreSalaries: {
          type: 'number',
          label: 'Nombre de salariés',
          required: true,
          min: 0,
          help: 'Nombre de salariés actuels'
        },
        
        experienceMetier: {
          type: 'number',
          label: 'Années d\'expérience dans le métier',
          required: true,
          min: 0,
          max: 50,
          help: 'Nombre d\'années d\'expérience du dirigeant principal'
        },
        
        // Previous insurance
        assureurPrecedent: {
          type: 'text',
          label: 'Assureur précédent',
          required: false,
          help: 'Nom de votre précédent assureur (si applicable)'
        },
        
        // Claims history
        sinistresAntecedents: {
          type: 'textarea',
          label: 'Sinistres antécédents',
          required: false,
          rows: 3,
          help: 'Décrivez vos éventuels sinistres des 5 dernières années'
        },
        
        // Coverage needs
        garantiesSouhaitees: {
          type: 'multiselect',
          label: 'Garanties souhaitées',
          required: true,
          options: [
            { value: 'RC_DECENNALE', label: 'RC Décennale' },
            { value: 'RC_BIENNALE', label: 'RC Biennale' },
            { value: 'RC_EXPLOITATION', label: 'RC d\'exploitation' },
            { value: 'DOMMAGES_OUVRAGE', label: 'Dommages-ouvrage' },
            { value: 'TOUS_RISQUES_CHANTIER', label: 'Tous risques chantier' }
          ]
        },
        
        // Project information
        typeChantiers: {
          type: 'multiselect',
          label: 'Types de chantiers',
          required: true,
          options: [
            { value: 'MAISONS_INDIVIDUELLES', label: 'Maisons individuelles' },
            { value: 'LOGEMENTS_COLLECTIFS', label: 'Logements collectifs' },
            { value: 'BUREAUX', label: 'Bureaux' },
            { value: 'COMMERCES', label: 'Commerces' },
            { value: 'INDUSTRIEL', label: 'Bâtiments industriels' },
            { value: 'RENOVATION', label: 'Rénovation' },
            { value: 'NEUF', label: 'Construction neuve' }
          ]
        },
        
        montantMoyenChantiers: {
          type: 'number',
          label: 'Montant moyen des chantiers (€)',
          required: true,
          min: 0,
          help: 'Montant moyen HT de vos chantiers'
        },
        
        // Date effect
        dateEffetSouhaitee: {
          type: 'date',
          label: 'Date d\'effet souhaitée',
          required: true,
          min: new Date().toISOString().split('T')[0]
        }
      },
      
      pricingRules: {
        basePremium: 1500, // Base premium in euros
        
        // Activity risk multipliers
        activityMultipliers: {
          'GROS_OEUVRE': 2.5,
          'SECOND_OEUVRE': 1.5,
          'CHARPENTE': 2.2,
          'COUVERTURE': 2.8,
          'PLOMBERIE': 1.8,
          'ELECTRICITE': 1.9,
          'MACONNERIE': 2.3,
          'CARRELAGE': 1.4,
          'PEINTURE': 1.2,
          'MENUISERIE': 1.6,
          'ISOLATION': 1.7,
          'TERRASSEMENT': 2.0
        },
        
        // Turnover brackets
        turnoverMultipliers: [
          { max: 50000, multiplier: 0.8 },
          { max: 150000, multiplier: 1.0 },
          { max: 300000, multiplier: 1.3 },
          { max: 500000, multiplier: 1.6 },
          { max: 1000000, multiplier: 2.0 },
          { max: 99999999, multiplier: 2.5 }
        ],
        
        // Experience discounts
        experienceDiscounts: [
          { minYears: 0, maxYears: 2, discount: 0 },
          { minYears: 3, maxYears: 5, discount: 0.05 },
          { minYears: 6, maxYears: 10, discount: 0.10 },
          { minYears: 11, maxYears: 20, discount: 0.15 },
          { minYears: 21, maxYears: 99, discount: 0.20 }
        ],
        
        // Employee count multipliers
        employeeMultipliers: [
          { max: 0, multiplier: 0.9 }, // Solo entrepreneur
          { max: 2, multiplier: 1.0 },
          { max: 5, multiplier: 1.2 },
          { max: 10, multiplier: 1.4 },
          { max: 20, multiplier: 1.7 },
          { max: 99999, multiplier: 2.0 }
        ],
        
        // Coverage multipliers
        coverageMultipliers: {
          'RC_DECENNALE': 1.0,
          'RC_BIENNALE': 0.3,
          'RC_EXPLOITATION': 0.4,
          'DOMMAGES_OUVRAGE': 0.8,
          'TOUS_RISQUES_CHANTIER': 0.6
        }
      },
      
      requiredDocs: [
        'Extrait Kbis (moins de 3 mois)',
        'Attestation d\'assurance précédente',
        'Relevé d\'information sinistres',
        'Justificatif de chiffre d\'affaires',
        'Attestation de qualification professionnelle',
        'Liste des chantiers en cours'
      ],
      
      workflowConfig: {
        steps: [
          {
            name: 'submission',
            label: 'Soumission',
            description: 'Dossier soumis par le courtier',
            requiredFields: ['companyData', 'activities', 'chiffreAffaires']
          },
          {
            name: 'review',
            label: 'Étude',
            description: 'Étude du dossier par un souscripteur',
            requiredDocs: ['kbis', 'previous_insurance']
          },
          {
            name: 'pricing',
            label: 'Tarification',
            description: 'Calcul de la prime',
            automated: true
          },
          {
            name: 'validation',
            label: 'Validation',
            description: 'Validation finale du dossier',
            requiredRole: 'UNDERWRITER'
          },
          {
            name: 'offer',
            label: 'Offre',
            description: 'Génération et envoi de l\'offre',
            automated: true
          }
        ]
      },
      
      createdBy: {
        connect: {
          email: 'admin@dune-assurances.fr'
        }
      }
    }
  });

  console.log('✅ RC Décennale product created:', rcDecennaleProduct.name);

  // Create sample broker
  const brokerUser = await prisma.user.upsert({
    where: { email: 'courtier@example.com' },
    update: {},
    create: {
      name: 'Jean Dupont',
      email: 'courtier@example.com',
      emailVerified: true,
      role: 'BROKER',
      companyName: 'Courtage Expert',
      phone: '01 98 76 54 32',
      address: '456 Rue du Commerce, 75002 Paris',
      siretNumber: '12345678901234',
      isActive: true
    }
  });

  console.log('✅ Sample broker created:', brokerUser.email);

  // Create sample underwriter
  const underwriterUser = await prisma.user.upsert({
    where: { email: 'souscripteur@dune-assurances.fr' },
    update: {},
    create: {
      name: 'Marie Martin',
      email: 'souscripteur@dune-assurances.fr',
      emailVerified: true,
      role: 'UNDERWRITER',
      companyName: 'Dune Assurances',
      phone: '01 11 22 33 44',
      address: '123 Avenue des Assurances, 75001 Paris',
      isActive: true
    }
  });

  console.log('✅ Sample underwriter created:', underwriterUser.email);

  console.log('🎉 Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });