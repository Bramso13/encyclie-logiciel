import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  createApiResponse,
  handleApiError,
  withAuth,
} from "@/lib/api-utils";

// GET /api/payment-installments - Get all payment installments (filtered by role)
export async function GET(request: NextRequest) {
  try {
    return await withAuth(async (userId, userRole) => {
      const { searchParams } = new URL(request.url);
      const quoteId = searchParams.get('quoteId');
      

      

      // Récupérer les échéances avec toutes les infos nécessaires
      const [installments, total] = await Promise.all([
        prisma.paymentInstallment.findMany({
          where: {
            schedule: {
              quoteId: quoteId ?? ''
            }
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
                      }
                    },
                    product: {
                      select: {
                        name: true,
                        code: true,
                      }
                    }
                  }
                }
              }
            },
            validatedBy: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
              }
            },
            transactions: {
              include: {
                validatedBy: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    role: true,
                  }
                }
              },
              orderBy: {
                createdAt: 'desc'
              }
            }
          },
          orderBy: [
            { dueDate: 'asc' },
            { installmentNumber: 'asc' }
          ],

        }),
        prisma.paymentInstallment.count({
          where: {
            schedule: {
              quoteId: quoteId ?? ''
            }
          },
        })
      ]);

      return createApiResponse({
        installments,
        pagination: {
          total,
          totalPages: Math.ceil(total / 50),
        }
      });
    });
  } catch (error) {
    return handleApiError(error);
  }
}