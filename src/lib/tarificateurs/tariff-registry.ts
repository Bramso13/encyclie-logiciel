export type ActivityRate = { code: number; title: string; rate: number };

export type DegressivityRow = {
  code: number;
  title: string;
  type: string;
  degressivity1: number;
  degressivity2: number;
};

export type TariffOverlay = {
  year: number;
  activityRates: ActivityRate[];
  territoryTaxes: Record<string, number>;
  territoryPjTaxes: Record<string, number>;
  degressivity: DegressivityRow[];
};

const overlays = new Map<number, TariffOverlay>();

export function setTariffOverlays(rows: TariffOverlay[]) {
  overlays.clear();
  for (const row of rows) {
    if (row.year >= 2027) {
      overlays.set(row.year, row);
    }
  }
}

export function getTariffOverlay(year: number): TariffOverlay | undefined {
  if (year < 2027) return undefined;
  return overlays.get(year);
}

export function listOverlayYears(): number[] {
  return [...overlays.keys()].sort((a, b) => a - b);
}

export const BUILTIN_TARIFF_YEARS = [2025, 2026] as const;
