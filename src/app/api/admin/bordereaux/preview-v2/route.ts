import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { withAuthAndRole } from "@/lib/api-utils";
import { getPolicesV2, getQuittancesV2 } from "@/lib/bordereau";
import type { BordereauInclusionOptions } from "@/lib/bordereau";

const prisma = new PrismaClient();

/**
 * POST /api/admin/bordereaux/preview-v2
 *
 * Prévisualisation v2 : polices + quittances pour la période uniquement.
 * Pas de filtre courtiers. Nécessite le rôle ADMIN.
 */
export async function POST(request: NextRequest) {
  return withAuthAndRole(["ADMIN"], async () => {
    try {
      const body = await request.json();
      const { dateRange, inclusionOptions } = body as {
        dateRange?: { startDate: string; endDate: string };
        inclusionOptions?: BordereauInclusionOptions;
      };

      if (!dateRange?.startDate || !dateRange?.endDate) {
        return NextResponse.json(
          { success: false, error: "dateRange.startDate et dateRange.endDate requis" },
          { status: 400 },
        );
      }

      const startDate = new Date(dateRange.startDate);
      const endDate = new Date(dateRange.endDate);
      const filters = { dateRange: { startDate, endDate } };

      const [polices, quittances] = await Promise.all([
        getPolicesV2(filters, prisma, inclusionOptions),
        getQuittancesV2(filters, prisma, inclusionOptions),
      ]);

      return NextResponse.json({
        success: true,
        polices,
        quittances,
        metadata: {
          dateRange: { startDate, endDate },
          generatedAt: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error("Error in bordereau preview-v2:", error);
      return NextResponse.json(
        {
          success: false,
          error:
            error instanceof Error ? error.message : "Erreur lors de la prévisualisation",
        },
        { status: 500 },
      );
    } finally {
      await prisma.$disconnect();
    }
  });
}
