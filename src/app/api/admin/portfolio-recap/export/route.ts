import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  handleApiError,
  withAuthAndRole,
} from "@/lib/api-utils";
import {
  ACTIVE_PORTFOLIO_STATUSES,
  buildPortfolioRecap,
  formatRatio,
  type RecapQuoteInput,
} from "@/lib/quotes/portfolio-recap";
import { calendarYear } from "@/lib/quotes/exercise-year-filter";
import { computeDebitNoteLines, debitNoteTotals } from "@/lib/quotes/debit-note";
import { csvDownloadBuffer, csvRow } from "@/lib/quotes/csv-export";

function jsonRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function money(value: number): string {
  return value.toLocaleString("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export async function GET(request: NextRequest) {
  try {
    return await withAuthAndRole(["ADMIN"], async () => {
      const year =
        Number(request.nextUrl.searchParams.get("year")) || calendarYear();
      const quotes = await prisma.quote.findMany({
        where: {
          status: { in: [...ACTIVE_PORTFOLIO_STATUSES] },
          paymentSchedule: { some: { vintageYear: year } },
        },
        include: {
          broker: { select: { id: true, name: true, companyName: true } },
          paymentSchedule: {
            where: { vintageYear: year },
            include: { payments: true },
          },
          debitNotes: { include: { lines: true } },
        },
      });

      const mapped: RecapQuoteInput[] = quotes.map((quote) => {
        const form = jsonRecord(quote.formData);
        const installments = quote.paymentSchedule.flatMap(
          (schedule) => schedule.payments,
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
      });

      const recap = buildPortfolioRecap(mapped, year);
      const lines = [
        csvRow([`PORTEFEUILLE RC DECENNALE ${recap.year}`]),
        csvRow([]),
        csvRow(["Indicateur", "Valeur"]),
        csvRow(["Affaires actives", recap.activeCount]),
        csvRow(["Prime annuelle cumulée", money(recap.annualPremium)]),
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
        csvRow(["Région", "Prime annuelle", "Part", "Nb assurés"]),
        ...recap.geo.map((row) =>
          csvRow([row.label, money(row.annualPremium), formatRatio(row.share), row.count]),
        ),
        csvRow([]),
        csvRow(["Répartition courtier"]),
        csvRow(["Courtier", "Prime annuelle", "Part", "Nb contrats"]),
        ...recap.brokers.map((row) =>
          csvRow([row.label, money(row.annualPremium), formatRatio(row.share), row.count]),
        ),
        csvRow([]),
        csvRow(["Répartition fractionnement"]),
        csvRow([
          "Fractionnement",
          "Nb contrats",
          "Prime annuelle",
          "Prime due (échu)",
          "Prime réglée",
          "Ratio",
        ]),
        ...recap.fractionnement.map((row) =>
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
        ...recap.summary.map((line) => csvRow([line])),
      ];

      return new NextResponse(csvDownloadBuffer(lines), {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="portefeuille-rcd-${year}.csv"`,
        },
      });
    });
  } catch (error) {
    return handleApiError(error);
  }
}
