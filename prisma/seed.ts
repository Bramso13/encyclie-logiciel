import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Clear existing data first (order matters due to foreign keys)
  console.log('🗑️ Clearing existing data...');
  await prisma.quote.deleteMany({});
  await prisma.insuranceProduct.deleteMany({});
  console.log('✅ Existing data cleared');

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

  // Create RC Décennale product with step configuration
  const rcDecennaleProduct = await prisma.insuranceProduct.create({
    data: {
      name: 'RC Décennale',
      code: 'RC_DECENNALE',
      description: 'Responsabilité Civile Décennale pour les professionnels du bâtiment',
      isActive: true,
      formFields: {
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
        chiffreAffaires: {
          type: 'number',
          label: 'Chiffre d\'affaires annuel (€)',
          required: true,
          min: 0,
          help: 'Chiffre d\'affaires de l\'année précédente ou prévisionnel'
        },
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
        assureurPrecedent: {
          type: 'text',
          label: 'Assureur précédent',
          required: false,
          help: 'Nom de votre précédent assureur (si applicable)'
        },
        sinistresAntecedents: {
          type: 'textarea',
          label: 'Sinistres antécédents',
          required: false,
          rows: 3,
          help: 'Décrivez vos éventuels sinistres des 5 dernières années'
        },
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
        dateEffetSouhaitee: {
          type: 'date',
          label: 'Date d\'effet souhaitée',
          required: true,
          min: new Date().toISOString().split('T')[0]
        }
      },
      pricingRules: {
        basePremium: 1500
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
      stepConfig: {
        steps: [
          {
            title: "Informations entreprise",
            description: "Renseignez les informations de base de votre entreprise",
            includeCompanyInfo: true,
            fields: ["companyCreationDate", "legalForm"]
          },
          {
            title: "Activité professionnelle",
            description: "Précisez votre secteur d'activité et vos spécialités",
            fields: ["activities", "chiffreAffaires", "typeChantiers", "montantMoyenChantiers"]
          },
          {
            title: "Expérience et équipe",
            description: "Informations sur votre expérience professionnelle et votre équipe",
            fields: ["experienceMetier", "nombreSalaries"]
          },
          {
            title: "Historique et garanties",
            description: "Votre historique d'assurance et les garanties souhaitées",
            fields: ["assureurPrecedent", "sinistresAntecedents", "garantiesSouhaitees", "dateEffetSouhaitee"]
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

  // Create RC Professionnelle product
  const rcProfessionnelleProduct = await prisma.insuranceProduct.create({
    data: {
      name: 'RC Professionnelle',
      code: 'RC_PRO',
      description: 'Responsabilité Civile Professionnelle',
      isActive: true,
      formFields: {
        activities: {
          type: 'multiselect',
          label: 'Activités exercées',
          required: true,
          options: [
            { value: 'CONSEIL', label: 'Conseil' },
            { value: 'FORMATION', label: 'Formation' },
            { value: 'EXPERTISE', label: 'Expertise' },
            { value: 'COURTAGE', label: 'Courtage' },
            { value: 'COMMERCE', label: 'Commerce' }
          ]
        },
        chiffreAffaires: {
          type: 'number',
          label: 'Chiffre d\'affaires annuel (€)',
          required: true,
          min: 0
        },
        nombreSalaries: {
          type: 'number',
          label: 'Nombre de salariés',
          required: true,
          min: 0
        }
      },
      pricingRules: {
        basePremium: 800
      },
      requiredDocs: ['Extrait Kbis', 'Justificatif CA'],
      stepConfig: {
        steps: [
          {
            title: 'Entreprise',
            description: 'Informations sur votre entreprise',
            includeCompanyInfo: true,
            fields: ['chiffreAffaires', 'nombreSalaries']
          },
          {
            title: 'Activités',
            description: 'Vos activités professionnelles',
            fields: ['activities']
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

  console.log('✅ RC Professionnelle product created:', rcProfessionnelleProduct.name);

  // Create Multirisque Professionnelle product
  const multirisqueProduct = await prisma.insuranceProduct.create({
    data: {
      name: 'Multirisque Professionnelle',
      code: 'MR_PRO',
      description: 'Assurance Multirisque Professionnelle',
      isActive: true,
      formFields: {
        typeLocal: {
          type: 'select',
          label: 'Type de local',
          required: true,
          options: [
            { value: 'BUREAU', label: 'Bureau' },
            { value: 'COMMERCE', label: 'Commerce' },
            { value: 'ATELIER', label: 'Atelier' },
            { value: 'ENTREPOT', label: 'Entrepôt' }
          ]
        },
        superficie: {
          type: 'number',
          label: 'Superficie (m²)',
          required: true,
          min: 1
        },
        valeurMobilier: {
          type: 'number',
          label: 'Valeur du mobilier (€)',
          required: true,
          min: 0
        },
        chiffreAffaires: {
          type: 'number',
          label: 'Chiffre d\'affaires annuel (€)',
          required: true,
          min: 0
        }
      },
      pricingRules: {
        basePremium: 1200
      },
      requiredDocs: ['Plan du local', 'Inventaire mobilier'],
      stepConfig: {
        steps: [
          {
            title: 'Local professionnel',
            description: 'Caractéristiques de votre local',
            fields: ['typeLocal', 'superficie']
          },
          {
            title: 'Biens à assurer',
            description: 'Valeur des biens professionnels',
            fields: ['valeurMobilier', 'chiffreAffaires']
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

  console.log('✅ Multirisque Professionnelle product created:', multirisqueProduct.name);

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