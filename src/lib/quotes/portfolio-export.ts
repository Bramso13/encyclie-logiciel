import { roundMoney } from "./aggravation";
import { csvRow } from "./csv-export";
import {
  formatRatio,
  type PortfolioRecap,
  type RecapBreakdownRow,
} from "./portfolio-recap";

export type PortfolioExportVariant = "interne" | "partenaires";

export function portfolioExportVariant(
  value: string | null,
): PortfolioExportVariant {
  return value === "partenaires" ? "partenaires" : "interne";
}

export function portfolioExportFilename(
  year: number,
  variant: PortfolioExportVariant,
): string {
  const suffix = variant === "partenaires" ? "-partenaires" : "";
  return `portefeuille-rcd-${year}${suffix}.csv`;
}

function money(value: number): string {
  return value.toLocaleString("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function rowsForVariant(
  rows: RecapBreakdownRow[],
  variant: PortfolioExportVariant,
  totalExcluding: number,
): RecapBreakdownRow[] {
  if (variant === "interne") return rows;
  return rows
    .map((row) => ({
      ...row,
      annualPremium: row.annualPremiumExcludingFees,
      share:
        totalExcluding > 0
          ? roundMoney((row.annualPremiumExcludingFees / totalExcluding) * 100)
          : 0,
    }))
    .sort((a, b) => b.annualPremium - a.annualPremium);
}

function summaryForVariant(
  recap: PortfolioRecap,
  variant: PortfolioExportVariant,
  geo: RecapBreakdownRow[],
  brokers: RecapBreakdownRow[],
  fractionnement: RecapBreakdownRow[],
): string[] {
  if (variant === "interne") return recap.summary;

  const amount = recap.annualPremiumExcludingFees.toLocaleString("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const topGeo = geo[0];
  const topBroker = brokers[0];
  const topFrac = fractionnement[0];
  const ratioLine = recap.summary.find((line) => line.includes("réglés sur les mois échus"));

  return [
    `Portefeuille en RC Décennale pour un montant de prime annuelle ${recap.year} hors frais de gestion de ${amount} €.`,
    ratioLine ??
      `${recap.paidElapsed.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} € réglés sur les mois échus.`,
    topGeo
      ? `Concentration géographique : ${topGeo.label} (${topGeo.share} % de la prime annuelle hors frais de gestion, ${topGeo.count} affaire${topGeo.count > 1 ? "s" : ""}).`
      : "Aucune répartition géographique disponible.",
    topBroker
      ? `Premier apporteur : ${topBroker.label} (${topBroker.share} % de la prime annuelle hors frais de gestion).`
      : "Aucun apporteur identifié.",
    topFrac
      ? `Le fractionnement ${topFrac.label.toLowerCase()} domine (${topFrac.count} contrat${topFrac.count > 1 ? "s" : ""}).`
      : "Fractionnement non renseigné.",
  ];
}

export function buildPortfolioCsvLines(
  recap: PortfolioRecap,
  variant: PortfolioExportVariant,
): string[] {
  const partners = variant === "partenaires";
  const annualLabel = partners
    ? "Prime annuelle hors frais de gestion"
    : "Prime annuelle";
  const geo = rowsForVariant(recap.geo, variant, recap.annualPremiumExcludingFees);
  const brokers = rowsForVariant(
    recap.brokers,
    variant,
    recap.annualPremiumExcludingFees,
  );
  const fractionnement = rowsForVariant(
    recap.fractionnement,
    variant,
    recap.annualPremiumExcludingFees,
  );
  const indicatorRows = partners
    ? [csvRow(["Prime annuelle hors frais de gestion", money(recap.annualPremiumExcludingFees)])]
    : [
        csvRow(["Prime annuelle cumulée", money(recap.annualPremium)]),
        csvRow([
          "Prime annuelle hors frais de gestion",
          money(recap.annualPremiumExcludingFees),
        ]),
      ];

  return [
    csvRow([`PORTEFEUILLE RC DECENNALE ${recap.year}`]),
    csvRow([]),
    csvRow(["Indicateur", "Valeur"]),
    csvRow(["Affaires actives", recap.activeCount]),
    ...indicatorRows,
    csvRow(["Prime réglée (mois échus)", money(recap.paidElapsed)]),
    csvRow(["Prime due (mois échus)", money(recap.dueElapsed)]),
    csvRow(["Ratio règlement / prime", formatRatio(recap.ratioElapsed)]),
    csvRow(["Notes de débit reçues", money(recap.debitNotesReceived)]),
    csvRow(["Notes de débit dues", money(recap.debitNotesDue)]),
    csvRow(["Ratio notes de débit", formatRatio(recap.debitNotesRatio)]),
    csvRow(["Commissions totales", money(recap.commissionsTotal)]),
    csvRow([]),
    csvRow(["Suivi mensuel"]),
    csvRow(["Mois", "Prime due", "Prime réglée", "Ratio"]),
    ...recap.months.map((row) =>
      csvRow([
        row.label,
        money(row.due),
        row.elapsed ? money(row.paid) : "",
        formatRatio(row.ratio),
      ]),
    ),
    csvRow([]),
    csvRow(["Répartition géographique"]),
    csvRow(["Région", annualLabel, "Part", "Nb assurés"]),
    ...geo.map((row) =>
      csvRow([row.label, money(row.annualPremium), formatRatio(row.share), row.count]),
    ),
    csvRow([]),
    csvRow(["Répartition courtier"]),
    csvRow(["Courtier", annualLabel, "Part", "Nb contrats"]),
    ...brokers.map((row) =>
      csvRow([row.label, money(row.annualPremium), formatRatio(row.share), row.count]),
    ),
    csvRow([]),
    csvRow(["Répartition fractionnement"]),
    csvRow([
      "Fractionnement",
      "Nb contrats",
      annualLabel,
      "Prime due (échu)",
      "Prime réglée",
      "Ratio",
    ]),
    ...fractionnement.map((row) =>
      csvRow([
        row.label,
        row.count,
        money(row.annualPremium),
        money(row.dueElapsed),
        money(row.paidElapsed),
        formatRatio(row.ratio),
      ]),
    ),
    csvRow([]),
    csvRow(["Synthèse"]),
    ...summaryForVariant(recap, variant, geo, brokers, fractionnement).map((line) =>
      csvRow([line]),
    ),
  ];
}
