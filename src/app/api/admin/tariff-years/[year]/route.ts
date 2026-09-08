import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  ApiError,
  createApiResponse,
  handleApiError,
  withAuthAndRole,
} from "@/lib/api-utils";
import { hydrateTariffOverlaysFromDb } from "@/lib/tarificateurs/tariff-year-service";

const PatchSchema = z.object({
  activityRates: z
    .array(
      z.object({
        code: z.number(),
        title: z.string(),
        rate: z.number().positive(),
      }),
    )
    .optional(),
  territoryTaxes: z.record(z.string(), z.number()).optional(),
  territoryPjTaxes: z.record(z.string(), z.number()).optional(),
  degressivity: z
    .array(
      z.object({
        code: z.number(),
        title: z.string(),
        type: z.string(),
        degressivity1: z.number(),
        degressivity2: z.number(),
      }),
    )
    .optional(),
});

export async function PATCH(
  request: NextRequest,
  props: { params: Promise<{ year: string }> },
) {
  const params = await props.params;
  try {
    return await withAuthAndRole(["ADMIN"], async () => {
      const year = Number(params.year);
      if (!Number.isInteger(year) || year < 2027) {
        throw new ApiError(400, "Les exercices 2025/2026 sont figés (code production)");
      }
      const later = await prisma.tariffYear.findFirst({
        where: { year: { gt: year } },
        select: { year: true },
      });
      if (later) {
        throw new ApiError(
          409,
          `L'exercice ${year} est gelé depuis la création de ${later.year}`,
        );
      }
      const existing = await prisma.tariffYear.findUnique({ where: { year } });
      if (!existing) {
        throw new ApiError(404, `Exercice ${year} introuvable`);
      }
      const body = PatchSchema.parse(await request.json());
      const updated = await prisma.tariffYear.update({
        where: { year },
        data: {
          ...(body.activityRates ? { activityRates: body.activityRates } : {}),
          ...(body.territoryTaxes ? { territoryTaxes: body.territoryTaxes } : {}),
          ...(body.territoryPjTaxes
            ? { territoryPjTaxes: body.territoryPjTaxes }
            : {}),
          ...(body.degressivity ? { degressivity: body.degressivity } : {}),
        },
      });
      await hydrateTariffOverlaysFromDb();
      return createApiResponse(updated, `Barème ${year} mis à jour`);
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return handleApiError(
        new ApiError(400, error.issues[0]?.message ?? "Données invalides"),
      );
    }
    return handleApiError(error);
  }
}
