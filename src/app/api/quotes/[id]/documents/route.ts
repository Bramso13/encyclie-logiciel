import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  createApiResponse,
  handleApiError,
  withAuth,
  ApiError,
} from "@/lib/api-utils";

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
          uploadedAt: true,
        },
        orderBy: { uploadedAt: "desc" },
      });

      return createApiResponse(documents);
    });
  } catch (error) {
    return handleApiError(error);
  }
}
