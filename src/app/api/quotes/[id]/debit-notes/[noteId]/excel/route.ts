import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  ApiError,
  handleApiError,
  withAuth,
} from "@/lib/api-utils";
import { csvDownloadBuffer } from "@/lib/quotes/csv-export";
import {
  debitNoteCsvLines,
  type DebitNoteHeader,
  type DebitNoteLineComputed,
} from "@/lib/quotes/debit-note";

export async function GET(
  _request: NextRequest,
  props: { params: Promise<{ id: string; noteId: string }> },
) {
  const { id, noteId } = await props.params;
  try {
    return await withAuth(async (userId, userRole) => {
      const note = await prisma.debitNote.findFirst({
        where: { id: noteId, quoteId: id },
        include: {
          lines: { orderBy: { periodDate: "asc" } },
          quote: { select: { brokerId: true, reference: true } },
        },
      });
      if (!note) throw new ApiError(404, "Note de débit introuvable");
      if (userRole !== "ADMIN" && note.quote.brokerId !== userId) {
        throw new ApiError(403, "Accès refusé");
      }

      const header: DebitNoteHeader = {
        contractNumber: note.contractNumber || "",
        directorName: note.directorName || "",
        clientName: note.clientName || "",
        clientAddress: note.clientAddress || "",
        clientCity: note.clientCity || "",
        intermediary: note.intermediary || "",
        brokerCode: note.brokerCode || "",
        companyName: note.companyName || "",
      };
      const lines: DebitNoteLineComputed[] = note.lines.map((line) => ({
        installmentId: line.installmentId,
        installmentNumber: 0,
        periodDate: line.periodDate,
        amountTTC: line.amountTTC,
        primeRcdHT: line.primeRcdHT,
        commission: line.commission,
        netHorsCom: line.netHorsCom,
        paymentDate: line.paymentDate,
      }));
      const buffer = csvDownloadBuffer(
        debitNoteCsvLines(header, note.periodStart, note.periodEnd, lines),
      );
      const filename = `note-de-debit-${note.quote.reference}.csv`;
      return new NextResponse(buffer, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      });
    });
  } catch (error) {
    return handleApiError(error);
  }
}
