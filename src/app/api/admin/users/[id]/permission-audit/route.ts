import { NextResponse } from "next/server";
import { handleApiError, withPermission } from "@/lib/api-utils";
import { listPermissionAudit } from "@/lib/permission-service";

export async function GET(
  _request: Request,
  props: { params: Promise<{ id: string }> },
) {
  const params = await props.params;
  try {
    return await withPermission("USERS_ROLES", async () => {
      const logs = await listPermissionAudit(params.id);
      return NextResponse.json({
        success: true,
        data: logs.map((log) => ({
          id: log.id,
          permission: log.permission,
          action: log.action,
          createdAt: log.createdAt,
          ipAddress: log.ipAddress,
          userAgent: log.userAgent,
          changedBy: log.changedBy,
        })),
      });
    });
  } catch (error) {
    return handleApiError(error);
  }
}
