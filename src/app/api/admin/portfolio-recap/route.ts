import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  createApiResponse,
  handleApiError,
  withPermission,
} from "@/lib/api-utils";
import {
  ACTIVE_PORTFOLIO_STATUSES,
  buildPortfolioRecap,
} from "@/lib/quotes/portfolio-recap";
import { toRecapQuoteInput } from "@/lib/quotes/portfolio-recap-source";
import { calendarYear } from "@/lib/quotes/exercise-year-filter";

export async function GET(request: NextRequest) {
  try {
    return await withPermission("PRODUCTION", async () => {
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
          vintages: {
            where: { year },
            select: { calculatedPremium: true },
          },
        },
      });

      const mapped = quotes.map((quote) => toRecapQuoteInput(quote));

      return createApiResponse(buildPortfolioRecap(mapped, year));
    });
  } catch (error) {
    return handleApiError(error);
  }
}
