import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  withAuthAndRole,
  handleApiError,
  ApiError,
} from "@/lib/api-utils";

/**
 * PATCH /api/admin/ecarts-montants/[quoteId]
 * Bascule modifieAlaMain sur le devis.
 */
export async function PATCH(
  _request: NextRequest,
  props: { params: Promise<{ quoteId: string }> },
) {
  const params = await props.params;
  try {
    return await withAuthAndRole(["ADMIN"], async () => {
      const existing = await prisma.quote.findUnique({
        where: { id: params.quoteId },
        select: { id: true, modifieAlaMain: true },
      });

      if (!existing) {
        throw new ApiError(404, "Devis introuvable");
      }

      const updated = await prisma.quote.update({
        where: { id: params.quoteId },
        data: { modifieAlaMain: !existing.modifieAlaMain },
        select: { id: true, modifieAlaMain: true },
      });

      return NextResponse.json({ success: true, data: updated });
    });
  } catch (e) {
    return handleApiError(e);
  }
}
