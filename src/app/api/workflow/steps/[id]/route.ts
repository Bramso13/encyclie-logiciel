import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { 
  createApiResponse, 
  handleApiError, 
  withAuth, 
  withAuthAndRole,
  ApiError 
} from "@/lib/api-utils";

// GET /api/workflow/steps/[id] - Récupérer une étape spécifique
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    
    return await withAuth(async (userId, userRole) => {
      const step = await prisma.workflowStep.findUnique({
        where: { id: resolvedParams.id },
        include: {
          quote: {
            include: {
              broker: true
            }
          },
          assignedToBroker: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          inputs: true,
          messages: {
            include: {
              author: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  role: true
                }
              },
              attachments: true
            },
            orderBy: { createdAt: 'asc' }
          },
          template: true
        }
      });

      if (!step) {
        throw new ApiError(404, "Étape non trouvée");
      }

      // Vérifier l'accès
      if (userRole !== "ADMIN" && step.quote.brokerId !== userId) {
        throw new ApiError(403, "Accès refusé");
      }

      return createApiResponse({ step });
    });
  } catch (error) {
    return handleApiError(error);
  }
}

// PUT /api/workflow/steps/[id] - Mettre à jour une étape
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    
    return await withAuthAndRole(["ADMIN"], async (userId, userRole) => {
      const body = await request.json();
      const {
        title,
        description,
        order,
        status,
        assignedToBrokerId,
        dueDate
      } = body;

      // Vérifier que l'étape existe
      const existingStep = await prisma.workflowStep.findUnique({
        where: { id: resolvedParams.id }
      });

      if (!existingStep) {
        throw new ApiError(404, "Étape non trouvée");
      }

      // Mettre à jour l'étape
      const step = await prisma.workflowStep.update({
        where: { id: resolvedParams.id },
        data: {
          title,
          description,
          order,
          status,
          assignedToBrokerId,
          dueDate: dueDate ? new Date(dueDate) : null
        },
        include: {
          assignedToBroker: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          inputs: true,
          messages: {
            include: {
              author: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  role: true
                }
              },
              attachments: true
            }
          },
          template: true
        }
      });

      return createApiResponse({ step }, "Étape mise à jour avec succès");
    });
  } catch (error) {
    return handleApiError(error);
  }
}

// DELETE /api/workflow/steps/[id] - Supprimer une étape
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    
    return await withAuthAndRole(["ADMIN"], async (userId, userRole) => {
      // Vérifier que l'étape existe
      const existingStep = await prisma.workflowStep.findUnique({
        where: { id: resolvedParams.id }
      });

      if (!existingStep) {
        throw new ApiError(404, "Étape non trouvée");
      }

      // Supprimer l'étape (cascade supprimera les inputs et messages)
      await prisma.workflowStep.delete({
        where: { id: resolvedParams.id }
      });

      return createApiResponse(null, "Étape supprimée avec succès");
    });
  } catch (error) {
    return handleApiError(error);
  }
}
