import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  createApiResponse,
  handleApiError,
  withAuth,
  ApiError,
} from "@/lib/api-utils";

// GET /api/quotes/[id]/documents/by-type - Get documents grouped by documentType
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

      // Get documents grouped by documentType
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
        },
        orderBy: { uploadedAt: "desc" },
      });

      // Group documents by documentType
      const documentsByType: Record<string, typeof documents> = {};
      documents.forEach((doc) => {
        if (!documentsByType[doc.documentType]) {
          documentsByType[doc.documentType] = [];
        }
        documentsByType[doc.documentType].push(doc);
      });

      return createApiResponse(documentsByType);
    });
  } catch (error) {
    return handleApiError(error);
  }
}

