import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  createApiResponse,
  handleApiError,
  withAuth,
  ApiError,
} from "@/lib/api-utils";

// GET - Récupérer calculatedPremium
export async function GET(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  try {
    return await withAuth(async (userId, userRole) => {
      const quote = await prisma.quote.findUnique({
        where: { id: params.id },
        include: {
          broker: true,

        }
      });

      if (!quote) {
        throw new ApiError(404, "Devis non trouvé");
      }

      // Role-based access control
      if (userRole === "BROKER" && quote.brokerId !== userId) {
        throw new ApiError(403, "Accès refusé à ce devis");
      }

      console.log("quote///", quote);

      return createApiResponse({ calculatedPremium: quote.calculatedPremium });
    });
  } catch (error) {
    return handleApiError(error);
  }
}

// POST - Sauvegarder calculatedPremium
export async function POST(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  try {
    return await withAuth(async (userId, userRole) => {
      const body = await request.json();
      const { calculatedPremium } = body;

      // Get existing quote for access control
      const existingQuote = await prisma.quote.findUnique({
        where: { id: params.id },
        select: {
          id: true,
          brokerId: true,
        },
      });

      if (!existingQuote) {
        throw new ApiError(404, "Devis non trouvé");
      }

      // Role-based access control
      if (userRole === "BROKER" && existingQuote.brokerId !== userId) {
        throw new ApiError(403, "Accès refusé à ce devis");
      }

      // Update calculatedPremium (convert to JSON string for Prisma)
      await prisma.quote.update({
        where: { id: params.id },
        data: { calculatedPremium: calculatedPremium},
      });

      return createApiResponse(null, "Calcul sauvegardé avec succès");
    });
  } catch (error) {
    return handleApiError(error);
  }
}