export const CABINET = {
  name: "ENCYCLIE CONSTRUCTION",
  addressLine: "10 rue de Louvois",
  postalCode: "75002",
  city: "Paris",
  postalCity: "75002 Paris",
  postalCityCaps: "75002 PARIS",
  fullAddress: "10 rue de Louvois, 75002 Paris",
  email: "contact@encyclie-construction.com",
  phone: "01 85 09 42 06",
  website: "https://www.encyclie-construction.com",
  websiteHost: "www.encyclie-construction.com",
} as const;

export const CABINET_DISTRIBUTOR_LINE = `${CABINET.name} – ${CABINET.addressLine}, ${CABINET.postalCityCaps} - SAS au capital de 1 000 € - SIREN 897 796 785 – RCS Paris – N° ORIAS : 21 004 564 –`;

export const CABINET_LEGAL_FOOTER = `${CABINET_DISTRIBUTOR_LINE} www.orias.fr – Sous le contrôle de l'ACPR, Autorité de Contrôle Prudentiel et de Résolution – 4 Place de Budapest, CS 92459, 75436 PARIS CEDEX 09 – acpr.banque-france.fr – Assurance de Responsabilité Civile Professionnelle et Garantie Financière conformes au Code des assurances.`;
