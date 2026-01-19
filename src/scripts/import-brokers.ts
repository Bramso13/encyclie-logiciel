// Données des courtiers et fonction d'import
interface BrokerRow {
  brokerCode: string;
  companyName: string;
  legalForm?: string;
  siretNumber?: string;
  gerant?: string;
  email: string;
  phone: string;
  territoire?: string;
  address: string;
}

export const brokersData: BrokerRow[] = [
  {
    brokerCode: '973-2',
    companyName: 'JVFINANCES',
    legalForm: 'SAS',
    siretNumber: '811701937',
    gerant: 'Joel VARSOVIE',
    email: 'direction@jvfinances.com',
    phone: '(+594) 594296001',
    territoire: 'Guyane',
    address: '9 Rue des Entreprises Route de Dégrad des Cannes 97354 REMIRE-MONTJOLY',
  },
  {
    brokerCode: '974-3',
    companyName: 'PRIMASSURANCES',
    legalForm: 'SAS',
    siretNumber: '814777520',
    gerant: 'MOUTIEN Sandjay',
    email: 'primassurances.constructions@gmail.com',
    phone: '(+262)692163207',
    territoire: 'Île de la Réunion',
    address: 'Route de riviere des pluies 17 H SAINTE Clotilde 97490 SAINT DENIS',
  },
  {
    brokerCode: '971-5',
    companyName: 'DL-CACI',
    legalForm: 'SASU',
    siretNumber: '750867806',
    gerant: 'Jasmine Lidia Anise',
    email: 'contact@dlassurances.fr',
    phone: '(+590)690960015',
    territoire: 'Guadeloupe',
    address: '13 rue Joseph.Massonel 97420 LE PORT',
  },
  {
    brokerCode: '971-6',
    companyName: 'FIC',
    legalForm: 'SARL',
    gerant: 'SOUPOU Bernard',
    email: 'bernard.soupou@gmail.com',
    phone: '0478725326',
    territoire: 'Guadeloupe',
    address: '10 rue Noziere 97110 Pointe à Pitre',
  },
  {
    brokerCode: '971-7',
    companyName: 'JRVCONSEIL',
    legalForm: 'EI',
    gerant: 'GAULT Nicolas',
    email: 'nicolas.gault@humanera-assu.com',
    phone: '06 90 41 48 73',
    territoire: 'Guadeloupe',
    address: '68, rue de Low-Town St-James Marigot 97150 St-Martin',
  },
  {
    brokerCode: '69-1',
    companyName: 'GLOBAL CONSULTANT',
    legalForm: 'SAS',
    gerant: 'ROUSSEL Jean-Pierre',
    email: 'mcolomboconseil@orange.fr',
    phone: '0693 04 40 62',
    territoire: 'Lyon',
    address: '63 Rue André Bollier 69307 Lyon Cedex 7',
  },
  {
    brokerCode: '974-8',
    companyName: 'COI',
    legalForm: 'SARL',
    gerant: 'OLIVIE Michel',
    email: 'michelolivie@cea-assurances.fr',
    phone: '0182283211',
    territoire: 'REUNION',
    address: '754 av île de France 97440 Saint André',
  },
  {
    brokerCode: '974-9',
    companyName: 'REUNI ASSURANCES',
    legalForm: 'SARL',
    gerant: 'Yannis ARNAUD',
    email: 'siege@apcassurance.re',
    phone: '0767175853',
    territoire: 'REUNION',
    address: '20 rue de suffren logement 1 97460 Saint Paul',
  },
  {
    brokerCode: '973-10',
    companyName: 'WAB GUYANE \'HUMAN ERA\'',
    legalForm: 'SAS',
    gerant: 'Muriel EZELIN',
    email: 'mcolomboconseil@orange.fr',
    phone: '0620114974',
    territoire: 'Guyane',
    address: 'Route de la Rocade 97300 Cayenne',
  },
  {
    brokerCode: '971-11',
    companyName: 'M,COLOMBO CONSEIL',
    legalForm: 'SAS',
    gerant: 'LATTENTION Patricia',
    email: 'mcolomboconseil@orange.fr',
    phone: '0693000291',
    territoire: 'Guadeloupe',
    address: '230 AV Gaston Monnerville 97320 SAINT LAURENT DU MARONI',
  },
  {
    brokerCode: '971-12',
    companyName: 'CEA ANTILLE',
    legalForm: 'SARL',
    gerant: 'MENEGHINI Alexandre',
    email: 'michelolivie@cea-assurances.fr',
    phone: '0596 63 84 49',
    territoire: 'Antilles',
    address: 'Rivières des Pères 97100 BASSE-TERRE',
  },
  {
    brokerCode: '973-13',
    companyName: 'CEA GUYANE',
    legalForm: 'SARL',
    gerant: 'Camerone NewCo',
    email: 'michelolivie@cea-assurances.fr',
    phone: '0690 31 88 03',
    territoire: 'Guyane',
    address: 'la Marina les pied dans l\'eau le mole portuaire 97110 Pointe à Pitre',
  },
  {
    brokerCode: '971-14',
    companyName: 'ARC ASSURANCES',
    legalForm: 'SARL',
    gerant: 'WOLF Fabian',
    email: 'michelolivie@cea-assurances.fr',
    phone: '690633666',
    territoire: 'Guadeloupe',
    address: '20 rue Gilles BEHARI Laul Sirder ZI COLLERY II 97300 Cayenne',
  },
  {
    brokerCode: '971-15',
    companyName: 'SARL CORALITAPATRIMOINE',
    legalForm: 'SARL',
    gerant: 'DEJEAN Julie Bernadette',
    email: 'siege@apcassurance.re',
    phone: '06,93,80,29,16',
    territoire: 'Guadeloupe',
    address: '39 rue Adrien LAGOURGUE',
  },
  {
    brokerCode: '971-16',
    companyName: 'SAS ODEALIM CARAI BES',
    legalForm: 'SAS',
    gerant: 'DIJOUX HAGEN Marie Graziella',
    email: 'graziella.hagen@ocea-assurances.re',
    phone: '06,90,70,60,95',
    territoire: 'Guadeloupe',
    address: '20 Lot Coralita Pond 97150 Saint MARTIN',
  },
  {
    brokerCode: '971-17',
    companyName: 'SARL APC ASSURANCES PRO ET CONSTRUCTION',
    legalForm: 'SARL',
    gerant: 'DUPONT Cédric',
    email: 'cedrick@celanonycourtage.fr',
    phone: '0693000291',
    territoire: 'Guadeloupe',
    address: 'Immeuble Héritiers LT et LF Magras Ld Gustavia 97133 Saint-Barthélemy',
  },
  {
    brokerCode: '974-18',
    companyName: 'KOALA',
    legalForm: 'SARL',
    gerant: 'BARCHECHAT Michae',
    email: 'contact@groupe-prowess.fr',
    phone: '0620114974',
    territoire: 'REUNION',
    address: 'Local 3 99 rue Marius et Ary Leblond 97430 Le Tampon',
  },
  {
    brokerCode: '974-19',
    companyName: 'OCEA ASSURANCES',
    legalForm: 'SARL',
    gerant: 'MAHAMADALY Chaheda Banou',
    email: 'graziella.hagen@ocea-assurances.re',
    phone: '0693000291',
    territoire: 'REUNION',
    address: '554 ZAC Andropolis, N° 428 immeuble les Salazes 97440 SAINT ANDRE',
  },
  {
    brokerCode: '34-1',
    companyName: 'CELANONY COURTAGE',
    legalForm: 'SARL',
    gerant: 'PEJOUX Tony',
    email: 'cedrick@celanonycourtage.fr',
    phone: '0182283211',
    territoire: 'MONTPELLIER',
    address: 'ROUTE DE NEBIAN CHEMIN LARAMASSE EST 34800 CLERMONT L HERAULT',
  },
  {
    brokerCode: '91-1',
    companyName: 'PROWESS',
    legalForm: 'SAS',
    gerant: 'ZIMMERMANN Marc',
    email: 'contact@groupe-prowess.fr',
    phone: '0767175853',
    territoire: 'MASSY',
    address: '207 Avenue du Maréchal Leclerc 91300 Massy',
  },
  {
    brokerCode: '974-20',
    companyName: 'ASSURANCES COURTAGE REUNION CRM',
    legalForm: 'SARL',
    gerant: 'NANNETTE Marie-Andrée',
    email: 'marieandree.marechaux@axecime.com',
    phone: '0620114974',
    territoire: 'REUNION',
    address: '83 rue des Deux Canons 97490 Sainte Clotilde',
  },
  {
    brokerCode: '972-1',
    companyName: 'DPASSURANCES',
    legalForm: 'SARL',
    gerant: 'KEVIN MOUTIEN',
    email: 'kevin@helioscourtage.re',
    phone: '0693000291',
    territoire: 'Martinique',
    address: '129 route des religieuses 97200 FORT DE France',
  },
  {
    brokerCode: '75-2',
    companyName: 'AXECIME',
    legalForm: 'SARL',
    gerant: 'RODOLPHE ROUGET',
    email: 'marieandree.marechaux@axecime.com',
    phone: '0182283211',
    territoire: 'PARIS',
    address: '104 bd de Sébastopol',
  },
  {
    brokerCode: '974-21',
    companyName: 'HELIOS COURTAGE',
    legalForm: 'SARL',
    gerant: 'ROUSSEL JP ANDRE',
    email: 'kevin@helioscourtage.re',
    phone: '0767175853',
    territoire: 'REUNION',
    address: '90CHEMIN LECLERC-97440 SAINT ANDRE',
  },
  {
    brokerCode: '971-18',
    companyName: 'COURTAGE RRILES DU NORD',
    legalForm: 'SARL',
    gerant: 'COCKS Fabien',
    email: 'contact@groupe-prowess.fr',
    phone: '0620114974',
    territoire: 'Guadeloupe',
    address: '51 Impasse Sicile - Lorient-97133 SAINT BATHELEMY',
  },
  {
    brokerCode: '974-22',
    companyName: 'CEAREUNION',
    legalForm: 'SARL',
    gerant: 'GULTEKIN Oktay',
    email: 'oktaygultekin@cea-reunion.fr',
    phone: '0693000291',
    territoire: 'REUNION',
    address: '98 rue Jules Auber-97400 ST DENIS',
  },
  {
    brokerCode: '971-19',
    companyName: 'INKIMMO',
    legalForm: 'SARL',
    gerant: 'COCKS Fabien',
    email: 'contact@groupe-prowess.fr',
    phone: '0620114974',
    territoire: 'Guadeloupe',
    address: '4 Impasse Frangiro Agrement-97150 SAINT-MARTIN',
  },
];

