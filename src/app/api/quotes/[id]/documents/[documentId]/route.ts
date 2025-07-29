import { NextRequest } from "next/server";
import { readFile } from "fs/promises";
import { prisma } from "@/lib/prisma";
import { 
  handleApiError, 
  withAuth,
  ApiError
} from "@/lib/api-utils";

// GET /api/quotes/[id]/documents/[documentId] - Download document
export async function GET(
  request: NextRequest,
  props: { params: Promise<{ id: string; documentId: string }> }
) {
  const params = await props.params;
  try {
    return await withAuth(async (userId, userRole) => {
      // Get document with quote info
      const document = await prisma.quoteDocument.findUnique({
        where: { id: params.documentId },
        include: {
          quote: {
            select: { 
              id: true, 
              brokerId: true 
            }
          }
        }
      });

      if (!document) {
        throw new ApiError(404, "Document non trouvé");
      }

      if (document.quote.id !== params.id) {
        throw new ApiError(400, "Document ne correspond pas au devis");
      }

      // Role-based access control
      if (userRole === "BROKER" && document.quote.brokerId !== userId) {
        throw new ApiError(403, "Accès refusé à ce document");
      }

      try {
        // Read file from disk
        const fileBuffer = await readFile(document.filePath);

        // Return file with appropriate headers
        return new Response(fileBuffer, {
          headers: {
            "Content-Type": document.fileType,
            "Content-Disposition": `attachment; filename="${document.originalName}"`,
            "Content-Length": document.fileSize.toString(),
          },
        });
      } catch (fileError) {
        console.error("Error reading file:", fileError);
        throw new ApiError(404, "Fichier non trouvé sur le disque");
      }
    });
  } catch (error) {
    return handleApiError(error);
  }
}

// DELETE /api/quotes/[id]/documents/[documentId] - Delete document
export async function DELETE(
  request: NextRequest,
  props: { params: Promise<{ id: string; documentId: string }> }
) {
  const params = await props.params;
  try {
    return await withAuth(async (userId, userRole) => {
      // Get document with quote info
      const document = await prisma.quoteDocument.findUnique({
        where: { id: params.documentId },
        include: {
          quote: {
            select: { 
              id: true, 
              brokerId: true,
              status: true
            }
          }
        }
      });

      if (!document) {
        throw new ApiError(404, "Document non trouvé");
      }

      if (document.quote.id !== params.id) {
        throw new ApiError(400, "Document ne correspond pas au devis");
      }

      // Role-based access control
      if (userRole === "BROKER" && document.quote.brokerId !== userId) {
        throw new ApiError(403, "Accès refusé à ce document");
      }

      // Cannot delete documents from accepted/rejected quotes (except admins)
      if (userRole !== "ADMIN" && ["ACCEPTED", "REJECTED"].includes(document.quote.status)) {
        throw new ApiError(400, "Impossible de supprimer des documents d'un devis accepté ou rejeté");
      }

      // Delete from database (file cleanup could be done with a cron job)
      await prisma.quoteDocument.delete({
        where: { id: params.documentId }
      });

      // TODO: Optionally delete physical file
      // await unlink(document.filePath).catch(console.error);

      return new Response(null, { 
        status: 204,
        headers: {
          "Content-Type": "application/json"
        }
      });
    });
  } catch (error) {
    return handleApiError(error);
  }
}