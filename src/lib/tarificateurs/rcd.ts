function parseISO(d: string): Date {
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) throw new Error(`Date invalide: ${d}`);
  return dt;
}

type ReturnValueRefus = {
  experienceDirigeant: boolean;
  sansAssuranceDepuisPlusDe12Mois: boolean;
  partSoutraitance: boolean;
  partNegoce: boolean;
};

function verifRefus(params: {
  experienceDirigeant: number;

  tempsSansActivite: Enum_Temps_sans_activite;
  partSoutraitance: number;
  partNegoce: number;
}) {
  const {
    experienceDirigeant,
    tempsSansActivite,
    partSoutraitance,
    partNegoce,
  } = params;
  const returnValue: ReturnValueRefus = {
    experienceDirigeant: false,
    sansAssuranceDepuisPlusDe12Mois: false,
    partSoutraitance: false,
    partNegoce: false,
  };

  returnValue.experienceDirigeant = experienceDirigeant < 1;
  returnValue.sansAssuranceDepuisPlusDe12Mois =
    tempsSansActivite === "PLUS_DE_12_MOIS";
  returnValue.partSoutraitance =
    partSoutraitance > 1
      ? partSoutraitance / 100 > 0.15
      : partSoutraitance > 0.15;
  returnValue.partNegoce =
    partNegoce > 1 ? partNegoce / 100 > 0.15 : partNegoce > 0.15;
  return returnValue;
}

type Enum_Temps_sans_activite =
  | "PLUS_DE_12_MOIS"
  | "DE 6_A 12_MOIS"
  | "NON"
  | "CREATION";