export async function importBrokers(
  createBrokerFn: (brokerData: {
    name: string;
    email: string;
    companyName: string;
    phone: string;
    address: string;
    siretNumber?: string;
    brokerCode: string;
  }) => Promise<any>
) {
  const results = {
    success: 0,
    failed: 0,
    skipped: 0,
    errors: [] as Array<{ company: string; email: string; error: string }>,
  };

  console.log(`🚀 Début de l'import de ${brokersData.length} courtiers...\n`);

  for (let i = 0; i < brokersData.length; i++) {
    const broker = brokersData[i];
    try {
      const name = (broker.gerant && broker.gerant.trim()) || broker.companyName;

      const brokerData = {
        name: name.trim(),
        email: broker.email.trim(),
        companyName: broker.companyName.trim(),
        phone: broker.phone.trim(),
        address: broker.address.trim(),
        siretNumber: broker.siretNumber?.trim() || undefined,
        brokerCode: broker.brokerCode.trim(),
      };

      console.log(`[${i + 1}/${brokersData.length}] Import de ${broker.companyName}...`);
      await createBrokerFn(brokerData);
      results.success++;
      console.log(`✅ ${broker.companyName} (${broker.email}) - Code: ${broker.brokerCode}\n`);
      
      // Délai de 100ms entre chaque requête pour éviter les problèmes de rate limiting
      if (i < brokersData.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    } catch (error) {
      // Ne jamais bloquer, toujours continuer
      results.failed++;
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;

      console.error(`❌ ERREUR pour ${broker.companyName}:`, errorMessage);
      if (errorStack) {
        console.error('Stack trace:', errorStack);
      }

      if (
        errorMessage.includes('existe déjà') ||
        errorMessage.includes('déjà en cours') ||
        errorMessage.includes('déjà réservé')
      ) {
        results.skipped++;
        results.failed--; // Ne pas compter les doublons comme des échecs
        console.log(`⏭️  ${broker.companyName} (${broker.email}) - Ignoré (doublon): ${errorMessage}\n`);
      } else {
        results.errors.push({
          company: broker.companyName,
          email: broker.email,
          error: errorMessage,
        });
        console.log(`❌ ${broker.companyName} (${broker.email}) - Échec: ${errorMessage}\n`);
      }
      
      // Continuer même en cas d'erreur
      if (i < brokersData.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
  }

  console.log(`\n📊 Résultats de l'import:`);
  console.log(`   ✅ Réussis: ${results.success}`);
  console.log(`   ⏭️  Ignorés (doublons): ${results.skipped}`);
  console.log(`   ❌ Échecs: ${results.failed}`);

  if (results.errors.length > 0) {
    console.log(`\n❌ Détails des erreurs:`);
    results.errors.forEach((err, idx) => {
      console.log(`   ${idx + 1}. ${err.company} (${err.email}): ${err.error}`);
    });
  }

  return results;
}
