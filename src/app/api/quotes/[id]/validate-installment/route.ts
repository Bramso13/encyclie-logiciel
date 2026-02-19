import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  createApiResponse,
  handleApiError,
  withAuth,
  ApiError,
} from "@/lib/api-utils";

/**
 * POST /api/quotes/[id]/validate-installment
 *
 * Valide la prochaine échéance (la première sans emissionDate, ordre chronologique).
 * Body: { installmentId: string, emissionDate: string }
 *
 * - Définit emissionDate sur l'échéance choisie
 * - Passe le statut du devis à PRIME_CALL_EMITTED
 */
export async function POST(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  try {
    return await withAuth(async (userId, userRole) => {
      const quote = await prisma.quote.findUnique({
        where: { id: params.id },
        select: { id: true, brokerId: true, status: true },
      });

      if (!quote) throw new ApiError(404, "Devis non trouvé");
      if (userRole === "BROKER" && quote.brokerId !== userId) {
        throw new ApiError(403, "Accès refusé à ce devis");
      }

      const body = await request.json();
      const { installmentId, emissionDate } = body as {
        installmentId: string;
        emissionDate: string;
      };

      if (!installmentId) throw new ApiError(400, "installmentId requis");
      if (!emissionDate) throw new ApiError(400, "emissionDate requise");

      // Vérifier que l'échéance appartient bien à ce devis
      const installment = await prisma.paymentInstallment.findFirst({
        where: {
          id: installmentId,
          schedule: { quoteId: params.id },
        },
        select: { id: true, emissionDate: true, installmentNumber: true },
      });

      if (!installment) {
        throw new ApiError(404, "Échéance introuvable pour ce devis");
      }

      await prisma.$transaction(async (tx) => {
        // 1. Définir la date d'émission sur l'échéance
        await tx.paymentInstallment.update({
          where: { id: installmentId },
          data: {
            emissionDate: new Date(emissionDate),
            updatedAt: new Date(),
          },
        });

        // 2. Passer le devis à PRIME_CALL_EMITTED
        await tx.quote.update({
          where: { id: params.id },
          data: {
            status: "PRIME_CALL_EMITTED",
            updatedAt: new Date(),
          },
        });
      });

      const updated = await prisma.paymentInstallment.findUnique({
        where: { id: installmentId },
        select: {
          id: true,
          installmentNumber: true,
          emissionDate: true,
          dueDate: true,
          amountTTC: true,
        },
      });

      return createApiResponse(
        updated,
        `Appel de prime émis pour l'échéance n°${installment.installmentNumber} (${new Date(emissionDate).toLocaleDateString("fr-FR")})`
      );
    });
  } catch (error) {
    return handleApiError(error);
  }
}
