import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  createApiResponse,
  handleApiError,
  withAuth,
  ApiError,
} from "@/lib/api-utils";

// GET - Récupérer l'offre d'un devis
export async function GET(
  _request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  try {
    return await withAuth(async (userId, userRole) => {
      if (userRole !== "ADMIN") {
        throw new ApiError(
          403,
          "Seuls les administrateurs peuvent accéder aux offres"
        );
      }

      const quote = await prisma.quote.findUnique({
        where: { id: params.id },
        select: {
          id: true,
          offerData: true,
          offerSentAt: true,
        },
      });

      if (!quote) {
        throw new ApiError(404, "Devis non trouvé");
      }

      return createApiResponse({
        requiredDocuments: quote.offerData
          ? (quote.offerData as any).requiredDocuments
          : [],
        sent: !!quote.offerSentAt,
        sentAt: quote.offerSentAt,
      });
    });
  } catch (error) {
    return handleApiError(error);
  }
}

// POST - Envoyer l'offre au courtier
export async function POST(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  try {
    return await withAuth(async (userId, userRole) => {
      if (userRole !== "ADMIN") {
        throw new ApiError(
          403,
          "Seuls les administrateurs peuvent envoyer des offres"
        );
      }

      const body = await request.json();
      const { requiredDocuments, calculationResult, formData, companyData } =
        body;

      if (!requiredDocuments || requiredDocuments.length === 0) {
        throw new ApiError(400, "Au moins un document doit être sélectionné");
      }

      const quote = await prisma.quote.findUnique({
        where: { id: params.id },
        include: {
          broker: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      if (!quote) {
        throw new ApiError(404, "Devis non trouvé");
      }

      // Créer les demandes de documents pour chaque document requis
      const documentRequestPromises = requiredDocuments.map((docId: string) => {
        return prisma.documentRequest.create({
          data: {
            quoteId: params.id,
            documentType: docId,
            isRequired: true,
            requestedById: userId,
          },
        });
      });

      await Promise.all(documentRequestPromises);

      // Mettre à jour le devis avec les données de l'offre
      const updatedQuote = await prisma.quote.update({
        where: { id: params.id },
        data: {
          offerData: {
            requiredDocuments,
            calculationResult,
            formData,
            companyData,
            sentBy: userId,
          },
          offerSentAt: new Date(),
          status: "OFFER_SENT",
        },
      });

      // Créer une notification pour le courtier
      await prisma.notification.create({
        data: {
          type: "OFFER_READY",
          title: "Nouvelle offre disponible",
          message: `Une offre est disponible pour le devis ${quote.reference}. Veuillez fournir les documents requis.`,
          userId: quote.brokerId,
          relatedEntityType: "quote",
          relatedEntityId: params.id,
        },
      });

      return createApiResponse(
        {
          requiredDocuments,
          sent: true,
          sentAt: updatedQuote.offerSentAt,
        },
        "Offre envoyée avec succès",
        201
      );
    });
  } catch (error) {
    return handleApiError(error);
  }
}

// PUT - Sauvegarder la sélection de documents (sans envoyer)
export async function PUT(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  try {
    return await withAuth(async (userId, userRole) => {
      if (userRole !== "ADMIN") {
        throw new ApiError(
          403,
          "Seuls les administrateurs peuvent modifier les offres"
        );
      }

      const body = await request.json();
      const { requiredDocuments } = body;

      const quote = await prisma.quote.findUnique({
        where: { id: params.id },
        select: {
          id: true,
          offerData: true,
        },
      });

      if (!quote) {
        throw new ApiError(404, "Devis non trouvé");
      }

      // Mettre à jour uniquement les documents requis
      const currentOfferData = (quote.offerData as any) || {};
      const updatedQuote = await prisma.quote.update({
        where: { id: params.id },
        data: {
          offerData: {
            ...currentOfferData,
            requiredDocuments,
            lastUpdatedBy: userId,
            lastUpdatedAt: new Date(),
          },
        },
      });

      return createApiResponse(
        {
          requiredDocuments,
        },
        "Sélection sauvegardée"
      );
    });
  } catch (error) {
    return handleApiError(error);
  }
}
