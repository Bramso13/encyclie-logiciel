import { prisma } from "@/lib/prisma";
import {
  getBuiltinActivityRates,
  getBuiltinDegressivity,
  BUILTIN_TERRITORY_TAXES,
  BUILTIN_TERRITORY_PJ_TAXES,
} from "@/lib/tarificateurs/rcd";
import {
  setTariffOverlays,
  type TariffOverlay,
} from "@/lib/tarificateurs/tariff-registry";

function asOverlay(row: {
  year: number;
  activityRates: unknown;
  territoryTaxes: unknown;
  territoryPjTaxes: unknown;
  degressivity: unknown;
}): TariffOverlay {
  return {
    year: row.year,
    activityRates: Array.isArray(row.activityRates)
      ? (row.activityRates as TariffOverlay["activityRates"])
      : [],
    territoryTaxes:
      row.territoryTaxes && typeof row.territoryTaxes === "object"
        ? (row.territoryTaxes as Record<string, number>)
        : { ...BUILTIN_TERRITORY_TAXES },
    territoryPjTaxes:
      row.territoryPjTaxes && typeof row.territoryPjTaxes === "object"
        ? (row.territoryPjTaxes as Record<string, number>)
        : { ...BUILTIN_TERRITORY_PJ_TAXES },
    degressivity: Array.isArray(row.degressivity)
      ? (row.degressivity as TariffOverlay["degressivity"])
      : getBuiltinDegressivity(),
  };
}

export async function hydrateTariffOverlaysFromDb(): Promise<TariffOverlay[]> {
  try {
    const rows = await prisma.tariffYear.findMany({
      orderBy: { year: "asc" },
    });
    const overlays = rows.map(asOverlay);
    setTariffOverlays(overlays);
    return overlays;
  } catch {
    setTariffOverlays([]);
    return [];
  }
}

export function snapshotRatesForYear(year: number): TariffOverlay {
  const rateYear = year >= 2027 ? 2026 : year;
  return {
    year,
    activityRates: getBuiltinActivityRates(rateYear).map((item) => ({ ...item })),
    territoryTaxes: { ...BUILTIN_TERRITORY_TAXES },
    territoryPjTaxes: { ...BUILTIN_TERRITORY_PJ_TAXES },
    degressivity: getBuiltinDegressivity().map((item) => ({ ...item })),
  };
}

export function applyIncrease(
  source: TariffOverlay,
  targetYear: number,
  percent: number,
): TariffOverlay {
  const factor = 1 + percent / 100;
  return {
    year: targetYear,
    activityRates: source.activityRates.map((item) => ({
      ...item,
      rate: item.rate * factor,
    })),
    territoryTaxes: { ...source.territoryTaxes },
    territoryPjTaxes: { ...source.territoryPjTaxes },
    degressivity: source.degressivity.map((item) => ({ ...item })),
  };
}
