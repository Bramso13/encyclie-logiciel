import type {
  FidelidadeRow,
  FidelidadePolicesRow,
  FidelidadeQuittancesRow,
} from "./types";

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

/** Colonnes Feuille 1 Polices (scope clarifié §6) — exporté pour l'UI */
export const POLICES_COLUMNS: (keyof FidelidadePolicesRow)[] = [
  "APPORTEUR",
  "IDENTIFIANT_POLICE",
  "DATE_SOUSCRIPTION",
  "DATE_EFFET_CONTRAT",
  "DATE_FIN_CONTRAT",
  "NUMERO_AVENANT",
  "MOTIF_AVENANT",
  "DATE_EFFET_AVENANT",
  "DATE_DEMANDE",
  "STATUT_POLICE",
  "DATE_STAT_POLICE",
  "MOTIF_STATUT",
  "TYPE_CONTRAT",
  "COMPAGNIE",
  "NOM_ENTREPRISE_ASSURE",
  "SIREN",
  "ACTIVITE",
  "ADRESSE_RISQUE",
  "VILLE_RISQUE",
  "CODE_POSTAL_RISQUE",
  "CA_ENTREPRISE",
  "EFFECTIF_ENTREPRISE",
  "CODE_NAF",
  "LIBELLE_ACTIVITE_1",
  "POIDS_ACTIVITE_1",
  "LIBELLE_ACTIVITE_2",
  "POIDS_ACTIVITE_2",
  "LIBELLE_ACTIVITE_3",
  "POIDS_ACTIVITE_3",
  "LIBELLE_ACTIVITE_4",
  "POIDS_ACTIVITE_4",
  "LIBELLE_ACTIVITE_5",
  "POIDS_ACTIVITE_5",
  "LIBELLE_ACTIVITE_6",
  "POIDS_ACTIVITE_6",
  "LIBELLE_ACTIVITE_7",
  "POIDS_ACTIVITE_7",
  "LIBELLE_ACTIVITE_8",
  "POIDS_ACTIVITE_8",
];

/** Colonnes Feuille 2 Quittances (scope clarifié §6) — exporté pour l'UI */
export const QUITTANCES_COLUMNS: (keyof FidelidadeQuittancesRow)[] = [
  "APPORTEUR",
  "IDENTIFIANT_POLICE",
  "NUMERO_AVENANT",
  "IDENTIFIANT_QUITTANCE",
  "DATE_EMISSION_QUITTANCE",
  "DATE_EFFET_QUITTANCE",
  "DATE_FIN_QUITTANCE",
  "DATE_ENCAISSEMENT",
  "STATUT_QUITTANCE",
  "GARANTIE",
  "PRIME_TTC",
  "PRIME_HT",
  "TAXES",
  "TAUX_COMMISSIONS",
  "COMMISSIONS",
  "MODE_PAIEMENT",
];

/**
 * Génère le CSV Feuille 1 Polices.
 * @param rows - Lignes FidelidadePolicesRow
 * @returns Contenu CSV
 */
export function generatePolicesCSV(rows: FidelidadePolicesRow[]): string {
  return generateCSVFromHeaders(POLICES_COLUMNS, rows as unknown as Record<string, string>[]);
}

/**
 * Génère le CSV Feuille 2 Quittances.
 * @param rows - Lignes FidelidadeQuittancesRow
 * @returns Contenu CSV
 */
export function generateQuittancesCSV(rows: FidelidadeQuittancesRow[]): string {
  return generateCSVFromHeaders(QUITTANCES_COLUMNS, rows as unknown as Record<string, string>[]);
}

function generateCSVFromHeaders(
  headers: string[],
  rows: Record<string, string>[],
): string {
  const headerRow = headers.join(",");
  const dataRows = rows.map((row) =>
    headers.map((h) => escapeCsvValue(String(row[h] ?? ""))).join(","),
  );
  return [headerRow, ...dataRows].join("\n");
}

/**
 * Valide que la structure CSV correspond au spec FIDELIDADE (noms et nombre de colonnes).
 */
export function validatePolicesCSVStructure(csvContent: string): boolean {
  const firstLine = csvContent.split("\n")[0];
  const headers = firstLine?.split(",").map((h) => h.replace(/^"|"$/g, "")) ?? [];
  return (
    headers.length === POLICES_COLUMNS.length &&
    headers.every((h, i) => h === POLICES_COLUMNS[i])
  );
}

/**
 * Valide que la structure CSV quittances correspond au spec FIDELIDADE.
 */
export function validateQuittancesCSVStructure(csvContent: string): boolean {
  const firstLine = csvContent.split("\n")[0];
  const headers = firstLine?.split(",").map((h) => h.replace(/^"|"$/g, "")) ?? [];
  return (
    headers.length === QUITTANCES_COLUMNS.length &&
    headers.every((h, i) => h === QUITTANCES_COLUMNS[i])
  );
}

/**
 * Escape special characters in CSV values
 * @param value - The value to escape
 * @returns Escaped value
 */
export function escapeCsvValue(value: string): string {
  // If value contains comma, quote, or newline, wrap in quotes and escape quotes
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Generate a default file name for the bordereau CSV (legacy single file)
 * Format: BORDEREAU_FIDELIDADE_MONTH_YEAR.csv
 */
export function generateFileName(date?: Date): string {
  const d = date || new Date();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `BORDEREAU_FIDELIDADE_${month}_${year}.csv`;
}

/**
 * Nom du fichier CSV polices : BORDEREAU_FIDELIDADE_POLICES_MM_YYYY.csv
 */
export function getPolicesFileName(month: number, year: number): string {
  const m = String(month).padStart(2, "0");
  return `BORDEREAU_FIDELIDADE_POLICES_${m}_${year}.csv`;
}

/**
 * Nom du fichier CSV quittances : BORDEREAU_FIDELIDADE_QUITTANCES_MM_YYYY.csv
 */
export function getQuittancesFileName(month: number, year: number): string {
  const m = String(month).padStart(2, "0");
  return `BORDEREAU_FIDELIDADE_QUITTANCES_${m}_${year}.csv`;
}

/**
 * Nom du ZIP : BORDEREAU_FIDELIDADE_MM_YYYY.zip
 */
export function getBordereauZipFileName(month: number, year: number): string {
  const m = String(month).padStart(2, "0");
  return `BORDEREAU_FIDELIDADE_${m}_${year}.zip`;
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
