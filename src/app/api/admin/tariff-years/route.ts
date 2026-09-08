import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  ApiError,
  createApiResponse,
  handleApiError,
  withAuth,
  withAuthAndRole,
} from "@/lib/api-utils";
import { BUILTIN_TARIFF_YEARS } from "@/lib/tarificateurs/tariff-registry";
import {
  applyIncrease,
  hydrateTariffOverlaysFromDb,
  snapshotRatesForYear,
} from "@/lib/tarificateurs/tariff-year-service";
import type { TariffOverlay } from "@/lib/tarificateurs/tariff-registry";

const CreateSchema = z.object({
  year: z.number().int().min(2027),
  fromYear: z.number().int().min(2025),
  increasePercent: z.number().min(0).max(100),
});

function frozenYears(dbYears: number[]): Set<number> {
  const all = [...BUILTIN_TARIFF_YEARS, ...dbYears].sort((a, b) => a - b);
  const frozen = new Set<number>();
  const max = all[all.length - 1] ?? 2026;
  for (const year of all) {
    if (year < max) frozen.add(year);
  }
  for (const year of BUILTIN_TARIFF_YEARS) frozen.add(year);
  return frozen;
}

export async function GET() {
  try {
    return await withAuth(async () => {
      const overlays = await hydrateTariffOverlaysFromDb();
      const dbYears = overlays.map((row) => row.year);
      const frozen = frozenYears(dbYears);
      const builtins = BUILTIN_TARIFF_YEARS.map((year) => ({
        year,
        builtin: true,
        frozen: frozen.has(year),
        rates: snapshotRatesForYear(year),
      }));
      const custom = overlays.map((row) => ({
        year: row.year,
        builtin: false,
        frozen: frozen.has(row.year),
        rates: row,
      }));
      return createApiResponse({
        years: [...builtins, ...custom].sort((a, b) => a.year - b.year),
      });
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    return await withAuthAndRole(["ADMIN"], async () => {
      const body = CreateSchema.parse(await request.json());
      const overlays = await hydrateTariffOverlaysFromDb();
      if (overlays.some((row) => row.year === body.year)) {
        throw new ApiError(409, `L'exercice ${body.year} existe déjà`);
      }

      let source: TariffOverlay;
      if (body.fromYear <= 2026) {
        source = snapshotRatesForYear(body.fromYear);
      } else {
        const found = overlays.find((row) => row.year === body.fromYear);
        source = found ?? snapshotRatesForYear(body.fromYear);
      }

      const created = applyIncrease(source, body.year, body.increasePercent);
      await prisma.tariffYear.create({
        data: {
          year: created.year,
          activityRates: created.activityRates,
          territoryTaxes: created.territoryTaxes,
          territoryPjTaxes: created.territoryPjTaxes,
          degressivity: created.degressivity,
          createdFromYear: body.fromYear,
          increasePercent: body.increasePercent,
        },
      });
      await hydrateTariffOverlaysFromDb();
      return createApiResponse(
        { year: body.year, rates: created },
        `Exercice ${body.year} créé (copie ${body.fromYear} + ${body.increasePercent} %)`,
        201,
      );
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
