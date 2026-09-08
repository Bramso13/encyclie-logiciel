export function roundMoney(value: number): number {
  return Math.round((Number(value) || 0) * 100) / 100;
}

/** Prime d'aggravation : prime HT × % × (1 + frais de gestion + taxe). */
export function aggravationAmount(
  primeHT: number,
  percent: number,
  fraisGestionRate: number,
  taxRate: number,
): number {
  return roundMoney(
    primeHT * (percent / 100) * (1 + fraisGestionRate + taxRate),
  );
}

export function isAggravatedPremium(calculationResult: {
  majorations?: { nonFournitureBilanN_1?: number };
} | null | undefined): boolean {
  return calculationResult?.majorations?.nonFournitureBilanN_1 === 0.5;
}

export function premiumCallTitle(
  year: number,
  aggravated: boolean,
): string {
  return aggravated
    ? `Appel de prime ${year} aggravé`
    : `Appel de prime ${year}`;
}
