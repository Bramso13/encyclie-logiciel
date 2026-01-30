import { FidelidadeRow } from "./types";

/**
 * Generate CSV content from FIDELIDADE rows
 *
 * @param rows - Array of FIDELIDADE data rows
 * @param fileName - Optional file name (defaults to BORDEREAU_FIDELIDADE_MONTH_YEAR.csv)
 * @returns CSV string ready for download
 */
export function generateCSV(rows: FidelidadeRow[], fileName?: string): string {
  // Define the exact 36 columns in the correct order
  const headers: (keyof FidelidadeRow)[] = [
    "APPORTEUR",
    "IDENTIFIANT_POLICE",
    "DATE_SOUSCRIPTION",
    "DATE_EFFET_CONTRAT",
    "DATE_FIN_CONTRAT",
    "NUMERO_AVENANT",
    "MOTIF_AVENANT",
    "DATE_EFFET_AVENANT",
    "DATE_ECHEANCE",
    "ETAT_POLICE",
    "DATE_ETAT_POLICE",
    "MOTIF_ETAT",
    "FRANCTIONNEMENT",
    "SIREN",
    "ADRESSE_RISQUE",
    "VILLE_RISQUE",
    "CODE_POSTAL_RISQUE",
    "CA_ENTREPRISE",
    "EFFECTIF_ENTREPRISE",
    "CODE_NAF",
    "LIBELLE_ACTIVITE_1",
    "POID_ACTIVITE_1",
    "LIBELLE_ACTIVITE_2",
    "POID_ACTIVITE_2",
    "LIBELLE_ACTIVITE_3",
    "POID_ACTIVITE_3",
    "LIBELLE_ACTIVITE_4",
    "POID_ACTIVITE_4",
    "LIBELLE_ACTIVITE_5",
    "POID_ACTIVITE_5",
    "LIBELLE_ACTIVITE_6",
    "POID_ACTIVITE_6",
    "LIBELLE_ACTIVITE_7",
    "POID_ACTIVITE_7",
    "LIBELLE_ACTIVITE_8",
    "POID_ACTIVITE_8",
  ];

  // Create CSV header row
  const headerRow = headers.join(",");

  // Create CSV data rows
  const dataRows = rows.map((row) => {
    return headers
      .map((header) => {
        const value = row[header];
        // Escape CSV special characters
        return escapeCsvValue(String(value || ""));
      })
      .join(",");
  });

  // Combine header and data
  const csvContent = [headerRow, ...dataRows].join("\n");

  return csvContent;
}

/**
 * Escape special characters in CSV values
 * @param value - The value to escape
 * @returns Escaped value
 */
function escapeCsvValue(value: string): string {
  // If value contains comma, quote, or newline, wrap in quotes and escape quotes
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Generate a default file name for the bordereau CSV
 * Format: BORDEREAU_FIDELIDADE_MONTH_YEAR.csv
 * @param date - Optional date to use for file name (defaults to current date)
 * @returns File name string
 */
export function generateFileName(date?: Date): string {
  const d = date || new Date();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();

  return `BORDEREAU_FIDELIDADE_${month}_${year}.csv`;
}

/**
 * Convert CSV string to downloadable blob
 * @param csvContent - CSV string content
 * @returns Blob ready for download
 */
export function csvToBlob(csvContent: string): Blob {
  return new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
}

/**
 * Trigger browser download of CSV file
 * @param csvContent - CSV string content
 * @param fileName - File name for download
 */
export function downloadCSV(csvContent: string, fileName: string): void {
  const blob = csvToBlob(csvContent);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}