function calculateMajorations(params: {
  enCreation: boolean;
  etp: number;
  nbActivites: number;
  qualif: boolean;
  dateCreation: Date;
  nonFournitureBilanN_1: boolean;
  anneeExperience: number;
  assureurDefaillant: boolean;
  nombreAnneeAssuranceContinue: number;
  tempsSansActivite: Enum_Temps_sans_activite;

  sansActiviteDepuisPlusDe12MoisSansFermeture: "OUI" | "NON" | "CREATION";
  absenceDeSinistreSurLes5DernieresAnnees:
    | "OUI"
    | "NON"
    | "CREATION"
    | "ASSUREUR_DEFAILLANT"
    | "A_DEFINIR";
}) {
  const {
    enCreation,
    etp,
    nbActivites,
    qualif,
    dateCreation,
    tempsSansActivite,
    anneeExperience,
    assureurDefaillant,
    nombreAnneeAssuranceContinue,
    nonFournitureBilanN_1,
    sansActiviteDepuisPlusDe12MoisSansFermeture,
    absenceDeSinistreSurLes5DernieresAnnees,
  } = params;
  const calculMajTempsSansActivite = (
    tempsSansActivite: Enum_Temps_sans_activite
  ) => {
    console.log("tempsSansActivite", tempsSansActivite);
    if (tempsSansActivite === "DE 6_A 12_MOIS") return 0.3;
    if (tempsSansActivite === "NON") return 0;
    if (tempsSansActivite === "CREATION") return 0;
  };

  const calculMajETP = (etp: number, nbActivites: number) => {
    if (etp === 1) {
      if (nbActivites <= 3) return 0;
      if (nbActivites > 3 && nbActivites <= 5) return 0.1;
    }
    if (etp > 1 && etp < 5) {
      if (nbActivites <= 5) return 0;
      if (nbActivites > 5 && nbActivites <= 8) return 0.1;
    }
    if (etp >= 6 && etp <= 8) return 0;
  };
  const calculMajAnciennete = (dateCreation: Date) => {
    const today = new Date();
    const diffMs = today.getTime() - dateCreation.getTime();
    const diffYears = diffMs / (1000 * 60 * 60 * 24 * 365.25);
    if (diffYears < 1) return 0.2;
    if (diffYears > 1 && diffYears < 3) return 0.1;
    return 0;
  };
  const calculMajExp = (anneeExperience: number) => {
    if (anneeExperience > 1 && anneeExperience < 3) return 0.05;
    if (anneeExperience >= 3 && anneeExperience < 5) return 0;
    if (anneeExperience >= 5) return -0.05;
  };
  const calculMajNAAC = (NAAC: number) => {
    if (!enCreation && !assureurDefaillant) {
      if (NAAC <= 1) return 0.1;
      if (NAAC > 1 && NAAC <= 2) return 0.05;
    }
    return 0;
  };
  const majorations = {
    etp: calculMajETP(etp, nbActivites),
    qualif: qualif ? -0.05 : 0,
    dateCreation: calculMajAnciennete(dateCreation),
    tempsSansActivite: calculMajTempsSansActivite(tempsSansActivite),
    anneeExperience: calculMajExp(anneeExperience),
    assureurDefaillant:
      !enCreation &&
      assureurDefaillant &&
      !(absenceDeSinistreSurLes5DernieresAnnees === "ASSUREUR_DEFAILLANT")
        ? 0.2
        : 0,
    nombreAnneeAssuranceContinue: enCreation
      ? 0
      : calculMajNAAC(nombreAnneeAssuranceContinue),
    nonFournitureBilanN_1: enCreation ? 0 : nonFournitureBilanN_1 ? 0.5 : 0,
    sansActiviteDepuisPlusDe12MoisSansFermeture:
      sansActiviteDepuisPlusDe12MoisSansFermeture === "OUI" ? 0.2 : 0,
    absenceDeSinistreSurLes5DernieresAnnees:
      absenceDeSinistreSurLes5DernieresAnnees === "ASSUREUR_DEFAILLANT"
        ? 0.2
        : 0,
  };

  return majorations;
}
export const tableauTax = [
  { code: 1, title: "Voiries Réseaux Divers (VRD)", rate: 0.0382 },
  { code: 2, title: "Maçonnerie et béton armé", rate: 0.0407 },
  { code: 3, title: "Charpente et structure en bois", rate: 0.0439 },
  { code: 4, title: "Charpente et structure métallique", rate: 0.0439 },
  { code: 5, title: "Couverture", rate: 0.0366 },
  { code: 6, title: "Menuiseries extérieures bois et PVC", rate: 0.0357 },
  { code: 7, title: "Menuiseries extérieures métalliques", rate: 0.0357 },
  { code: 8, title: "Bardages de façades", rate: 0.0379 },
  { code: 9, title: "Menuiseries intérieures", rate: 0.0343 },
  { code: 10, title: "Plâtrerie – Staff – Stuc – Gypserie", rate: 0.0416 },
  { code: 11, title: "Serrurerie - Métallerie", rate: 0.0256 },
  { code: 12, title: "Vitrerie - Miroiterie", rate: 0.0253 },
  { code: 13, title: "Peinture", rate: 0.0296 },
  {
    code: 14,
    title: "Revêtement intérieur de surfaces en matériaux souples et parquets",
    rate: 0.0227,
  },
  {
    code: 15,
    title: "Revêtement de surfaces en matériaux durs - Chapes et sols coulés",
    rate: 0.0361,
  },
  { code: 16, title: "Isolation thermique et acoustique", rate: 0.0251 },
  { code: 17, title: "Plomberie", rate: 0.0293 },
  {
    code: 18,
    title: "Installations thermiques de génie climatique",
    rate: 0.0293,
  },
  {
    code: 19,
    title: "Installations d'aéraulique et de conditionnement d'air",
    rate: 0.0293,
  },
  { code: 20, title: "Electricité -Télécommunications", rate: 0.0298 },
];
const tableauDegAvant = [
  {
    code: 1,
    title: "Voiries Réseaux Divers (VRD)",
    type: "max",
    degressivity1: 0.85,
    degressivity2: 0.75,
  },
  {
    code: 2,
    title: "Maçonnerie et béton armé",
    type: "max",
    degressivity1: 0.85,
    degressivity2: 0.75,
  },
  {
    code: 3,
    title: "Charpente et structure en bois",
    type: "max",
    degressivity1: 0.85,
    degressivity2: 0.75,
  },
  {
    code: 4,
    title: "Charpente et structure métallique",
    type: "max",
    degressivity1: 0.85,
    degressivity2: 0.75,
  },
  {
    code: 5,
    title: "Couverture",
    type: "max",
    degressivity1: 0.85,
    degressivity2: 0.75,
  },
  {
    code: 6,
    title: "Menuiseries extérieures bois et PVC",
    type: "max",
    degressivity1: 0.85,
    degressivity2: 0.75,
  },
  {
    code: 7,
    title: "Menuiseries extérieures métalliques",
    type: "max",
    degressivity1: 0.85,
    degressivity2: 0.75,
  },
  {
    code: 8,
    title: "Bardages de façades",
    type: "max",
    degressivity1: 0.85,
    degressivity2: 0.75,
  },
  {
    code: 9,
    title: "Menuiseries intérieures",
    type: "max",
    degressivity1: 0.8,
    degressivity2: 0.7,
  },
  {
    code: 10,
    title: "Plâtrerie – Staff – Stuc – Gypserie",
    type: "max",
    degressivity1: 0.8,
    degressivity2: 0.7,
  },
  {
    code: 11,
    title: "Serrurerie - Métallerie",
    type: "max",
    degressivity1: 0.8,
    degressivity2: 0.7,
  },
  {
    code: 12,
    title: "Vitrerie - Miroiterie",
    type: "max",
    degressivity1: 0.8,
    degressivity2: 0.7,
  },
  {
    code: 13,
    title: "Peinture",
    type: "max",
    degressivity1: 0.8,
    degressivity2: 0.7,
  },
  {
    code: 14,
    title: "Revêtement intérieur de surfaces en matériaux souples et parquets",
    type: "max",
    degressivity1: 0.8,
    degressivity2: 0.7,
  },
  {
    code: 15,
    title: "Revêtement de surfaces en matériaux durs - Chapes et sols coulés",
    type: "max",
    degressivity1: 0.8,
    degressivity2: 0.7,
  },
  {
    code: 16,
    title: "Isolation thermique et acoustique",
    type: "max",
    degressivity1: 0.8,
    degressivity2: 0.7,
  },
  {
    code: 17,
    title: "Plomberie",
    type: "max",
    degressivity1: 0.8,
    degressivity2: 0.7,
  },
  {
    code: 18,
    title: "Installations thermiques de génie climatique",
    type: "max",
    degressivity1: 0.8,
    degressivity2: 0.7,
  },
  {
    code: 19,
    title: "Installations d'aéraulique et de conditionnement d'air",
    type: "max",
    degressivity1: 0.8,
    degressivity2: 0.7,
  },
  {
    code: 20,
    title: "Electricité -Télécommunications",
    type: "max",
    degressivity1: 0.8,
    degressivity2: 0.7,
  },
];
// Tableau des assureurs défaillants
const assureursDefaillants = [
  "ACASTA",
  "ALPHA_INSURANCE",
  "CBL",
  "EIL",
  "ELITE",
  "GABLE",
  "QUDOS",
];

