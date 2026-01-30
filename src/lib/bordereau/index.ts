/**
 * Bordereau FIDELIDADE Module
 *
 * This module provides functionality to extract and transform insurance contract data
 * into the FIDELIDADE CSV format for monthly reporting.
 */

export { getBordereauData } from "./extractBordereauData";
export type {
  BordereauFilters,
  FidelidadeRow,
  ActivityData,
  BordereauDataResult,
  SourceDataItem,
} from "./types";
export {
  formatDate,
  mapContractStatusToEtatPolice,
  mapQuoteStatusToEtatPolice,
  flattenToSourceData,
  safeExtract,
} from "./utils";
export {
  generateCSV,
  generateFileName,
  csvToBlob,
  downloadCSV,
} from "./generateCSV";
