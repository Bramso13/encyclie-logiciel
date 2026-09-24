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
  /** Frais de gestion TTC de l'exercice (non taxés). Déduits de la prime annuelle. */
  managementFees?: number;
  commissionsTotal?: number;
  installments: RecapInstallment[];
  debitNotes: RecapDebitNote[];
};

export type ManagementFeeInstallment = {
  amountHT: number;
  rcdAmount?: number | null;
  pjAmount?: number | null;
  feesAmount?: number | null;
  resumeAmount?: number | null;
};

export type RecapBreakdownRow = {
  key: string;
  label: string;
  count: number;
  annualPremium: number;
  annualPremiumExcludingFees: number;
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
  annualPremiumExcludingFees: number;
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

function quoteFees(quote: RecapQuoteInput): number {
  return quote.managementFees ?? 0;
}

function deriveFraisGestion(item: ManagementFeeInstallment): number | null {
  const parts = [item.rcdAmount, item.pjAmount, item.feesAmount, item.resumeAmount];
  if (parts.some((part) => part == null || Number.isNaN(Number(part)))) return null;
  return (
    item.amountHT -
    Number(item.rcdAmount) -
    Number(item.pjAmount) -
    Number(item.feesAmount) -
    Number(item.resumeAmount)
  );
}

/** Frais de gestion de l'exercice : dérivés des échéances, sinon repli JSON. */
export function managementFeesFromInstallments(
  installments: ManagementFeeInstallment[],
  fallbackFraisGestion: number[] = [],
): number {
  const total = installments.reduce((sum, item, index) => {
    const derived = deriveFraisGestion(item);
    const fee = derived ?? fallbackFraisGestion[index] ?? 0;
    return sum + Math.max(0, fee);
  }, 0);
  return roundMoney(total);
}

export function fraisGestionListFromCalculatedPremium(value: unknown): number[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];
  const echeancier = (value as Record<string, unknown>).echeancier;
  if (!echeancier || typeof echeancier !== "object" || Array.isArray(echeancier)) {
    return [];
  }
  const echeances = (echeancier as Record<string, unknown>).echeances;
  if (!Array.isArray(echeances)) return [];
  return echeances.map((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return 0;
    const fee = (item as Record<string, unknown>).fraisGestion;
    return typeof fee === "number" && Number.isFinite(fee) ? fee : 0;
  });
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
      managementFees: number;
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
      managementFees: 0,
      dueElapsed: 0,
      paidElapsed: 0,
    };
    row.count += 1;
    row.annualPremium = roundMoney(row.annualPremium + quote.annualPremium);
    row.managementFees = roundMoney(row.managementFees + quoteFees(quote));
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
      annualPremiumExcludingFees: roundMoney(row.annualPremium - row.managementFees),
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
  const managementFees = roundMoney(
    quotes.reduce((sum, quote) => sum + quoteFees(quote), 0),
  );
  const annualPremiumExcludingFees = roundMoney(annualPremium - managementFees);

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

  const horsFraisLabel = annualPremiumExcludingFees.toLocaleString("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const summary = [
    `Portefeuille en RC Décennale pour un montant de prime annuelle ${year} de ${annualPremium.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} €.`,
    `soit ${horsFraisLabel} € hors frais de gestion.`,
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
    annualPremiumExcludingFees,
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
