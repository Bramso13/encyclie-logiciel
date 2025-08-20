import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
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
        // Initialize Supabase client
        const supabase = createClient(
          process.env.SUPABASE_URL!,
          process.env.SUPABASE_ANON_KEY!
        );

        // Authenticate with Supabase using email/password from .env
        const { error: authError } = await supabase.auth.signInWithPassword({
          email: process.env.SUPABASE_UPLOAD_EMAIL!,
          password: process.env.SUPABASE_UPLOAD_PASSWORD!,
        });

        if (authError) {
          console.error("Supabase auth error:", authError);
          throw new ApiError(500, "Erreur d'authentification pour le téléchargement");
        }

        // Download file from Supabase Storage
        const { data: fileData, error: downloadError } = await supabase.storage
          .from("documents")
          .download(document.fileName);

        if (downloadError) {
          console.error("Supabase download error:", downloadError);
          throw new ApiError(404, "Fichier non trouvé dans le stockage");
        }

        // Convert blob to array buffer
        const fileBuffer = await fileData.arrayBuffer();

        // Return file with appropriate headers
        return new Response(fileBuffer, {
          headers: {
            "Content-Type": document.fileType,
            "Content-Disposition": `attachment; filename="${document.originalName}"`,
            "Content-Length": document.fileSize.toString(),
          },
        });
      } catch (fileError) {
        console.error("Error downloading file:", fileError);
        if (fileError instanceof ApiError) {
          throw fileError;
        }
        throw new ApiError(500, "Erreur lors du téléchargement du fichier");
      }
    });
  } catch (error) {
    return handleApiError(error);
  }
}

// PUT /api/quotes/[id]/documents/[documentId] - Validate/Invalidate document
export async function PUT(
  request: NextRequest,
  props: { params: Promise<{ id: string; documentId: string }> }
) {
  const params = await props.params;
  try {
    return await withAuth(async (userId, userRole) => {
      const body = await request.json();
      const { isVerified, validationNotes } = body;

      if (typeof isVerified !== 'boolean') {
        throw new ApiError(400, "Le statut de validation est requis");
      }

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

      // Only ADMIN and UNDERWRITER can validate documents
      if (!["ADMIN", "UNDERWRITER"].includes(userRole)) {
        throw new ApiError(403, "Seuls les administrateurs et souscripteurs peuvent valider les documents");
      }

      // Update document validation status
      const updatedDocument = await prisma.quoteDocument.update({
        where: { id: params.documentId },
        data: {
          isVerified,
          validationNotes: validationNotes || null,
          validatedAt: isVerified ? new Date() : null,
          validatedById: isVerified ? userId : null
        }
      });

      return new Response(
        JSON.stringify({
          success: true,
          message: `Document ${isVerified ? 'validé' : 'invalidé'} avec succès`,
          data: updatedDocument
        }),
        {
          headers: { "Content-Type": "application/json" }
        }
      );
    });
  } catch (error) {
    return handleApiError(error);
  }
}

// DELETE /api/quotes/[id]/documents/[documentId] - Delete document
export async function DELETE(
  _request: NextRequest,
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

      try {
        // Initialize Supabase client
        const supabase = createClient(
          process.env.SUPABASE_URL!,
          process.env.SUPABASE_ANON_KEY!
        );

        // Authenticate with Supabase using email/password from .env
        const { error: authError } = await supabase.auth.signInWithPassword({
          email: process.env.SUPABASE_UPLOAD_EMAIL!,
          password: process.env.SUPABASE_UPLOAD_PASSWORD!,
        });

        if (authError) {
          console.error("Supabase auth error:", authError);
          throw new ApiError(500, "Erreur d'authentification pour la suppression");
        }

        // Delete file from Supabase Storage
        const { error: deleteError } = await supabase.storage
          .from("documents")
          .remove([document.fileName]);

        if (deleteError) {
          console.error("Supabase delete error:", deleteError);
          // Continue with database deletion even if file deletion fails
        }

        // Delete from database
        await prisma.quoteDocument.delete({
          where: { id: params.documentId }
        });

        return new Response(null, { 
          status: 204,
          headers: {
            "Content-Type": "application/json"
          }
        });
      } catch (deleteError) {
        console.error("Error deleting file:", deleteError);
        if (deleteError instanceof ApiError) {
          throw deleteError;
        }
        throw new ApiError(500, "Erreur lors de la suppression du fichier");
      }
    });
  } catch (error) {
    return handleApiError(error);
  }
}