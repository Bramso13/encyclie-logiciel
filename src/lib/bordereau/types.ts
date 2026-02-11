import { ContractStatus } from "@prisma/client";

/**
 * Filtres v2 : période uniquement (pas de brokerIds).
 * Utilisé par getPolicesV2 et extraction quittances v2.
 */
export interface BordereauFiltersV2 {
  dateRange: {
    startDate: Date;
    endDate: Date;
  };
}

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
 * Feuille 1 Polices — une ligne = une échéance (scope v2, aligné quittances).
 * date_souscription = formData.dateDeffet, date_fin_contrat = date fin période échéance.
 * Colonnes type contrat, compagnie, activité supprimées ; fractionnement ajouté.
 */
export interface FidelidadePolicesRow {
  APPORTEUR: string;
  IDENTIFIANT_POLICE: string;
  DATE_SOUSCRIPTION: string;
  DATE_EFFET_CONTRAT: string;
  DATE_FIN_CONTRAT: string;
  NUMERO_AVENANT: string;
  MOTIF_AVENANT: string;
  DATE_EFFET_AVENANT: string;
  DATE_DEMANDE: string;
  STATUT_POLICE: string;
  DATE_STAT_POLICE: string;
  MOTIF_STATUT: string;
  FRACTIONNEMENT: string;
  NOM_ENTREPRISE_ASSURE: string;
  SIREN: string;
  ADRESSE_RISQUE: string;
  VILLE_RISQUE: string;
  CODE_POSTAL_RISQUE: string;
  CA_ENTREPRISE: string;
  EFFECTIF_ENTREPRISE: string;
  CODE_NAF: string;
  LIBELLE_ACTIVITE_1: string;
  POIDS_ACTIVITE_1: string;
  LIBELLE_ACTIVITE_2: string;
  POIDS_ACTIVITE_2: string;
  LIBELLE_ACTIVITE_3: string;
  POIDS_ACTIVITE_3: string;
  LIBELLE_ACTIVITE_4: string;
  POIDS_ACTIVITE_4: string;
  LIBELLE_ACTIVITE_5: string;
  POIDS_ACTIVITE_5: string;
  LIBELLE_ACTIVITE_6: string;
  POIDS_ACTIVITE_6: string;
  LIBELLE_ACTIVITE_7: string;
  POIDS_ACTIVITE_7: string;
  LIBELLE_ACTIVITE_8: string;
  POIDS_ACTIVITE_8: string;
}

/**
 * Feuille 2 Quittances — une ligne = une échéance (scope v2).
 * Colonnes DATE_EMISSION_QUITTANCE et TAUX_COMMISSIONS supprimées ; TAUX_TAXE ajouté.
 * Commission = PrimeHT * 0.24.
 */
export interface FidelidadeQuittancesRow {
  APPORTEUR: string;
  IDENTIFIANT_POLICE: string;
  NUMERO_AVENANT: string;
  IDENTIFIANT_QUITTANCE: string;
  DATE_EFFET_QUITTANCE: string;
  DATE_FIN_QUITTANCE: string;
  DATE_ENCAISSEMENT: string;
  STATUT_QUITTANCE: string;
  GARANTIE: string;
  PRIME_TTC: string;
  PRIME_HT: string;
  TAXES: string;
  TAUX_TAXE: string;
  COMMISSIONS: string;
  MODE_PAIEMENT: string;
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
