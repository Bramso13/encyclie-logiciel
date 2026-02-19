import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  createApiResponse,
  handleApiError,
  withAuth,
  ApiError,
} from "@/lib/api-utils";

/**
 * POST /api/quotes/[id]/resiliate
 *
 * Body: { resiliationDate: string | null, resiliationReason?: string }
 *
 * - resiliationDate non null → résilier :
 *     • PaymentSchedule.resiliationDate = date
 *     • InsuranceContract.status = CANCELLED (si contrat associé)
 * - resiliationDate null → annuler la résiliation :
 *     • PaymentSchedule.resiliationDate = null
 *     • InsuranceContract.status = ACTIVE (si contrat associé)
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
        select: {
          id: true,
          brokerId: true,
          status: true,
          contract: {
            select: { id: true, status: true },
          },
        },
      });

      if (!quote) throw new ApiError(404, "Devis non trouvé");
      if (userRole === "BROKER" && quote.brokerId !== userId) {
        throw new ApiError(403, "Accès refusé à ce devis");
      }

      const body = await request.json();
      const { resiliationDate, resiliationReason } = body as {
        resiliationDate: string | null;
        resiliationReason?: string;
      };

      const schedule = await prisma.paymentSchedule.findUnique({
        where: { quoteId: params.id },
        select: { id: true },
      });

      if (!schedule) throw new ApiError(404, "Échéancier non trouvé pour ce devis");

      const isResiliate = resiliationDate !== null && resiliationDate !== undefined;

      await prisma.$transaction(async (tx) => {
        // 1. Mise à jour de l'échéancier
        await tx.paymentSchedule.update({
          where: { id: schedule.id },
          data: {
            resiliationDate: isResiliate ? new Date(resiliationDate!) : null,
            resiliationReason: isResiliate ? (resiliationReason ?? null) : null,
            updatedAt: new Date(),
          },
        });

        // 2. Mise à jour du contrat si existant
        if (quote.contract) {
          await tx.insuranceContract.update({
            where: { id: quote.contract.id },
            data: {
              status: isResiliate ? "CANCELLED" : "ACTIVE",
              updatedAt: new Date(),
            },
          });
        }
      });

      // Retourner l'état mis à jour
      const updatedSchedule = await prisma.paymentSchedule.findUnique({
        where: { id: schedule.id },
        select: {
          id: true,
          resiliationDate: true,
          resiliationReason: true,
        },
      });

      const updatedContract = quote.contract
        ? await prisma.insuranceContract.findUnique({
            where: { id: quote.contract.id },
            select: { id: true, status: true },
          })
        : null;

      const message = isResiliate
        ? `Contrat résilié au ${new Date(resiliationDate!).toLocaleDateString("fr-FR")}`
        : "Résiliation annulée — contrat remis actif";

      return createApiResponse(
        { schedule: updatedSchedule, contract: updatedContract },
        message
      );
    });
  } catch (error) {
    return handleApiError(error);
  }
}
