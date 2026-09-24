import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { handleApiError, withPermission, ApiError } from "@/lib/api-utils";
import { ADMIN_PERMISSIONS } from "@/lib/permissions";
import { applyPermissionChange } from "@/lib/permission-service";

const BodySchema = z
  .object({
    permission: z.enum(ADMIN_PERMISSIONS).optional(),
    granted: z.boolean().optional(),
    role: z.enum(["ADMIN", "BROKER"]).optional(),
  })
  .refine(
    (body) =>
      body.role !== undefined ||
      (body.permission !== undefined && body.granted !== undefined),
    { message: "Indiquez une permission ou un rôle." },
  );

function clientMeta(request: NextRequest) {
  const forwarded = request.headers.get("x-forwarded-for");
  const ipAddress =
    forwarded?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    null;
  return {
    ipAddress,
    userAgent: request.headers.get("user-agent"),
  };
}

export async function PUT(
  request: NextRequest,
  props: { params: Promise<{ id: string }> },
) {
  const params = await props.params;
  try {
    return await withPermission("USERS_ROLES", async (actorId) => {
      const parsed = BodySchema.safeParse(await request.json());
      if (!parsed.success) {
        throw new ApiError(400, "Indiquez une permission ou un rôle.");
      }

      const meta = clientMeta(request);
      const result = await applyPermissionChange({
        actorId,
        targetUserId: params.id,
        permission: parsed.data.permission,
        granted: parsed.data.granted,
        nextRole: parsed.data.role,
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
      });

      if (!result.ok) {
        throw new ApiError(result.status, result.message);
      }

      return NextResponse.json({
        success: true,
        message: "Permissions mises à jour",
      });
    });
  } catch (error) {
    return handleApiError(error);
  }
}
