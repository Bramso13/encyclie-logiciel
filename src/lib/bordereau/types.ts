import { ContractStatus } from "@prisma/client";

/**
 * Filters for bordereau data extraction
 */
export interface BordereauFilters {
  /** Date range for filtering by payment installment due dates */
  dateRange: {
    startDate: Date;
    endDate: Date;
  };
  /** Optional broker IDs to filter by */
  brokerIds?: string[];
  /** Optional contract status filter */
  contractStatus?: ContractStatus[];
  /** Optional product type filter */
  productType?: string;
  /** Include quotes (devis) in addition to contracts. Filter quotes by createdAt in date range. Default true. */
  includeQuotes?: boolean;
}

/**
 * FIDELIDADE CSV row structure (36 columns)
 */
export interface FidelidadeRow {
  // Broker and policy identification
  APPORTEUR: string;
  IDENTIFIANT_POLICE: string;

  // Dates
  DATE_SOUSCRIPTION: string;
  DATE_EFFET_CONTRAT: string;
  DATE_FIN_CONTRAT: string;
  DATE_ECHEANCE: string;

  // Avenant (amendment) fields - empty for now
  NUMERO_AVENANT: string;
  MOTIF_AVENANT: string;
  DATE_EFFET_AVENANT: string;

  // Policy status
  ETAT_POLICE: string;
  DATE_ETAT_POLICE: string;
  MOTIF_ETAT: string;
  FRANCTIONNEMENT: string;

  // Company information
  SIREN: string;
  ADRESSE_RISQUE: string;
  VILLE_RISQUE: string;
  CODE_POSTAL_RISQUE: string;
  CA_ENTREPRISE: string;
  EFFECTIF_ENTREPRISE: string;
  CODE_NAF: string;

  // Activities (up to 8)
  LIBELLE_ACTIVITE_1: string;
  POID_ACTIVITE_1: string;
  LIBELLE_ACTIVITE_2: string;
  POID_ACTIVITE_2: string;
  LIBELLE_ACTIVITE_3: string;
  POID_ACTIVITE_3: string;
  LIBELLE_ACTIVITE_4: string;
  POID_ACTIVITE_4: string;
  LIBELLE_ACTIVITE_5: string;
  POID_ACTIVITE_5: string;
  LIBELLE_ACTIVITE_6: string;
  POID_ACTIVITE_6: string;
  LIBELLE_ACTIVITE_7: string;
  POID_ACTIVITE_7: string;
  LIBELLE_ACTIVITE_8: string;
  POID_ACTIVITE_8: string;
}

/**
 * Activity mapping for FIDELIDADE format
 */
export interface ActivityData {
  code: number; // 1-20
  caSharePercent: number;
}

/** Une entrée "donnée du devis" pour drag & drop (clé + valeur texte) */
export interface SourceDataItem {
  key: string;
  value: string;
}

/**
 * Result of bordereau data extraction
 */
export interface BordereauDataResult {
  rows: FidelidadeRow[];
  /** Données sources par ligne (formData, companyData, calculatedPremium aplatis) pour drag & drop */
  sourceDataPerRow: SourceDataItem[][];
  metadata: {
    totalContracts: number;
    totalQuotes?: number;
    dateRange: {
      startDate: Date;
      endDate: Date;
    };
    generatedAt: Date;
  };
}
