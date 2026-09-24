import { computeDebitNoteLines, debitNoteTotals } from "./debit-note";
import {
  fraisGestionListFromCalculatedPremium,
  managementFeesFromInstallments,
  type RecapQuoteInput,
} from "./portfolio-recap";

export type PortfolioSourceInstallment = {
  id: string;
  installmentNumber: number;
  dueDate: Date;
  amountHT: number;
  amountTTC: number;
  status: string;
  paidAmount?: number | null;
  paidAt?: Date | null;
  rcdAmount?: number | null;
  pjAmount?: number | null;
  feesAmount?: number | null;
  resumeAmount?: number | null;
};

export type PortfolioSourceQuote = {
  id: string;
  formData: unknown;
  calculatedPremium: unknown;
  broker: { id: string; name: string | null; companyName: string | null };
  paymentSchedule: Array<{
    totalAmountTTC: number;
    payments: PortfolioSourceInstallment[];
  }>;
  debitNotes: Array<{
    annualAmount: number;
    totalCommission: number;
    lines: Array<{ amountTTC: number; paymentDate: Date | null }>;
  }>;
  vintages: Array<{ calculatedPremium: unknown }>;
};

function jsonRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export function toRecapQuoteInput(quote: PortfolioSourceQuote): RecapQuoteInput {
  const form = jsonRecord(quote.formData);
  const installments = quote.paymentSchedule.flatMap((schedule) => schedule.payments);
  const vintagePremium = quote.vintages.find((vintage) => vintage.calculatedPremium)
    ?.calculatedPremium;
  const managementFees = managementFeesFromInstallments(
    installments,
    fraisGestionListFromCalculatedPremium(
      vintagePremium ?? quote.calculatedPremium,
    ),
  );
  const annualPremium = quote.paymentSchedule.reduce(
    (sum, schedule) => sum + schedule.totalAmountTTC,
    0,
  );
  const computed = computeDebitNoteLines(installments);
  const commissionsFromNotes = quote.debitNotes.reduce(
    (sum, note) => sum + note.totalCommission,
    0,
  );

  return {
    id: quote.id,
    territory: form.territory,
    periodicity: form.periodicity,
    brokerId: quote.broker.id,
    brokerName: quote.broker.companyName || quote.broker.name || "Courtier",
    annualPremium,
    managementFees,
    commissionsTotal:
      commissionsFromNotes || debitNoteTotals(computed).totalCommission,
    installments: installments.map((item) => ({
      dueDate: item.dueDate,
      amountTTC: item.amountTTC,
      status: item.status,
      paidAmount: item.paidAmount,
    })),
    debitNotes: quote.debitNotes.map((note) => ({
      annualAmount: note.annualAmount,
      lines: note.lines.map((line) => ({
        amountTTC: line.amountTTC,
        paymentDate: line.paymentDate,
      })),
    })),
  };
}
