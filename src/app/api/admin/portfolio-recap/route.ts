import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  createApiResponse,
  handleApiError,
  withAuthAndRole,
} from "@/lib/api-utils";
import {
  ACTIVE_PORTFOLIO_STATUSES,
  buildPortfolioRecap,
  type RecapQuoteInput,
} from "@/lib/quotes/portfolio-recap";
import { calendarYear } from "@/lib/quotes/exercise-year-filter";
import { computeDebitNoteLines, debitNoteTotals } from "@/lib/quotes/debit-note";

function jsonRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
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
        const installments = quote.paymentSchedule.flatMap((schedule) =>
          schedule.payments,
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

      return createApiResponse(buildPortfolioRecap(mapped, year));
    });
  } catch (error) {
    return handleApiError(error);
  }
}
