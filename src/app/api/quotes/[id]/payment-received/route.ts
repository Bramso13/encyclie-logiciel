import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  createApiResponse,
  handleApiError,
  withAuth,
  ApiError,
} from "@/lib/api-utils";

/**
 * POST /api/quotes/[id]/payment-received
 *
 * Enregistre un règlement reçu pour une échéance précise.
 * Body: { installmentId: string, paidAt: string, paymentMethod?: string }
 *
 * - Marque l'échéance comme PAID avec la date de règlement
 * - Passe le devis à INSTALLMENT_IN_PROGRESS
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
      const { installmentId, paidAt, paymentMethod } = body as {
        installmentId: string;
        paidAt: string;
        paymentMethod?: string;
      };

      if (!installmentId) throw new ApiError(400, "installmentId requis");
      if (!paidAt) throw new ApiError(400, "paidAt (date de règlement) requis");

      // Vérifier que l'échéance appartient bien à ce devis
      const installment = await prisma.paymentInstallment.findFirst({
        where: {
          id: installmentId,
          schedule: { quoteId: params.id },
        },
        select: {
          id: true,
          installmentNumber: true,
          status: true,
          amountTTC: true,
        },
      });

      if (!installment) {
        throw new ApiError(404, "Échéance introuvable pour ce devis");
      }

      await prisma.$transaction(async (tx) => {
        // 1. Marquer l'échéance comme PAID
        await tx.paymentInstallment.update({
          where: { id: installmentId },
          data: {
            status: "PAID",
            paidAt: new Date(paidAt),
            paidAmount: installment.amountTTC,
            ...(paymentMethod ? { paymentMethod: paymentMethod as any } : {}),
            updatedAt: new Date(),
          },
        });

        // 2. Passer le devis à INSTALLMENT_IN_PROGRESS
        await tx.quote.update({
          where: { id: params.id },
          data: {
            status: "INSTALLMENT_IN_PROGRESS",
            updatedAt: new Date(),
          },
        });
      });

      const updated = await prisma.paymentInstallment.findUnique({
        where: { id: installmentId },
        select: {
          id: true,
          installmentNumber: true,
          status: true,
          paidAt: true,
          paidAmount: true,
          paymentMethod: true,
        },
      });

      return createApiResponse(
        updated,
        `Règlement enregistré pour l'échéance n°${installment.installmentNumber} (${new Date(paidAt).toLocaleDateString("fr-FR")})`
      );
    });
  } catch (error) {
    return handleApiError(error);
  }
}
