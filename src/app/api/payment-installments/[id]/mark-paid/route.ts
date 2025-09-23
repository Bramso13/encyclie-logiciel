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
    return await withAuthAndRole(['ADMIN'], async (userId) => {
      const body = await request.json();
      const { amount, method, reference, notes } = body;

      // Vérifier que l'échéance existe
      const installment = await prisma.paymentInstallment.findUnique({
        where: { id: params.id },
        include: {
          schedule: {
            include: {
              quote: {
                select: {
                  id: true,
                  reference: true,
                  brokerId: true,
                },
              },
            },
          },
        },
      });

      if (!installment) {
        throw new ApiError(404, "Échéance non trouvée");
      }

      // Vérifier que l'échéance n'est pas déjà payée
      if (installment.status === 'PAID') {
        throw new ApiError(400, "Cette échéance est déjà marquée comme payée");
      }

      const paidAmount = parseFloat(amount);
      if (isNaN(paidAmount) || paidAmount <= 0) {
        throw new ApiError(400, "Le montant payé doit être positif");
      }

      // Déterminer le nouveau statut
      let newStatus: 'PAID' | 'PARTIALLY_PAID' = 'PAID';
      if (paidAmount < installment.amountTTC) {
        newStatus = 'PARTIALLY_PAID';
      }

      // Mettre à jour l'échéance dans une transaction
      const result = await prisma.$transaction(async (tx) => {
        // Créer la transaction de paiement
        await tx.paymentTransaction.create({
          data: {
            installmentId: params.id,
            amount: paidAmount,
            method: method || 'BANK_TRANSFER',
            reference: reference || null,
            notes: notes || null,
            validatedById: userId,
            validatedAt: new Date(),
          },
        });

        // Mettre à jour l'échéance
        const updatedInstallment = await tx.paymentInstallment.update({
          where: { id: params.id },
          data: {
            status: newStatus,
            paidAt: new Date(),
            paidAmount: (installment.paidAmount || 0) + paidAmount,
            paymentMethod: method || 'BANK_TRANSFER',
            paymentReference: reference || null,
            adminNotes: notes || null,
            validatedById: userId,
            validatedAt: new Date(),
          },
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
                createdAt: 'desc',
              },
            },
          },
        });

        // Vérifier s'il faut mettre à jour le statut global de l'échéancier
        const allInstallments = await tx.paymentInstallment.findMany({
          where: { scheduleId: installment.scheduleId },
          select: { status: true },
        });

        const allPaid = allInstallments.every(inst => inst.status === 'PAID');
        const anyPaid = allInstallments.some(inst => inst.status === 'PAID' || inst.status === 'PARTIALLY_PAID');

        let scheduleStatus: 'PENDING' | 'PAID' | 'PARTIALLY_PAID' = 'PENDING';
        if (allPaid) {
          scheduleStatus = 'PAID';
        } else if (anyPaid) {
          scheduleStatus = 'PARTIALLY_PAID';
        }

        // Mettre à jour le statut de l'échéancier
        await tx.paymentSchedule.update({
          where: { id: installment.scheduleId },
          data: { status: scheduleStatus },
        });

        return updatedInstallment;
      });

      // Créer une notification pour le courtier
      await prisma.notification.create({
        data: {
          type: 'GENERAL',
          title: 'Paiement validé',
          message: `Le paiement de l'échéance #${installment.installmentNumber} (${paidAmount.toLocaleString('fr-FR')} €) a été validé par l'administration.`,
          userId: installment.schedule.quote.brokerId,
          relatedEntityType: 'quote',
          relatedEntityId: installment.schedule.quote.id,
        },
      });

      return createApiResponse(result, "Paiement validé avec succès");
    });
  } catch (error) {
    return handleApiError(error);
  }
}