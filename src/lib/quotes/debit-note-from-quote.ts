import type { DebitNoteHeader } from "./debit-note";

function text(value: unknown): string {
  if (value == null) return "";
  return String(value).trim();
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export function headerFromQuote(quote: {
  reference: string;
  companyData: unknown;
  formData: unknown;
  broker?: {
    name?: string | null;
    companyName?: string | null;
    brokerProfile?: { code?: string | null } | null;
  } | null;
  product?: { name?: string | null } | null;
  contract?: { reference?: string | null } | null;
}): DebitNoteHeader {
  const company = record(quote.companyData);
  const form = record(quote.formData);
  const postal = text(form.postalCode || company.postalCode);
  const city = text(form.city || company.city);
  return {
    contractNumber: text(quote.contract?.reference) || quote.reference,
    directorName: text(form.directorName || company.directorName),
    clientName: text(company.companyName || form.companyName),
    clientAddress: text(form.address || company.address),
    clientCity: [postal, city].filter(Boolean).join(" "),
    intermediary: text(
      quote.broker?.companyName || quote.broker?.name,
    ),
    brokerCode: text(quote.broker?.brokerProfile?.code),
    companyName: text(quote.product?.name) || "WAKAM",
  };
}
