import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuthAndRole, ApiError } from "@/lib/api-utils";

export async function POST(request: NextRequest) {
  try {
    return await withAuthAndRole(["ADMIN"], async () => {
      const body = await request.json();
      const { startDate, endDate } = body;

      if (!startDate || !endDate) {
        throw new ApiError(400, "Les dates de début et fin sont requises");
      }

      const start = new Date(startDate);
      const end = new Date(endDate);

      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        throw new ApiError(400, "Dates invalides");
      }

      // Réinitialiser les paiements pour la période sélectionnée
      // On cible les échéances où paidAt est dans la période
      const result = await prisma.paymentInstallment.updateMany({
        where: {
          paidAt: {
            gte: start,
            lt: end,
          },
        },
        data: {
          paidAt: null,
          paidAmount: null,
          paymentMethod: null,
          status: "PENDING",
        },
      });

      return NextResponse.json({
        success: true,
        count: result.count,
        message: `${result.count} paiement(s) réinitialisé(s)`,
      });
    });
  } catch (error) {
    console.error("Erreur réinitialisation paiements:", error);
    if (error instanceof ApiError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.status },
      );
    }
    return NextResponse.json(
      { success: false, error: "Erreur serveur" },
      { status: 500 },
    );
  }
}
