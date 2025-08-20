import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, createApiResponse, handleApiError } from "@/lib/api-utils";

export async function GET(request: NextRequest) {
  try {
    return await withAuth(async (userId) => {
      const count = await prisma.notification.count({
        where: {
          userId,
          type: "GENERAL",
          isRead: false,
        },
      });

      return createApiResponse({ count });
    });
  } catch (error) {
    return handleApiError(error);
  }
}