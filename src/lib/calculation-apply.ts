import { Quote, CalculationResult } from "@/lib/types";
import { genererEcheancier, getTaxeByRegion } from "@/lib/tarificateurs/rcd";

/**
 * Applique une modification (section, champ, valeur) au résultat de calcul
 * et recalcule totaux + échéancier. Logique partagée par SimpleParameterEditor et les toggles.
 */
export function applyCalculationChange(
  result: CalculationResult,
  quote: Quote,
  sectionKey: string,
  fieldKey: string,
  value: number
): CalculationResult {
  const newResult = {
    ...result,
    majorations: { ...(result.majorations || {}) },
    autres: { ...(result.autres || {}) },
    autresN1: { ...(result.autresN1 || {}) },
  };

  if (sectionKey === "majorations") {
    newResult.majorations = {
      ...newResult.majorations,
      [fieldKey]: value,
    };

    const totalMaj = Object.entries(newResult.majorations).reduce(
      (sum, [, val]) => sum + (val as number),
      1
    );

    newResult.totalMajorations = totalMaj;
    newResult.primeTotal = newResult.PrimeHTSansMajorations * totalMaj;

    const txFraisGestion = 0.1;
    newResult.fraisGestion = newResult.primeTotal * txFraisGestion;

    newResult.primeTotalN1 = newResult.PrimeHTSansMajorationsN1 * totalMaj;
    newResult.fraisGestionN1 = newResult.primeTotalN1 * txFraisGestion;

    newResult.autres.total =
      newResult.autres.taxeAssurance +
      newResult.autres.protectionJuridiqueTTC +
      newResult.autres.fraisFractionnementPrimeHT;

    newResult.totalTTC =
      newResult.primeTotal + newResult.fraisGestion + newResult.autres.total;

    newResult.totalTTCN1 =
      newResult.primeTotalN1 +
      newResult.fraisGestionN1 +
      (newResult.autresN1?.total ?? 0);
  } else if (sectionKey === "frais_taxes") {
    if (fieldKey === "fraisGestion") {
      newResult.fraisGestion = value;
    } else if (fieldKey === "taxeAssurance") {
      newResult.autres.taxeAssurance = value;
    } else if (fieldKey === "protectionJuridique") {
      newResult.autres.protectionJuridiqueTTC = value;
    } else if (fieldKey === "fraisFractionnement") {
      newResult.autres.fraisFractionnementPrimeHT = value;
    }

    newResult.autres.total =
      newResult.autres.taxeAssurance +
      newResult.autres.protectionJuridiqueTTC +
      newResult.autres.fraisFractionnementPrimeHT;

    newResult.totalTTC =
      newResult.primeTotal + newResult.fraisGestion + newResult.autres.total;
  }

  try {
    newResult.echeancier = genererEcheancier({
      dateDebut: new Date(quote.formData.dateDeffet),
      tauxTaxe: getTaxeByRegion(quote.formData.territory),
      taxe: newResult.autres.taxeAssurance,
      totalTTC: newResult.totalTTC,
      rcd: newResult.primeTotal,
      frais: newResult.autres.fraisFractionnementPrimeHT,
      reprise: newResult.reprisePasseResult?.primeReprisePasseTTC ?? 0,
      fraisGestion: newResult.fraisGestion,
      periodicite: quote.formData.periodicity as
        | "annuel"
        | "semestriel"
        | "trimestriel"
        | "mensuel",
      taxeN1: newResult.autresN1.taxeAssurance,
      totalTTCN1: newResult.totalTTCN1,
      rcdN1: newResult.primeTotalN1,
      fraisN1: newResult.autresN1.fraisFractionnementPrimeHT,
      fraisGestionN1: newResult.fraisGestionN1,
    });
  } catch (error) {
    console.error("Erreur recalcul échéancier:", error);
  }

  return newResult;
}