const calculDeg = (params: {
  caDeclared: number;
  tableauDeg: {
    code: number;
    title: string;
    type: string;
    degressivity1: number;
    degressivity2: number;
  }[];
}) => {
  // 0.982
  const { caDeclared, tableauDeg } = params;

  console.log("caCalculee", caDeclared);

  const resultValue: {
    code: number;
    title: string;
    type: string;
    degressivity: number;
  }[] = [];
  tableauDeg.forEach((deg) => {
    if (caDeclared > 250_000 && caDeclared < 500_000) {
      console.log("caDeclared", caDeclared);
      const degMax =
        1 - ((1 - deg.degressivity1) * (caDeclared - 250_000)) / 250_000;
      resultValue.push({
        code: deg.code,
        title: deg.title,
        type: "CA",
        degressivity: degMax,
      });
    }
    if (caDeclared > 500_000 && caDeclared < 1_000_000) {
      const degMax =
        deg.degressivity1 -
        ((deg.degressivity1 - deg.degressivity2) * (caDeclared - 500_000)) /
          500_000;
      resultValue.push({
        code: deg.code,
        title: deg.title,
        type: "CA",
        degressivity: degMax,
      });
    }
    if (caDeclared >= 70_000 && caDeclared <= 250_000) {
      resultValue.push({
        code: deg.code,
        title: deg.title,
        type: "CA",
        degressivity: deg.degressivity1,
      });
    }
  });
  return resultValue;
};
export function getTaxeByRegion(region: string) {
  const regionRea = region.toLowerCase().replace(" ", "-");
  console.log("regionRea", regionRea);
  const taxeByRegion: { [key: string]: number } = {
    martinique: 0.09,
    guadeloupe: 0.09,
    reunion: 0.09,
    guyane: 0.045,
    mayotte: 0.045,
    "st-martin": 0.05,
    "st-barth": 0.0,
  };
  return taxeByRegion[regionRea];
}
export function getTaxeProtectionJuridiqueByRegion(region: string) {
  const regionRea = region.toLowerCase().replace(" ", "-");
  console.log("regionRea", regionRea);
  const taxeByRegion: { [key: string]: number } = {
    martinique: 0.134,
    guadeloupe: 0.134,
    reunion: 0.134,
    guyane: 0.067,
    mayotte: 0.067,
    "st-martin": 0.05,
    "st-barth": 0.0,
  };
  return taxeByRegion[regionRea];
}
export function calculPrimeRCD(params: {
  enCreation: boolean;
  caDeclared: number;
  honoraireGestion: number;
  etp: number;
  activites: { code: number; caSharePercent: number }[];
  dateCreation: Date;
  tempsSansActivite: Enum_Temps_sans_activite;
  anneeExperience: number;
  assureurDefaillant: boolean;
  nombreAnneeAssuranceContinue: number;
  qualif: boolean;
  sansActiviteDepuisPlusDe12MoisSansFermeture: "OUI" | "NON" | "CREATION";
  absenceDeSinistreSurLes5DernieresAnnees:
    | "OUI"
    | "NON"
    | "CREATION"
    | "ASSUREUR_DEFAILLANT"
    | "A_DEFINIR";
  protectionJuridique: boolean;

  fractionnementPrime: "annuel" | "mensuel" | "trimestriel" | "semestriel";
  fraisFractionnementPrime: number;
  protectionJuridique1an: number;
  taxeAssurance: number;
  taxeProtectionJuridique: number;
  partSoutraitance: number;
  partNegoce: number;
  nonFournitureBilanN_1: boolean;
  reprisePasse: boolean;
  txFraisGestion: number;
  dateFinCouverturePrecedente: Date;

  // Nouveaux paramètres pour la reprise du passé
  nomDeLAsurreur: string;
  dateEffet?: Date; // Date d'effet du contrat (ISO)

  sinistresPrecedents?: SinistrePasse[]; // Sinistres des 5 dernières années
}) {
  const {
    enCreation,
    caDeclared,
    honoraireGestion,
    etp,
    activites: activitesRaw,
    dateCreation,

    anneeExperience,
    assureurDefaillant,
    nombreAnneeAssuranceContinue,
    qualif,
    tempsSansActivite,

    // Paramètres reprise du passé
    nomDeLAsurreur,
    dateEffet,
    sansActiviteDepuisPlusDe12MoisSansFermeture,
    absenceDeSinistreSurLes5DernieresAnnees,

    fractionnementPrime,
    protectionJuridique1an = 106.0,
    txFraisGestion = 0.1,
    taxeAssurance,
    taxeProtectionJuridique,
    fraisFractionnementPrime = 40,
    partSoutraitance,
    partNegoce,
    nonFournitureBilanN_1,
    reprisePasse,
    sinistresPrecedents = [],
    dateFinCouverturePrecedente,
  } = params;
  console.log("params", params);
  console.log("protectionJuridique1an", protectionJuridique1an);

  const calculCA = (params: { caDeclared: number; etp: number }) => {
    const { caDeclared, etp } = params;
    if (etp * 70_000 > caDeclared) return etp * 70_000;
    return caDeclared;
  };
  const reformatedActivites = (
    activites: { code: number; caSharePercent: number }[]
  ) =>
    activites.map((activite) => ({
      ...activite,
      caSharePercent:
        activite.caSharePercent > 0
          ? activite.caSharePercent / 100
          : activite.caSharePercent,
    }));

  const activites = reformatedActivites(activitesRaw);

  const caCalculee = calculCA({ caDeclared, etp });

  const refus: ReturnValueRefus = verifRefus({
    experienceDirigeant: anneeExperience,
    tempsSansActivite,
    partSoutraitance,
    partNegoce,
  });

  const isAssureurDefaillant = assureursDefaillants.includes(nomDeLAsurreur);

  const majorations = calculateMajorations({
    enCreation,
    etp,
    nbActivites: activites.length,
    qualif,
    dateCreation,
    tempsSansActivite,
    anneeExperience,
    assureurDefaillant,
    nombreAnneeAssuranceContinue,
    nonFournitureBilanN_1,
    sansActiviteDepuisPlusDe12MoisSansFermeture,
    absenceDeSinistreSurLes5DernieresAnnees,
  });

  type returnTab = {
    nomActivite: string;
    partCA: number;
    tauxBase: number;
    tauxApplique: number;
    PrimeMiniAct: number;
    DegMax: number;
    Deg400k: number;
    PrimeRefAct: number;
    Prime100Ref: number;
    Prime100Min: number;
  };

  type returnValue = {
    caCalculee: number;
    honoraireGestion: number;
    refus: boolean;
    refusReason: string;
    returnTab: returnTab[];
    PminiHT: number;
    PrimeHTSansMajorations: number;
    totalMajorations: number;
    primeMini: number;
    primeMiniAvecMajorations: number;
    primeAuDela: number;
    primeTotal: number;
    majorations: typeof majorations;
    reprisePasseResult?: ReprisePasseResult; // Résultat du calcul de reprise du passé
    protectionJuridique: number;
    fraisGestion: number;
    totalTTC: number;
    echeancier?: EcheancierResult;
    nbEcheances: number;
    autres: {
      taxeAssurance: number;
      protectionJuridiqueTTC: number;
      fraisFractionnementPrimeHT: number;
      total: number;
    };
    primeAggravationBilanN_1NonFourni: number;
  };

  const plafond = 70_000;

  const returnTab: returnTab[] = [];

  const returnValue: returnValue = {
    caCalculee: caCalculee,
    honoraireGestion: honoraireGestion,
    refus:
      refus.experienceDirigeant ||
      refus.sansAssuranceDepuisPlusDe12Mois ||
      refus.partSoutraitance ||
      refus.partNegoce,
    refusReason: refus.experienceDirigeant
      ? "Expérience du dirigeant"
      : refus.sansAssuranceDepuisPlusDe12Mois
      ? "Sans assurance depuis plus de 12 mois"
      : refus.partSoutraitance
      ? "Part de soutraitance"
      : refus.partNegoce
      ? "Part de négociation"
      : "",
    returnTab: [],
    PminiHT: 0,
    primeMini: 0,
    PrimeHTSansMajorations: 0,
    totalMajorations: 0,
    primeMiniAvecMajorations: 0,
    primeAuDela: 0,
    primeTotal: 0,
    majorations: majorations,
    reprisePasseResult: undefined,
    protectionJuridique: protectionJuridique1an * (1 + taxeProtectionJuridique),
    fraisGestion: 0,
    totalTTC: 0,
    nbEcheances: {
      annuel: 1,
      mensuel: 12,
      trimestriel: 4,
      semestriel: 2,
    }[fractionnementPrime],
    echeancier: undefined,
    autres: {
      taxeAssurance: 0,
      protectionJuridiqueTTC: 0,
      fraisFractionnementPrimeHT: 0,
      total: 0,
    },
    primeAggravationBilanN_1NonFourni: 0,
  };

  const calculSommeTauxActPartCa = (
    activites: { code: number; caSharePercent: number }[],
    tableauTax: { code: number; rate: number }[]
  ) => {
    return activites.reduce((acc, activite) => {
      const rate = tableauTax.find((tax) => tax.code === activite.code)?.rate;
      return acc + (rate ? rate * activite.caSharePercent : 0);
    }, 0);
  };

  const tableauDeg = calculDeg({
    caDeclared: caCalculee,
    tableauDeg: tableauDegAvant,
  });

  console.log("tableauDeg", tableauDeg);

  const totalMajorations = Object.entries(returnValue.majorations)
    .filter(([key]) => key !== "nonFournitureBilanN_1")
    .reduce(
      (acc: number, [, val]: [string, number | undefined]) => acc + (val ?? 0),
      1
    );

  activites.forEach((activite) => {
    const degMax = tableauDeg.find(
      (deg) => deg.code === activite.code
    )?.degressivity;
    const deg400k = tableauDeg.find(
      (deg) => deg.code === activite.code && deg.type === "CA"
    )?.degressivity;
    const rate = tableauTax.find((tax) => tax.code === activite.code)?.rate;
    const tauxBase =
      deg400k && caCalculee > 250000 ? (rate ?? 0) * deg400k : rate ?? 0;
    const primeMiniAct = tauxBase * plafond * activite.caSharePercent;

    const prime100Min =
      tauxBase * (caCalculee - plafond) * activite.caSharePercent;

    returnTab.push({
      nomActivite:
        tableauTax.find((tax) => tax.code === activite.code)?.title ?? "",
      partCA: activite.caSharePercent,
      tauxBase,
      tauxApplique: tauxBase * (caCalculee > 250000 ? deg400k ?? 1 : 1),
      PrimeMiniAct: primeMiniAct,
      DegMax: degMax ?? 0,
      Deg400k: deg400k ?? 0,
      PrimeRefAct: -1,
      Prime100Ref: -1,
      Prime100Min: prime100Min,
    });
  });

  returnValue.PminiHT = returnTab.reduce(
    (acc, activite) => acc + activite.PrimeMiniAct,
    0
  );
  returnValue.primeMini = returnTab.reduce(
    (acc, activite) => acc + activite.Prime100Min,
    0
  );
  returnValue.primeMiniAvecMajorations = returnValue.PminiHT * totalMajorations;
  returnValue.PrimeHTSansMajorations =
    returnValue.PminiHT + returnValue.primeMini;
  returnValue.totalMajorations = totalMajorations;

  returnValue.primeTotal =
    returnValue.PrimeHTSansMajorations * totalMajorations;
  returnValue.fraisGestion = returnValue.primeTotal * txFraisGestion;
  returnValue.autres.fraisFractionnementPrimeHT =
    returnValue.nbEcheances > 1
      ? returnValue.nbEcheances * fraisFractionnementPrime
      : 0;
  returnValue.autres.taxeAssurance =
    returnValue.primeTotal * taxeAssurance +
    returnValue.autres.fraisFractionnementPrimeHT * taxeAssurance;
  returnValue.autres.protectionJuridiqueTTC =
    protectionJuridique1an * (1 + taxeProtectionJuridique);
  returnValue.autres.total =
    returnValue.autres.taxeAssurance +
    returnValue.autres.protectionJuridiqueTTC +
    returnValue.autres.fraisFractionnementPrimeHT;
  returnValue.primeAuDela =
    returnValue.primeTotal - returnValue.primeMiniAvecMajorations;
  returnValue.totalTTC =
    returnValue.primeTotal +
    returnValue.autres.total +
    returnValue.fraisGestion;
  returnValue.returnTab = returnTab;
  returnValue.echeancier = genererEcheancier({
    dateDebut: dateEffet ?? new Date(),
    totalHT: returnValue.primeTotal,
    taxe: returnValue.autres.taxeAssurance,
    totalTTC: returnValue.totalTTC,
    rcd: returnValue.primeTotal,
    pj: returnValue.autres.protectionJuridiqueTTC,
    frais: returnValue.autres.fraisFractionnementPrimeHT,
    reprise: 0, // Pas de reprise dans cet exemple
    fraisGestion: returnValue.fraisGestion,
    periodicite: fractionnementPrime,
    // caCalculee: returnValue.caCalculee,
    // primeHTSansMajorations: returnValue.PrimeHTSansMajorations,
    // totalMajorations: returnValue.totalMajorations,
    // primeMini: returnValue.primeMini,
    // primeAuDela: returnValue.primeAuDela,
    // primeTotal: returnValue.primeTotal,
    // majorations: returnValue.majorations,
    // protectionJuridique: returnValue.protectionJuridique,
    // autres: returnValue.autres,
    // primeAggravationBilanN_1NonFourni: returnValue.primeAggravationBilanN_1NonFourni,
  });

  returnValue.primeAggravationBilanN_1NonFourni = returnValue.majorations
    .nonFournitureBilanN_1
    ? returnValue.primeTotal *
      returnValue.majorations.nonFournitureBilanN_1 *
      (1 + txFraisGestion + taxeAssurance)
    : 0;
  console.log("returnValue", returnValue);
  // Calcul de la reprise du passé si activée
  if (
    (isAssureurDefaillant || assureurDefaillant) &&
    dateEffet &&
    reprisePasse
  ) {
    try {
      const reprisePasseResult = calculReprisePasseRCD({
        tauxTI: [
          0.7, 0.686, 0.672, 0.658, 0.644, 0.63, 0.616, 0.602, 0.588, 0.574,
          0.56, 0.546, 0.532, 0.518, 0.504, 0.49, 0.476, 0.462, 0.448, 0.434,
          0.42, 0.406, 0.392, 0.378, 0.364, 0.35, 0.336, 0.322, 0.308, 0.294,
          0.28, 0.266, 0.252, 0.238, 0.224, 0.21, 0.196, 0.182, 0.168, 0.154,
          0.14, 0.126, 0.112, 0.098, 0.084, 0.07, 0.056, 0.042, 0.028, 0.014,
          0.0,
        ],
        primeAnnuelleHT: returnValue.PrimeHTSansMajorations,
        dureeCouvertureAssureur: 5, // Par défaut 5 ans, à adapter selon les besoins
        dateFinCouverturePrecedente,
        sinistresPrecedents,
        coefficientAntecedent: 1,
        dateCreation: dateCreation,
      });
      returnValue.reprisePasseResult = reprisePasseResult;
    } catch (error) {
      console.error("Erreur lors du calcul de la reprise du passé:", error);
      // On continue sans la reprise du passé en cas d'erreur
      returnValue.reprisePasseResult = undefined;
    }
  }

  return returnValue;
}

