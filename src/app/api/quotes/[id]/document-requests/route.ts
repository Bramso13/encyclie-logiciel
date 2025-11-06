import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  createApiResponse,
  handleApiError,
  withAuth,
  ApiError,
} from "@/lib/api-utils";

// GET - Récupérer les demandes de documents d'un devis
export async function GET(
  _request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  try {
    return await withAuth(async (userId, userRole) => {
      const quote = await prisma.quote.findUnique({
        where: { id: params.id },
        select: {
          id: true,
          brokerId: true,
        },
      });

      if (!quote) {
        throw new ApiError(404, "Devis non trouvé");
      }

      if (userRole === "BROKER" && quote.brokerId !== userId) {
        throw new ApiError(403, "Accès refusé à ce devis");
      }

      const documentRequests = await prisma.documentRequest.findMany({
        where: { quoteId: params.id },
        include: {
          requestedBy: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
          fulfilledByDocument: {
            select: {
              id: true,
              fileName: true,
              originalName: true,
              documentType: true,
              fileSize: true,
              uploadedAt: true,
              isVerified: true,
              validationNotes: true,
              validatedAt: true,
              validatedBy: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
        orderBy: { requestedAt: "desc" },
      });

      return createApiResponse(documentRequests);
    });
  } catch (error) {
    return handleApiError(error);
  }
}

// POST - Créer une nouvelle demande de document (admin seulement)
export async function POST(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  try {
    return await withAuth(async (userId, userRole) => {
      if (userRole !== "ADMIN") {
        throw new ApiError(403, "Seuls les administrateurs peuvent demander des documents");
      }

      const body = await request.json();
      const { documentType, description, isRequired } = body;

      if (!documentType) {
        throw new ApiError(400, "Le type de document est requis");
      }

      const quote = await prisma.quote.findUnique({
        where: { id: params.id },
        select: { id: true },
      });

      if (!quote) {
        throw new ApiError(404, "Devis non trouvé");
      }

      const documentRequest = await prisma.documentRequest.create({
        data: {
          quoteId: params.id,
          documentType,
          description,
          isRequired: isRequired ?? true,
          requestedById: userId,
        },
        include: {
          requestedBy: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
      });

      return createApiResponse(documentRequest, "Demande de document créée", 201);
    });
  } catch (error) {
    return handleApiError(error);
  }
}