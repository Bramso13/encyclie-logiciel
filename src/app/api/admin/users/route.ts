import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handleApiError, withPermission } from "@/lib/api-utils";

export async function GET() {
  try {
    return await withPermission("USERS_ROLES", async () => {
      const users = await prisma.user.findMany({
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          companyName: true,
          isActive: true,
          permissions: { select: { permission: true } },
        },
        orderBy: [{ role: "asc" }, { name: "asc" }],
      });

      return NextResponse.json({
        success: true,
        data: users.map((user) => ({
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          companyName: user.companyName,
          isActive: user.isActive,
          permissions: user.permissions.map((row) => row.permission),
        })),
      });
    });
  } catch (error) {
    return handleApiError(error);
  }
}