// ========== FONCTION ÉCHÉANCIER SIMPLE ==========

type EcheancierParams = {
  dateDebut: Date; // Date de début du contrat
  totalHT: number; // Total HT
  taxe: number; // Taxe €
  totalTTC: number; // Total TTC
  rcd: number; // RCD
  pj: number; // PJ
  frais: number; // Frais
  reprise: number; // Reprise
  fraisGestion: number; // Frais de gestion
  periodicite: "annuel" | "semestriel" | "trimestriel" | "mensuel";
  // Informations complètes du calcul
  // caCalculee: number;
  // primeHTSansMajorations: number;
  // totalMajorations: number;
  // primeMini: number;
  // primeAuDela: number;
  // primeTotal: number;
  // majorations: any;
  // protectionJuridique: number;
  // autres: {
  //   taxeAssurance: number;
  //   protectionJuridiqueTTC: number;
  //   fraisFractionnementPrimeHT: number;
  //   total: number;
  // };
  // primeAggravationBilanN_1NonFourni: number;
};

type Echeance = {
  date: string; // Format "DD/MM/YYYY"
  totalHT: number;
  taxe: number;
  totalTTC: number;
  rcd: number;
  pj: number;
  frais: number;
  reprise: number;
  fraisGestion: number;
  debutPeriode: string; // Format "DD/MM/YYYY"
  finPeriode: string; // Format "DD/MM/YYYY"
};

