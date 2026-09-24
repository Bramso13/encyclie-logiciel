import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handleApiError, withPermission } from "@/lib/api-utils";
import {
  ACTIVE_PORTFOLIO_STATUSES,
  buildPortfolioRecap,
} from "@/lib/quotes/portfolio-recap";
import { toRecapQuoteInput } from "@/lib/quotes/portfolio-recap-source";
import { calendarYear } from "@/lib/quotes/exercise-year-filter";
import { csvDownloadBuffer } from "@/lib/quotes/csv-export";
import {
  buildPortfolioCsvLines,
  portfolioExportFilename,
  portfolioExportVariant,
} from "@/lib/quotes/portfolio-export";

export async function GET(request: NextRequest) {
  try {
    return await withPermission("PRODUCTION", async () => {
      const year =
        Number(request.nextUrl.searchParams.get("year")) || calendarYear();
      const variant = portfolioExportVariant(
        request.nextUrl.searchParams.get("variant"),
      );
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

      const recap = buildPortfolioRecap(
        quotes.map((quote) => toRecapQuoteInput(quote)),
        year,
      );

      return new NextResponse(csvDownloadBuffer(buildPortfolioCsvLines(recap, variant)), {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${portfolioExportFilename(year, variant)}"`,
        },
      });
    });
  } catch (error) {
    return handleApiError(error);
  }
}
