import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, createApiResponse, handleApiError } from "@/lib/api-utils";

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    return await withAuth(async (userId) => {
      const { id } = params;

      // Check if notification exists and belongs to user
      const existingNotification = await prisma.notification.findFirst({
        where: { 
          id,
          userId,
        },
      });

      if (!existingNotification) {
        return createApiResponse(
          null,
          "Message non trouvé",
          404
        );
      }

      const notification = await prisma.notification.update({
        where: { id },
        data: {
          isRead: true,
          readAt: new Date(),
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              companyName: true,
            },
          },
        },
      });

      return createApiResponse(notification, "Message marqué comme lu");
    });
  } catch (error) {
    return handleApiError(error);
  }
}