type EcheancierResult = {
  echeances: Echeance[];
  nbEcheances: number;
  // Informations complètes du calcul
  // caCalculee: number;
  // primeHTSansMajorations: number;
  // totalMajorations: number;
  // primeMini: number;
  // primeAuDela: number;
  // primeTotal: number;
  // majorations: any;
  // protectionJuridique: number;
  // fraisGestion: number;
  // autres: {
  //   taxeAssurance: number;
  //   protectionJuridiqueTTC: number;
  //   fraisFractionnementPrimeHT: number;
  //   total: number;
  // };
  // primeAggravationBilanN_1NonFourni: number;
};

export function genererEcheancier(params: EcheancierParams): EcheancierResult {
  const {
    dateDebut,
    totalHT,
    taxe,
    totalTTC,
    rcd,
    pj,
    frais,
    reprise,
    fraisGestion,
    periodicite,
    // caCalculee,
    // primeHTSansMajorations,
    // totalMajorations,
    // primeMini,
    // primeAuDela,
    // primeTotal,
    // majorations,
    // protectionJuridique,
    // autres,
    // primeAggravationBilanN_1NonFourni
  } = params;

  const echeances: Echeance[] = [];

  // Calculer le nombre d'échéances selon la périodicité
  const nbEcheancesParAn = {
    annuel: 1,
    semestriel: 2,
    trimestriel: 4,
    mensuel: 12,
  }[periodicite];
  const nbEcheances = nbEcheancesParAn;
  console.log("nbEcheancesParAn :", nbEcheancesParAn);
  console.log("nbEcheances :", nbEcheances);

  // On génère un tableau de dates (type Date uniquement) qui coupe l'année en nbEcheances parts égales
  // On part du 1er janvier de l'année courante
  const year = dateDebut.getFullYear();
  console.log("Année de début :", year);

  // On calcule le nombre de jours entre le 1er janvier de l'année courante et la date de début
  const nbJoursDepuisDateDebut = Math.floor(
    (dateDebut.getTime() - new Date(year, 0, 1).getTime()) /
      (1000 * 60 * 60 * 24)
  );
  console.log(
    "Nombre de jours depuis le 1er janvier :",
    nbJoursDepuisDateDebut
  );

  const nbEcheancesNbJours = 365.25 / nbEcheances;
  console.log("Nombre de jours par échéance :", nbEcheancesNbJours);

  let premierPaiementDeLAnnee = true;
  let totalPaiement = 0;

  let nbJoursPaye = nbJoursDepuisDateDebut;
  console.log("nbJoursPaye initial :", nbJoursPaye);

  if (nbJoursDepuisDateDebut > 1) {
    const nbAnneeAEcheance = 2;
    console.log("nbAnneeAEcheance :", nbAnneeAEcheance);

    const iFn = () => {
      for (let k = 0; k <= nbEcheances; k++) {
        if (k * nbEcheancesNbJours > nbJoursDepuisDateDebut) {
          console.log("iFn retourne :", k);
          return k;
        }
      }
      console.log("iFn retourne 0");
      return 0;
    };
    const i = iFn();
    console.log("Valeur de i :", i);

    for (let j = i - 1; j < nbAnneeAEcheance * nbEcheances; j++) {
      const formatDate = (date: Date) => {
        const d = date.getDate().toString().padStart(2, "0");
        const m = (date.getMonth() + 1).toString().padStart(2, "0");
        const y = date.getFullYear();
        return `${d}/${m}/${y}`;
      };
      const dateEcheanceIPLus1D = new Date(
        new Date(year, 0, 1).getTime() +
          nbEcheancesNbJours * (j + 1) * 24 * 60 * 60 * 1000
      );
      const dateEcheanceIPLus1 = formatDate(dateEcheanceIPLus1D);

      const dateEcheance = formatDate(
        j === i - 1
          ? dateDebut
          : new Date(
              new Date(year, 0, 1).getTime() +
                nbEcheancesNbJours * j * 24 * 60 * 60 * 1000
            )
      );
      console.log(
        `Échéance ${j}: dateEcheanceI_1 = ${dateEcheanceIPLus1}, dateEcheance = ${dateEcheance}`
      );

      if (
        dateEcheanceIPLus1D.getFullYear() >= year + 1 &&
        j % nbEcheances === 0
      ) {
        premierPaiementDeLAnnee = true;
        console.log("Premier paiement de l'année détecté pour j =", j);
      }
      const ratio =
        nbJoursPaye % nbEcheancesNbJours === 0
          ? 1
          : (nbEcheancesNbJours * (j + 1) - nbJoursPaye) / nbEcheancesNbJours;
      console.log(`ratio pour j=${j} :`, ratio);

      const taxeEcheance =
        (taxe / nbEcheances) * ratio +
        (premierPaiementDeLAnnee ? frais * 0.045 : 0);

      const rcdEcheance = ((rcd + taxe + frais) / nbEcheances) * ratio;
      console.log(rcd, taxe, frais, "rcdEcheance", rcdEcheance, ratio);
      const pjEcheance = premierPaiementDeLAnnee ? pj : 0;
      const fraisEcheance = premierPaiementDeLAnnee ? frais : 0;
      const repriseEcheance = premierPaiementDeLAnnee ? reprise : 0;
      const fraisGestionEcheance = premierPaiementDeLAnnee ? fraisGestion : 0;
      const totalHTEcheance =
        rcdEcheance +
        fraisGestionEcheance +
        pjEcheance +
        (repriseEcheance === undefined ? 0 : repriseEcheance) -
        taxeEcheance;

      const totalTCHEcheance = totalHTEcheance + taxeEcheance;

      console.log(
        `totalHTEcheance : ${totalHTEcheance}, taxeEcheance : ${taxeEcheance}, totalTCHEcheance : ${totalTCHEcheance}, rcdEcheance : ${rcdEcheance}, pjEcheance : ${pjEcheance}, fraisEcheance : ${fraisEcheance}, repriseEcheance : ${repriseEcheance}, fraisGestionEcheance : ${fraisGestionEcheance}`
      );

      totalPaiement +=
        totalHTEcheance +
        taxeEcheance +
        rcdEcheance +
        pjEcheance +
        fraisEcheance +
        repriseEcheance +
        fraisGestionEcheance;

      console.log("totalPaiement cumulé :", totalPaiement);

      echeances.push({
        date: dateEcheance,
        totalHT: totalHTEcheance,
        taxe: taxeEcheance,
        totalTTC: totalTCHEcheance,
        rcd: rcdEcheance,
        pj: pjEcheance,
        frais: fraisEcheance,
        reprise: repriseEcheance,
        fraisGestion: fraisGestionEcheance,
        debutPeriode: dateEcheance,
        finPeriode: dateEcheanceIPLus1,
      });

      nbJoursPaye = nbEcheancesNbJours;
      console.log("nbJoursPaye après incrément :", nbJoursPaye);

      premierPaiementDeLAnnee = false;
    }
  }

  return {
    echeances,
    nbEcheances,
    // caCalculee,
    // primeHTSansMajorations,
    // totalMajorations,
    // primeMini,
    // primeAuDela,
    // primeTotal,
    // majorations,
    // protectionJuridique,
    // fraisGestion,
    // autres,
    // primeAggravationBilanN_1NonFourni
  };
}

