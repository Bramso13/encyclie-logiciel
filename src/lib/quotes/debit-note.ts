import { roundMoney } from "./aggravation";
import { csvRow } from "./csv-export";

export type DebitNoteInstallmentInput = {
  id: string;
  installmentNumber: number;
  dueDate: Date | string;
  amountHT: number;
  amountTTC: number;
  rcdAmount?: number | null;
  pjAmount?: number | null;
  feesAmount?: number | null;
  paidAt?: Date | string | null;
};

export type DebitNoteLineComputed = {
  installmentId: string;
  installmentNumber: number;
  periodDate: Date;
  amountTTC: number;
  primeRcdHT: number;
  commission: number;
  netHorsCom: number;
  paymentDate: Date | null;
};

const COMMISSION_RATE = 0.1;

function asDate(value: Date | string | null | undefined): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function primeRcdHtFromInstallment(
  installment: DebitNoteInstallmentInput,
): number {
  if (installment.rcdAmount != null && installment.rcdAmount > 0) {
    return roundMoney(installment.rcdAmount);
  }
  return roundMoney(
    (installment.amountHT || 0) -
      (installment.feesAmount || 0) -
      (installment.pjAmount || 0),
  );
}

export function computeDebitNoteLines(
  installments: DebitNoteInstallmentInput[],
): DebitNoteLineComputed[] {
  const sorted = [...installments].sort(
    (a, b) => a.installmentNumber - b.installmentNumber,
  );
  const sharedHt = sorted[0]
    ? primeRcdHtFromInstallment(sorted[0])
    : 0;
  const sameHtOnEveryLine = sorted.every(
    (item) => primeRcdHtFromInstallment(item) === sharedHt || !item.rcdAmount,
  );
  const annualHt = sameHtOnEveryLine
    ? sharedHt
    : sharedHt;

  return sorted.map((item) => {
    const primeRcdHT =
      item.rcdAmount != null && item.rcdAmount > 0
        ? roundMoney(item.rcdAmount)
        : annualHt;
    const commission = roundMoney(primeRcdHT * COMMISSION_RATE);
    const amountTTC = roundMoney(item.amountTTC);
    return {
      installmentId: item.id,
      installmentNumber: item.installmentNumber,
      periodDate: asDate(item.dueDate) ?? new Date(),
      amountTTC,
      primeRcdHT,
      commission,
      netHorsCom: roundMoney(amountTTC - commission),
      paymentDate: asDate(item.paidAt),
    };
  });
}

export function debitNoteTotals(lines: DebitNoteLineComputed[]): {
  annualAmount: number;
  totalCommission: number;
} {
  return {
    annualAmount: roundMoney(
      lines.reduce((sum, line) => sum + line.amountTTC, 0),
    ),
    totalCommission: roundMoney(
      lines.reduce((sum, line) => sum + line.commission, 0),
    ),
  };
}

export type DebitNoteHeader = {
  contractNumber: string;
  directorName: string;
  clientName: string;
  clientAddress: string;
  clientCity: string;
  intermediary: string;
  brokerCode: string;
  companyName: string;
};

export function yearPeriod(year: number): { start: Date; end: Date } {
  return {
    start: new Date(Date.UTC(year, 0, 1)),
    end: new Date(Date.UTC(year, 11, 31, 23, 59, 59)),
  };
}

function formatDateFr(value: Date | null): string {
  if (!value) return "";
  return value.toLocaleDateString("fr-FR");
}

function formatMoney(value: number): string {
  return value.toLocaleString("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function debitNoteCsvLines(
  header: DebitNoteHeader,
  periodStart: Date,
  periodEnd: Date,
  lines: DebitNoteLineComputed[],
): string[] {
  const totals = debitNoteTotals(lines);
  return [
    csvRow(["NOTE DE DEBIT"]),
    csvRow(["N° de contrat", header.contractNumber]),
    csvRow(["Nom du dirigeant", header.directorName]),
    csvRow(["Nom du client", header.clientName]),
    csvRow(["Adresse", header.clientAddress]),
    csvRow(["CP Ville", header.clientCity]),
    csvRow(["Intermédiaire", header.intermediary]),
    csvRow(["Code courtier", header.brokerCode]),
    csvRow(["Compagnie", header.companyName]),
    csvRow([
      "Période",
      formatDateFr(periodStart),
      formatDateFr(periodEnd),
    ]),
    csvRow(["Montant HT ANNUEL (somme TTC)", formatMoney(totals.annualAmount)]),
    csvRow(["Commissions totales", formatMoney(totals.totalCommission)]),
    csvRow([]),
    csvRow([
      "Période Date",
      "Montant TTC",
      "Date règlement",
      "Prime RCD HT",
      "Commissions courtier",
      "Prime due TTC hors com",
    ]),
    ...lines.map((line) =>
      csvRow([
        formatDateFr(line.periodDate),
        formatMoney(line.amountTTC),
        formatDateFr(line.paymentDate),
        formatMoney(line.primeRcdHT),
        formatMoney(line.commission),
        formatMoney(line.netHorsCom),
      ]),
    ),
  ];
}

