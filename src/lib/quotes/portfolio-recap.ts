import { periodicityLabel, territoryLabel } from "./territory";
import { roundMoney } from "./aggravation";

export const ACTIVE_PORTFOLIO_STATUSES = [
  "ACCEPTED",
  "PRIME_CALL_EMITTED",
  "INSTALLMENT_IN_PROGRESS",
] as const;

const MONTH_LABELS = [
  "Janvier",
  "Février",
  "Mars",
  "Avril",
  "Mai",
  "Juin",
  "Juillet",
  "Août",
  "Septembre",
  "Octobre",
  "Novembre",
  "Décembre",
];

export type RecapInstallment = {
  dueDate: Date;
  amountTTC: number;
  status: string;
  paidAmount?: number | null;
};

export type RecapDebitNote = {
  annualAmount: number;
  lines: Array<{ amountTTC: number; paymentDate: Date | null }>;
};

export type RecapQuoteInput = {
  id: string;
  territory: unknown;
  periodicity: unknown;
  brokerId: string;
  brokerName: string;
  annualPremium: number;
  commissionsTotal?: number;
  installments: RecapInstallment[];
  debitNotes: RecapDebitNote[];
};

export type RecapBreakdownRow = {
  key: string;
  label: string;
  count: number;
  annualPremium: number;
  share: number;
  dueElapsed: number;
  paidElapsed: number;
  ratio: number | null;
};

export type MonthlyRow = {
  month: number;
  label: string;
  due: number;
  paid: number;
  ratio: number | null;
  elapsed: boolean;
};

export type PortfolioRecap = {
  year: number;
  asOf: string;
  activeCount: number;
  annualPremium: number;
  paidElapsed: number;
  dueElapsed: number;
  ratioElapsed: number | null;
  months: MonthlyRow[];
  geo: RecapBreakdownRow[];
  brokers: RecapBreakdownRow[];
  fractionnement: RecapBreakdownRow[];
  debitNotesReceived: number;
  debitNotesDue: number;
  debitNotesRatio: number | null;
  commissionsTotal: number;
  summary: string[];
};

function monthIndex(date: Date): number {
  return date.getMonth();
}

function inYear(date: Date, year: number): boolean {
  return date.getFullYear() === year;
}

function isPaid(status: string): boolean {
  return status === "PAID";
}

function ratio(paid: number, due: number): number | null {
  if (due <= 0) return null;
  return roundMoney((paid / due) * 100);
}

function breakdown(
  quotes: RecapQuoteInput[],
  year: number,
  now: Date,
  keyOf: (quote: RecapQuoteInput) => { key: string; label: string },
): RecapBreakdownRow[] {
  const map = new Map<
    string,
    {
      label: string;
      count: number;
      annualPremium: number;
      dueElapsed: number;
      paidElapsed: number;
    }
  >();

  for (const quote of quotes) {
    const { key, label } = keyOf(quote);
    const row = map.get(key) ?? {
      label,
      count: 0,
      annualPremium: 0,
      dueElapsed: 0,
      paidElapsed: 0,
    };
    row.count += 1;
    row.annualPremium = roundMoney(row.annualPremium + quote.annualPremium);
    for (const installment of quote.installments) {
      if (!inYear(installment.dueDate, year)) continue;
      const elapsed = installment.dueDate <= now;
      if (!elapsed) continue;
      row.dueElapsed = roundMoney(row.dueElapsed + installment.amountTTC);
      if (isPaid(installment.status)) {
        row.paidElapsed = roundMoney(
          row.paidElapsed + (installment.paidAmount ?? installment.amountTTC),
        );
      }
    }
    map.set(key, row);
  }

  const annualTotal = quotes.reduce((sum, quote) => sum + quote.annualPremium, 0);
  return [...map.entries()]
    .map(([key, row]) => ({
      key,
      label: row.label,
      count: row.count,
      annualPremium: row.annualPremium,
      share: annualTotal > 0 ? roundMoney((row.annualPremium / annualTotal) * 100) : 0,
      dueElapsed: row.dueElapsed,
      paidElapsed: row.paidElapsed,
      ratio: ratio(row.paidElapsed, row.dueElapsed),
    }))
    .sort((a, b) => b.annualPremium - a.annualPremium);
}

