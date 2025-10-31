import { withAuth } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  return withAuth(async (userId, userRole) => {
    const brokerProfile = await prisma.brokerProfile.findUnique({
      where: { userId },
    });
    return NextResponse.json({ broker: brokerProfile });
  });
}
