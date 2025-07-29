import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { UpdateQuoteSchema } from "@/lib/validations";
import { 
  createApiResponse, 
  handleApiError, 
  withAuth, 
  withAuthAndRole,
  ApiError
} from "@/lib/api-utils";

// GET /api/quotes/[id] - Get single quote
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    return await withAuth(async (userId, userRole) => {
      const quote = await prisma.quote.findUnique({
        where: { id: params.id },
        include: {
          product: {
            select: { 
              name: true, 
              code: true, 
              formFields: true,
              requiredDocs: true 
            }
          },
          broker: {
            select: { name: true, companyName: true, email: true }
          },
          documents: {
            select: {
              id: true,
              fileName: true,
              originalName: true,
              documentType: true,
              fileSize: true,
              uploadedAt: true
            }
          },
          contract: {
            select: { 
              id: true, 
              reference: true, 
              status: true 
            }
          }
        }
      });

      if (!quote) {
        throw new ApiError(404, "Devis non trouvé");
      }

      // Role-based access control
      if (userRole === "BROKER" && quote.brokerId !== userId) {
        throw new ApiError(403, "Accès refusé à ce devis");
      }

      return createApiResponse(quote);
    });
  } catch (error) {
    return handleApiError(error);
  }
}

// PUT /api/quotes/[id] - Update quote
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    return await withAuth(async (userId, userRole) => {
      const body = await request.json();
      const validatedData = UpdateQuoteSchema.parse(body);

      // Get existing quote
      const existingQuote = await prisma.quote.findUnique({
        where: { id: params.id },
        select: { 
          id: true, 
          brokerId: true, 
          status: true 
        }
      });

      if (!existingQuote) {
        throw new ApiError(404, "Devis non trouvé");
      }

      // Role-based access control
      if (userRole === "BROKER" && existingQuote.brokerId !== userId) {
        throw new ApiError(403, "Accès refusé à ce devis");
      }

      // Status change validation
      if (validatedData.status) {
        const allowedTransitions = getStatusTransitions(existingQuote.status, userRole);
        if (!allowedTransitions.includes(validatedData.status)) {
          throw new ApiError(400, `Transition de statut non autorisée: ${existingQuote.status} -> ${validatedData.status}`);
        }
      }

      // Prepare update data
      const updateData: any = {
        ...validatedData,
        updatedAt: new Date()
      };

      // Add workflow timestamps based on status
      if (validatedData.status) {
        switch (validatedData.status) {
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
      }

      // Update quote
      const updatedQuote = await prisma.quote.update({
        where: { id: params.id },
        data: updateData,
        include: {
          product: {
            select: { name: true, code: true }
          },
          broker: {
            select: { name: true, companyName: true }
          }
        }
      });

      return createApiResponse(
        updatedQuote, 
        "Devis mis à jour avec succès"
      );
    });
  } catch (error) {
    return handleApiError(error);
  }
}

// DELETE /api/quotes/[id] - Delete quote (Admin/Broker only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    return await withAuth(async (userId, userRole) => {
      const quote = await prisma.quote.findUnique({
        where: { id: params.id },
        select: { 
          id: true, 
          brokerId: true, 
          status: true,
          contract: { select: { id: true } }
        }
      });

      if (!quote) {
        throw new ApiError(404, "Devis non trouvé");
      }

      // Role-based access control
      if (userRole === "BROKER" && quote.brokerId !== userId) {
        throw new ApiError(403, "Accès refusé à ce devis");
      }

      // Cannot delete if contract exists
      if (quote.contract) {
        throw new ApiError(400, "Impossible de supprimer un devis avec un contrat associé");
      }

      // Cannot delete if not in draft status (except for admins)
      if (quote.status !== "DRAFT" && userRole !== "ADMIN") {
        throw new ApiError(400, "Seuls les devis en brouillon peuvent être supprimés");
      }

      // Delete quote (documents will be cascaded)
      await prisma.quote.delete({
        where: { id: params.id }
      });

      return createApiResponse(
        null, 
        "Devis supprimé avec succès"
      );
    });
  } catch (error) {
    return handleApiError(error);
  }
}

// Helper function to determine allowed status transitions based on role
function getStatusTransitions(currentStatus: string, userRole: string): string[] {
  const transitions: Record<string, Record<string, string[]>> = {
    BROKER: {
      DRAFT: ["SUBMITTED"],
      SUBMITTED: ["DRAFT"], // Can revert to draft if needed
      COMPLEMENT_REQUIRED: ["SUBMITTED"],
      OFFER_SENT: ["ACCEPTED", "REJECTED"],
      ACCEPTED: [], // Cannot change once accepted
      REJECTED: [], // Cannot change once rejected
      EXPIRED: [] // Cannot change once expired
    },
    UNDERWRITER: {
      SUBMITTED: ["IN_PROGRESS", "COMPLEMENT_REQUIRED"],
      IN_PROGRESS: ["OFFER_READY", "COMPLEMENT_REQUIRED"],
      COMPLEMENT_REQUIRED: ["IN_PROGRESS"],
      OFFER_READY: ["OFFER_SENT"]
    },
    ADMIN: {
      // Admins can change any status to any other status
      DRAFT: ["SUBMITTED", "IN_PROGRESS", "COMPLEMENT_REQUIRED", "OFFER_READY", "OFFER_SENT", "ACCEPTED", "REJECTED", "EXPIRED"],
      SUBMITTED: ["DRAFT", "IN_PROGRESS", "COMPLEMENT_REQUIRED", "OFFER_READY", "OFFER_SENT", "ACCEPTED", "REJECTED", "EXPIRED"],
      IN_PROGRESS: ["DRAFT", "SUBMITTED", "COMPLEMENT_REQUIRED", "OFFER_READY", "OFFER_SENT", "ACCEPTED", "REJECTED", "EXPIRED"],
      COMPLEMENT_REQUIRED: ["DRAFT", "SUBMITTED", "IN_PROGRESS", "OFFER_READY", "OFFER_SENT", "ACCEPTED", "REJECTED", "EXPIRED"],
      OFFER_READY: ["DRAFT", "SUBMITTED", "IN_PROGRESS", "COMPLEMENT_REQUIRED", "OFFER_SENT", "ACCEPTED", "REJECTED", "EXPIRED"],
      OFFER_SENT: ["DRAFT", "SUBMITTED", "IN_PROGRESS", "COMPLEMENT_REQUIRED", "OFFER_READY", "ACCEPTED", "REJECTED", "EXPIRED"],
      ACCEPTED: ["DRAFT", "SUBMITTED", "IN_PROGRESS", "COMPLEMENT_REQUIRED", "OFFER_READY", "OFFER_SENT", "REJECTED", "EXPIRED"],
      REJECTED: ["DRAFT", "SUBMITTED", "IN_PROGRESS", "COMPLEMENT_REQUIRED", "OFFER_READY", "OFFER_SENT", "ACCEPTED", "EXPIRED"],
      EXPIRED: ["DRAFT", "SUBMITTED", "IN_PROGRESS", "COMPLEMENT_REQUIRED", "OFFER_READY", "OFFER_SENT", "ACCEPTED", "REJECTED"]
    }
  };

  return transitions[userRole]?.[currentStatus] || [];
}