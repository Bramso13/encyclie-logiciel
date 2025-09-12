import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { 
  createApiResponse, 
  handleApiError, 
  withAuth, 
  ApiError 
} from "@/lib/api-utils";

// POST /api/workflow/steps/[id]/messages - Ajouter un message à une étape
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    
    return await withAuth(async (userId, userRole) => {
      // Vérifier que l'étape existe et que l'utilisateur y a accès
      const step = await prisma.workflowStep.findUnique({
        where: { id: resolvedParams.id },
        include: {
          quote: {
            include: {
              broker: true
            }
          }
        }
      });

      if (!step) {
        throw new ApiError(404, "Étape non trouvée");
      }

      // Vérifier l'accès (admin ou broker assigné)
      if (userRole !== "ADMIN" && step.quote.brokerId !== userId) {
        throw new ApiError(403, "Accès refusé");
      }

      const formData = await request.formData();
      const content = formData.get("content") as string;
      const type = formData.get("type") as string;
      const files = formData.getAll("attachments") as File[];

      if (!content || !type) {
        throw new ApiError(400, "Contenu et type requis");
      }

      // Créer le message
      const message = await prisma.stepMessage.create({
        data: {
          stepId: resolvedParams.id,
          content,
          type: type as any,
          authorId: userId
        },
        include: {
          author: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true
            }
          }
        }
      });

      // Traiter les pièces jointes si présentes
      if (files && files.length > 0) {
        const attachments = [];
        
        for (const file of files) {
          if (file.size > 0) {
            // Utiliser l'API d'upload existante
            const uploadFormData = new FormData();
            uploadFormData.append("file", file);
            uploadFormData.append("fileName", `workflow-${Date.now()}-${file.name}`);

            const uploadResponse = await fetch(`${request.nextUrl.origin}/api/upload`, {
              method: "POST",
              body: uploadFormData,
            });

            if (!uploadResponse.ok) {
              console.error("Erreur lors de l'upload du fichier");
              continue; // Continuer avec les autres fichiers
            }

            const uploadData = await uploadResponse.json();

            // Créer l'enregistrement de pièce jointe
            const attachment = await prisma.stepMessageAttachment.create({
              data: {
                messageId: message.id,
                fileName: uploadData.data.fileName,
                originalName: uploadData.data.originalName,
                filePath: uploadData.data.publicUrl,
                fileType: uploadData.data.fileType,
                fileSize: uploadData.data.fileSize
              }
            });

            attachments.push(attachment);
          }
        }

        // Retourner le message avec les pièces jointes
        return createApiResponse({
          message: {
            ...message,
            attachments
          }
        }, "Message ajouté avec succès", 201);
      }

      return createApiResponse({ message }, "Message ajouté avec succès", 201);
    });
  } catch (error) {
    return handleApiError(error);
  }
}
