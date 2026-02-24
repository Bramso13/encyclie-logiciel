/**
 * Bordereau FIDELIDADE Module
 *
 * This module provides functionality to extract and transform insurance contract data
 * into the FIDELIDADE CSV format for monthly reporting.
 */

export { getBordereauData } from "./extractBordereauData";
export { getPolicesV2 } from "./extractPolicesV2";
export type { BordereauInclusionOptions } from "./extractPolicesV2";
export { getQuittancesV2 } from "./extractQuittancesV2";
export type {
  BordereauFilters,
  BordereauFiltersV2,
  FidelidadeRow,
  FidelidadePolicesRow,
  FidelidadeQuittancesRow,
  ActivityData,
  BordereauDataResult,
  SourceDataItem,
} from "./types";
export {
  formatDate,
  mapContractStatusToEtatPolice,
  mapQuoteStatusToEtatPolice,
  mapQuoteStatusToStatutPolice,
  mapPaymentStatusToStatutQuittance,
  mapPaymentMethodToModePaiement,
  flattenToSourceData,
  safeExtract,
} from "./utils";
export {
  generateCSV,
  generatePolicesCSV,
  generateQuittancesCSV,
  generateFileName,
  getPolicesFileName,
  getQuittancesFileName,
  getBordereauZipFileName,
  escapeCsvValue,
  validatePolicesCSVStructure,
  validateQuittancesCSVStructure,
  POLICES_COLUMNS,
  QUITTANCES_COLUMNS,
  csvToBlob,
  downloadCSV,
} from "./generateCSV";
export { getApporteur } from "./config";