export function buildPortfolioRecap(
  quotes: RecapQuoteInput[],
  year: number,
  now = new Date(),
): PortfolioRecap {
  const months: MonthlyRow[] = MONTH_LABELS.map((label, month) => {
    const monthStart = new Date(year, month, 1);
    const elapsed = monthStart <= now && year <= now.getFullYear();
    const due = roundMoney(
      quotes.reduce((sum, quote) => {
        return (
          sum +
          quote.installments
            .filter(
              (item) =>
                inYear(item.dueDate, year) && monthIndex(item.dueDate) === month,
            )
            .reduce((inner, item) => inner + item.amountTTC, 0)
        );
      }, 0),
    );
    const paid = roundMoney(
      quotes.reduce((sum, quote) => {
        return (
          sum +
          quote.installments
            .filter(
              (item) =>
                inYear(item.dueDate, year) &&
                monthIndex(item.dueDate) === month &&
                isPaid(item.status),
            )
            .reduce(
              (inner, item) => inner + (item.paidAmount ?? item.amountTTC),
              0,
            )
        );
      }, 0),
    );
    return {
      month,
      label,
      due,
      paid: elapsed ? paid : 0,
      ratio: elapsed ? ratio(paid, due) : null,
      elapsed,
    };
  });

  const dueElapsed = roundMoney(
    months.filter((row) => row.elapsed).reduce((sum, row) => sum + row.due, 0),
  );
  const paidElapsed = roundMoney(
    months.filter((row) => row.elapsed).reduce((sum, row) => sum + row.paid, 0),
  );
  const annualPremium = roundMoney(
    quotes.reduce((sum, quote) => sum + quote.annualPremium, 0),
  );

  let debitNotesDue = 0;
  let debitNotesReceived = 0;
  for (const quote of quotes) {
    for (const note of quote.debitNotes) {
      debitNotesDue = roundMoney(debitNotesDue + note.annualAmount);
      debitNotesReceived = roundMoney(
        debitNotesReceived +
          note.lines
            .filter((line) => line.paymentDate)
            .reduce((sum, line) => sum + line.amountTTC, 0),
      );
    }
  }

  const commissionsTotal = roundMoney(
    quotes.reduce((sum, quote) => sum + (quote.commissionsTotal ?? 0), 0),
  );

  const geo = breakdown(quotes, year, now, (quote) => ({
    key: territoryLabel(quote.territory),
    label: territoryLabel(quote.territory),
  }));
  const brokers = breakdown(quotes, year, now, (quote) => ({
    key: quote.brokerId,
    label: quote.brokerName || "Courtier",
  }));
  const fractionnement = breakdown(quotes, year, now, (quote) => ({
    key: periodicityLabel(quote.periodicity),
    label: periodicityLabel(quote.periodicity),
  }));

  const ratioElapsed = ratio(paidElapsed, dueElapsed);
  const topGeo = geo[0];
  const topBroker = brokers[0];
  const topFrac = fractionnement[0];

  const summary = [
    `Portefeuille en RC Décennale pour un montant de prime annuelle ${year} de ${annualPremium.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} €.`,
    `${paidElapsed.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} € réglés sur les mois échus, soit un taux de règlement de ${ratioElapsed == null ? "N/A" : `${ratioElapsed} %`} sur les échéances déjà exigibles.`,
    topGeo
      ? `Concentration géographique : ${topGeo.label} (${topGeo.share} % de la prime annuelle, ${topGeo.count} affaire${topGeo.count > 1 ? "s" : ""}).`
      : "Aucune répartition géographique disponible.",
    topBroker
      ? `Premier apporteur : ${topBroker.label} (${topBroker.share} % de la prime annuelle).`
      : "Aucun apporteur identifié.",
    topFrac
      ? `Le fractionnement ${topFrac.label.toLowerCase()} domine (${topFrac.count} contrat${topFrac.count > 1 ? "s" : ""} sur ${quotes.length}).`
      : "Fractionnement non renseigné.",
  ];

  return {
    year,
    asOf: now.toISOString(),
    activeCount: quotes.length,
    annualPremium,
    paidElapsed,
    dueElapsed,
    ratioElapsed,
    months,
    geo,
    brokers,
    fractionnement,
    debitNotesReceived,
    debitNotesDue,
    debitNotesRatio: ratio(debitNotesReceived, debitNotesDue),
    commissionsTotal,
    summary,
  };
}

export function formatRatio(value: number | null): string {
  if (value == null) return "N/A";
  return `${value.toLocaleString("fr-FR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })} %`;
}
