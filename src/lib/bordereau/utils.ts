import { ContractStatus, QuoteStatus } from "@prisma/client";

/**
 * Format a Date object to DD/MM/YYYY format for FIDELIDADE CSV
 * @param date - Date to format
 * @returns Formatted date string
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;

  if (isNaN(d.getTime())) {
    return "";
  }

  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();

  return `${day}/${month}/${year}`;
}

/**
 * Map ContractStatus enum to FIDELIDADE ETAT_POLICE values
 * @param status - Prisma ContractStatus
 * @returns ETAT_POLICE value
 */
export function mapContractStatusToEtatPolice(status: ContractStatus): string {
  const mapping: Record<ContractStatus, string> = {
    ACTIVE: "EN COURS",
    SUSPENDED: "SUSPENDU",
    EXPIRED: "EXPIRE",
    CANCELLED: "RESILIE",
    PENDING_RENEWAL: "EN ATTENTE DE RENOUVELLEMENT",
  };

  return mapping[status] || "EN COURS";
}

/**
 * Map QuoteStatus to FIDELIDADE ETAT_POLICE values for quote-only rows (devis)
 */
export function mapQuoteStatusToEtatPolice(status: QuoteStatus): string {
  const mapping: Record<QuoteStatus, string> = {
    DRAFT: "BROUILLON",
    INCOMPLETE: "INCOMPLET",
    SUBMITTED: "SOUSCRIPTION",
    IN_PROGRESS: "EN COURS",
    COMPLEMENT_REQUIRED: "COMPLEMENT REQUIS",
    OFFER_READY: "OFFRE PRETE",
    OFFER_SENT: "OFFRE ENVOYEE",
    ACCEPTED: "ACCEPTE",
    REJECTED: "REJETE",
    EXPIRED: "EXPIRE",
  };
  return mapping[status] || "DEVIS";
}

/**
 * Flatten an object (e.g. formData, companyData, calculatedPremium) into key-value pairs for drag & drop.
 * Keys are paths like "companyData.siret", "formData.activites.0.code". Values are strings.
 */
export function flattenToSourceData(
  obj: unknown,
  prefix: string,
  maxDepth: number = 5,
  depth: number = 0,
): { key: string; value: string }[] {
  const out: { key: string; value: string }[] = [];
  if (depth >= maxDepth || obj === null || obj === undefined) return out;

  if (typeof obj !== "object") {
    out.push({ key: prefix, value: String(obj) });
    return out;
  }

  if (obj instanceof Date) {
    out.push({ key: prefix, value: obj.toISOString() });
    return out;
  }

  if (Array.isArray(obj)) {
    obj.forEach((item, i) => {
      const k = `${prefix}.${i}`;
      if (
        item !== null &&
        item !== undefined &&
        typeof item === "object" &&
        !(item instanceof Date)
      ) {
        out.push(...flattenToSourceData(item, k, maxDepth, depth + 1));
      } else {
        out.push({ key: k, value: String(item) });
      }
    });
    return out;
  }

  for (const [key, value] of Object.entries(obj)) {
    const k = prefix ? `${prefix}.${key}` : key;
    if (
      value !== null &&
      value !== undefined &&
      typeof value === "object" &&
      !(value instanceof Date) &&
      !Array.isArray(value)
    ) {
      out.push(...flattenToSourceData(value, k, maxDepth, depth + 1));
    } else if (value !== null && value !== undefined) {
      out.push({
        key: k,
        value: value instanceof Date ? value.toISOString() : String(value),
      });
    }
  }
  return out;
}

/**
 * Safely extract a string value from JSON data
 * @param obj - Source object
 * @param path - Dot-notation path to the value
 * @param defaultValue - Default value if path not found
 * @returns Extracted value or default
 */
export function safeExtract(
  obj: any,
  path: string,
  defaultValue: string = "",
): string {
  try {
    const keys = path.split(".");
    let value = obj;

    for (const key of keys) {
      if (value && typeof value === "object" && key in value) {
        value = value[key];
      } else {
        return defaultValue;
      }
    }

    return value !== null && value !== undefined ? String(value) : defaultValue;
  } catch {
    return defaultValue;
  }
}
