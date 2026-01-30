import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * GET /api/admin/brokers
 *
 * Get list of all brokers for filter dropdown
 */
export async function GET() {
  try {
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
  } catch (error) {
    console.error("Error fetching brokers:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch brokers",
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