// ========== CALCUL REPRISE DU PASSÉ ==========

type SinistrePasse = {
  year: number;
  numClaims: number;
  totalCost: number;
};

type ReprisePasseParams = {
  dateCreation: Date; // Date de création de l'entreprise (ISO)
  tauxTI: number[]; // Taux TI par année (ex: [0.700, 0.686, 0.672, 0.658, 0.644, 0.630, 0.616, 0.602, 0.588, 0.574, 0.560, 0.546, 0.532, 0.518, 0.504, 0.490, 0.476, 0.462, 0.448, 0.434, 0.420, 0.406, 0.392, 0.378, 0.364, 0.350, 0.336, 0.322, 0.308, 0.294, 0.280, 0.266, 0.252, 0.238, 0.224, 0.210, 0.196, 0.182, 0.168, 0.154, 0.140, 0.126, 0.112, 0.098, 0.084, 0.070, 0.056, 0.042, 0.028, 0.014, 0.000])
  primeAnnuelleHT: number; // Prime annuelle calculée avec tous les coefficients
  dureeCouvertureAssureur: number; // Durée de couverture de l'assureur (en années)
  dateFinCouverturePrecedente: Date; // Date de fin de couverture précédente (ISO)
  sinistresPrecedents: SinistrePasse[]; // Sinistres des 5 dernières années
  coefficientAntecedent: number; // Coefficient selon ancienneté (0.3, 0.6, 1, 1.4, 1.7, etc.)
};

