import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  createApiResponse,
  handleApiError,
  withAuth,
  ApiError,
} from "@/lib/api-utils";
import { sendEmail, getDocumentUploadedTemplate } from "@/lib/nodemailer";

// POST /api/quotes/[id]/documents - Add document metadata for quote
export async function POST(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  try {
    return await withAuth(async (userId, userRole) => {
      const body = await request.json();
      const {
        fileName,
        originalName,
        filePath,
        fileSize,
        fileType,
        documentType,
      } = body;

      if (
        !fileName ||
        !originalName ||
        !filePath ||
        !fileSize ||
        !fileType ||
        !documentType
      ) {
        throw new ApiError(400, "Données de fichier manquantes");
      }

      // Check if quote exists and user has access
      const quote = await prisma.quote.findUnique({
        where: { id: params.id },
        select: {
          id: true,
          brokerId: true,
          reference: true,
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

      if (userRole === "BROKER" && quote.brokerId !== userId) {
        throw new ApiError(403, "Accès refusé à ce devis");
      }

      // Save document metadata to database
      const document = await prisma.quoteDocument.create({
        data: {
          fileName,
          originalName,
          filePath,
          fileType,
          fileSize,
          documentType: documentType as any,
          quoteId: params.id,
        },
      });

      // Envoyer notification et email aux admins
      try {
        // Récupérer tous les admins
        const admins = await prisma.user.findMany({
          where: { role: "ADMIN", isActive: true },
          select: {
            id: true,
            email: true,
            name: true,
          },
        });

        // Créer les notifications pour chaque admin
        await Promise.all(
          admins.map((admin) =>
            prisma.notification.create({
              data: {
                type: "GENERAL",
                title: "Nouveau document uploadé",
                message: `Un nouveau document "${originalName}" (${documentType}) a été uploadé pour le devis ${quote.reference} par ${quote.broker.name}.`,
                userId: admin.id,
                relatedEntityType: "quote",
                relatedEntityId: params.id,
              },
            })
          )
        );

        // Envoyer les emails aux admins
        const emailTemplate = getDocumentUploadedTemplate(
          quote.reference,
          documentType,
          originalName,
          quote.broker.name || "Courtier"
        );

        await Promise.all(
          admins.map((admin) =>
            sendEmail(
              admin.email,
              emailTemplate.subject,
              emailTemplate.html,
              emailTemplate.text,
              {
                type: "DOCUMENT_UPLOADED",
                relatedQuoteId: params.id,
                relatedUserId: admin.id,
                sentById: userId,
              }
            ).catch((error) => {
              console.error(
                `Erreur lors de l'envoi de l'email à ${admin.email}:`,
                error
              );
              // Ne pas faire échouer la requête si l'email échoue
            })
          )
        );
      } catch (notificationError) {
        console.error(
          "Erreur lors de l'envoi des notifications/emails:",
          notificationError
        );
        // Ne pas faire échouer la requête si les notifications échouent
      }

      return createApiResponse(document, "Document ajouté avec succès", 201);
    });
  } catch (error) {
    return handleApiError(error);
  }
}

// GET /api/quotes/[id]/documents - List documents for quote
export async function GET(
  _request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  try {
    return await withAuth(async (userId, userRole) => {
      // Check if quote exists and user has access
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

      // Get documents
      const documents = await prisma.quoteDocument.findMany({
        where: { quoteId: params.id },
        select: {
          id: true,
          fileName: true,
          originalName: true,
          documentType: true,
          fileSize: true,
          filePath: true,
          fileType: true,
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
        orderBy: { uploadedAt: "desc" },
      });

      return createApiResponse(documents);
    });
  } catch (error) {
    return handleApiError(error);
  }
}
