import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  createApiResponse,
  handleApiError,
  withAuth,
  ApiError,
} from "@/lib/api-utils";

// PATCH /api/quotes/[id]/assign-broker - Réassigner un devis à un courtier
export async function PATCH(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  try {
    return await withAuth(async (userId, userRole) => {
      // Seuls les admins peuvent réassigner un devis
      if (userRole !== "ADMIN") {
        throw new ApiError(
          403,
          "Seuls les administrateurs peuvent réassigner un devis"
        );
      }

      const body = await request.json();
      const { brokerId } = body;

      if (!brokerId) {
        throw new ApiError(400, "L'ID du courtier est requis");
      }

      // Vérifier que le devis existe
      const existingQuote = await prisma.quote.findUnique({
        where: { id: params.id },
        select: {
          id: true,
          brokerId: true,
          broker: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      if (!existingQuote) {
        throw new ApiError(404, "Devis non trouvé");
      }

      // Vérifier que le nouveau courtier existe et a bien le rôle BROKER
      const newBroker = await prisma.user.findUnique({
        where: { id: brokerId },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          isActive: true,
        },
      });

      if (!newBroker) {
        throw new ApiError(404, "Courtier non trouvé");
      }

      if (newBroker.role !== "BROKER") {
        throw new ApiError(
          400,
          "L'utilisateur sélectionné n'est pas un courtier"
        );
      }

      if (!newBroker.isActive) {
        throw new ApiError(400, "Le courtier sélectionné n'est pas actif");
      }

      // Vérifier si le courtier est déjà assigné
      if (existingQuote.brokerId === brokerId) {
        throw new ApiError(400, "Ce courtier est déjà assigné à ce devis");
      }

      // Mettre à jour le devis
      const updatedQuote = await prisma.quote.update({
        where: { id: params.id },
        data: {
          brokerId: brokerId,
          updatedAt: new Date(),
        },
        include: {
          broker: {
            select: {
              id: true,
              name: true,
              email: true,
              companyName: true,
            },
          },
        },
      });

      return createApiResponse(
        {
          quote: updatedQuote,
          oldBroker: existingQuote.broker,
          newBroker: newBroker,
        },
        `Devis réassigné avec succès à ${newBroker.name || newBroker.email}`
      );
    });
  } catch (error) {
    return handleApiError(error);
  }
}
