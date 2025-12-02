import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  createApiResponse,
  handleApiError,
  withAuthAndRole,
} from "@/lib/api-utils";

// GET /api/payment-installments/overdue - Get all overdue payment installments (Admin only)
export async function GET(request: NextRequest) {
  try {
    return await withAuthAndRole(["ADMIN"], async (userId, userRole) => {
      const now = new Date();

      // Get all payment installments that are overdue
      const overduePayments = await prisma.paymentInstallment.findMany({
        where: {
          dueDate: {
            lt: now, // Date d'échéance dépassée
          },
          status: {
            not: "PAID", // Pas encore payé
          },
        },
        include: {
          schedule: {
            include: {
              quote: {
                include: {
                  broker: {
                    select: {
                      id: true,
                      name: true,
                      email: true,
                      companyName: true,
                      phone: true,
                    },
                  },
                  product: {
                    select: {
                      name: true,
                      code: true,
                    },
                  },
                },
              },
            },
          },
          validatedBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: {
          dueDate: "asc", // Les plus anciens en premier
        },
      });

      // Calculer le nombre de jours de retard pour chaque paiement
      const paymentsWithDelay = overduePayments.map((payment) => {
        const dueDate = new Date(payment.dueDate);
        const diffTime = now.getTime() - dueDate.getTime();
        const daysOverdue = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        return {
          ...payment,
          daysOverdue,
        };
      });

      return createApiResponse({
        payments: paymentsWithDelay,
        total: paymentsWithDelay.length,
      });
    });
  } catch (error) {
    return handleApiError(error);
  }
}









