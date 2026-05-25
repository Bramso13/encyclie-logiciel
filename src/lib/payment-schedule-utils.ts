/**
 * Utilitaires pour la gestion des échéanciers de paiement
 * Inclut la conservation des paiements lors de la régénération
 */

import { PrismaClient, PaymentScheduleStatus, PaymentMethod, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

// Type pour stocker les informations de paiement à conserver
type PaymentInfo = {
  periodStart: Date;
  periodEnd: Date;
  status: PaymentScheduleStatus;
  paidAt: Date | null;
  paidAmount: number | null;
  paymentMethod: PaymentMethod | null;
  paymentReference: string | null;
  validatedById: string | null;
  validatedAt: Date | null;
  adminNotes: string | null;
  brokerNotes: string | null;
  emissionDate: Date | null;
  lastReminderSent: Date | null;
  reminderCount: number;
  transactions: {
    amount: number;
    method: PaymentMethod;
    reference: string | null;
    validatedById: string | null;
    validatedAt: Date | null;
    notes: string | null;
    proofDocumentPath: string | null;
  }[];
};

/**
 * Sauvegarde les informations de paiement des échéances existantes
 * avant suppression pour restauration ultérieure
 */
export async function savePaymentInfoBeforeRegeneration(
  tx: Prisma.TransactionClient,
  scheduleId: string
): Promise<PaymentInfo[]> {
  const existingInstallments = await tx.paymentInstallment.findMany({
    where: { scheduleId },
    include: {
      transactions: true,
    },
  });

  return existingInstallments.map((inst) => ({
    periodStart: inst.periodStart,
    periodEnd: inst.periodEnd,
    status: inst.status,
    paidAt: inst.paidAt,
    paidAmount: inst.paidAmount,
    paymentMethod: inst.paymentMethod,
    paymentReference: inst.paymentReference,
    validatedById: inst.validatedById,
    validatedAt: inst.validatedAt,
    adminNotes: inst.adminNotes,
    brokerNotes: inst.brokerNotes,
    emissionDate: inst.emissionDate,
    lastReminderSent: inst.lastReminderSent,
    reminderCount: inst.reminderCount,
    transactions: inst.transactions.map((t) => ({
      amount: t.amount,
      method: t.method,
      reference: t.reference,
      validatedById: t.validatedById,
      validatedAt: t.validatedAt,
      notes: t.notes,
      proofDocumentPath: t.proofDocumentPath,
    })),
  }));
}

/**
 * Compare deux périodes pour vérifier si elles correspondent
 * Utilisé pour matcher les anciennes échéances avec les nouvelles
 */
function periodsMatch(
  period1Start: Date,
  period1End: Date,
  period2Start: Date,
  period2End: Date
): boolean {
  const start1 = new Date(period1Start).setHours(0, 0, 0, 0);
  const start2 = new Date(period2Start).setHours(0, 0, 0, 0);
  const end1 = new Date(period1End).setHours(0, 0, 0, 0);
  const end2 = new Date(period2End).setHours(0, 0, 0, 0);

  return start1 === start2 && end1 === end2;
}

/**
 * Restaure les informations de paiement sur les nouvelles échéances
 * basé sur la correspondance des périodes
 */
export async function restorePaymentInfoAfterRegeneration(
  tx: Prisma.TransactionClient,
  newInstallments: { id: string; periodStart: Date; periodEnd: Date }[],
  savedPaymentInfo: PaymentInfo[]
): Promise<void> {
  for (const newInst of newInstallments) {
    // Chercher une échéance correspondante par période
    const matchingPayment = savedPaymentInfo.find((saved) =>
      periodsMatch(saved.periodStart, saved.periodEnd, newInst.periodStart, newInst.periodEnd)
    );

    if (matchingPayment && matchingPayment.status !== "PENDING") {
      // Mettre à jour la nouvelle échéance avec les infos de paiement
      await tx.paymentInstallment.update({
        where: { id: newInst.id },
        data: {
          status: matchingPayment.status,
          paidAt: matchingPayment.paidAt,
          paidAmount: matchingPayment.paidAmount,
          paymentMethod: matchingPayment.paymentMethod,
          paymentReference: matchingPayment.paymentReference,
          validatedById: matchingPayment.validatedById,
          validatedAt: matchingPayment.validatedAt,
          adminNotes: matchingPayment.adminNotes,
          brokerNotes: matchingPayment.brokerNotes,
          emissionDate: matchingPayment.emissionDate,
          lastReminderSent: matchingPayment.lastReminderSent,
          reminderCount: matchingPayment.reminderCount,
        },
      });

      // Recréer les transactions si elles existent
      if (matchingPayment.transactions.length > 0) {
        for (const transaction of matchingPayment.transactions) {
          await tx.paymentTransaction.create({
            data: {
              installmentId: newInst.id,
              amount: transaction.amount,
              method: transaction.method,
              reference: transaction.reference,
              validatedById: transaction.validatedById,
              validatedAt: transaction.validatedAt,
              notes: transaction.notes,
              proofDocumentPath: transaction.proofDocumentPath,
            },
          });
        }
      }
    }
  }
}

/**
 * Fonction complète pour régénérer un échéancier en conservant les paiements
 * Supprime les anciennes échéances, crée les nouvelles, restaure les paiements
 */
export async function regenerateScheduleWithPaymentPreservation(
  tx: Prisma.TransactionClient,
  scheduleId: string,
  newEcheances: {
    installmentNumber: number;
    dueDate: Date;
    amountHT: number;
    taxAmount: number;
    amountTTC: number;
    rcdAmount?: number;
    pjAmount?: number;
    feesAmount?: number;
    resumeAmount?: number;
    periodStart: Date;
    periodEnd: Date;
  }[]
): Promise<void> {
  // 1. Sauvegarder les infos de paiement des échéances existantes
  const savedPaymentInfo = await savePaymentInfoBeforeRegeneration(tx, scheduleId);

  // 2. Supprimer toutes les échéances existantes (hard-delete)
  await tx.paymentInstallment.deleteMany({
    where: { scheduleId },
  });

  // 3. Créer les nouvelles échéances
  const createdInstallments: { id: string; periodStart: Date; periodEnd: Date }[] = [];

  for (const echeance of newEcheances) {
    const created = await tx.paymentInstallment.create({
      data: {
        scheduleId,
        installmentNumber: echeance.installmentNumber,
        dueDate: echeance.dueDate,
        amountHT: echeance.amountHT,
        taxAmount: echeance.taxAmount,
        amountTTC: echeance.amountTTC,
        rcdAmount: echeance.rcdAmount ?? null,
        pjAmount: echeance.pjAmount ?? null,
        feesAmount: echeance.feesAmount ?? null,
        resumeAmount: echeance.resumeAmount ?? null,
        periodStart: echeance.periodStart,
        periodEnd: echeance.periodEnd,
        status: "PENDING",
      },
    });

    createdInstallments.push({
      id: created.id,
      periodStart: created.periodStart,
      periodEnd: created.periodEnd,
    });
  }

  // 4. Restaurer les informations de paiement
  await restorePaymentInfoAfterRegeneration(tx, createdInstallments, savedPaymentInfo);
}

/**
 * Type pour les échéances générées par le calculateur
 */
export type GeneratedEcheance = {
  date: string; // Format "DD/MM/YYYY"
  totalHT: number;
  taxe: number;
  totalTTC: number;
  rcd: number;
  pj: number;
  frais: number;
  reprise: number;
  fraisGestion: number;
  debutPeriode: string; // Format "DD/MM/YYYY"
  finPeriode: string; // Format "DD/MM/YYYY"
};

/**
 * Convertit une date au format français DD/MM/YYYY en objet Date
 */
export function parseDateFrancaise(dateFr: string): Date {
  const [jour, mois, annee] = dateFr.split("/").map(Number);
  return new Date(annee, mois - 1, jour);
}

/**
 * Adapte les échéances générées pour la création en base
 */
export function adaptEcheancesForDatabase(
  echeances: GeneratedEcheance[]
): {
  installmentNumber: number;
  dueDate: Date;
  amountHT: number;
  taxAmount: number;
  amountTTC: number;
  rcdAmount: number;
  pjAmount: number;
  feesAmount: number;
  resumeAmount: number;
  periodStart: Date;
  periodEnd: Date;
}[] {
  return echeances.map((e, index) => ({
    installmentNumber: index + 1,
    dueDate: parseDateFrancaise(e.date),
    amountHT: e.totalHT,
    taxAmount: e.taxe,
    amountTTC: e.totalTTC,
    rcdAmount: e.rcd,
    pjAmount: e.pj,
    feesAmount: e.frais,
    resumeAmount: e.reprise,
    periodStart: parseDateFrancaise(e.debutPeriode),
    periodEnd: parseDateFrancaise(e.finPeriode),
  }));
}
