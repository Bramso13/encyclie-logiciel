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

// POST /api/quotes/[id]/payment-schedule - Create payment schedule from calculation result or empty
export async function POST(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  try {
    return await withAuth(async (userId, userRole) => {
      const body = await request.json();
      const { calculationResult, createEmpty } = body;

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

      if (createEmpty === true) {
        const existingSchedule = await prisma.paymentSchedule.findUnique({
          where: { quoteId: params.id },
          include: { payments: { orderBy: { installmentNumber: "asc" } } },
        });
        if (existingSchedule) {
          return createApiResponse(existingSchedule, "Échéancier existant");
        }
        const today = new Date();
        const paymentSchedule = await prisma.paymentSchedule.create({
          data: {
            quoteId: params.id,
            totalAmountHT: 0,
            totalTaxAmount: 0,
            totalAmountTTC: 0,
            startDate: today,
            endDate: today,
            status: "PENDING",
          },
          include: { payments: { orderBy: { installmentNumber: "asc" } } },
        });
        return createApiResponse(paymentSchedule, "Échéancier vide créé");
      }

      if (!calculationResult?.echeancier?.echeances) {
        throw new ApiError(400, "Données de calcul invalides ou indiquez createEmpty: true");
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

// PATCH /api/quotes/[id]/payment-schedule - Update payment schedule and installments
export async function PATCH(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  try {
    return await withAuth(async (userId, userRole) => {
      const quote = await prisma.quote.findUnique({
        where: { id: params.id },
        select: { id: true, brokerId: true },
      });

      if (!quote) {
        throw new ApiError(404, "Devis non trouvé");
      }

      if (userRole === "BROKER" && quote.brokerId !== userId) {
        throw new ApiError(403, "Accès refusé à ce devis");
      }

      const existing = await prisma.paymentSchedule.findUnique({
        where: { quoteId: params.id },
        include: { payments: { orderBy: { installmentNumber: "asc" } } },
      });

      if (!existing) {
        throw new ApiError(404, "Échéancier non trouvé");
      }

      const body = await request.json();
      const { payments } = body as {
        payments?: Array<{
          id?: string;
          dueDate?: string;
          amountHT?: number;
          taxAmount?: number;
          amountTTC?: number;
          rcdAmount?: number;
          pjAmount?: number;
          feesAmount?: number;
          resumeAmount?: number;
          periodStart?: string;
          periodEnd?: string;
          paidAt?: string | null;
          paidAmount?: number | null;
          emissionDate?: string | null;
        }>;
      };

      if (!Array.isArray(payments)) {
        throw new ApiError(400, "Tableau 'payments' requis");
      }

      const isNewPayment = (id: string | undefined) =>
        !id || id.startsWith("new-");

      const bodyIds = new Set(payments.map((p) => p.id).filter((id): id is string => !isNewPayment(id)));
      const toDelete = existing.payments.filter((p) => !bodyIds.has(p.id));
      for (const inst of toDelete) {
        await prisma.paymentInstallment.delete({ where: { id: inst.id } });
      }

      if (payments.length === 0) {
        const updated = await prisma.paymentSchedule.update({
          where: { id: existing.id },
          data: {
            totalAmountHT: 0,
            totalTaxAmount: 0,
            totalAmountTTC: 0,
          },
          include: {
            payments: { orderBy: { installmentNumber: "asc" } },
          },
        });
        return createApiResponse(updated, "Échéancier mis à jour");
      }

      const defaultDate = existing.startDate;
      let totalAmountHT = 0;
      let totalTaxAmount = 0;
      let totalAmountTTC = 0;
      let minStart: Date | null = null;
      let maxEnd: Date | null = null;

      for (let i = 0; i < payments.length; i++) {
        const p = payments[i];
        const inst = !isNewPayment(p.id) ? existing.payments.find((x) => x.id === p.id) : null;
        const dueDate = p.dueDate ? new Date(p.dueDate) : inst?.dueDate ?? defaultDate;
        const periodStart = p.periodStart ? new Date(p.periodStart) : inst?.periodStart ?? defaultDate;
        const periodEnd = p.periodEnd ? new Date(p.periodEnd) : inst?.periodEnd ?? defaultDate;
        const amountHT = typeof p.amountHT === "number" ? p.amountHT : (inst?.amountHT ?? 0);
        const taxAmount = typeof p.taxAmount === "number" ? p.taxAmount : (inst?.taxAmount ?? 0);
        const amountTTC = typeof p.amountTTC === "number" ? p.amountTTC : (inst?.amountTTC ?? 0);
        const rcdAmount = typeof p.rcdAmount === "number" ? p.rcdAmount : (inst?.rcdAmount ?? null);
        const pjAmount = typeof p.pjAmount === "number" ? p.pjAmount : (inst?.pjAmount ?? null);
        const feesAmount = typeof p.feesAmount === "number" ? p.feesAmount : (inst?.feesAmount ?? null);
        const resumeAmount = typeof p.resumeAmount === "number" ? p.resumeAmount : (inst?.resumeAmount ?? null);
        const paidAt = p.paidAt !== undefined
          ? (p.paidAt ? new Date(p.paidAt) : null)
          : undefined;
        const paidAmount =
          p.paidAmount !== undefined
            ? (typeof p.paidAmount === "number" ? p.paidAmount : null)
            : undefined;
        const emissionDate = p.emissionDate !== undefined
          ? (p.emissionDate ? new Date(p.emissionDate) : null)
          : undefined;

        totalAmountHT += amountHT;
        totalTaxAmount += taxAmount;
        totalAmountTTC += amountTTC;
        if (minStart === null || periodStart.getTime() < minStart.getTime()) {
          minStart = periodStart;
        }
        if (maxEnd === null || periodEnd.getTime() > maxEnd.getTime()) {
          maxEnd = periodEnd;
        }

        const data = {
          scheduleId: existing.id,
          installmentNumber: i + 1,
          dueDate,
          amountHT,
          taxAmount,
          amountTTC,
          rcdAmount,
          pjAmount,
          feesAmount,
          resumeAmount,
          periodStart,
          periodEnd,
          status: "PENDING" as const,
        };

        if (inst) {
          const updateData: Record<string, unknown> = {
            installmentNumber: data.installmentNumber,
            dueDate: data.dueDate,
            amountHT: data.amountHT,
            taxAmount: data.taxAmount,
            amountTTC: data.amountTTC,
            rcdAmount: data.rcdAmount,
            pjAmount: data.pjAmount,
            feesAmount: data.feesAmount,
            resumeAmount: data.resumeAmount,
            periodStart: data.periodStart,
            periodEnd: data.periodEnd,
          };
          if (paidAt !== undefined) {
            updateData.paidAt = paidAt;
          }
          if (paidAmount !== undefined) {
            updateData.paidAmount = paidAmount;
          }
          if (emissionDate !== undefined) {
            updateData.emissionDate = emissionDate;
          }
          await prisma.paymentInstallment.update({
            where: { id: inst.id },
            data: updateData,
          });
        } else {
          await prisma.paymentInstallment.create({
            data,
          });
        }
      }

      const startDate = minStart ?? existing.startDate;
      const endDate = maxEnd ?? existing.endDate;

      const updated = await prisma.paymentSchedule.update({
        where: { id: existing.id },
        data: {
          totalAmountHT,
          totalTaxAmount,
          totalAmountTTC,
          startDate,
          endDate,
        },
        include: {
          payments: {
            orderBy: { installmentNumber: "asc" },
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
          },
        },
      });

      return createApiResponse(updated, "Échéancier enregistré");
    });
  } catch (error) {
    return handleApiError(error);
  }
}
