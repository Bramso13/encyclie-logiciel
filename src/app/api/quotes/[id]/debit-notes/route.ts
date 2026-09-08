import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  ApiError,
  createApiResponse,
  handleApiError,
  withAuth,
} from "@/lib/api-utils";
import {
  computeDebitNoteLines,
  debitNoteTotals,
  yearPeriod,
} from "@/lib/quotes/debit-note";
import { headerFromQuote } from "@/lib/quotes/debit-note-from-quote";
import { calendarYear } from "@/lib/quotes/exercise-year-filter";

async function loadQuote(id: string) {
  return prisma.quote.findUnique({
    where: { id },
    include: {
      product: { select: { name: true } },
      contract: { select: { reference: true } },
      broker: {
        select: {
          id: true,
          name: true,
          companyName: true,
          brokerProfile: { select: { code: true } },
        },
      },
    },
  });
}

function assertAccess(
  quote: { brokerId: string },
  userId: string,
  userRole: string,
) {
  if (userRole !== "ADMIN" && quote.brokerId !== userId) {
    throw new ApiError(403, "Accès refusé");
  }
}

export async function GET(
  _request: NextRequest,
  props: { params: Promise<{ id: string }> },
) {
  const { id } = await props.params;
  try {
    return await withAuth(async (userId, userRole) => {
      const quote = await loadQuote(id);
      if (!quote) throw new ApiError(404, "Dossier introuvable");
      assertAccess(quote, userId, userRole);

      const notes = await prisma.debitNote.findMany({
        where: { quoteId: id },
        include: {
          lines: { orderBy: { periodDate: "asc" } },
        },
        orderBy: { periodStart: "desc" },
      });
      return createApiResponse({ notes });
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(
  request: NextRequest,
  props: { params: Promise<{ id: string }> },
) {
  const { id } = await props.params;
  try {
    return await withAuth(async (userId, userRole) => {
      if (userRole !== "ADMIN") {
        throw new ApiError(403, "Seul un administrateur peut générer une note de débit");
      }
      const body = (await request.json().catch(() => ({}))) as { year?: number };
      const year = Number(body.year) || calendarYear();
      const { start, end } = yearPeriod(year);

      const quote = await loadQuote(id);
      if (!quote) throw new ApiError(404, "Dossier introuvable");

      const schedule = await prisma.paymentSchedule.findFirst({
        where: { quoteId: id, vintageYear: year },
        include: {
          payments: { orderBy: { installmentNumber: "asc" } },
        },
      });
      const installments =
        schedule?.payments ??
        (
          await prisma.paymentInstallment.findMany({
            where: {
              schedule: { quoteId: id },
              dueDate: { gte: start, lte: end },
            },
            orderBy: { installmentNumber: "asc" },
          })
        );

      if (installments.length === 0) {
        throw new ApiError(
          400,
          `Aucune échéance pour l'exercice ${year}`,
        );
      }

      const header = headerFromQuote(quote);
      const lines = computeDebitNoteLines(installments);
      const totals = debitNoteTotals(lines);

      const note = await prisma.$transaction(async (tx) => {
        const existing = await tx.debitNote.findFirst({
          where: { quoteId: id, periodStart: start },
        });
        if (existing) {
          await tx.debitNoteLine.deleteMany({
            where: { debitNoteId: existing.id },
          });
          await tx.debitNote.delete({ where: { id: existing.id } });
        }
        return tx.debitNote.create({
          data: {
            quoteId: id,
            periodStart: start,
            periodEnd: end,
            contractNumber: header.contractNumber,
            directorName: header.directorName,
            clientName: header.clientName,
            clientAddress: header.clientAddress,
            clientCity: header.clientCity,
            intermediary: header.intermediary,
            brokerCode: header.brokerCode,
            companyName: header.companyName,
            annualAmount: totals.annualAmount,
            totalCommission: totals.totalCommission,
            lines: {
              create: lines.map((line) => ({
                installmentId: line.installmentId,
                periodDate: line.periodDate,
                amountTTC: line.amountTTC,
                primeRcdHT: line.primeRcdHT,
                commission: line.commission,
                netHorsCom: line.netHorsCom,
                paymentDate: line.paymentDate,
              })),
            },
          },
          include: { lines: { orderBy: { periodDate: "asc" } } },
        });
      });

      return createApiResponse(note, `Note de débit ${year} générée`);
    });
  } catch (error) {
    return handleApiError(error);
  }
}
