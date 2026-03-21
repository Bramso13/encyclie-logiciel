import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  withAuthAndRole,
  handleApiError,
} from "@/lib/api-utils";

/**
 * GET /api/admin/ecarts-montants
 * Devis avec au moins 2 échéances et tous les amountHT identiques.
 * Query: ?search= pour filtrer par référence (insensible à la casse).
 */
export async function GET(request: NextRequest) {
  try {
    return await withAuthAndRole(["ADMIN"], async () => {
      const search = request.nextUrl.searchParams.get("search")?.trim() ?? "";

      const schedules = await prisma.paymentSchedule.findMany({
        where: search
          ? {
              quote: {
                reference: { contains: search, mode: "insensitive" },
              },
            }
          : {},
        include: {
          quote: {
            select: {
              id: true,
              reference: true,
              status: true,
              modifieAlaMain: true,
              contract: { select: { id: true, reference: true } },
            },
          },
          payments: { select: { amountHT: true } },
        },
      });

      const data = schedules
        .filter((s) => {
          const payments = s.payments;
          if (payments.length < 2) return false;
          const firstHt = payments[0].amountHT;
          return payments.every((p) => p.amountHT === firstHt);
        })
        .map((s) => ({
          id: s.quote.id,
          reference: s.quote.reference,
          status: s.quote.status,
          installmentCount: s.payments.length,
          commonAmountHT: s.payments[0]?.amountHT ?? 0,
          contract: s.quote.contract
            ? {
                id: s.quote.contract.id,
                reference: s.quote.contract.reference,
              }
            : null,
          modifieAlaMain: s.quote.modifieAlaMain,
        }));

      return NextResponse.json({ success: true, data });
    });
  } catch (e) {
    return handleApiError(e);
  }
}
