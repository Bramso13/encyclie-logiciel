import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  createApiResponse,
  handleApiError,
  withAuthAndRole,
  ApiError,
} from "@/lib/api-utils";

// PATCH /api/payment-installments/[id]/mark-unpaid - Marquer une échéance comme non payée (Admin only)
export async function PATCH(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  try {
    return await withAuthAndRole(["ADMIN"], async () => {
      const existingPayment = await prisma.paymentInstallment.findUnique({
        where: { id: params.id },
        include: {
          schedule: {
            select: {
              id: true,
              quoteId: true,
            },
          },
        },
      });

      if (!existingPayment) {
        throw new ApiError(404, "Échéance de paiement non trouvée");
      }

      if (existingPayment.status !== "PAID") {
        throw new ApiError(400, "Cette échéance n'est pas marquée comme payée");
      }

      const dueDate = existingPayment.dueDate;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const status =
        dueDate < today ? ("OVERDUE" as const) : ("PENDING" as const);

      const updatedPayment = await prisma.paymentInstallment.update({
        where: { id: params.id },
        data: {
          status,
          paidAt: null,
          paidAmount: null,
          paymentMethod: null,
          paymentReference: null,
          adminNotes: null,
          validatedById: null,
          validatedAt: null,
        },
        include: {
          schedule: {
            include: {
              quote: {
                include: {
                  broker: {
                    select: {
                      name: true,
                      email: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      // Mettre à jour le statut du schedule si besoin (plus tous payés)
      await prisma.paymentSchedule.update({
        where: { id: existingPayment.scheduleId },
        data: {
          status: "PENDING",
        },
      });

      return createApiResponse(
        updatedPayment,
        "Paiement annulé, échéance marquée comme non payée"
      );
    });
  } catch (error) {
    return handleApiError(error);
  }
}
