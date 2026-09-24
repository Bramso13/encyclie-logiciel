import { NextResponse } from "next/server";
import { handleApiError, withAuth } from "@/lib/api-utils";
import { loadPermissionNames } from "@/lib/permission-service";

export async function GET() {
  try {
    return await withAuth(async (userId, userRole) => {
      const permissions =
        userRole === "ADMIN" ? await loadPermissionNames(userId) : [];
      return NextResponse.json({
        success: true,
        data: { role: userRole, permissions },
      });
    });
  } catch (error) {
    return handleApiError(error);
  }
}
