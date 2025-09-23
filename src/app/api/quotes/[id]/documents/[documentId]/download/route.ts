import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@supabase/supabase-js";
import {
  handleApiError,
  withAuth,
  ApiError,
} from "@/lib/api-utils";

// GET - Télécharger un document de devis
export async function GET(
  _request: NextRequest,
  props: { params: Promise<{ id: string; documentId: string }> }
) {
  const params = await props.params;
  try {
    return await withAuth(async (userId, userRole) => {
      // Vérifier que le document existe et que l'utilisateur a accès
      const document = await prisma.quoteDocument.findUnique({
        where: { id: params.documentId },
        include: {
          quote: {
            select: {
              id: true,
              brokerId: true,
            },
          },
        },
      });

      if (!document) {
        throw new ApiError(404, "Document non trouvé");
      }

      if (document.quote.id !== params.id) {
        throw new ApiError(400, "Document non associé à ce devis");
      }

      // Vérifier les permissions
      if (userRole === "BROKER" && document.quote.brokerId !== userId) {
        throw new ApiError(403, "Accès refusé à ce document");
      }

      // Se connecter à Supabase
      const supabase = createClient(
        process.env.SUPABASE_URL!,
        process.env.SUPABASE_ANON_KEY!
      );

      // Authentification avec Supabase
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: process.env.SUPABASE_UPLOAD_EMAIL!,
        password: process.env.SUPABASE_UPLOAD_PASSWORD!,
      });

      if (authError) {
        console.error("Supabase auth error:", authError);
        throw new ApiError(500, "Erreur d'authentification pour le téléchargement");
      }

      // Extraire le nom du fichier de l'URL publique
      const fileName = document.fileName;

      // Télécharger le fichier depuis Supabase
      const { data: fileData, error: downloadError } = await supabase.storage
        .from("documents")
        .download(fileName);

      if (downloadError) {
        console.error("Download error:", downloadError);
        throw new ApiError(500, "Erreur lors du téléchargement du fichier");
      }

      if (!fileData) {
        throw new ApiError(404, "Fichier non trouvé sur le serveur de stockage");
      }

      // Convertir le blob en ArrayBuffer
      const arrayBuffer = await fileData.arrayBuffer();

      // Retourner le fichier avec les bons headers
      return new NextResponse(arrayBuffer, {
        status: 200,
        headers: {
          "Content-Type": document.fileType || "application/octet-stream",
          "Content-Disposition": `attachment; filename="${document.originalName}"`,
          "Content-Length": document.fileSize.toString(),
        },
      });
    });
  } catch (error) {
    return handleApiError(error);
  }
}