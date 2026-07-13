import { getTaxeByRegion, getTaxePJByTauxTaxe } from "@/lib/tarificateurs/rcd";

export type EcheanceForPrimesTable = {
  rcd?: number;
  pj?: number;
  frais?: number;
  fraisGestion?: number;
  reprise?: number;
  taxe?: number;
  totalTTC?: number;
};

export function computePrimesTableAmounts(
  echeances: EcheanceForPrimesTable[],
  territory?: string
) {
  const sum = (fn: (echeance: EcheanceForPrimesTable) => number) =>
    echeances.reduce((acc, echeance) => acc + fn(echeance), 0);

  const tauxTaxe = getTaxeByRegion(territory || "");
  const tauxTaxePJ = getTaxePJByTauxTaxe(tauxTaxe);

  const primeRCDHT = sum((e) => (e.rcd || 0) - (e.taxe || 0));
  const primeRCDTaxes = sum((e) => e.taxe || 0);
  const primeRCDTTC = sum((e) => e.rcd || 0);

  const primePJHT = sum((e) => e.pj || 0);
  const primePJTaxes = primePJHT * tauxTaxePJ;
  const primePJTTC = primePJHT + primePJTaxes;

  const totalRCDPJHT = primeRCDHT + primePJHT;
  const totalRCDPJTaxes = primeRCDTaxes + primePJTaxes;
  const totalRCDPJTTC = primeRCDTTC + primePJTTC;

  const honorairesHT = sum((e) => e.fraisGestion || 0);

  const totalAvecFraisHT = totalRCDPJHT + honorairesHT;
  const totalAvecFraisTaxes = totalRCDPJTaxes;
  const totalAvecFraisTTC = totalRCDPJTTC + honorairesHT;

  const repriseHT = sum((e) => e.reprise || 0);
  const repriseTaxes = repriseHT * tauxTaxe;
  const repriseTTC = repriseHT + repriseTaxes;

  const primeTotaleHT = totalAvecFraisHT + repriseHT;
  const primeTotaleTaxes = totalAvecFraisTaxes + repriseTaxes;
  const primeTotaleTTC = sum((e) => e.totalTTC || 0);

  return {
    primeRCDHT,
    primeRCDTaxes,
    primeRCDTTC,
    primePJHT,
    primePJTaxes,
    primePJTTC,
    totalRCDPJHT,
    totalRCDPJTaxes,
    totalRCDPJTTC,
    honorairesHT,
    totalAvecFraisHT,
    totalAvecFraisTaxes,
    totalAvecFraisTTC,
    repriseHT,
    repriseTaxes,
    repriseTTC,
    primeTotaleHT,
    primeTotaleTaxes,
    primeTotaleTTC,
  };
}
