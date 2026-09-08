import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  createApiResponse,
  handleApiError,
  withAuthAndRole,
} from "@/lib/api-utils";

const DEFAULT_LIMIT = 25;

export async function GET(request: NextRequest) {
  try {
    return await withAuthAndRole(["ADMIN"], async () => {
      const now = new Date();
      const page = Math.max(
        1,
        Number(request.nextUrl.searchParams.get("page")) || 1,
      );
      const limit = Math.min(
        100,
        Math.max(
          1,
          Number(request.nextUrl.searchParams.get("limit")) || DEFAULT_LIMIT,
        ),
      );

      const where = {
        dueDate: { lt: now },
        status: { not: "PAID" as const },
      };

      const [total, overduePayments] = await Promise.all([
        prisma.paymentInstallment.count({ where }),
        prisma.paymentInstallment.findMany({
          where,
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
          orderBy: { dueDate: "asc" },
          skip: (page - 1) * limit,
          take: limit,
        }),
      ]);

      const paymentsWithDelay = overduePayments.map((payment) => {
        const dueDate = new Date(payment.dueDate);
        const daysOverdue = Math.floor(
          (now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24),
        );
        return { ...payment, daysOverdue };
      });

      return createApiResponse({
        payments: paymentsWithDelay,
        total,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      });
    });
  } catch (error) {
    return handleApiError(error);
  }
}
