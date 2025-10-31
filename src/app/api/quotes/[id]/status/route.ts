import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  createApiResponse,
  handleApiError,
  withAuthAndRole,
  ApiError,
} from "@/lib/api-utils";

// PATCH /api/quotes/[id]/status - Update quote status (Admin only) with versioning
export async function PATCH(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  try {
    return await withAuthAndRole(["ADMIN"], async (userId, userRole) => {
      const body = await request.json();
      const { status, reason } = body;

      // Validation
      if (!status) {
        throw new ApiError(400, "Le statut est requis");
      }

      const validStatuses = [
        "DRAFT",
        "INCOMPLETE",
        "SUBMITTED",
        "IN_PROGRESS",
        "COMPLEMENT_REQUIRED",
        "OFFER_READY",
        "OFFER_SENT",
        "ACCEPTED",
        "REJECTED",
        "EXPIRED",
      ];

      if (!validStatuses.includes(status)) {
        throw new ApiError(400, "Statut invalide");
      }

      // Get existing quote with full data for versioning
      const existingQuote = await prisma.quote.findUnique({
        where: { id: params.id },
        select: {
          id: true,
          status: true,
          reference: true,
          brokerId: true,
          companyData: true,
          formData: true,
          calculatedPremium: true,
          offerData: true,
          validUntil: true,
          submittedAt: true,
          offerReadyAt: true,
          offerSentAt: true,
          acceptedAt: true,
          broker: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      });

      if (!existingQuote) {
        throw new ApiError(404, "Devis non trouvé");
      }

      // Don't update if status is the same
      if (existingQuote.status === status) {
        return createApiResponse(existingQuote, "Le statut est déjà à jour");
      }

      // Get the next version number
      const lastVersion = await prisma.quoteVersion.findFirst({
        where: { quoteId: params.id },
        orderBy: { version: "desc" },
        select: { version: true },
      });

      const nextVersion = (lastVersion?.version || 0) + 1;

      // Prepare update data with timestamps
      const updateData: any = {
        status,
        updatedAt: new Date(),
      };

      // Add workflow timestamps based on status
      switch (status) {
        case "SUBMITTED":
          updateData.submittedAt = new Date();
          break;
        case "OFFER_READY":
          updateData.offerReadyAt = new Date();
          break;
        case "OFFER_SENT":
          updateData.offerSentAt = new Date();
          break;
        case "ACCEPTED":
          updateData.acceptedAt = new Date();
          break;
      }

      // Calculate changes
      const changes = {
        status: {
          old: existingQuote.status,
          new: status,
        },
      };

      // Get IP and User Agent from request
      const ipAddress =
        request.headers.get("x-forwarded-for") ||
        request.headers.get("x-real-ip") ||
        "unknown";
      const userAgent = request.headers.get("user-agent") || "unknown";

      // Update quote and create version in a transaction
      const result = await prisma.$transaction(async (tx) => {
        // Create version snapshot BEFORE updating
        const quoteVersion = await tx.quoteVersion.create({
          data: {
            quoteId: params.id,
            version: nextVersion,
            status: existingQuote.status, // Old status
            companyData: existingQuote.companyData as any,
            formData: existingQuote.formData as any,
            calculatedPremium: existingQuote.calculatedPremium as any,
            offerData: existingQuote.offerData as any,
            validUntil: existingQuote.validUntil,
            submittedAt: existingQuote.submittedAt,
            offerReadyAt: existingQuote.offerReadyAt,
            offerSentAt: existingQuote.offerSentAt,
            acceptedAt: existingQuote.acceptedAt,
            changedById: userId,
            changeReason: reason || "Changement de statut par admin",
            action: "STATUS_CHANGE",
            changes: changes as any,
            userRole: userRole,
            ipAddress: ipAddress,
            userAgent: userAgent,
          },
        });

        // Update quote
        const updatedQuote = await tx.quote.update({
          where: { id: params.id },
          data: updateData,
          include: {
            product: {
              select: { name: true, code: true },
            },
            broker: {
              select: { name: true, companyName: true, email: true },
            },
          },
        });

        // Create notification for broker
        await tx.notification.create({
          data: {
            type:
              status === "OFFER_READY"
                ? "OFFER_READY"
                : status === "COMPLEMENT_REQUIRED"
                ? "COMPLEMENT_REQUIRED"
                : "GENERAL",
            title: `Changement de statut du devis ${existingQuote.reference}`,
            message: `Le statut de votre devis a été changé vers "${getStatusLabel(
              status
            )}"${reason ? `: ${reason}` : ""}`,
            userId: existingQuote.brokerId,
            relatedEntityType: "quote",
            relatedEntityId: params.id,
          },
        });

        return { updatedQuote, quoteVersion };
      });

      return createApiResponse(
        {
          quote: result.updatedQuote,
          version: result.quoteVersion.version,
        },
        `Statut du devis mis à jour avec succès (version ${result.quoteVersion.version} créée)`
      );
    });
  } catch (error) {
    return handleApiError(error);
  }
}

// Helper function to get status label in French
function getStatusLabel(status: string): string {
  const statusLabels: Record<string, string> = {
    DRAFT: "Brouillon",
    INCOMPLETE: "À compléter",
    SUBMITTED: "Soumis",
    IN_PROGRESS: "En cours",
    COMPLEMENT_REQUIRED: "Complément demandé",
    OFFER_READY: "Offre prête",
    OFFER_SENT: "Offre envoyée",
    ACCEPTED: "Acceptée",
    REJECTED: "Refusée",
    EXPIRED: "Expirée",
  };
  return statusLabels[status] || status;
}
