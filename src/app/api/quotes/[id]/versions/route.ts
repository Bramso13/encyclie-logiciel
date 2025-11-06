import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  createApiResponse,
  handleApiError,
  withAuth,
  ApiError,
} from "@/lib/api-utils";

// GET /api/quotes/[id]/versions - Get all versions of a quote
export async function GET(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  try {
    return await withAuth(async (userId, userRole) => {
      // Get quote to check access
      const quote = await prisma.quote.findUnique({
        where: { id: params.id },
        select: {
          id: true,
          brokerId: true,
          reference: true,
        },
      });

      if (!quote) {
        throw new ApiError(404, "Devis non trouvé");
      }

      // Role-based access control
      if (userRole === "BROKER" && quote.brokerId !== userId) {
        throw new ApiError(403, "Accès refusé à ce devis");
      }

      // Get all versions
      const versions = await prisma.quoteVersion.findMany({
        where: { quoteId: params.id },
        orderBy: { version: "desc" },
        select: {
          id: true,
          version: true,
          status: true,
          companyData: true,
          formData: true,
          calculatedPremium: true,
          offerData: true,
          validUntil: true,
          submittedAt: true,
          offerReadyAt: true,
          offerSentAt: true,
          acceptedAt: true,
          changedById: true,
          changeReason: true,
          action: true,
          changes: true,
          userRole: true,
          createdAt: true,
        },
      });

      // Get user names for each version
      const userIds = [...new Set(versions.map((v) => v.changedById))];
      const users = await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: {
          id: true,
          name: true,
          email: true,
        },
      });

      const usersMap = new Map(users.map((u) => [u.id, u]));

      // Enrich versions with user data
      const enrichedVersions = versions.map((version) => ({
        ...version,
        changedBy: usersMap.get(version.changedById),
      }));

      return createApiResponse({
        quoteId: params.id,
        quoteReference: quote.reference,
        totalVersions: versions.length,
        versions: enrichedVersions,
      });
    });
  } catch (error) {
    return handleApiError(error);
  }
}



