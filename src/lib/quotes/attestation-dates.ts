import { CalculationResult, Quote } from "@/lib/types";

interface AttestationInstallment {
  periodStart?: string;
  periodEnd?: string;
  paidAt?: string;
}

export function formatRcdContractNumber(reference?: string | null): string {
  if (!reference) return "RCDWAK";
  const ref = reference.trim();
  if (ref.toUpperCase().startsWith("RCD")) return ref;
  return `RCD${ref}`;
}

export function getAttestationPdfDates(
  installment: AttestationInstallment,
  quote: Quote,
  calculationResult?: CalculationResult | null
) {
  const contractStartDate = quote.formData?.dateDeffet
    ? new Date(quote.formData.dateDeffet)
    : installment.periodStart
      ? new Date(installment.periodStart)
      : new Date();

  const echeances = calculationResult?.echeancier?.echeances;
  const lastFinPeriode = echeances?.length
    ? echeances[echeances.length - 1]?.finPeriode
    : undefined;

  const contractEndDate = lastFinPeriode
    ? new Date(lastFinPeriode)
    : new Date(
        contractStartDate.getFullYear() + 1,
        contractStartDate.getMonth(),
        contractStartDate.getDate()
      );

  const validityStartDate = installment.periodStart
    ? new Date(installment.periodStart)
    : contractStartDate;
  const validityEndDate = installment.periodEnd
    ? new Date(installment.periodEnd)
    : contractEndDate;

  const attestationDate = installment.paidAt
    ? new Date(installment.paidAt)
    : new Date();

  return {
    contractStartDate,
    contractEndDate,
    validityStartDate,
    validityEndDate,
    attestationDate,
  };
}
