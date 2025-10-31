import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  createApiResponse,
  handleApiError,
  withAuth,
  ApiError,
} from "@/lib/api-utils";

// Fonction pour convertir une date au format français DD/MM/YYYY vers un objet Date
// function parseDateFrancaise(dateFr: string): Date {
//   const [jour, mois, annee] = dateFr.split("/").map(Number);
//   // Mois - 1 car les mois en JavaScript commencent à 0
//   return new Date(annee, mois - 1, jour);
// }

// GET /api/quotes/[id]/payment-schedule - Get payment schedule for a quote
export async function GET(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  try {
    return await withAuth(async (userId, userRole) => {
      // Vérifier que le devis existe et que l'utilisateur y a accès
      const quote = await prisma.quote.findUnique({
        where: { id: params.id },
        select: {
          id: true,
          brokerId: true,
          status: true,
        },
      });

      if (!quote) {
        throw new ApiError(404, "Devis non trouvé");
      }

      // Contrôle d'accès basé sur les rôles
      if (userRole === "BROKER" && quote.brokerId !== userId) {
        throw new ApiError(403, "Accès refusé à ce devis");
      }

      // Récupérer l'échéancier avec toutes les échéances
      const paymentSchedule = await prisma.paymentSchedule.findUnique({
        where: { quoteId: params.id },
        include: {
          payments: {
            include: {
              validatedBy: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  role: true,
                },
              },
              transactions: {
                include: {
                  validatedBy: {
                    select: {
                      id: true,
                      name: true,
                      email: true,
                      role: true,
                    },
                  },
                },
                orderBy: {
                  createdAt: "desc",
                },
              },
            },
            orderBy: {
              installmentNumber: "asc",
            },
          },
        },
      });

      if (!paymentSchedule) {
        throw new ApiError(404, "Échéancier non trouvé");
      }

      return createApiResponse(paymentSchedule);
    });
  } catch (error) {
    return handleApiError(error);
  }
}

// POST /api/quotes/[id]/payment-schedule - Create payment schedule from calculation result
export async function POST(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  try {
    return await withAuth(async (userId, userRole) => {
      const body = await request.json();
      const { calculationResult } = body;

      if (!calculationResult?.echeancier?.echeances) {
        throw new ApiError(400, "Données de calcul invalides");
      }

      // Vérifier que le devis existe et que l'utilisateur y a accès
      const quote = await prisma.quote.findUnique({
        where: { id: params.id },
        select: {
          id: true,
          brokerId: true,
          status: true,
        },
      });

      if (!quote) {
        throw new ApiError(404, "Devis non trouvé");
      }

      // Contrôle d'accès basé sur les rôles
      if (userRole === "BROKER" && quote.brokerId !== userId) {
        throw new ApiError(403, "Accès refusé à ce devis");
      }

      const echeances = calculationResult.echeancier.echeances;

      // Calculer les totaux
      const totalAmountHT = calculationResult.primeTotal || 0;
      const totalTaxAmount = calculationResult.autres?.taxeAssurance || 0;
      const totalAmountTTC = calculationResult.totalTTC || 0;

      // Créer l'échéancier avec les échéances
      const paymentSchedule = await prisma.paymentSchedule.create({
        data: {
          quoteId: params.id,
          totalAmountHT,
          totalTaxAmount,
          totalAmountTTC,
          startDate: new Date(echeances[0].debutPeriode),
          endDate: new Date(echeances[echeances.length - 1].finPeriode),
          status: "PENDING",
          payments: {
            create: echeances.map((echeance: any, index: number) => ({
              installmentNumber: index + 1,
              dueDate: new Date(echeance.date),
              amountHT: echeance.totalHT || 0,
              taxAmount: echeance.taxe || 0,
              amountTTC: echeance.totalTTC || 0,
              rcdAmount: echeance.rcd || 0,
              pjAmount: echeance.pj || 0,
              feesAmount: echeance.frais || 0,
              resumeAmount: echeance.reprise || 0,
              periodStart: new Date(echeance.debutPeriode),
              periodEnd: new Date(echeance.finPeriode),
              status: "PENDING",
            })),
          },
        },
        include: {
          payments: {
            include: {
              validatedBy: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  role: true,
                },
              },
            },
            orderBy: {
              installmentNumber: "asc",
            },
          },
        },
      });

      return createApiResponse(paymentSchedule, "Échéancier créé avec succès");
    });
  } catch (error) {
    return handleApiError(error);
  }
}
