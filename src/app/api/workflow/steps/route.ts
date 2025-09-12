import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { 
  createApiResponse, 
  handleApiError, 
  withAuth, 
  ApiError, 
  withAuthAndRole
} from "@/lib/api-utils";
import { Quote } from "@prisma/client";

// GET /api/workflow/steps?quoteId=xxx - Récupérer les étapes d'un devis
export async function GET(request: NextRequest) {
  try {
    return await withAuthAndRole(["ADMIN", "BROKER"], async (userId, userRole) => {
      const { searchParams } = new URL(request.url);
      const quoteId = searchParams.get("quoteId");

      if (!quoteId) {
        throw new ApiError(400, "quoteId requis");
      }

      let quote: Quote | null = null;

      if(userRole === "ADMIN") {
            quote = await prisma.quote.findUnique({
          where: {
            id: quoteId
          }
        });

        if(!quote) {
          throw new ApiError(404, "Devis non trouvé");
        }

      }else{
        // Vérifier que l'utilisateur a accès à ce devis
      quote = await prisma.quote.findFirst({
        where: {
          id: quoteId,
          OR: [
            { brokerId: userId },

          ]
        },
        include: {
          broker: true
        }
      });
      }

      

      if (!quote) {
        throw new ApiError(404, "Devis non trouvé");
      }

      // Récupérer les étapes avec toutes les relations
      const steps = await prisma.workflowStep.findMany({
        where: { quoteId },
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
            },
            orderBy: { createdAt: 'asc' }
          },
          template: true
        },
        orderBy: { order: 'asc' }
      });

      return createApiResponse({ steps });
    });
  } catch (error) {
    return handleApiError(error);
  }
}

// POST /api/workflow/steps - Créer une nouvelle étape
export async function POST(request: NextRequest) {
  try {

    return await withAuth(async (userId, userRole) => {
      // Vérifier que l'utilisateur est admin
      if (userRole !== "ADMIN") {
        throw new ApiError(403, "Accès refusé - rôle admin requis");
      }

      const body = await request.json();
      const {
        quoteId,
        title,
        description,
        order,
        assignedToBrokerId,
        dueDate,
        templateId,
        inputs
      } = body;

      if (!quoteId || !title) {
        throw new ApiError(400, "quoteId et title requis");
      }

      // Vérifier que le devis existe
      const quote = await prisma.quote.findUnique({
        where: { id: quoteId }
      });

      if (!quote) {
        throw new ApiError(404, "Devis non trouvé");
      }

      // Créer l'étape
      const step = await prisma.workflowStep.create({
        data: {
          quoteId,
          title,
          description,
          order,
          assignedToBrokerId,
          dueDate: dueDate ? new Date(dueDate) : null,
          templateId,
          inputs: {
            create: inputs?.map((input: any) => ({
              type: input.type,
              label: input.label,
              placeholder: input.placeholder,
              required: input.required,
              options: input.options,
              validationRules: input.validationRules
            })) || []
          }
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

      return createApiResponse({ step }, "Étape créée avec succès", 201);
    });
  } catch (error) {
    return handleApiError(error);
  }
}
