import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  createApiResponse,
  handleApiError,
  withAuthAndRole,
  ApiError,
} from "@/lib/api-utils";
import { sendEmail } from "@/lib/nodemailer";

// POST /api/payment-installments/[id]/send-reminder - Send payment reminder email (Admin only)
export async function POST(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  try {
    return await withAuthAndRole(["ADMIN"], async (userId, userRole) => {
      // Get payment installment with all related data
      const payment = await prisma.paymentInstallment.findUnique({
        where: { id: params.id },
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
                    },
                  },
                  product: {
                    select: {
                      name: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!payment) {
        throw new ApiError(404, "Échéance de paiement non trouvée");
      }

      // Check if already paid
      if (payment.status === "PAID") {
        throw new ApiError(400, "Ce paiement a déjà été effectué");
      }

      const quote = payment.schedule.quote;
      const broker = quote.broker;
      const dueDate = new Date(payment.dueDate);
      const now = new Date();
      const daysOverdue = Math.floor(
        (now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      // Préparer l'email de rappel
      const emailSubject = `Rappel de paiement - Échéance n°${payment.installmentNumber} - ${quote.reference}`;

      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1f2937;">Rappel de paiement</h2>
          
          <p>Bonjour ${broker.name},</p>
          
          <p>Nous vous informons qu'un paiement est en retard pour le devis <strong>${
            quote.reference
          }</strong>.</p>
          
          <div style="background-color: #fee; border-left: 4px solid #dc2626; padding: 15px; margin: 20px 0;">
            <h3 style="color: #dc2626; margin-top: 0;">Détails du paiement en retard</h3>
            <ul style="list-style: none; padding: 0;">
              <li><strong>Échéance n°:</strong> ${
                payment.installmentNumber
              }</li>
              <li><strong>Montant TTC:</strong> ${payment.amountTTC.toFixed(
                2
              )}€</li>
              <li><strong>Date d'échéance:</strong> ${dueDate.toLocaleDateString(
                "fr-FR"
              )}</li>
              <li><strong>Retard:</strong> ${daysOverdue} jour(s)</li>
              <li><strong>Produit:</strong> ${quote.product.name}</li>
            </ul>
          </div>
          
          <p>Merci de régulariser cette situation dans les plus brefs délais.</p>
          
          <p>Pour toute question, n'hésitez pas à nous contacter.</p>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 12px;">
            <p>Cet email a été envoyé automatiquement depuis notre plateforme de gestion.</p>
          </div>
        </div>
      `;

      const emailText = `
Rappel de paiement

Bonjour ${broker.name},

Nous vous informons qu'un paiement est en retard pour le devis ${
        quote.reference
      }.

Détails du paiement en retard:
- Échéance n°: ${payment.installmentNumber}
- Montant TTC: ${payment.amountTTC.toFixed(2)}€
- Date d'échéance: ${dueDate.toLocaleDateString("fr-FR")}
- Retard: ${daysOverdue} jour(s)
- Produit: ${quote.product.name}

Merci de régulariser cette situation dans les plus brefs délais.

Pour toute question, n'hésitez pas à nous contacter.
      `;

      // Envoyer l'email
      try {
        await sendEmail(broker.email, emailSubject, emailHtml, emailText, {
          type: "PAYMENT_REMINDER",
          relatedQuoteId: quote.id,
          relatedUserId: broker.id,
          sentById: userId,
        });

        // Update payment installment with reminder info
        const updatedPayment = await prisma.paymentInstallment.update({
          where: { id: params.id },
          data: {
            lastReminderSent: new Date(),
            reminderCount: {
              increment: 1,
            },
          },
        });

        // Create notification for broker
        await prisma.notification.create({
          data: {
            type: "PAYMENT_DUE",
            title: `Rappel de paiement envoyé`,
            message: `Un rappel de paiement a été envoyé pour l'échéance n°${payment.installmentNumber} du devis ${quote.reference}.`,
            userId: broker.id,
            relatedEntityType: "quote",
            relatedEntityId: quote.id,
            isUrgent: true,
          },
        });

        return createApiResponse(
          {
            payment: updatedPayment,
            emailSent: true,
            sentTo: broker.email,
          },
          "Rappel de paiement envoyé avec succès"
        );
      } catch (emailError) {
        console.error("Erreur lors de l'envoi de l'email:", emailError);

        throw new ApiError(500, "Erreur lors de l'envoi de l'email de rappel");
      }
    });
  } catch (error) {
    return handleApiError(error);
  }
}
