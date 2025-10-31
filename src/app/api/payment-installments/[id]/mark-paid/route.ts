import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  createApiResponse,
  handleApiError,
  withAuthAndRole,
  ApiError,
} from "@/lib/api-utils";

// PATCH /api/payment-installments/[id]/mark-paid - Mark payment installment as paid (Admin only)
export async function PATCH(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  try {
    return await withAuthAndRole(["ADMIN"], async (userId, userRole) => {
      const body = await request.json();
      const { paymentMethod, paymentReference, adminNotes } = body;

      // Get existing payment installment
      const existingPayment = await prisma.paymentInstallment.findUnique({
        where: { id: params.id },
        include: {
          schedule: {
            include: {
              quote: {
                select: {
                  reference: true,
                  brokerId: true,
                },
              },
            },
          },
        },
      });

      if (!existingPayment) {
        throw new ApiError(404, "Échéance de paiement non trouvée");
      }

      // Check if already paid
      if (existingPayment.status === "PAID") {
        throw new ApiError(400, "Ce paiement est déjà marqué comme payé");
      }

      // Update payment installment
      const updatedPayment = await prisma.paymentInstallment.update({
        where: { id: params.id },
        data: {
          status: "PAID",
          paidAt: new Date(),
          paidAmount: existingPayment.amountTTC,
          paymentMethod: paymentMethod || null,
          paymentReference: paymentReference || null,
          adminNotes: adminNotes || null,
          validatedById: userId,
          validatedAt: new Date(),
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

      // Check if all payments in the schedule are now paid
      const allPayments = await prisma.paymentInstallment.findMany({
        where: {
          scheduleId: existingPayment.scheduleId,
        },
      });

      const allPaid = allPayments.every((p) => p.status === "PAID");

      // Update schedule status if all payments are paid
      if (allPaid) {
        await prisma.paymentSchedule.update({
          where: { id: existingPayment.scheduleId },
          data: {
            status: "PAID",
          },
        });
      }

      // Create notification for broker
      await prisma.notification.create({
        data: {
          type: "PAYMENT_DUE",
          title: `Paiement confirmé - ${updatedPayment.schedule.quote.reference}`,
          message: `Le paiement de l'échéance n°${updatedPayment.installmentNumber} (${updatedPayment.amountTTC}€) a été confirmé.`,
          userId: updatedPayment.schedule.quote.brokerId,
          relatedEntityType: "quote",
          relatedEntityId: updatedPayment.schedule.quoteId,
        },
      });

      return createApiResponse(
        updatedPayment,
        "Paiement marqué comme payé avec succès"
      );
    });
  } catch (error) {
    return handleApiError(error);
  }
}
