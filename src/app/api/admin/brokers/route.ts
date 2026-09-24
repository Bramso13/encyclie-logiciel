import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ApiError, handleApiError, withPermission } from "@/lib/api-utils";

/**
 * GET /api/admin/brokers
 *
 * Liste des courtiers actifs pour les filtres.
 */
export async function GET() {
  try {
    return await withPermission("USERS_ROLES", async () => {
      const brokers = await prisma.user.findMany({
        where: {
          role: "BROKER",
          isActive: true,
        },
        include: {
          brokerProfile: true,
        },
        orderBy: {
          name: "asc",
        },
      });

      const brokersData = brokers
        .filter((broker) => broker.brokerProfile)
        .map((broker) => ({
          id: broker.id,
          name: broker.name || broker.email,
          code: broker.brokerProfile?.code || "",
          email: broker.email,
          companyName: broker.companyName,
        }));

      return NextResponse.json({
        success: true,
        brokers: brokersData,
      });
    });
  } catch (error) {
    if (error instanceof ApiError) return handleApiError(error);
    console.error("Error fetching brokers:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch brokers",
      },
      { status: 500 },
    );
  }
}