type ReprisePasseResult = {
  // Tableau des années avec calculs
  tableauAnnees: {
    annee: number;
    tauxTI: number;
    pourcentageAnnee: number;
    primeRepriseAnnee: number;
  }[];

  // Analyse sinistralité
  ratioSP: number; // S/P = (coût sinistres cumulé) / (prime annuelle HT * coeff antécédent)
  frequenceSinistres: number; // Min(Nb sinistres / Nb années ; Nb sinistres avec suite / Nb années)

  // Classification selon le tableau
  categorieAnciennete: string; // "< 3ans", "3 à 7 ans", "> 7 ans"
  categorieFrequence: string; // "0", "0 à 0.5", "0.5 à 1", "1 à 2", "> 2"
  categorieRatioSP: string; // "0", "0 à 0.5", "0.5 à 0.7", "0.7 à 1", "> 1"

  tauxMajoration: number; // Taux de majoration
  primeReprisePasseTTC: number; // Prime de reprise du passé TTC finale
  primeApresSinistralite: number; // Prime après sinistralité
};

/**
 * Calcule la prime de reprise du passé selon les règles RCD
 *
 * @param params - Paramètres de calcul de la reprise du passé
 * @returns Résultat détaillé du calcul de reprise du passé
 */
export function calculReprisePasseRCD(
  params: ReprisePasseParams
): ReprisePasseResult {
  const {
    dateCreation,
    tauxTI,
    primeAnnuelleHT,
    dureeCouvertureAssureur,
    dateFinCouverturePrecedente,
    sinistresPrecedents,
    coefficientAntecedent,
  } = params;

  const anciennete =
    new Date().getFullYear() - dateCreation.getFullYear() === 0
      ? 1
      : new Date().getFullYear() - dateCreation.getFullYear();

  console.log("anciennete reprise passe", anciennete);

  // Tableaux de référence selon les spécifications
  const tableauCoefficientsAnciennete = [
    { anciennete: 1, coefficient: 0.3 },
    { anciennete: 2, coefficient: 0.6 },
    { anciennete: 3, coefficient: 1.0 },
    { anciennete: 4, coefficient: 1.4 },
    { anciennete: 5, coefficient: 1.7 },
    { anciennete: 6, coefficient: 2.6 },
    { anciennete: 7, coefficient: 3.3 },
    { anciennete: 8, coefficient: 4.1 },
    { anciennete: 9, coefficient: 5.0 },
    { anciennete: 10, coefficient: 5.9 },
    { anciennete: 11, coefficient: 6.8 },
    { anciennete: 12, coefficient: 7.8 },
    { anciennete: 13, coefficient: 8.8 },
  ];

  console.log(
    "tableauCoefficientsAnciennete reprise passe",
    tableauCoefficientsAnciennete
  );

  // Tableau principal de coefficients selon ancienneté, fréquence et ratio S/P
  const tableauCoefficients = {
    "< 3ans": {
      "0": {
        "0": 1.0,
        "0 à 0.5": 1.0,
        "0.5 à 0.7": 1.0,
        "0.7 à 1": 1.0,
        "> 1": 1.0,
      },
      "0 à 0.5": {
        "0": 1.0,
        "0 à 0.5": 1.1,
        "0.5 à 0.7": 1.2,
        "0.7 à 1": 1.3,
        "> 1": "Analyse Cie",
      },
      "0.5 à 1": {
        "0": "Non",
        "0 à 0.5": "Non",
        "0.5 à 0.7": "Non",
        "0.7 à 1": "Non",
        "> 1": "Non",
      },
      "1 à 2": {
        "0": "Non",
        "0 à 0.5": "Non",
        "0.5 à 0.7": "Non",
        "0.7 à 1": "Non",
        "> 1": "Non",
      },
      "> 2": {
        "0": "Non",
        "0 à 0.5": "Non",
        "0.5 à 0.7": "Non",
        "0.7 à 1": "Non",
        "> 1": "Non",
      },
    },
    "3 à 7 ans": {
      "0": {
        "0": 0.9,
        "0 à 0.5": 0.9,
        "0.5 à 0.7": 0.9,
        "0.7 à 1": 0.9,
        "> 1": 0.9,
      },
      "0 à 0.5": {
        "0": 0.9,
        "0 à 0.5": 0.97,
        "0.5 à 0.7": 1.1,
        "0.7 à 1": 1.2,
        "> 1": "Analyse Cie",
      },
      "0.5 à 1": {
        "0": "Non",
        "0 à 0.5": "Non",
        "0.5 à 0.7": 0.95,
        "0.7 à 1": 1.05,
        "> 1": 1.15,
      },
      "1 à 2": {
        "0": "Non",
        "0 à 0.5": "Non",
        "0.5 à 0.7": "Non",
        "0.7 à 1": "Non",
        "> 1": "Non",
      },
      "> 2": {
        "0": "Non",
        "0 à 0.5": "Non",
        "0.5 à 0.7": "Non",
        "0.7 à 1": "Non",
        "> 1": "Non",
      },
    },
    "> 7 ans": {
      "0": {
        "0": 0.8,
        "0 à 0.5": 0.8,
        "0.5 à 0.7": 0.8,
        "0.7 à 1": 0.8,
        "> 1": 0.8,
      },
      "0 à 0.5": {
        "0": 0.8,
        "0 à 0.5": 0.9,
        "0.5 à 0.7": 1.0,
        "0.7 à 1": 1.1,
        "> 1": 1.2,
      },
      "0.5 à 1": {
        "0": "Non",
        "0 à 0.5": "Non",
        "0.5 à 0.7": 0.95,
        "0.7 à 1": 1.05,
        "> 1": 1.15,
      },
      "1 à 2": {
        "0": "Non",
        "0 à 0.5": "Non",
        "0.5 à 0.7": "Non",
        "0.7 à 1": "Non",
        "> 1": "Non",
      },
      "> 2": {
        "0": "Non",
        "0 à 0.5": "Non",
        "0.5 à 0.7": "Non",
        "0.7 à 1": "Non",
        "> 1": "Non",
      },
    },
  };

  console.log("tableauCoefficients reprise passe", tableauCoefficients);

  const sP =
    sinistresPrecedents.reduce((sum, s) => sum + s.totalCost, 0) /
    (primeAnnuelleHT *
      (tableauCoefficientsAnciennete.find(
        (item) => item.anciennete === anciennete
      )?.coefficient || 0));

  const frequence =
    sinistresPrecedents.reduce((sum, s) => sum + s.numClaims, 0) / anciennete;

  console.log("sP reprise passe", sP);
  console.log("frequence reprise passe", frequence);

  const categorieAnciennete =
    (tableauCoefficientsAnciennete.find(
      (item) => item.anciennete === anciennete
    )?.anciennete || 0) < 3
      ? "< 3ans"
      : (tableauCoefficientsAnciennete.find(
          (item) => item.anciennete === anciennete
        )?.anciennete || 0) <= 7
      ? "3 à 7 ans"
      : "> 7 ans";
  const categorieFrequence =
    frequence === 0
      ? "0"
      : frequence <= 0.5
      ? "0 à 0.5"
      : frequence <= 1
      ? "0.5 à 1"
      : frequence <= 2
      ? "1 à 2"
      : "> 2";
  const categorieRatioSP =
    sP === 0
      ? "0"
      : sP <= 0.5
      ? "0 à 0.5"
      : sP <= 0.7
      ? "0.5 à 0.7"
      : sP <= 1
      ? "0.7 à 1"
      : "> 1";

  console.log("categorieAnciennete reprise passe", categorieAnciennete);
  console.log("categorieFrequence reprise passe", categorieFrequence);
  console.log("categorieRatioSP reprise passe", categorieRatioSP);

  const tauxMajoration =
    (tableauCoefficients as any)[categorieAnciennete]?.[categorieFrequence]?.[
      categorieRatioSP
    ] === "Non"
      ? -1
      : (tableauCoefficients as any)[categorieAnciennete]?.[
          categorieFrequence
        ]?.[categorieRatioSP];
  console.log("tauxMajoration reprise passe", tauxMajoration);

  // 1. Construction du tableau des années (de la plus récente à la plus ancienne)
  const tableauAnnees: {
    annee: number;
    tauxTI: number;
    pourcentageAnnee: number;
    primeRepriseAnnee: number;
  }[] = [];

  const anneeFin = dateFinCouverturePrecedente.getFullYear();
  const moisFin = dateFinCouverturePrecedente.getMonth();
  const jourFin = dateFinCouverturePrecedente.getDate();

  // Pour chaque année de la période de couverture
  for (let i = 0; i < dureeCouvertureAssureur; i++) {
    const annee = anneeFin - i;
    const tauxTIAnnee = tauxTI[i] || 0; // Taux TI pour cette année

    // Calcul du pourcentage de l'année
    let pourcentageAnnee = 1; // Par défaut, année complète

    if (i === 0) {
      // Première année (la plus récente) : calculer le pourcentage depuis le début de l'année
      const debutAnnee = new Date(annee, 0, 1);
      const finAnnee = new Date(annee, 11, 31);
      const totalJoursAnnee =
        Math.ceil(
          (finAnnee.getTime() - debutAnnee.getTime()) / (1000 * 60 * 60 * 24)
        ) + 1;
      const joursDepuisDebutAnnee =
        Math.ceil(
          (dateFinCouverturePrecedente.getTime() - debutAnnee.getTime()) /
            (1000 * 60 * 60 * 24)
        ) + 1;
      pourcentageAnnee = Math.min(1, joursDepuisDebutAnnee / totalJoursAnnee);
    }

    // Calcul de la prime de reprise pour cette année
    const primeRepriseAnnee = tauxTIAnnee * pourcentageAnnee * primeAnnuelleHT;

    tableauAnnees.push({
      annee,
      tauxTI: tauxTIAnnee,
      pourcentageAnnee: Math.round(pourcentageAnnee * 10000) / 100, // en %
      primeRepriseAnnee: Math.round(primeRepriseAnnee),
    });
  }

  return {
    tableauAnnees,
    ratioSP: sP,
    frequenceSinistres: Math.round(frequence * 100) / 100,
    categorieAnciennete,
    categorieFrequence,
    categorieRatioSP,
    tauxMajoration,
    primeReprisePasseTTC: tableauAnnees.reduce(
      (sum, item) => sum + item.primeRepriseAnnee,
      0
    ),
    primeApresSinistralite: primeAnnuelleHT * tauxMajoration,
  };
}
