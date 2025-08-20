import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, createApiResponse, handleApiError } from "@/lib/api-utils";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    return await withAuth(async (userId, userRole) => {
      const { id } = params;

      const notification = await prisma.notification.findFirst({
        where: { 
          id,
          userId, // S'assurer que l'utilisateur peut seulement voir ses propres notifications
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

      if (!notification) {
        return createApiResponse(
          null,
          "Message non trouvé",
          404
        );
      }

      return createApiResponse(notification);
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    return await withAuth(async (userId, userRole) => {
      const { id } = params;
      const body = await request.json();

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
          ...body,
          readAt: body.isRead ? new Date() : existingNotification.readAt,
          updatedAt: new Date(),
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

      return createApiResponse(notification, "Message mis à jour avec succès");
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    return await withAuth(async (userId, userRole) => {
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

      await prisma.notification.delete({
        where: { id },
      });

      return createApiResponse(null, "Message supprimé avec succès");
    });
  } catch (error) {
    return handleApiError(error);
  }
}